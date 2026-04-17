import 'server-only';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 401 });
    }

    const { ticketId } = await request.json();

    if (!ticketId) {
      return NextResponse.json({ error: 'QR Code inválido ou vazio.' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Sessão inválida ou expirada.' }, { status: 401 });
    }

    const { data: operatorProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = operatorProfile?.role || 'customer';
    const admins = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
    const isAdmin = admins.includes(user.email || '') || role === 'admin';
    
    if (!isAdmin && role !== 'producer' && role !== 'agent') {
      return NextResponse.json({ error: 'Você não tem permissão para realizar check-in.' }, { status: 403 });
    }

    const { data: ticket, error: fetchError } = await supabaseAdmin
      .from('tickets')
      .select('id, payment_status, is_used, user_id, buyer_name')
      .eq('id', ticketId)
      .single();

    if (fetchError || !ticket) {
      return NextResponse.json({ status: 'invalid', message: 'Ingresso não encontrado.' });
    }

    let userProfile = null;
    if (ticket.user_id) {
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('first_name, last_name, cpf, occupation')
        .eq('id', ticket.user_id)
        .single();
      userProfile = profileData;
    }

    const buyerFullName = userProfile?.first_name 
      ? `${userProfile.first_name} ${userProfile.last_name}` 
      : (ticket.buyer_name || 'Usuário Desconhecido');

    if (ticket.payment_status !== 'approved') {
      return NextResponse.json({ status: 'pending', message: `O pagamento de ${buyerFullName} ainda não foi confirmado.` });
    }

    if (ticket.is_used) {
      return NextResponse.json({ status: 'used', message: `Atenção: O ingresso de ${buyerFullName} JÁ FOI UTILIZADO.` });
    }

    const { error: updateError } = await supabaseAdmin
      .from('tickets')
      .update({ is_used: true })
      .eq('id', ticketId);

    if (updateError) throw new Error('Falha ao atualizar o status do ingresso no servidor.');

    return NextResponse.json({ 
      status: 'success', 
      message: 'Entrada Liberada!',
      userData: {
        fullName: buyerFullName,
        cpf: userProfile?.cpf || 'Não informado',
        occupation: userProfile?.occupation || 'Não informada'
      }
    });

  } catch (error) {
    console.error('Erro crítico na API de Check-in:', error);
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}