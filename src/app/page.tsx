'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import EventCard from '../components/EventCard';
import { Database } from '../types/database.types';

type Event = Database['public']['Tables']['events']['Row'];

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) {
        console.error('Erro ao buscar eventos:', error);
      } else {
        setEvents(data || []);
      }
      
      setLoading(false);
    };

    fetchEvents();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center">
      
      <section className="w-full bg-blue-600 text-white py-16 px-4 text-center">
        <div className="max-w-3xl mx-auto space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Encontre os melhores eventos
          </h1>
          <p className="text-lg md:text-xl text-blue-100">
            Compre seus ingressos de forma rápida, segura e com aprovação via PIX na mesma hora.
          </p>
        </div>
      </section>

      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-grow">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Próximos Eventos</h2>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-200 text-center">
            <p className="text-gray-500 text-lg">Nenhum evento disponível no momento.</p>
            <p className="text-gray-400 text-sm mt-2">Volte novamente mais tarde!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
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