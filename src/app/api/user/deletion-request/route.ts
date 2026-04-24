import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Token não fornecido.' }, { status: 401 });
    }

    let body = {};
    try {
      body = await request.json();
    } catch (e) {
    }
    const { confirmTicketAbandonment } = body as { confirmTicketAbandonment?: boolean };

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseUserClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Descobrir a role do usuário (Producer ou Customer)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 });
    }

    const todayIso = new Date().toISOString();

    // FLUXO DO PRODUTOR (PRODUCER)
    if (profile.role === 'producer') {
      // Verifica se o produtor tem eventos futuros ativos
      const { data: activeEvents, error: eventsError } = await supabaseAdmin
        .from('events')
        .select('id')
        .eq('producer_id', user.id)
        .gte('event_date', todayIso)
        .limit(1);

      if (eventsError) throw eventsError;

      if (activeEvents && activeEvents.length > 0) {
        return NextResponse.json({ 
          code: 'PRODUCER_ACTIVE_EVENTS',
          error: 'Você possui eventos ativos ou futuros. Encerre seus eventos, processe os repasses/estornos e contate o administrador para encerrar sua conta.' 
        }, { status: 403 });
      }
    }

    // FLUXO DO CLIENTE / GERAL (CUSTOMER)
    // Verifica se o usuário tem ingressos válidos para eventos que ainda não aconteceram
    const { data: futureTickets, error: ticketsError } = await supabaseAdmin
      .from('tickets')
      .select('id, events!inner(event_date)')
      .eq('user_id', user.id)
      .gte('events.event_date', todayIso)
      .limit(1);

    if (ticketsError) throw ticketsError;

    if (futureTickets && futureTickets.length > 0) {
      if (!confirmTicketAbandonment) {
        return NextResponse.json({ 
          code: 'CUSTOMER_HAS_TICKETS',
          error: 'Você possui ingressos para eventos futuros. É necessário abrir mão deles ou solicitar o estorno antes de excluir a conta.' 
        }, { status: 400 });
      }
    }

    // AGENDAMENTO DA EXCLUSÃO (SOFT DELETE)
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        status: 'pending_deletion',
        deletion_scheduled_at: deletionDate.toISOString()
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    // SUSPENSÃO NO SUPABASE AUTH por 720 horas = 30 dias
    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      ban_duration: '720h'
    });

    if (banError) throw banError;

    return NextResponse.json({ 
      success: true, 
      message: 'Sua conta foi suspensa e agendada para exclusão definitiva em 30 dias.' 
    });

  } catch (error: any) {
    console.error('Erro na solicitação de exclusão:', error);
    return NextResponse.json({ error: 'Erro interno ao processar a solicitação.' }, { status: 500 });
  }
}