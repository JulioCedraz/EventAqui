import { Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EmptyTickets({ onExplore }: { onExplore: () => void }) {
  return (
    <div className="mt-12 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="w-32 h-32 bg-blue-50 dark:bg-blue-500/5 rounded-full flex items-center justify-center mb-6 transition-colors shadow-inner">
        <Ticket className="w-12 h-12 text-blue-300 dark:text-blue-500/40 transition-colors" />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 transition-colors">Seu histórico está vazio</h3>
      <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md text-lg transition-colors">
        Você ainda não garantiu ingressos para nenhum evento. Explore a plataforma e encontre a sua próxima experiência!
      </p>
      <Button onClick={onExplore} size="lg" className="font-bold rounded-2xl h-14 px-8 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 transition-all hover:scale-105">
        Explorar Eventos
      </Button>
    </div>
  );
}
