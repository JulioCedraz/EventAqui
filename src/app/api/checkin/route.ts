import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch (error) {}
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autorizado. Faça login novamente.' }, { status: 401 });
    }

    const { ticketId, eventId } = await request.json();
    if (!ticketId || !eventId) {
      return NextResponse.json({ error: 'Dados do ingresso incompletos.' }, { status: 400 });
    }

    const userId = session.user.id;

    const [eventResponse, profileResponse] = await Promise.all([
      supabase.from('events').select('producer_id').eq('id', eventId).single(),
      supabase.from('profiles').select('role, producer_id').eq('id', userId).single()
    ]);

    if (eventResponse.error || !eventResponse.data) {
      return NextResponse.json({ error: 'Evento não encontrado.' }, { status: 404 });
    }

    if (profileResponse.error || !profileResponse.data) {
      return NextResponse.json({ error: 'Perfil do usuário não encontrado.' }, { status: 404 });
    }

    const eventOwnerId = eventResponse.data.producer_id;
    const { role, producer_id } = profileResponse.data;

    if (
      role !== 'admin' &&
      !(role === 'producer' && userId === eventOwnerId) &&
      !(role === 'agent' && producer_id === eventOwnerId)
    ) {
      return NextResponse.json({ error: 'Você não tem permissão para este evento.' }, { status: 403 });
    }

    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id, status')
      .eq('id', ticketId)
      .eq('event_id', eventId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ingresso não encontrado ou não pertence a este evento.' }, { status: 404 });
    }

    if (ticket.status === 'used') {
      return NextResponse.json({ error: 'ALERTA: Este ingresso já foi utilizado.' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('tickets')
      .update({ 
        status: 'used', 
        checked_in_at: new Date().toISOString(),
        checked_by: userId 
      })
      .eq('id', ticketId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, message: 'Check-in validado com sucesso!' });

  } catch (err: any) {
    console.error('Erro na API de Check-in:', err);
    return NextResponse.json({ error: 'Erro interno no servidor ao validar.' }, { status: 500 });
  }
}