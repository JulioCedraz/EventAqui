import { NextResponse } from 'next/server';
import { sendGuestClaimedEmail } from '@/lib/mail';

export async function POST(request: Request) {
  try {
    const { email, name, eventTitle, newTicketId } = await request.json();
    await sendGuestClaimedEmail(email, name, eventTitle, newTicketId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Falha ao enviar' }, { status: 500 });
  }
}
