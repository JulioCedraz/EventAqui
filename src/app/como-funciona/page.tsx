"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type MouseEvent } from "react";
import Link from "next/link";
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
  TrendingUp,
  Tag,
  CalendarPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Reveal from "@/components/Reveal";

// Espaço entre os cards do carrossel no celular (gap-4)
const FEATURE_GAP_PX = 16;

const navLinks = [
  { href: "#recursos", label: "Recursos" },
  { href: "#faq", label: "Dúvidas Frequentes" },
];

// Manchas em vw: crescem com a tela. `shift` é quanto cada uma desloca (x, y) por pixel rolado
const heroBlobs = [
  {
    position: "top-0 -left-[25%] w-[95vw] h-[95vw] md:-top-[15%] md:left-[2%] md:w-[42vw] md:h-[42vw]",
    color: "bg-blue-400/30 dark:bg-blue-600/25",
    shift: [0, 0.35],
    delay: "",
  },
  {
    position: "top-[18%] -right-[25%] w-[90vw] h-[90vw] md:-top-[5%] md:right-[2%] md:w-[36vw] md:h-[36vw]",
    color: "bg-cyan-300/30 dark:bg-cyan-500/15",
    shift: [-0.15, 0.2],
    delay: "[animation-delay:-6s]",
  },
  {
    position: "top-[40%] -left-[10%] w-[95vw] h-[95vw] md:top-auto md:-bottom-[25%] md:left-[30%] md:w-[42vw] md:h-[42vw]",
    color: "bg-violet-300/25 dark:bg-violet-600/15",
    shift: [0.2, -0.25],
    delay: "[animation-delay:-12s]",
  },
];

const contactEmail = (
  <a href="mailto:eventaqui@gmail.com" className="font-black underline underline-offset-2 decoration-current/40 hover:decoration-current">
    eventaqui@gmail.com
  </a>
);

const features = [
  {
    icon: ShieldCheck,
    iconClassName: "bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    title: "Cadastro e Aprovação",
    description: "Para manter a comunidade segura, o acesso como produtor/organizador é moderado. Você cria a sua conta gratuitamente e solicita a autorização via e-mail.",
  },
  {
    icon: CalendarPlus,
    iconClassName: "bg-violet-100 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
    title: "Eventos e Vagas",
    description: "Crie, edite e exclua seus eventos com capa, descrição, data e preço. Defina o limite de vagas e a plataforma não vende além dele. Eventos podem ser pagos ou gratuitos.",
  },
  {
    icon: Zap,
    iconClassName: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    title: "PIX e Cartão",
    description: "Conecte sua conta InfinitePay no painel. O comprador paga por PIX, sem taxa, ou cartão de crédito, e o valor cai na sua conta em até 1 dia útil. Pedidos não pagos em 30 minutos são cancelados e a vaga volta a ficar disponível.",
  },
  {
    icon: Tag,
    iconClassName: "bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    title: "Cupons e Casadinha",
    description: "Crie cupons de desconto em porcentagem ou valor fixo, com limite de usos e data de validade. Ofereça o ingresso casadinha: o comprador leva dois ingressos e o acompanhante recebe o dele por e-mail.",
  },
  {
    icon: QrCode,
    iconClassName: "bg-cyan-100 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400",
    title: "Portaria Antifraude",
    description: "Convide sua equipe pelo e-mail e ela valida os ingressos com a câmera do próprio celular. Ingressos já usados, não pagos ou de eventos de outro produtor são recusados. Se a câmera falhar, dá para digitar o código do ingresso.",
  },
  {
    icon: TrendingUp,
    iconClassName: "bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    title: "Painel de Vendas",
    description: "Acompanhe receita bruta, ingressos vendidos e pagamentos pendentes. Veja a lista de compradores com contato e dados acadêmicos, e filtre por evento, status do pagamento e cupom.",
  },
];

