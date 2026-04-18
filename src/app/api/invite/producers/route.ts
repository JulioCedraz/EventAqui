import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'E-mail é obrigatório' }, { status: 400 });
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    const redirectToUrl = `${origin}/profile?invite=true`;

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { role: 'producer' },
      redirectTo: redirectToUrl
    });

    if (error) {
      if (
        error.message.includes('already registered') || 
        error.message.includes('already exists') ||
        error.status === 422
      ) {
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ role: 'producer' })
          .eq('email', email);

        if (updateError) {
          return NextResponse.json({ error: 'Erro ao promover usuário existente a produtor.' }, { status: 500 });
        }

        return NextResponse.json({ 
          success: true, 
          message: 'Usuário já possuía conta e foi promovido a Produtor com sucesso!',
          alreadyExists: true 
        });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: data.user });
    
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}