import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const authHeader = request.headers.get('Authorization');

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch (error) {}
          },
        },
        global: {
          headers: authHeader ? { Authorization: authHeader } : undefined
        }
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsedId = z.uuid().safeParse(body?.ticketId || body?.id);

    if (!parsedId.success) {
      return NextResponse.json({ error: 'ID do ingresso ausente ou inválido.' }, { status: 400 });
    }

    const ticketId = parsedId.data;

    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        id,
        event_id,
        is_used,
        payment_status,
        buyer_name,
        buyer_email,
        user_id,
        events ( title )
      `)
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ingresso não encontrado.' }, { status: 404 });
    }

    // Autoriza antes de expor qualquer dado do portador do ingresso
    const { data: canManage } = await supabase.rpc('is_ticket_manager', { p_event_id: ticket.event_id });

    if (!canManage) {
      return NextResponse.json({ error: 'Você não é o produtor ou agente autorizado deste evento.' }, { status: 403 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('cpf, university, course, semester, enrollment_number')
      .eq('id', ticket.user_id)
      .single();

    const userDataObj = {
      name: ticket.buyer_name,
      email: ticket.buyer_email,
      cpf: profile?.cpf || 'Não informado',
      university: profile?.university || 'Não informada',
      course: profile?.course || 'Não informado',
      semester: profile?.semester || 'N/A',
      enrollment_number: profile?.enrollment_number || 'N/A',
      event: (ticket.events as any)?.title
    };

    if (ticket.payment_status !== 'approved') {
      return NextResponse.json({ error: `Ingresso não pago (Status: ${ticket.payment_status})` }, { status: 400 });
    }

    if (ticket.is_used) {
      return NextResponse.json({ 
        error: 'Este ingresso já foi usado!',
        userData: userDataObj
      }, { status: 400 });
    }

    const { data: updatedRow, error: updateError } = await supabase
      .from('tickets')
      .update({ is_used: true })
      .eq('id', ticketId)
      .select('id')
      .single();

    if (updateError || !updatedRow) {
      return NextResponse.json({ 
        error: 'Você não é o produtor ou agente autorizado deste evento.',
        userData: userDataObj
      }, { status: 403 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Entrada autorizada!',
      userData: userDataObj
    });

  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}