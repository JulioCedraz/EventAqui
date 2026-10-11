'use client';

import { toast } from 'sonner';
import { Calendar, DollarSignIcon, Image as ImageIcon, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatBRL } from '@/lib/utils';
import type { EventRow } from '../types';

function EventDate({ dateString }: { dateString: string }) {
  const dateObj = new Date(dateString);
  const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
  const capWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const longDate = dateObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  const shortDate = dateObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '');
  const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col gap-0.5">
      <span className="capitalize text-gray-900 dark:text-gray-100 transition-colors">{capWeekday}</span>
      <span className="md:hidden text-blue-600 dark:text-blue-400 font-extrabold transition-colors">{shortDate}</span>
      <span className="hidden md:block text-blue-600 dark:text-blue-400 font-extrabold transition-colors">{longDate}</span>
      <span className="text-gray-600 dark:text-gray-400 transition-colors">{timeStr}</span>
    </div>
  );
}

export function EventCover({ event }: { event: EventRow }) {
  if (!event.image_url) {
    return (
      <div className="w-full h-64 md:h-100 bg-linear-to-br from-blue-600 to-indigo-800 dark:from-slate-800 dark:to-slate-900 flex flex-col items-center justify-center text-white/50 transition-colors">
        <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
        <span className="font-bold text-xl tracking-widest uppercase">Sem Imagem</span>
      </div>
    );
  }

  return (
    <div className="w-full relative bg-muted">
      <img
        src={event.image_url}
        alt={`Capa do evento ${event.title}`}
        className="w-full h-auto block"
      />
      <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
    </div>
  );
}

export function EventInfo({ event }: { event: EventRow }) {
  const isFreeEvent = event.price === 0;

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `Confira este evento incrível na EventAqui: ${event.title}`,
          url,
        });
      } catch (error) {
        console.log('Compartilhamento cancelado ou falhou', error);
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link do evento copiado para a área de transferência!');
    } catch {
      toast.error('Não foi possível copiar o link.');
    }
  };

  return (
    <>
      <div className="flex justify-between items-start gap-4 mb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight leading-tight transition-colors">
          {event.title}
        </h1>
        <Button
          variant="outline"
          size="icon"
          onClick={handleShare}
          title="Compartilhar evento"
          className="shrink-0 rounded-full h-10 w-10 text-blue-600 bg-blue-50/50 border-blue-200 shadow-sm shadow-blue-500/20 hover:scale-105 hover:shadow-md hover:shadow-blue-500/30 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-500/10 dark:border-blue-500/30 dark:hover:bg-blue-500/20 transition-all duration-300"
        >
          <Share2 className="w-5 h-5" />
        </Button>
      </div>

      <p className="text-gray-600 dark:text-gray-400 mb-10 whitespace-pre-wrap text-lg leading-relaxed transition-colors">
        {event.description}
      </p>

      <div className="bg-gray-50 dark:bg-slate-900/50 rounded-2xl p-6 md:p-8 mb-10 border border-gray-100 dark:border-slate-800/50 flex flex-col md:flex-row gap-6 md:gap-12 transition-colors">
        <div className="flex items-start gap-4 flex-1">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center shrink-0 mt-1 transition-colors">
            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400 transition-colors" />
          </div>
          <div>
            <span className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider transition-colors">Data e Hora</span>
            <div className="text-lg font-bold leading-tight">
              {event.event_date ? <EventDate dateString={event.event_date} /> : 'Sem data definida'}
            </div>
          </div>
        </div>

        <div className="w-px bg-gray-200 dark:bg-slate-800 hidden md:block transition-colors"></div>
        <div className="h-px w-full bg-gray-200 dark:bg-slate-800 md:hidden transition-colors"></div>

        <div className="flex items-start gap-4 flex-1">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center shrink-0 mt-1 transition-colors">
            <DollarSignIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400 transition-colors" />
          </div>
          <div>
            <span className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider transition-colors">
              Valor do Ingresso
            </span>
            <span className="block text-2xl text-emerald-600 dark:text-emerald-400 font-black tracking-tight transition-colors">
              {isFreeEvent ? 'Gratuito' : formatBRL(event.price)}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
