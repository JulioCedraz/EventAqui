import Link from 'next/link';

interface EventCardProps {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  price: number;
  image_url: string | null;
}

export default function EventCard({ id, title, description, event_date, price, image_url }: EventCardProps) {
  
  const dateObj = new Date(event_date);
  const formattedDate = dateObj.toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short'
  }).replace('.', '').toUpperCase();
  
  const formattedTime = dateObj.toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit'
  });

  const formattedPrice = price === 0 
    ? 'Grátis' 
    : `R$ ${price.toFixed(2).replace('.', ',')}`;

  return (
    <Link 
      href={`/evento/${id}`} 
      className="group h-full flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300"
    >
      <div className="relative w-full aspect-[16/9] bg-gray-100 overflow-hidden">
        {image_url ? (
          <img 
            src={image_url} 
            alt={title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-in-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-300">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5 flex flex-col flex-grow">
        
        <h3 className="text-lg font-bold text-gray-900 leading-tight line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>

        <p className="text-sm text-gray-600 font-medium mb-1">
          {formattedDate} • {formattedTime}
        </p>

        {description && (
          <p className="text-sm text-gray-500 line-clamp-1 mb-4">
            {description}
          </p>
        )}

        <div className="mt-auto pt-2">
          <span className="text-base font-bold text-gray-900">
            {formattedPrice}
          </span>
        </div>
      </div>
    </Link>
  );
}