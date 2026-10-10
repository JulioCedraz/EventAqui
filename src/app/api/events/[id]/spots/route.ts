import { NextResponse } from 'next/server';
import { z } from 'zod';
import { countSpots, getActiveTickets } from '@/lib/tickets';

type RouteContext = { params: Promise<{ id: string }> };

// Público: devolve só o total de vagas ocupadas, sem dados de compradores.
export async function GET(_request: Request, { params }: RouteContext) {
  const parsed = z.uuid().safeParse((await params).id);
  if (!parsed.success) return NextResponse.json({ error: 'Evento inválido.' }, { status: 400 });

  const sold = countSpots(await getActiveTickets(parsed.data));
  return NextResponse.json({ sold });
}
