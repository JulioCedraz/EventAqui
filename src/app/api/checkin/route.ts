// src\app\api\checkin\route.ts

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
          getAll() { return cookieStore.getAll(); },
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

    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    const { data: { user }, error: authError } = token 
      ? await supabase.auth.getUser(token) 
      : await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado. Sessão inválida ou expirada.' }, { status: 401 });
    }

    const { ticketId, eventId } = await request.json();
    if (!ticketId || !eventId) {
      return NextResponse.json({ error: 'Dados do ingresso incompletos.' }, { status: 400 });
    }

    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id, is_used, payment_status')
      .eq('id', ticketId)
      .eq('event_id', eventId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ingresso não encontrado ou você não tem permissão para esta portaria.' }, { status: 404 });
    }

    if (ticket.payment_status !== 'approved') {
      return NextResponse.json({ error: `ALERTA: Ingresso não está pago. Status: ${ticket.payment_status}` }, { status: 400 });
    }

    if (ticket.is_used) {
      return NextResponse.json({ error: 'ALERTA: Este ingresso já foi validado anteriormente!' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('tickets')
      .update({ is_used: true })
      .eq('id', ticketId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, message: 'Check-in validado com sucesso!' });

  } catch (err: any) {
    console.error('Erro na API de Check-in:', err);
    return NextResponse.json({ error: 'Erro interno no servidor ao validar o ingresso.' }, { status: 500 });
  }
}