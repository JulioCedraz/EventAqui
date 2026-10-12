'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import SmartModal from '@/components/SmartModal';
import { Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { useEventForm } from './_hooks/useEventForm';
import { useCouponManager } from './_hooks/useCouponManager';
import { EventDetailsCard } from './_components/EventDetailsCard';
import { CouponsCard } from './_components/CouponsCard';

function EventForm() {
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const form = useEventForm(editId);
  const couponManager = useCouponManager({
    editId,
    currentUserId: form.currentUserId,
    coupons: form.coupons,
    setCoupons: form.setCoupons,
  });

  if (form.isCheckingAuth || form.isLoadingEvent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-background transition-colors space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-500" />
        <p className="text-gray-500 dark:text-gray-400 font-medium transition-colors">Carregando formulário...</p>
      </div>
    );
  }

  return (
    <main className="bg-gray-50 dark:bg-background py-10 px-4 sm:px-6 lg:px-8 grow flex flex-col items-center min-h-screen transition-colors">
      <SmartModal
        dialog={couponManager.dialog}
        onClose={couponManager.closeDialog}
        isProcessing={couponManager.isModalProcessing}
      />
      <div className="w-full max-w-4xl space-y-8">

        <div className="pt-1 pb-1">
          <Link href="/admin/events" className="text-sm font-medium text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 flex items-center transition-colors w-fit mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Link>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight transition-colors">
            {editId ? 'Editar Evento' : 'Novo Evento'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 transition-colors">
            {editId ? 'Ajuste as informações deste evento e gerencie seus cupons de desconto.' : 'Preencha os detalhes abaixo para criar um novo evento na plataforma.'}
          </p>
        </div>

        <form onSubmit={form.handleSubmit} className="space-y-6">
          <EventDetailsCard
            isEditing={!!editId}
            values={form.values}
            update={form.update}
            imageError={form.imageError}
            onImageChange={form.handleImageChange}
          />

          {!form.values.isFree && <CouponsCard manager={couponManager} />}

          <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-3 transition-colors">
            <Link href="/admin/events" className="w-full sm:w-auto">
              <Button type="button" variant="outline" className="w-full sm:w-auto h-12 px-6 rounded-xl font-bold">
                Cancelar
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={form.loading}
              className="w-full sm:w-auto h-12 px-8 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 shadow-md shadow-blue-600/20 text-white transition-colors"
            >
              {form.loading ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processando</>
              ) : editId ? (
                <><CheckCircle2 className="w-5 h-5 mr-2" /> Salvar Alterações</>
              ) : (
                <><CheckCircle2 className="w-5 h-5 mr-2" /> Publicar Evento</>
              )}
            </Button>
          </div>
        </form>

      </div>
    </main>
  );
}

export default function NewEventPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background transition-colors">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-500" />
      </div>
    }>
      <EventForm />
    </Suspense>
  );
}
