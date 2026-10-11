import { Card } from '@/components/ui/card';

export default function TicketsSkeleton() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-background py-10 px-4 sm:px-6 lg:px-8 relative transition-colors">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="h-10 bg-gray-200 dark:bg-slate-800 rounded-lg w-64 animate-pulse"></div>
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <Card key={i} className="overflow-hidden rounded-2xl shadow-sm border-gray-200 dark:border-border dark:bg-card">
              <div className="flex flex-col md:flex-row h-full">
                <div className="flex-1 p-6 md:p-8 space-y-4">
                  <div className="h-6 bg-gray-200 dark:bg-slate-800 rounded-md w-32 animate-pulse"></div>
                  <div className="h-8 bg-gray-200 dark:bg-slate-800 rounded-md w-3/4 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded-md w-1/2 animate-pulse"></div>
                  <div className="h-24 bg-gray-100 dark:bg-slate-900/50 rounded-xl mt-6 animate-pulse"></div>
                </div>
                <div className="hidden md:block w-px border-r-2 border-dashed border-gray-100 dark:border-slate-800"></div>
                <div className="p-6 md:p-8 md:w-[320px] flex justify-center items-center">
                  <div className="w-32 h-32 bg-gray-200 dark:bg-slate-800 rounded-xl animate-pulse"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
