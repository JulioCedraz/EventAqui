import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function DELETE(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Token de autenticação não fornecido.' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Sessão inválida ou expirada. Faça login novamente.' }, { status: 401 });
    }

    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
      console.error('CRÍTICO: SUPABASE_SERVICE_ROLE_KEY não configurada no .env');
      return NextResponse.json({ error: 'Erro de configuração no servidor.' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('Erro ao deletar usuário no Supabase:', deleteError.message);
      return NextResponse.json({ error: 'Falha ao excluir a conta no banco de dados.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Conta excluída permanentemente.' });

  } catch (error: any) {
    console.error('Erro na API de exclusão:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}