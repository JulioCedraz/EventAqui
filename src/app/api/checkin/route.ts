import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

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

    const body = await request.json();
    const ticketId = body.ticketId || body.id; 

    if (!ticketId) {
      return NextResponse.json({ error: 'ID do ingresso ausente.' }, { status: 400 });
    }

    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        id, 
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('occupation')
      .eq('id', ticket.user_id)
      .single();

    if (ticket.payment_status !== 'approved') {
      return NextResponse.json({ error: `Ingresso não pago (Status: ${ticket.payment_status})` }, { status: 400 });
    }

    if (ticket.is_used) {
      return NextResponse.json({ 
        error: 'ALERTA: Este ingresso já foi validado anteriormente!',
        userData: {
          name: ticket.buyer_name,
          email: ticket.buyer_email,
          occupation: profile?.occupation || 'Não informada',
          event: (ticket.events as any)?.title
        }
      }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('tickets')
      .update({ is_used: true })
      .eq('id', ticketId);

    if (updateError) throw updateError;

    return NextResponse.json({ 
      success: true, 
      message: 'Check-in realizado com sucesso!',
      userData: {
        name: ticket.buyer_name,
        email: ticket.buyer_email,
        occupation: profile?.occupation || 'Não informada',
        event: (ticket.events as any)?.title
      }
    });

  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}