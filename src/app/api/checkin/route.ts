import 'server-only';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return NextResponse.json({ erro: 'Não autorizado. Faça login como admin.' }, { status: 401 });
    }

    const { ticketId } = await request.json();

    if (!ticketId) {
      return NextResponse.json({ erro: 'QR Code inválido ou vazio.' }, { status: 400 });
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

    const { data: ticket, error: erroBusca } = await userScopedSupabase
      .from('tickets')
      .select('id, payment_status, is_used, buyer_name')
      .eq('id', ticketId)
      .single();

    if (erroBusca || !ticket) {
      return NextResponse.json({ status: 'invalido', mensagem: 'Ingresso não encontrado ou sem permissão de leitura.' });
    }

    if (ticket.payment_status !== 'approved') {
      return NextResponse.json({ status: 'pendente', mensagem: `O pagamento de ${ticket.buyer_name} ainda não foi confirmado.` });
    }

    if (ticket.is_used) {
      return NextResponse.json({ status: 'usado', mensagem: `Atenção: O ingresso de ${ticket.buyer_name} JÁ FOI UTILIZADO.` });
    }

    const { error: erroUpdate } = await userScopedSupabase
      .from('tickets')
      .update({ is_used: true })
      .eq('id', ticketId);

    if (erroUpdate) throw new Error('Falha ao atualizar o banco de dados.');

    return NextResponse.json({ status: 'sucesso', mensagem: `Entrada Liberada! Bem-vindo(a), ${ticket.buyer_name}.` });

  } catch (error) {
    console.error('Erro na validação:', error);
    return NextResponse.json({ erro: 'Erro interno no servidor.' }, { status: 500 });
  }
}