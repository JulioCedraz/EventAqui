import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getRequestUser } from '@/lib/auth';
import { sendGuestClaimedEmail } from '@/lib/mail';
import { validateCPF } from '@/lib/cpf';

type RouteContext = { params: Promise<{ id: string }> };

type GuestWithTicket = {
  id: string;
  ticket_id: string;
  guest_email: string;
  guest_cpf: string;
  is_claimed: boolean | null;
  claimed_by_user_id: string | null;
  tickets: {
    buyer_name: string;
    event_id: string;
    payment_status: string | null;
    events: { title: string; image_url: string | null; event_date: string | null } | null;
  } | null;
};

const editSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().pipe(z.email().max(254)),
  cpf: z.string().trim().refine(validateCPF),
  phone: z.string().trim().max(20).optional(),
});

const onlyDigits =(value?: string | null) => (value ?? '').replace(/\D/g, '');
const normalizeEmail = (value?: string | null) => (value ?? '').trim().toLowerCase();

function maskEmail(email: string) {
  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}***@${domain}`;
}

async function loadGuest(id: string) {
  if (!z.uuid().safeParse(id).success) return null;

  const { data } = await supabaseAdmin
    .from('guests')
    .select('id, ticket_id, guest_email, guest_cpf, is_claimed, claimed_by_user_id, tickets(buyer_name, event_id, payment_status, events(title, image_url, event_date))')
    .eq('id', id)
    .single();

  return data as GuestWithTicket | null;
}

// O convidado é reconhecido pelo e-mail ou pelo CPF que o comprador cadastrou.
async function isInvitedUser(user: User, guest: GuestWithTicket) {
  if (normalizeEmail(user.email) === normalizeEmail(guest.guest_email)) return true;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('cpf')
    .eq('id', user.id)
    .single();

  const userCpf = onlyDigits(profile?.cpf);
  return userCpf.length > 0 && userCpf === onlyDigits(guest.guest_cpf);
}

// Dados públicos do convite: nada de CPF e e-mail apenas mascarado.
export async function GET(request: Request, { params }: RouteContext) {
  const guest = await loadGuest((await params).id);
  if (!guest?.tickets) return NextResponse.json({ error: 'Convite não encontrado.' }, { status: 404 });

  const user = await getRequestUser(request);

  return NextResponse.json({
    isClaimed: Boolean(guest.is_claimed),
    claimedByMe: Boolean(user && guest.claimed_by_user_id === user.id),
    isPaid: guest.tickets.payment_status === 'approved',
    isMismatch: user ? !(await isInvitedUser(user, guest)) : false,
    guestEmailHint: maskEmail(guest.guest_email),
    buyerName: guest.tickets.buyer_name,
    event: guest.tickets.events,
  });
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const user = await getRequestUser(request);
    if (!user?.email) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const guest = await loadGuest((await params).id);
    if (!guest?.tickets) return NextResponse.json({ error: 'Convite não encontrado.' }, { status: 404 });

    if (guest.tickets.payment_status !== 'approved') {
      return NextResponse.json({ error: 'O ingresso do comprador ainda não foi pago.' }, { status: 409 });
    }

    if (!(await isInvitedUser(user, guest))) {
      return NextResponse.json({ error: 'Esta conta não corresponde ao convidado cadastrado.' }, { status: 403 });
    }

    // Marca como resgatado primeiro: só uma requisição concorrente passa deste ponto.
    const { data: claimed } = await supabaseAdmin
      .from('guests')
      .update({ is_claimed: true, claimed_by_user_id: user.id })
      .eq('id', guest.id)
      .eq('is_claimed', false)
      .select('id')
      .maybeSingle();

    if (!claimed) return NextResponse.json({ error: 'Este convite já foi resgatado.' }, { status: 409 });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    const buyerName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Convidado';

    const { data: newTicket, error: insertError } = await supabaseAdmin
      .from('tickets')
      .insert({
        event_id: guest.tickets.event_id,
        user_id: user.id,
        buyer_name: buyerName,
        buyer_email: user.email,
        payment_status: 'approved',
        quantity: 1,
        is_used: false,
        amount_cents: 0,
        payment_method: 'free',
      })
      .select('id')
      .single();

    if (insertError || !newTicket) {
      await supabaseAdmin
        .from('guests')
        .update({ is_claimed: false, claimed_by_user_id: null })
        .eq('id', guest.id);
      throw insertError;
    }

    // Desmembra o lote do comprador: a segunda vaga agora é do convidado.
    await supabaseAdmin.from('tickets').update({ quantity: 1 }).eq('id', guest.ticket_id);

    await sendGuestClaimedEmail(user.email, profile?.first_name || 'Convidado', guest.tickets.events?.title ?? 'Evento', newTicket.id)
      .catch((error) => console.error('Falha ao enviar e-mail do convidado:', error));

    return NextResponse.json({ success: true, ticketId: newTicket.id });
  } catch (error) {
    console.error('Erro no resgate do convidado:', error);
    return NextResponse.json({ error: 'Erro interno ao resgatar o ingresso.' }, { status: 500 });
  }
}

// Edição única dos dados do convidado, só pelo comprador e antes do resgate.
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const id = (await params).id;
    if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: 'Convite não encontrado.' }, { status: 404 });

    const parsed = editSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos. Confira nome, e-mail e CPF.' }, { status: 400 });

    const { data: guest } = await supabaseAdmin
      .from('guests')
      .select('id, buyer_id, is_claimed, has_been_edited')
      .eq('id', id)
      .maybeSingle();

    if (!guest || guest.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Convite não encontrado.' }, { status: 404 });
    }
    if (guest.is_claimed || guest.has_been_edited) {
      return NextResponse.json({ error: 'Os dados deste convidado não podem mais ser alterados.' }, { status: 409 });
    }

    const { name, email, cpf, phone } = parsed.data;

    // Filtros repetidos no update: duas edições concorrentes não passam juntas.
    const { data: updated, error } = await supabaseAdmin
      .from('guests')
      .update({
        guest_name: name,
        guest_email: email,
        guest_cpf: cpf,
        guest_phone: phone || null,
        has_been_edited: true,
      })
      .eq('id', guest.id)
      .eq('is_claimed', false)
      .eq('has_been_edited', false)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!updated) return NextResponse.json({ error: 'Os dados deste convidado não podem mais ser alterados.' }, { status: 409 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao editar convidado:', error);
    return NextResponse.json({ error: 'Erro interno ao atualizar o convidado.' }, { status: 500 });
  }
}