const faqs = [
  {
    question: "A plataforma cobra alguma taxa sobre os ingressos?",
    answer: "Não. A EventAqui é uma iniciativa gratuita para suporte em eventos estudantis e não é cobrada nenhuma taxa de serviço pelo uso do sistema."
  },
  {
    question: "É obrigatório ter uma conta na InfinitePay?",
    answer: "Só para eventos pagos. Os pagamentos usam o Checkout Integrado da InfinitePay, que aceita conta de pessoa física. Em eventos gratuitos, o ingresso é emitido na hora e você não precisa conectar nenhuma conta."
  },
  {
    question: "A InfinitePay cobra alguma taxa?",
    answer: "No PIX, não: a taxa é 0%. No cartão de crédito, a InfinitePay cobra uma taxa que depende do plano de recebimento e do faturamento mensal do produtor. No Plano Inicial (até R$ 20 mil por mês, recebimento em 1 dia útil), a tabela pública da InfinitePay indica, para Visa e Mastercard, 3,15% no crédito à vista, subindo a cada parcela até 12,40% em 12x. O produtor pode repassar os juros do parcelamento ao comprador nas configurações do app. Confira os valores atualizados em infinitepay.io/taxas."
  },
  {
    question: "Como eu recebo o dinheiro das minhas vendas?",
    answer: "De forma direta. No painel administrativo, você informa a sua InfiniteTag e a API Key do Checkout, gerada no app da InfinitePay, e ela passa a valer para todos os seus eventos. Quando um cliente paga, o valor é creditado na sua conta InfinitePay, já descontada a taxa do cartão, quando houver. A responsabilidade é inteiramente sua. A EventAqui não retém nenhum valor."
  },
  {
    question: "O que acontece se o comprador não pagar?",
    answer: "O link de pagamento vale por 30 minutos. Depois disso, ele expira, o pedido é cancelado automaticamente e a vaga volta a ficar disponível. Se um pagamento chegar atrasado e o evento já estiver lotado, o ingresso não é emitido e você recebe um e-mail avisando para fazer o estorno pelo app da InfinitePay."
  },
  {
    question: "Como funciona o ingresso casadinha?",
    answer: "O comprador leva dois ingressos em uma única compra e informa os dados do acompanhante. O acompanhante recebe um convite por e-mail, cria a conta dele e resgata o próprio ingresso, com QR Code individual. Você também pode criar cupons que valem só para a casadinha."
  },
  {
    question: "Como minha equipe valida a entrada das pessoas no evento?",
    answer: "No painel administrativo, clique em 'Equipe de Portaria', informe o e-mail da pessoa que você quer designar como seu agente de portaria, depois clique em 'Convidar Agente' para habilitar aquele e-mail com o acesso ao leitor de QR Code de validação dos ingressos. Com o próprio celular, o agente acessa o Scanner de Check-in e lê o QR Code da pessoa. Cada ingresso só entra uma vez. Se a pessoa já for agente de outro produtor, basta adicioná-lo pelo e-mail, sem novo cadastro."
  },
  {
    question: "Como faço para liberar meu acesso como produtor/organizador?",
    answer: (
      <>
        Para manter a integridade da plataforma e evitar fraudes, novos produtores não são ativados automaticamente. Crie a sua conta de usuário e, em seguida, envie um e-mail para {contactEmail} se identificando e com as informações do seu evento para solicitar o acesso às ferramentas de criação.
      </>
    )
  }
];

// Grava a posição do cursor no elemento; os efeitos de luz leem --pointer-x e --pointer-y
const trackPointer = (e: MouseEvent<HTMLElement>) => {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--pointer-x", `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty("--pointer-y", `${e.clientY - rect.top}px`);
};

