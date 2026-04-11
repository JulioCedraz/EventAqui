import { createClient } from '@supabase/supabase-js';
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

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { 
        role: 'agent',
        invited_by: producerId 
      }
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: data.user });
    
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}