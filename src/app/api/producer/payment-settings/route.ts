import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getRequestUser, getUserRole } from '@/lib/auth';
import { decryptSecret, encryptSecret } from '@/lib/secret-box';

const bodySchema = z.object({
  handle: z.string().trim().toLowerCase().transform((value) => value.replace(/^\$/, ''))
    .pipe(z.string().regex(/^[a-z0-9._-]{2,40}$/)),
  apiKey: z.string().trim().min(10).max(300),
});

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

async function loadProducer(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return { response: fail('Não autorizado.', 401) };

  const { role } = await getUserRole(user);
  if (role !== 'producer' && role !== 'admin') return { response: fail('Acesso negado.', 403) };

  return { user };
}

// Nunca devolve a API Key: só a InfiniteTag e os 4 últimos caracteres da chave.
export async function GET(request: Request) {
  try {
    const { user, response } = await loadProducer(request);
    if (!user) return response;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('infinitepay_handle, infinitepay_api_key_enc')
      .eq('id', user.id)
      .single();

    const apiKey = profile?.infinitepay_api_key_enc ? decryptSecret(profile.infinitepay_api_key_enc) : null;

    return NextResponse.json({
      handle: profile?.infinitepay_handle ?? null,
      keyHint: apiKey ? apiKey.slice(-4) : null,
    });
  } catch (error) {
    console.error('Erro ao ler configuração de pagamento:', error);
    return fail('Erro interno no servidor.', 500);
  }
}

export async function PUT(request: Request) {
  try {
    const { user, response } = await loadProducer(request);
    if (!user) return response;

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail('InfiniteTag ou API Key inválida.', 400);

    const { handle, apiKey } = parsed.data;

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ infinitepay_handle: handle, infinitepay_api_key_enc: encryptSecret(apiKey) })
      .eq('id', user.id);

    if (error) throw error;

    return NextResponse.json({ handle, keyHint: apiKey.slice(-4) });
  } catch (error) {
    console.error('Erro ao salvar configuração de pagamento:', error);
    return fail('Erro interno no servidor.', 500);
  }
}
