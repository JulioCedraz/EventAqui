import 'server-only';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return NextResponse.json({ error: 'Não autorizado. Faça login como admin.' }, { status: 401 });
    }

    const { ticketId } = await request.json();

    if (!ticketId) {
      return NextResponse.json({ error: 'QR Code inválido ou vazio.' }, { status: 400 });
    }

    const userScopedSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // 1. Busca APENAS o ingresso primeiro
    const { data: ticket, error: fetchError } = await userScopedSupabase
      .from('tickets')
      .select('id, payment_status, is_used, user_id, buyer_name')
      .eq('id', ticketId)
      .single();

    if (fetchError || !ticket) {
      console.error('Erro na busca do ingresso:', fetchError);
      return NextResponse.json({ status: 'invalid', message: 'Ingresso não encontrado ou sem permissão de leitura.' });
    }

    // 2. Busca o perfil em uma requisição separada usando o user_id do ingresso
    let userProfile = null;
    if (ticket.user_id) {
      const { data: profileData, error: profileError } = await userScopedSupabase
        .from('profiles')
        .select('first_name, last_name, cpf, occupation')
        .eq('id', ticket.user_id)
        .single();
        
      if (profileError) {
        console.error('Aviso: Perfil não encontrado para este usuário.', profileError);
      } else {
        userProfile = profileData;
      }
    }

    // 3. Monta o nome completo (com fallback para o buyer_name antigo caso o perfil não exista)
    const buyerFullName = userProfile?.first_name 
      ? `${userProfile.first_name} ${userProfile.last_name}` 
      : (ticket.buyer_name || 'Usuário Desconhecido');

    if (ticket.payment_status !== 'approved') {
      return NextResponse.json({ status: 'pending', message: `O pagamento de ${buyerFullName} ainda não foi confirmado.` });
    }

    if (ticket.is_used) {
      return NextResponse.json({ status: 'used', message: `Atenção: O ingresso de ${buyerFullName} JÁ FOI UTILIZADO.` });
    }

    const { error: updateError } = await userScopedSupabase
      .from('tickets')
      .update({ is_used: true })
      .eq('id', ticketId);

    if (updateError) throw new Error('Falha ao atualizar o banco de dados.');

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
    console.error('Validation error:', error);
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}