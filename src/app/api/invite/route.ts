import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getRequestUser, getUserRole } from '@/lib/auth';
import { SITE_URL } from '@/lib/site';

const optionalText = z.string().trim().max(200).optional();

const bodySchema = z.object({
  email: z.email().max(254),
  role: z.enum(['admin', 'producer', 'agent', 'customer']),
  producerId: z.uuid().optional(),
  fullName: optionalText,
  firstName: optionalText,
  lastName: optionalText,
  cpf: optionalText,
  occupation: optionalText,
  birthDate: optionalText,
  university: optionalText,
  course: optionalText,
  area: optionalText,
  specialty: optionalText,
});

// Produtores só podem recrutar quem ainda não tem papel administrativo.
const RECRUITABLE_ROLES = ['customer', 'agent'];

export async function POST(request: Request) {
  try {
    const requester = await getRequestUser(request);
    if (!requester) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const { role: requesterRole, isAdmin } = await getUserRole(requester);

    if (!isAdmin && requesterRole !== 'producer') {
      return NextResponse.json({ error: 'Permissão insuficiente.' }, { status: 403 });
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });

    const { role, producerId, fullName, firstName, lastName, cpf, occupation, birthDate, university, course, area, specialty } = parsed.data;
    const email = parsed.data.email.toLowerCase();

    if (!isAdmin && role !== 'agent') {
      return NextResponse.json({ error: 'Produtores só podem convidar agentes.' }, { status: 403 });
    }

    const finalProducerId = role === 'agent'
      ? (isAdmin ? producerId || requester.id : requester.id)
      : null;

    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('email', email)
      .maybeSingle();

    if (existingUser && !isAdmin && !RECRUITABLE_ROLES.includes(existingUser.role ?? 'customer')) {
      return NextResponse.json({ error: 'Este usuário não pode ser convidado como agente.' }, { status: 403 });
    }

    let userId = existingUser?.id;

    if (!userId) {
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name: fullName,
          first_name: firstName || (fullName ? fullName.split(' ')[0] : ''),
          last_name: lastName || (fullName ? fullName.split(' ').slice(1).join(' ') : ''),
          cpf: cpf || null,
          occupation: occupation || null,
          birth_date: birthDate || null,
          university: university || null,
          course: course || null,
          area: area || null,
          specialty: specialty || null,
        },
        redirectTo: `${SITE_URL}/profile?invite=true`
      });

      if (inviteError || !inviteData.user) throw inviteError;
      userId = inviteData.user.id;
    }

    // O papel é gravado pelo servidor, nunca pelo metadata do cadastro.
    const rolePayload = { role, producer_id: finalProducerId };

    const { error: profileError } = await supabaseAdmin.from('profiles').update(rolePayload).eq('id', userId);
    if (profileError) throw profileError;

    if (existingUser) {
      return NextResponse.json({
        success: true,
        message: `Usuário promovido a ${role} com sucesso!`,
        alreadyExists: true
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro na API de Convites:', error);
    return NextResponse.json({ error: 'Erro interno ao enviar o convite.' }, { status: 500 });
  }
}
