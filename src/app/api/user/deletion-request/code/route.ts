import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getRequestUser, verifyPassword } from '@/lib/auth';
import { sendAccountDeletionCodeEmail } from '@/lib/mail';
import {
  DELETION_CODE_RESEND_SECONDS,
  DELETION_CODE_TTL_MINUTES,
  generateDeletionCode,
  hashDeletionCode,
} from '@/lib/deletion-code';

const bodySchema = z.object({ password: z.string().min(1).max(200) });

// Confere a senha e envia por e-mail o código que confirma a exclusão da conta.
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user?.email) return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 });

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'A senha atual é obrigatória.' }, { status: 400 });

    const { data: existing } = await supabaseAdmin
      .from('account_deletion_codes')
      .select('created_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing && Date.now() - new Date(existing.created_at).getTime() < DELETION_CODE_RESEND_SECONDS * 1000) {
      return NextResponse.json({ error: 'Aguarde um minuto antes de pedir um novo código.' }, { status: 429 });
    }

    if (!(await verifyPassword(user.email, parsed.data.password))) {
      return NextResponse.json({ error: 'Senha incorreta. Tente novamente.' }, { status: 401 });
    }

    const code = generateDeletionCode();
    const now = new Date();

    const { error: upsertError } = await supabaseAdmin.from('account_deletion_codes').upsert({
      user_id: user.id,
      code_hash: hashDeletionCode(user.id, code),
      attempts: 0,
      expires_at: new Date(now.getTime() + DELETION_CODE_TTL_MINUTES * 60_000).toISOString(),
      created_at: now.toISOString(),
    });

    if (upsertError) throw upsertError;

    await sendAccountDeletionCodeEmail(user.email, code);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao enviar o código de exclusão:', error);
    return NextResponse.json({ error: 'Erro ao enviar o código de segurança. Tente novamente.' }, { status: 500 });
  }
}
