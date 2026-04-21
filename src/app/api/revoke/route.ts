import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch (error) { }
          },
        },
      }
    );

    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user: requester }, error: authError } = token 
      ? await supabase.auth.getUser(token) 
      : await supabase.auth.getUser();

    if (authError || !requester) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const requesterRole = requester.user_metadata?.role || requester.app_metadata?.role || 'customer';
    const requesterEmail = requester.email;
    
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
    const isAdmin = adminEmails.includes(requesterEmail || '') || requesterRole === 'admin';

    if (!isAdmin && requesterRole !== 'producer') {
      return NextResponse.json({ error: 'Permissão insuficiente.' }, { status: 403 });
    }

    const { targetUserId } = await request.json();

    if (!targetUserId) {
      return NextResponse.json({ error: 'ID do usuário alvo não fornecido.' }, { status: 400 });
    }

    if (!isAdmin) {
      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('producer_id')
        .eq('id', targetUserId)
        .single();
        
      if (targetProfile?.producer_id !== requester.id) {
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

  } catch (err: any) {
    console.error('Erro na API de Revogação:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}