export default function ProducersLandingPage() {
  const { setTheme, resolvedTheme, systemTheme } = useTheme();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const headerRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    let isHeroVisible = true;
    // Altura rolável guardada: ler scrollHeight a cada rolagem força o navegador a recalcular o layout
    let maxScroll = 0;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
      setIsMenuOpen(false);
      if (isHeroVisible) hero?.style.setProperty("--hero-scroll", String(window.scrollY));

      const progress = maxScroll > 0 ? Math.min(window.scrollY / maxScroll, 1) : 0;
      progressRef.current?.style.setProperty("transform", `scaleX(${progress})`);
    };

    const measure = () => {
      maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      handleScroll();
    };

    // Seções fora da tela pausam as manchas animadas (regra em globals.css)
    const visibilityObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        entry.target.toggleAttribute("data-offscreen", !entry.isIntersecting);
        if (entry.target === hero) isHeroVisible = entry.isIntersecting;
      }
      handleScroll();
    });
    for (const section of [hero, ctaRef.current]) {
      if (section) visibilityObserver.observe(section);
    }

    // A altura muda com a janela e também com o conteúdo (FAQ abrindo, imagens carregando)
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(document.body);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", handleScroll, { passive: true });
    measure();

    return () => {
      visibilityObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
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

  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (headerRef.current?.contains(event.target as Node)) return;
      setIsMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isMenuOpen]);

  const toggleFaq = (index: number) => {
    const isOpening = openFaqIndex !== index;
    setOpenFaqIndex(isOpening ? index : null);
    if (!isOpening) return;

    // Depois da transição, garante que a pergunta aberta não ficou acima da tela
    window.setTimeout(() => {
      const item = document.getElementById(`faq-${index}`);
      if (!item || item.getBoundingClientRect().top >= 80) return;
      item.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 500);
  };

  const handleFeaturesScroll = () => {
    const container = featuresRef.current;
    const firstCard = container?.firstElementChild as HTMLElement | null;
    if (!container || !firstCard) return;

    const step = firstCard.offsetWidth + FEATURE_GAP_PX;
    setActiveFeature(Math.min(Math.round(container.scrollLeft / step), features.length - 1));
  };

  const scrollToFeature = (index: number) => {
    const card = featuresRef.current?.children[index] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const accessHref = user ? "/" : "/login";
  const accessLabel = isAuthLoading ? "Carregando..." : user ? "Acessar Plataforma" : "Já tem conta? Acesse";

  const toggleTheme = () => {
    const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(nextTheme === systemTheme ? "system" : nextTheme);
  };

  const themeToggle = mounted ? (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
      title="Alternar tema"
      aria-label="Alternar tema"
    >
      {resolvedTheme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  ) : (
    <div className="w-9 h-9" />
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">
      <header ref={headerRef} className="fixed top-0 w-full z-50">
        <div
          className={`relative z-50 w-full pt-[env(safe-area-inset-top)] border-b backdrop-blur-md transition-all duration-300 ${
            isScrolled || isMenuOpen
              ? "border-gray-200 dark:border-border bg-white/80 dark:bg-background/80 shadow-sm"
              : "border-transparent bg-gray-50 dark:bg-background"
          }`}
        >
          <div
            ref={progressRef}
            aria-hidden
            style={{ transform: "scaleX(0)" }}
            className="pointer-events-none absolute left-0 -bottom-px h-0.5 w-full origin-left bg-linear-to-r from-blue-500 via-cyan-400 to-violet-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="group">
              <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-500 tracking-tighter hover:opacity-80 transition-opacity">
                EventAqui
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-2 sm:gap-4">
              {navLinks.map(({ href, label }) => (
                <Button
                  key={href}
                  asChild
                  variant="ghost"
                  className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
                >
                  <Link href={href}>{label}</Link>
                </Button>
              ))}

              {themeToggle}

              <Button asChild className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold rounded-full px-5 min-w-42.5">
                <Link href={accessHref}>{accessLabel}</Link>
              </Button>
            </nav>

            <div className="flex md:hidden items-center gap-2">
              {themeToggle}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
                aria-expanded={isMenuOpen}
                className="relative text-gray-600 dark:text-gray-300"
              >
                <Menu
                  className={`absolute h-6 w-6 transition-all duration-300 ease-in-out ${
                    isMenuOpen ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"
                  }`}
                />
                <X
                  className={`absolute h-6 w-6 transition-all duration-300 ease-in-out ${
                    isMenuOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"
                  }`}
                />
              </Button>
            </div>
          </div>
        </div>

        <div
          className={`absolute left-0 w-full z-40 border-b border-gray-100 dark:border-border bg-white dark:bg-background shadow-lg transition-[translate,opacity,visibility] duration-300 ease-in-out md:hidden ${
            isMenuOpen ? "translate-y-0 opacity-100 visible" : "-translate-y-full opacity-0 invisible"
          }`}
          style={{ top: "100%" }}
        >
          <nav className="px-4 pt-2 pb-6 flex flex-col gap-2">
            {navLinks.map(({ href, label }) => (
              <Button
                key={href}
                asChild
                variant="ghost"
                className="w-full justify-start text-left text-gray-700 dark:text-gray-300 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                <Link href={href}>{label}</Link>
              </Button>
            ))}
            <Button
              asChild
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold mt-2"
              onClick={() => setIsMenuOpen(false)}
            >
              <Link href={accessHref}>{accessLabel}</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section
        ref={heroRef}
        onMouseMove={trackPointer}
        className="group/hero pt-24 pb-16 md:pt-32 md:pb-20 lg:pt-44 lg:pb-32 overflow-hidden relative border-b border-gray-200 dark:border-border transition-colors"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-grid text-gray-900 dark:text-white mask-[radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />

          {/* Troca de tom só a partir do md: em celular o filtro redesenha as manchas a cada rolagem */}
          <div className="absolute inset-0 md:filter-[hue-rotate(calc(var(--hero-scroll,0)*0.12deg))] motion-reduce:filter-none">
            {heroBlobs.map(({ position, color, shift: [x, y], delay }) => (
              <div
                key={color}
                className={`absolute ${position} motion-reduce:transform-none!`}
                style={{ transform: `translate3d(calc(var(--hero-scroll, 0) * ${x}px), calc(var(--hero-scroll, 0) * ${y}px), 0)` }}
              >
                <div className={`w-full h-full rounded-full ${color} blur-[12vw] md:blur-[6vw] animate-blob ${delay} motion-reduce:animate-none`} />
              </div>
            ))}
          </div>

          {/* Luz que acompanha o cursor */}
          <div className="absolute inset-0 opacity-0 group-hover/hero:opacity-100 transition-opacity duration-500 bg-[radial-gradient(28vw_circle_at_var(--pointer-x,50%)_var(--pointer-y,50%),rgba(59,130,246,0.14),transparent_70%)] motion-reduce:hidden" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-6xl mx-auto text-center space-y-8">
            <h1 className="text-4xl sm:text-5xl md:text-[min(6vw,5rem)] font-black tracking-tighter leading-[1.05] text-gray-900 dark:text-white animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 transition-colors">
              <span className="block md:whitespace-nowrap">Promova, divulgue e gerencie</span>
              <span className="block md:whitespace-nowrap text-transparent bg-clip-text bg-linear-to-r from-blue-600 via-cyan-500 to-violet-500 dark:from-blue-400 dark:via-cyan-400 dark:to-violet-400">
                os eventos de sua faculdade!
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 font-medium leading-relaxed max-w-2xl mx-auto text-balance animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 transition-colors">
              <span className="md:hidden">
                Sem taxa da plataforma. Venda por PIX e cartão, crie cupons e valide ingressos por QR Code.
              </span>
              <span className="hidden md:inline">
                Sem taxa da plataforma. Venda ingressos por PIX e cartão de crédito com o valor caindo direto na sua conta InfinitePay, crie cupons de desconto e controle a entrada do seu evento com o nosso validador de ingressos via QR Code.
              </span>
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2 sm:pt-6 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
              <Button asChild className="group w-full sm:w-60 h-14 px-8 text-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-black rounded-2xl shadow-md transition-all hover:-translate-y-1 hover:shadow-[0_0_24px_rgba(37,99,235,0.45)]">
                <Link href="/novo-cadastro">
                  Criar conta gratuita
                  <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full sm:w-60 h-14 px-8 text-lg font-bold rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-sm border-gray-300 dark:border-border shadow-md transition-all hover:-translate-y-1 hover:shadow-[0_0_24px_rgba(37,99,235,0.25)]">
                <Link href="#recursos">
                  Ver recursos
                </Link>
              </Button>
            </div>
          </div>

          <Link
            href="#recursos"
            aria-label="Rolar para os recursos"
            className="hidden lg:flex mx-auto mt-16 w-fit text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors animate-bounce motion-reduce:animate-none"
          >
            <ChevronDown className="h-7 w-7" />
          </Link>
        </div>
      </section>

      <section id="recursos" className="scroll-mt-16 py-24 bg-white dark:bg-background relative transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-10 md:mb-16 text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-balance text-gray-900 dark:text-white mb-4 transition-colors">
              Do cadastro ao check-in
            </h2>
            <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 font-medium text-balance transition-colors">
              A EventAqui foi desenhada para ser intuitiva. Veja como é simples estruturar a venda e a portaria do seu próximo evento.
            </p>
          </Reveal>

          {/* No celular vira carrossel horizontal com encaixe; a partir do md, grade */}
          <div
            ref={featuresRef}
            onScroll={handleFeaturesScroll}
            className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 overflow-x-auto md:overflow-visible snap-x snap-mandatory -mx-4 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:px-0 pb-4 md:pb-0 md:mb-20 scrollbar-none [&::-webkit-scrollbar]:hidden"
          >
            {features.map(({ icon: Icon, iconClassName, title, description }, index) => (
              <Reveal key={title} delay={(index % 3) * 120} className="h-full shrink-0 w-[85%] sm:w-[60%] md:w-auto snap-center">
                <div
                  onMouseMove={trackPointer}
                  className="relative h-full overflow-hidden bg-gray-50 dark:bg-card border border-gray-100 dark:border-border p-6 md:p-8 rounded-3xl transition-all duration-300 group active:scale-[0.98] hover:-translate-y-1 hover:border-blue-200 dark:hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/10"
                >
                  {/* Holofote que acompanha o cursor dentro do card */}
                  <div aria-hidden className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(220px_circle_at_var(--pointer-x,50%)_var(--pointer-y,50%),rgba(59,130,246,0.18),transparent_70%)]" />
                  <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-rotate-6 transition-transform ${iconClassName}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="relative text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 tracking-tight transition-colors">
                    {title}
                  </h3>
                  <p className="relative text-gray-600 dark:text-gray-400 leading-relaxed font-medium text-sm transition-colors">
                    {description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="flex md:hidden justify-center gap-2 mt-4">
            {features.map(({ title }, index) => (
              <button
                key={title}
                type="button"
                aria-label={`Ver recurso ${index + 1}: ${title}`}
                onClick={() => scrollToFeature(index)}
                className="p-1.5 -m-1.5 cursor-pointer"
              >
                <span
                  className={`block h-2 rounded-full transition-all duration-300 ${
                    activeFeature === index ? "w-6 bg-blue-600 dark:bg-blue-400" : "w-2 bg-gray-300 dark:bg-gray-600"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section
        id="faq"
        className="scroll-mt-16 py-24 bg-gray-50 dark:bg-background relative border-t border-gray-200 dark:border-border transition-colors"
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-10 md:mb-12 text-center">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-balance text-gray-900 dark:text-white mb-4 transition-colors">
              Dúvidas Frequentes
            </h2>
            <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 font-medium text-balance transition-colors">
              Ficou com alguma dúvida sobre o funcionamento da plataforma? Veja algumas respostas aqui.
            </p>
          </Reveal>

          <div className="space-y-3 md:space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;

              return (
                <div
                  key={index}
                  id={`faq-${index}`}
                  className={`group scroll-mt-20 bg-white dark:bg-card border rounded-2xl transition-all duration-300 overflow-hidden ${
                    isOpen
                      ? "border-blue-300 dark:border-blue-500/50 shadow-lg shadow-blue-500/10"
                      : "border-gray-200 dark:border-border shadow-sm"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    aria-expanded={isOpen}
                    className="flex w-full cursor-pointer items-center justify-between gap-3 p-4 md:p-6 font-bold text-gray-900 dark:text-gray-100 text-left focus:outline-none transition-colors active:bg-gray-50 dark:active:bg-white/5 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                  >
                    <span className="text-base md:text-lg">{faq.question}</span>
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
                      <div className="px-0 md:px-6 pb-4 md:pb-6 text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium leading-relaxed transition-colors border-t border-gray-100 dark:border-border pt-4 mt-0 md:mt-2 mx-4 md:mx-6">
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

      <section ref={ctaRef} className="py-24 relative overflow-hidden bg-linear-to-br from-blue-600 via-blue-700 to-violet-700 dark:from-blue-950 dark:via-blue-950 dark:to-violet-950 transition-colors">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-grid text-white mask-[radial-gradient(ellipse_at_center,black_10%,transparent_70%)]" />
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-cyan-400/30 blur-3xl animate-blob motion-reduce:animate-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-violet-400/30 blur-3xl animate-blob [animation-delay:-9s] motion-reduce:animate-none" />
        </div>
        <Reveal className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-balance text-white mb-6">
            Junte-se à nossa comunidade.
          </h2>
          <p className="text-lg md:text-xl text-blue-100 dark:text-blue-200 font-medium text-balance mb-10">
            Cadastre-se gratuitamente e solicite o seu acesso como produtor enviando um e-mail para{" "}
            {contactEmail} se identificando e apresentando o seu evento.
          </p>
          <Button asChild className="h-16 px-10 text-lg bg-white text-blue-600 hover:bg-gray-100 font-black rounded-2xl transition-transform hover:scale-105 shadow-xl min-w-62.5">
            <Link href="/novo-cadastro">
              Criar Conta Gratuita
            </Link>
          </Button>
        </Reveal>
      </section>
    </div>
  );
}
