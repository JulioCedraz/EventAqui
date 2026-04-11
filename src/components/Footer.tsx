import Link from "next/link";
import { Ticket } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-6">
          
          {/* Coluna 1: Marca e Sobre */}
          <div className="space-y-4 text-center md:text-left">
            <Link href="/" className="flex items-center justify-center md:justify-start gap-2 w-fit mx-auto md:mx-0">
              <div className="bg-blue-600 p-2 rounded-xl">
                <Ticket className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-black tracking-tight text-gray-900">
                EventAqui
              </span>
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed">
              A plataforma definitiva para criar, gerenciar e vender ingressos
              para os seus eventos com segurança e recebimento instantâneo.
            </p>
          </div>

          {/* Coluna 2: Navegação Rápida */}
          <div className="text-center md:text-left">
            <h3 className="font-bold text-gray-900 mb-4">Plataforma</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/"
                  className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
                >
                  Explorar Eventos
                </Link>
              </li>
              <li>
                <Link
                  href="/admin"
                  className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
                >
                  Área do Produtor
                </Link>
              </li>
              <li>
                <Link
                  href="/help"
                  className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
                >
                  Central de Ajuda
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Links Legais */}
          <div className="text-center md:text-left">
            <h3 className="font-bold text-gray-900 mb-4">Legal</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="#"
                  className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
                >
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
                >
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
                >
                  Política de Reembolso
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Linha de Copyright, Assinatura e Pagamentos */}
        <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-6 md:gap-4">
          <div className="text-xs text-gray-500 text-center md:text-left space-y-1">
            <p>© {currentYear} EventAqui. Todos os direitos reservados.</p>
            <p>
              Desenvolvido por{" "}
              <a
                href="https://www.linkedin.com/in/juliecio-cedraz/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-gray-700 hover:text-blue-600 transition-colors"
              >
                Julio Cedraz
              </a>
            </p>
          </div>

          {/* Selos de Confiança e Pagamento */}
          <div className="flex flex-col items-center md:items-end gap-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Transações Protegidas Por
            </span>
            <div className="flex items-center gap-3">
              {/* Logo Oficial do Mercado Pago */}
              <div className="h-8 flex items-center">
                <img
                  src="/mercado-pago.svg"
                  alt="Mercado Pago"
                  className="h-14 w-auto opacity-90 hover:opacity-100 transition-opacity"
                />
              </div>

              {/* Logo Oficial do PIX */}
              <div className="h-8 flex items-center">
                <img
                  src="/pix.svg"
                  alt="PIX"
                  className="object-contain h-8 w-auto opacity-90 hover:opacity-100 transition-opacity"
                />
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </footer>
  );
}