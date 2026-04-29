import Link from "next/link";
import { Ticket } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-background border-t border-gray-200 dark:border-border py-10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-6">
          
          {/* Coluna 1: Marca e Sobre */}
          <div className="space-y-4 text-center md:text-left">
            <Link href="/" className="flex items-center justify-center md:justify-start gap-2 w-fit mx-auto md:mx-0">
              <div className="bg-blue-600 dark:bg-blue-600 p-2 rounded-xl transition-colors">
                <Ticket className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-black tracking-tight text-gray-900 dark:text-gray-100 transition-colors">
                EventAqui
              </span>
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed transition-colors">
              A plataforma definitiva para criar, gerenciar e vender ingressos
              para os seus eventos com segurança e recebimento instantâneo.
            </p>
          </div>

          {/* Coluna 2: Navegação Rápida */}
          <div className="text-center md:text-left">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4 transition-colors">Plataforma</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/"
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Explorar Eventos
                </Link>
              </li>
              <li>
                <Link
                  href="/admin"
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Área do Produtor
                </Link>
              </li>
              <li>
                <Link
                  href="/help"
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Central de Ajuda
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Links Legais */}
          <div className="text-center md:text-left">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4 transition-colors">Legal</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="#"
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Política de Reembolso
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Linha de Copyright, Assinatura e Pagamentos */}
        <div className="pt-8 border-t border-gray-200 dark:border-border flex flex-col md:flex-row justify-between items-center gap-6 md:gap-4 transition-colors">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center md:text-left space-y-1 transition-colors">
            <p>© {currentYear} EventAqui. Todos os direitos reservados.</p>
            <p>
              Desenvolvido por{" "}
              <a
                href="https://www.linkedin.com/in/juliecio-cedraz/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Julio Cedraz
              </a>
            </p>
          </div>

          {/* Selos de Confiança e Pagamento */}
          <div className="flex flex-col items-center md:items-end gap-2">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest transition-colors">
              Transações Protegidas Por
            </span>
            <div className="flex items-center gap-3">
              {/* Logo Oficial do Mercado Pago */}
              <div className="h-8 flex items-center">
                <img
                  src="/mercado-pago.svg"
                  alt="Mercado Pago"
                  className="h-14 w-auto opacity-90 dark:opacity-80 hover:opacity-100 dark:hover:opacity-100 transition-opacity"
                />
              </div>

              {/* Logo Oficial do PIX */}
              <div className="h-8 flex items-center">
                <img
                  src="/pix.svg"
                  alt="PIX"
                  className="object-contain h-8 w-auto opacity-90 dark:opacity-80 hover:opacity-100 dark:hover:opacity-100 transition-opacity"
                />
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </footer>
  );
}