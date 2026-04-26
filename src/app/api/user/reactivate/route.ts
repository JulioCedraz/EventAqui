import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Token não fornecido.' }, { status: 401 });
    }

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

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        status: 'active',
        deletion_scheduled_at: null
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    return NextResponse.json({ 
      success: true, 
      message: 'Bem-vindo de volta! Sua conta foi reativada com sucesso.' 
    });

  } catch (error: any) {
    console.error('Erro na reativação da conta:', error);
    return NextResponse.json({ error: 'Erro interno ao reativar a conta.' }, { status: 500 });
  }
}