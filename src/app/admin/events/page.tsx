"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SmartModal, { DialogConfig } from "../../../components/SmartModal";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  Calendar,
  Image as ImageIcon,
  Pencil,
  Trash2,
  Clock,
  ArrowLeft,
  PlusCircle,
} from "lucide-react";
import type { Tables } from '@/types/database.types';

export default function ManageEventsPage() {
  const router = useRouter();

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [events, setEvents] = useState<Tables<'events'>[]>([]);
  const [dialog, setDialog] = useState<DialogConfig | null>(null);
  const [isModalProcessing, setIsModalProcessing] = useState(false);
  const [userContext, setUserContext] = useState<{
    isAdmin: boolean;
    uid: string;
  } | null>(null);

  const fetchEvents = async (context = userContext) => {
    if (!context) return;

    let query = supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });

    if (!context.isAdmin) {
      query = query.eq("producer_id", context.uid);
    }

    const { data, error } = await query;
    if (!error && data) {
      setEvents(data);
    }
  };

  useEffect(() => {
    const checkAccess = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/");
        return;
      }

      const userId = session.user.id;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      const role = profile?.role || "customer";
      const admins =
        process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(",").map((e) => e.trim()) || [];
      const isAdmin =
        admins.includes(session.user.email || "") || role === "admin";

      if (!isAdmin && role !== "producer") {
        toast.error("Acesso negado.");
        router.push("/admin");
      } else {
        setAuthorized(true);
        
        const currentContext = { isAdmin, uid: userId };
        setUserContext(currentContext);
        fetchEvents(currentContext);
      }
      setIsCheckingAuth(false);
    };
    
    checkAccess();
  }, [router]);

  const handleEdit = (id: string) => {
    router.push(`/admin/events/new?id=${id}`);
  };

  const handleDeleteClick = (id: string) => {
    setDialog({
      isOpen: true,
      type: "confirm",
      title: "Excluir Evento",
      message:
        "Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita e afetará os ingressos vendidos.",
      confirmText: "Excluir Evento",
      onConfirm: () => executeDelete(id),
    });
  };

  const executeDelete = async (id: string) => {
    setIsModalProcessing(true);
    try {
      const { error } = await supabase.from("events").delete().eq("id", id);

      if (error) throw error;

      toast.success("Evento excluído com sucesso.");
      fetchEvents();
    } catch {
      toast.error(
        "Erro ao excluir evento. Verifique se há ingressos vinculados a ele.",
      );
    } finally {
      setIsModalProcessing(false);
      setDialog(null);
    }
  };

  const formatEventDate = (dateString: string) => {
    if (!dateString) return "Sem data definida";
    
    const dateObj = new Date(dateString);
    
    // Formato curto (mobile)
    const shortWeekday = dateObj.toLocaleDateString("pt-BR", { weekday: "short" });
    const capShortWeekday = shortWeekday.charAt(0).toUpperCase() + shortWeekday.slice(1).replace(".", "");
    const shortDate = dateObj.toLocaleDateString("pt-BR");
    
    // Formato longo (desktop)
    const longWeekday = dateObj.toLocaleDateString("pt-BR", { weekday: "long" });
    const capLongWeekday = longWeekday.charAt(0).toUpperCase() + longWeekday.slice(1);
    const longDate = dateObj.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

    const timeStr = dateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    return (
      <>
        <span className="max-[869px]:inline min-[870px]:hidden">
          {capShortWeekday}, {shortDate} às {timeStr}
        </span>
        <span className="hidden min-[870px]:inline">
          {capLongWeekday}, {longDate} às {timeStr}
        </span>
      </>
    );
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background transition-colors">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-500 mx-auto" />
          <p className="text-gray-500 dark:text-gray-400 font-medium transition-colors">
            Carregando painel de eventos...
          </p>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <main className="bg-gray-50 dark:bg-background py-10 px-4 sm:px-6 lg:px-8 grow flex flex-col items-center min-h-screen transition-colors">
      <SmartModal
        dialog={dialog}
        onClose={() => setDialog(null)}
        isProcessing={isModalProcessing}
      />

      <div className="w-full max-w-5xl space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-1 pb-1">
          <div>
            <Link
              href="/admin"
              className="text-sm font-medium text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 flex items-center transition-colors w-fit mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar ao Painel
            </Link>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight transition-colors">
              Gerenciar Eventos
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 transition-colors">
              Publique novos eventos, visualize, edite ou exclua os eventos
              publicados na plataforma.
            </p>
          </div>
          <Link href="/admin/events/new">
            <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold h-12 px-6 rounded-xl shadow-sm transition-all hover:scale-105 w-full sm:w-auto">
              <PlusCircle className="w-5 h-5 mr-2" /> Criar Novo Evento
            </Button>
          </Link>
        </div>

        <Card className="shadow-md border-0 dark:border dark:border-border rounded-3xl overflow-hidden transition-colors">
          <CardHeader className="bg-white dark:bg-card border-b border-gray-100 dark:border-border pb-6 transition-colors">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2 transition-colors">
                Eventos Publicados
                <Badge
                  variant="secondary"
                  className="bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-300 font-bold px-2.5 py-0.5 rounded-md ml-2 transition-colors"
                >
                  {events.length}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-1.5 transition-colors">
                Lista de todos os eventos ativos no sistema.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {events.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3 bg-gray-50 dark:bg-card transition-colors">
                <Calendar className="w-12 h-12 text-gray-300 dark:text-slate-700 transition-colors" />
                <p>Nenhum evento cadastrado ainda.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-border transition-colors">
                {events.map((evt) => (
                  <li
                    key={evt.id}
                    className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors group bg-white dark:bg-transparent"
                  >
                    <div className="flex items-start sm:items-center gap-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gray-100 dark:bg-slate-800 shrink-0 overflow-hidden border border-gray-200 dark:border-slate-700 flex items-center justify-center mt-1 sm:mt-0 transition-colors">
                        {evt.image_url ? (
                          <img
                            src={evt.image_url}
                            alt="Capa"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-gray-300 dark:text-slate-600 transition-colors" />
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100 line-clamp-2 sm:line-clamp-1 text-lg transition-colors">
                          {evt.title}
                        </h3>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 transition-colors">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            {formatEventDate(evt.event_date)}
                          </span>
                          <Badge
                            variant="outline"
                            className={`transition-colors ${
                              Number(evt.price) === 0
                                ? "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20"
                                : "text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-500/10 dark:border-green-500/20"
                            }`}
                          >
                            {Number(evt.price) === 0
                              ? "Gratuito"
                              : `R$ ${Number(evt.price).toFixed(2).replace(".", ",")}`}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 mt-2 sm:mt-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleEdit(evt.id)}
                        className="font-bold h-10 px-4 transition-colors"
                      >
                        <Pencil className="w-4 h-4 mr-2" /> Editar
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(evt.id)}
                        className="font-bold h-10 px-4 bg-red-50 text-red-600 border border-red-100 hover:bg-red-600 hover:text-white dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 dark:hover:bg-red-600 dark:hover:text-white shadow-none transition-colors"
                      >
                        <Trash2 className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Excluir</span>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}