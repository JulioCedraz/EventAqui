import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageIcon, CalendarDays, Ticket } from "lucide-react";

interface EventCardProps {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  price: number;
  image_url: string | null;
}

export default function EventCard({ id, title, description, event_date, price, image_url }: EventCardProps) {
  
  let dateDisplay = 'Sem data definida';

  if (event_date) {
    const dateObj = new Date(event_date);
    const formattedDate = dateObj.toLocaleDateString('pt-BR', {
      weekday: 'short', day: '2-digit', month: 'short'
    }).replace('.', '').toUpperCase();
    
    const formattedTime = dateObj.toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit'
    });

    dateDisplay = `${formattedDate} • ${formattedTime}`;
  }

  const isFree = price === 0;
  const formattedPrice = isFree 
    ? 'Grátis' 
    : `R$ ${price.toFixed(2).replace('.', ',')}`;

  return (
    <Link 
      href={`/evento/${id}`} 
      className="group block h-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
    >
      <Card className="h-full flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-800">
        
        <div className="relative w-full aspect-video bg-muted overflow-hidden">
          {image_url ? (
            <img 
              src={image_url} 
              alt={title} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-blue-50/50 dark:bg-slate-800/50 text-blue-200 dark:text-slate-600 transition-colors">
              <ImageIcon className="w-12 h-12" />
            </div>
          )}
        </div>

        <CardHeader className="p-4 sm:p-5 pb-3">
          <CardTitle className="text-lg font-bold leading-tight line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {title}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-0 flex flex-col grow gap-3">
          <div className="flex items-center text-sm font-medium text-muted-foreground">
            <CalendarDays className="w-4 h-4 mr-2 shrink-0 text-gray-400 dark:text-gray-500 transition-colors" />
            <span>{dateDisplay}</span>
          </div>

          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
          )}
        </CardContent>

        <CardFooter className="p-4 sm:p-5 pt-0 mt-auto">
          <div className="flex items-center font-extrabold text-lg">
            <Ticket className={`w-5 h-5 mr-2 transition-colors ${isFree ? 'text-green-500 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`} />
            
            <span className={`transition-colors ${isFree ? "text-green-600 dark:text-emerald-400" : "text-foreground"}`}>
              {formattedPrice}
            </span>
          </div>
        </CardFooter>

      </Card>
    </Link>
  );
}