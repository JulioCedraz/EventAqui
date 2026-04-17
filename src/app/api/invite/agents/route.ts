import { createClient, User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function POST(request: Request) {
  try {
    const { email, producerId } = await request.json();

    if (!email || !producerId) {
      return NextResponse.json({ error: 'E-mail e ID do produtor são obrigatórios' }, { status: 400 });
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const redirectToUrl = `${origin}/profile?invite=true`;

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { 
        role: 'agent',
        producer_id: producerId
      },
      redirectTo: redirectToUrl
    });

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (!authError && authData?.users) {
          const existingUser = authData.users.find((u: User) => u.email === email.toLowerCase());
          
          if (existingUser) {
            const { error: profileError } = await supabaseAdmin
              .from('profiles')
              .update({ 
                role: 'agent', 
                producer_id: producerId 
              })
              .eq('id', existingUser.id);

            if (profileError) throw profileError;

            return NextResponse.json({ 
              success: true, 
              message: 'Usuário já possuía conta e foi promovido à sua equipe de portaria.',
              alreadyExists: true 
            });
          }
        }
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: data.user });
    
  } catch (err: any) {
    console.error('Erro na API de Convite:', err);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}