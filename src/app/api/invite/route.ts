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
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch (error) { }
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
    const requesterId = requester.id;
    const requesterEmail = requester.email;

    const body = await request.json();
    const { 
      email, role, producerId, fullName, firstName, lastName, 
      cpf, occupation, birthDate, university, course, area, specialty 
    } = body;

    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
    const isAdmin = adminEmails.includes(requesterEmail || '') || requesterRole === 'admin';

    if (!isAdmin && requesterRole !== 'producer') {
      return NextResponse.json({ error: 'Permissão insuficiente.' }, { status: 403 });
    }

    if (!isAdmin && requesterRole === 'producer' && role !== 'agent') {
      return NextResponse.json({ error: 'Produtores só podem convidar agentes.' }, { status: 403 });
    }

    let finalProducerId = null;
    if (role === 'agent') {
      finalProducerId = isAdmin ? (producerId || requesterId) : requesterId;
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const redirectToUrl = `${origin}/profile?invite=true`;
    
    const metaData: any = { 
        full_name: fullName || '',
        first_name: firstName || (fullName ? fullName.split(' ')[0] : ''),
        last_name: lastName || (fullName ? fullName.split(' ').slice(1).join(' ') : ''),
        cpf: cpf || null,
        occupation: occupation || null,
        role: role,
        birth_date: birthDate || null,
        university: university || null,
        course: course || null,
        area: area || null,
        specialty: specialty || null
     };
    if (finalProducerId) metaData.producer_id = finalProducerId;

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: metaData,
      redirectTo: redirectToUrl
    });

    if (inviteError) {
      if (inviteError.message.includes('already registered') || inviteError.status === 422) {
        // Busca o ID do usuário pelo e-mail
        const { data: existingUser } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', email.toLowerCase())
          .single();

        if (existingUser) {
          // Envia somente a role e o producer_id
          const safeUpdatePayload = {
            role: role,
            producer_id: finalProducerId
          };

          await supabaseAdmin.from('profiles').update(safeUpdatePayload).eq('id', existingUser.id);
          // Altera a role e producer_id e mantém os outros metadados.
          await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
            user_metadata: safeUpdatePayload
          });

          return NextResponse.json({ 
            success: true, 
            message: `Usuário promovido a ${role} com sucesso!`,
            alreadyExists: true 
          });
        }
      }
      throw inviteError;
    }

    return NextResponse.json({ success: true, user: inviteData.user });

  } catch (err: any) {
    console.error('Erro na API de Convites:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}