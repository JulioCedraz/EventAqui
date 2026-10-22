"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Ticket, ArrowUp } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const topButtonRef = useRef<HTMLButtonElement>(null);
  const [isArrowAnimating, setIsArrowAnimating] = useState(false);

  // Em telas de toque não há hover: a seta anima sempre que o botão aparece
  useEffect(() => {
    const button = topButtonRef.current;
    if (!button || !window.matchMedia("(hover: none)").matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsArrowAnimating(true);
      },
      { threshold: 0.6 }
    );

    observer.observe(button);
    return () => observer.disconnect();
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <footer className="bg-white dark:bg-background border-t border-gray-200 dark:border-border py-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-14">
          
          <div className="space-y-4 text-center md:text-left md:col-span-2 lg:col-span-2 lg:pr-12">
            <Link
              href="/"
              className="flex items-center justify-center md:justify-start gap-2 w-fit mx-auto md:mx-0"
            >
              <div className="bg-blue-600 dark:bg-blue-600 p-2.5 rounded-xl transition-colors">
                <Ticket className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-black tracking-tight text-gray-900 dark:text-gray-100 transition-colors">
                EventAqui
              </span>
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed transition-colors max-w-md mx-auto md:mx-0 font-medium">
              A plataforma definitiva para eventos universitários. Venda ingressos, gerencie sua portaria e receba na hora, com total segurança.
            </p>
          </div>

          <div className="text-center md:text-left">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-5 transition-colors uppercase tracking-wider text-xs">
              Para Estudantes
            </h3>
            <ul className="space-y-3.5">
              <li>
                <Link
                  href="/"
                  className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Explorar Eventos
                </Link>
              </li>
              <li>
                <Link
                  href="/tickets"
                  className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Meus Ingressos
                </Link>
              </li>
              <li>
                <Link
                  href="/help"
                  className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Central de Ajuda
                </Link>
              </li>
            </ul>
          </div>

          <div className="text-center md:text-left">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-5 transition-colors uppercase tracking-wider text-xs">
              Para Produtores
            </h3>
            <ul className="space-y-3.5">
              <li>
                <Link
                  href="/como-funciona"
                  className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Como Funciona
                </Link>
              </li>
              <li>
                <Link
                  href="/admin"
                  className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Área do Produtor
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/checkin"
                  className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Scanner de Portaria
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex justify-center mb-12">
          <button
            ref={topButtonRef}
            onClick={scrollToTop}
            className="group flex items-center gap-3 p-1.5 pr-6 rounded-full bg-white dark:bg-card border border-gray-200/80 dark:border-slate-800 hover:border-blue-100 dark:hover:border-slate-700 shadow-xs hover:shadow-md dark:hover:shadow-[0_0_15px_rgba(255,255,255,0.03)] text-sm font-medium text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-gray-200 transition-all duration-300 active:scale-95 cursor-pointer"
          >
            <div className="flex items-center justify-center w-9 h-9 overflow-hidden rounded-full bg-gray-50 dark:bg-background group-hover:bg-blue-50 dark:group-hover:bg-slate-800 transition-colors">
              <ArrowUp
                onAnimationEnd={() => setIsArrowAnimating(false)}
                className={`w-4 h-4 group-hover:animate-arrow-up motion-reduce:animate-none! ${isArrowAnimating ? "animate-arrow-up" : ""}`}
              />
            </div>
            Voltar ao topo
          </button>
        </div>

        <div className="pt-8 border-t border-gray-200 dark:border-border flex flex-col md:flex-row justify-between items-center gap-8 md:gap-4 transition-colors">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center md:text-left space-y-1.5 transition-colors">
            <p>© {currentYear} EventAqui. Todos os direitos reservados.</p>
            <p>
              Desenvolvido por{" "}
              <a
                href="https://www.linkedin.com/in/juliecio-cedraz/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Julio Cedraz
              </a>
            </p>
          </div>

          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center md:text-right transition-colors">
            Pagamentos via{" "}
            <a
              href="https://www.infinitepay.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              InfinitePay
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}