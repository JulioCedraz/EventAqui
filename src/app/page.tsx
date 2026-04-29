'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import EventCard from '../components/EventCard';
import { Database } from '../types/database.types';
import { Loader2, CalendarSearch } from 'lucide-react';
import { toast } from 'sonner';

type Event = Database['public']['Tables']['events']['Row'];

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .order('event_date', { ascending: true });

        if (error) throw error;
        setEvents(data || []);
      } catch (error) {
        console.error('Erro ao buscar eventos:', error);
        toast.error('Não foi possível carregar os eventos no momento. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-background flex flex-col items-center animate-in fade-in duration-500 transition-colors">
      
      <section className="w-full bg-blue-600 dark:bg-blue-950 text-white py-16 px-4 text-center transition-colors">
        <div className="max-w-3xl mx-auto space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight animate-in slide-in-from-bottom-4 duration-700">
            Encontre os melhores eventos
          </h1>
          <p className="text-lg md:text-xl text-blue-100 dark:text-blue-200 animate-in slide-in-from-bottom-5 duration-700 delay-150 fill-mode-both">
            Compre seus ingressos de forma rápida, segura e com aprovação via PIX na mesma hora.
          </p>
        </div>
      </section>

      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grow flex flex-col">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight transition-colors">Próximos Eventos</h2>
        </div>

        {loading ? (
          <div className="flex flex-col grow justify-center items-center py-20 text-gray-400 dark:text-gray-500">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-500 mb-4" />
            <p className="font-medium animate-pulse">Buscando eventos disponíveis...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white dark:bg-card p-12 rounded-3xl shadow-sm border border-gray-100 dark:border-border text-center flex flex-col items-center justify-center animate-in zoom-in-95 duration-500 transition-colors">
            <div className="h-20 w-20 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center mb-6 transition-colors">
              <CalendarSearch className="h-10 w-10 text-blue-500 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 transition-colors">Nenhum evento por aqui</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto transition-colors">
              No momento não temos ingressos disponíveis, mas estamos preparando novidades incríveis. Volte novamente mais tarde!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 animate-in slide-in-from-bottom-8 duration-700">
            {events.map((event) => (
              <EventCard 
                key={event.id}
                id={event.id}
                title={event.title}
                description={event.description}
                event_date={event.event_date}
                price={event.price}
                image_url={event.image_url}
              />
            ))}
          </div>
        )}
      </section>

    </main>
  );
}