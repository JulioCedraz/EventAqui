"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { supabase } from "../../lib/supabase";
import type { User } from "@supabase/supabase-js";
import {
  ArrowRight,
  Zap,
  QrCode,
  ShieldCheck,
  Sun,
  Moon,
  ChevronDown,
  Menu,
  X,
  HeartHandshake,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProducersLandingPage() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setIsAuthLoading(false);
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const faqs = [
    {
      question: "A plataforma cobra alguma taxa sobre os ingressos?",
      answer: "Não. A EventAqui é uma iniciativa gratuita para suporte em eventos estudantis e não é cobrada nenhuma taxa de serviço pelo uso do sistema."
    },
    {
      question: "É obrigatório ter uma conta no Mercado Pago?",
      answer: "Para você receber valores, sim. A infraestrutura de pagamentos desta plataforma foi arquitetada para o uso da API de Checkout do Mercado Pago."
    },
    {
      question: "O Mercado Pago cobra alguma taxa?",
      answer: "Sim. A taxa padrão de processamento do próprio Mercado Pago para Pix com QR code dinâmico é de 0,99% (aproximadamente 1%) por transação."
    },
    {
      question: "Como eu recebo o dinheiro das minhas vendas?",
      answer: "De forma direta e instantânea. Nossa arquitetura conecta a sua conta pessoal do Mercado Pago à sua conta da EventAqui e vincula a todos os eventos organizados por você. Quando um cliente realiza o PIX, o valor é creditado imediatamente no seu saldo. Lembrando que haverá desconto de 1% do valor pela taxa de transação do Mercado Pago. A responsabilidade é inteiramente sua. A EventAqui não retém nenhum valor."
    },
    {
      question: "Como minha equipe valida a entrada das pessoas no evento?",
      answer: "No painel administrativo, clique em 'Equipe de Portaria', informe o e-mail da pessoa que você quer designar como seu agente de portaria, depois clique em 'Convidar Agente' para habilitar aquele e-mail com o acesso ao leitor de QR Code de validação dos ingressos. Com o próprio celular, o agente acessa o Scanner de Check-in, lê o QR Code da pessoa, a catraca virtual fica verde. É rápido e antifraude."
    },
    {
      question: "Como faço para liberar meu acesso como produtor/organizador?",
      answer: (
        <>
          Para manter a integridade da plataforma e evitar fraudes, novos produtores não são ativados automaticamente. Crie a sua conta de usuário e, em seguida, envie um e-mail para <span className="font-black">eventaqui@gmail.com</span> se identificando e com as informações do seu evento para solicitar o acesso às ferramentas de criação.
        </>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">
      <header className="fixed top-0 w-full z-50">
        <div className="relative z-50 w-full border-b border-gray-200 dark:border-border bg-white/95 dark:bg-background/95 backdrop-blur-md transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/" className="group">
                <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-500 tracking-tighter hover:opacity-80 transition-opacity">
                  EventAqui
                </span>
              </Link>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 cursor-default">
                Produtor
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-2 sm:gap-4">
              <Button
                asChild
                variant="ghost"
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
              >
                <Link href="#como-funciona">
                  Como Funciona
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
              >
                <Link href="#faq">
                  Dúvidas Frequentes
                </Link>
              </Button>

              {mounted ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setTheme(resolvedTheme === "dark" ? "light" : "dark")
                  }
                  className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                  title="Alternar tema"
                >
                  {resolvedTheme === "dark" ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </Button>
              ) : (
                <div className="w-9 h-9" />
              )}

              <Button asChild className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold rounded-full px-5 min-w-42.5">
                <Link href={user ? "/" : "/login"}>
                  {isAuthLoading ? "Carregando..." : (user ? "Acessar Plataforma" : "Já tem conta? Acesse")}
                </Link>
              </Button>
            </nav>

            <div className="flex md:hidden items-center gap-2">
              {mounted ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setTheme(resolvedTheme === "dark" ? "light" : "dark")
                  }
                  className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {resolvedTheme === "dark" ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </Button>
              ) : (
                <div className="w-9 h-9" />
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-600 dark:text-gray-300"
              >
                {isMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <div
          className={`absolute left-0 w-full z-40 border-b border-gray-100 dark:border-border bg-white dark:bg-background shadow-lg transition-transform duration-300 ease-in-out md:hidden ${
            isMenuOpen ? "translate-y-0" : "-translate-y-full"
          }`}
          style={{ top: "100%" }}
        >
          <nav className="px-4 pt-2 pb-6 flex flex-col gap-2">
            <Button
              asChild
              variant="ghost"
              className="w-full justify-start text-left text-gray-700 dark:text-gray-300 font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              <Link href="#como-funciona">
                Como Funciona
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="w-full justify-start text-left text-gray-700 dark:text-gray-300 font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              <Link href="#faq">
                Dúvidas Frequentes
              </Link>
            </Button>
            <Button
              asChild
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold mt-2"
              onClick={() => setIsMenuOpen(false)}
            >
                <Link href={user ? "/" : "/login"}>
                  {isAuthLoading ? "Carregando..." : (user ? "Acessar Plataforma" : "Já tem conta? Acesse")}
                </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="pt-32 pb-20 lg:pt-40 lg:pb-24 overflow-hidden relative border-b border-gray-200 dark:border-border transition-colors">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-blue-400/20 dark:bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h1 className="text-5xl lg:text-7xl font-black tracking-tighter leading-[1.05] text-gray-900 dark:text-white animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 transition-colors">
              Promova, divulgue e gerencie <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-400">
                os eventos de sua faculdade!
              </span>
            </h1>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-200 border border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400 text-sm font-bold tracking-wide animate-in fade-in slide-in-from-bottom-4 duration-700 transition-colors">
              <HeartHandshake className="w-4 h-4 fill-blue-600/50 dark:fill-blue-400/50" />
              <span>Plataforma gratuita com foco em eventos acadêmicos</span>
            </div>
            <br />
            <div className="inline-flex items-center gap-8">
              <Image
                src="/pix.svg"
                alt="Pix"
                width={120}
                height={40}
                className="h-10 w-auto object-contain block drop-shadow-sm"
              />
              <Image
                src="/mercado-pago.svg"
                alt="Mercado Pago"
                width={160}
                height={64}
                className="h-16 w-auto object-contain block dark:hidden drop-shadow-sm"
              />
              <Image
                src="/mercado-pago-dark.png"
                alt="Mercado Pago"
                width={160}
                height={64}
                className="h-16 w-auto object-contain hidden dark:block drop-shadow-sm"
              />
            </div>

            <p className="text-xl text-gray-600 dark:text-gray-400 font-medium leading-relaxed max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 transition-colors">
              Um sistema focado em redução máxima de custos operacionais.
              Tenha total controle de acesso ao seu evento usando o nosso validador de ingressos via QR Code.
              Os pagamentos vão diretamente para sua conta bancária do Mercado Pago.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
              <Button asChild className="w-full sm:w-auto h-14 px-8 text-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-black rounded-2xl shadow-md transition-all hover:-translate-y-1">
                <Link href="#como-funciona">
                  Ver como funciona
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <section id="como-funciona" className="py-24 bg-white dark:bg-background relative transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16 md:text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900 dark:text-white mb-4 transition-colors">
              Um guia rápido de uso
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 font-medium transition-colors">
              A EventAqui foi desenhada para ser intuitiva. Veja como é simples estruturar a venda e a portaria do seu próximo evento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
            <div className="bg-gray-50 dark:bg-card border border-gray-100 dark:border-border p-8 rounded-3xl hover:shadow-lg dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all group">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 tracking-tight transition-colors">
              Cadastro e Aprovação
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium text-sm transition-colors">
                Para manter a comunidade segura, o acesso como produtor/organizador é moderado. Você cria a sua conta gratuitamente e solicita a autorização via e-mail.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-card border border-gray-100 dark:border-border p-8 rounded-3xl hover:shadow-lg dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all group">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 tracking-tight transition-colors">
              Integração Financeira
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium text-sm transition-colors">
                Vincule sua conta do Mercado Pago através de seu painel administrativo para receber pela venda de seus ingressos. Os ingressos são vendidos via PIX e você recebe imediatamente. Taxa de 1% por cada pagamento aprovado.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-card border border-gray-100 dark:border-border p-8 rounded-3xl hover:shadow-lg dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all group">
              <div className="w-12 h-12 bg-cyan-100 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 tracking-tight transition-colors">
                Portaria Colaborativa
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium text-sm transition-colors">
                Sem papelada. Em seu painel administrativo, você autoriza seus amigos e eles ganham acesso seguro ao Scanner de QR Code para validar os seus ingressos usando a câmera do próprio celular dentro da plataforma.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-card border border-gray-100 dark:border-border p-8 rounded-3xl hover:shadow-lg dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all group">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 tracking-tight transition-colors">
                Métricas em Tempo Real
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium text-sm transition-colors">
                Planilha dinâmica de vendas informando receita bruta, quantidade de
                ingressos emitidos e pagamentos pendentes. Você pode filtrar cada evento individualmente.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="faq"
        className="py-24 bg-gray-50 dark:bg-background relative border-t border-gray-200 dark:border-border transition-colors"
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 md:text-center">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900 dark:text-white mb-4 transition-colors">
              Dúvidas Frequentes
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 font-medium transition-colors">
              Ficou com alguma dúvida sobre o funcionamento da plataforma? Veja algumas respostas aqui.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;

              return (
                <div 
                  key={index} 
                  className="group bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl shadow-sm transition-colors overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    className="flex w-full cursor-pointer items-center justify-between gap-3 p-6 font-bold text-gray-900 dark:text-gray-100 text-left focus:outline-none transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400"
                  >
                    <span className="text-lg">{faq.question}</span>
                    <span className={`shrink-0 rounded-full bg-gray-50 dark:bg-slate-800 p-1.5 text-gray-900 dark:text-gray-300 sm:p-3 transition-transform duration-500 ease-in-out ${isOpen ? '-rotate-180' : ''}`}>
                      <ChevronDown className="h-5 w-5" />
                    </span>
                  </button>
                  
                  <div 
                    className={`grid transition-all duration-500 ease-in-out ${
                      isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="px-6 pb-6 text-gray-600 dark:text-gray-400 font-medium leading-relaxed transition-colors border-t border-gray-100 dark:border-border pt-4 mt-2 mx-6">
                        {faq.answer}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-24 relative overflow-hidden bg-blue-600 dark:bg-blue-950 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white mb-6">
            Junte-se à nossa comunidade.
          </h2>
          <p className="text-xl text-blue-100 dark:text-blue-200 font-medium mb-10">
            Cadastre-se gratuitamente e solicite o seu acesso como produtor enviando um e-mail para{" "}
            <span className="font-black">eventaqui@gmail.com</span> se identificando e apresentando o seu evento.
          </p>
          <Button asChild className="h-16 px-10 text-lg bg-white text-blue-600 hover:bg-gray-100 font-black rounded-2xl transition-transform hover:scale-105 shadow-xl min-w-62.5">
            <Link href="/novo-cadastro">
              Criar Conta Gratuita
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}