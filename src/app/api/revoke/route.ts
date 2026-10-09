import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getRequestUser, getUserRole } from '@/lib/auth';

const bodySchema = z.object({ targetUserId: z.uuid() });

export async function POST(request: Request) {
  try {
    const requester = await getRequestUser(request);
    if (!requester) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const { role, isAdmin } = await getUserRole(requester);
    if (!isAdmin && role !== 'producer') {
      return NextResponse.json({ error: 'Permissão insuficiente.' }, { status: 403 });
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'ID do usuário alvo não fornecido.' }, { status: 400 });

    const { targetUserId } = parsed.data;

    if (!isAdmin) {
      const { data: target } = await supabaseAdmin
        .from('profiles')
        .select('role, producer_id')
        .eq('id', targetUserId)
        .single();

      if (target?.role !== 'agent' || target.producer_id !== requester.id) {
        return NextResponse.json({ error: 'Você só pode revogar agentes da sua própria equipe.' }, { status: 403 });
      }
    }

    const { error: dbError } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'customer', producer_id: null })
      .eq('id', targetUserId);

    if (dbError) throw dbError;

    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      user_metadata: { role: 'customer', producer_id: null }
    });

    if (authUpdateError) throw authUpdateError;

    return NextResponse.json({ success: true, message: 'Acesso revogado com sucesso.' });
  } catch (error) {
    console.error('Erro na API de Revogação:', error);
    return NextResponse.json({ error: 'Erro interno ao revogar o acesso.' }, { status: 500 });
  }
}
