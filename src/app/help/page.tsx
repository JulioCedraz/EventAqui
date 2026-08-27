'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search, Ticket, Store, CreditCard, 
  Mail, MessageCircle, ShieldCheck
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const interactiveAreaRef = useRef<HTMLDivElement>(null);
  const faqSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (interactiveAreaRef.current && !interactiveAreaRef.current.contains(event.target as Node)) {
        setSelectedCategory(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const categories = [
    { id: 'comprador', title: 'Sou Comprador', desc: 'Dúvidas sobre ingressos e acesso.', icon: Ticket, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { id: 'produtor', title: 'Sou Produtor', desc: 'Gestão de eventos, equipe e portaria.', icon: Store, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { id: 'pagamentos', title: 'Pagamentos', desc: 'PIX, reembolsos e taxas.', icon: CreditCard, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10' },
    { id: 'seguranca', title: 'Segurança e Suporte', desc: 'LGPD, regras, contas e antifraude.', icon: ShieldCheck, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
  ];

  const faqs = [
    {
      categories: ['comprador'],
      question: "Como faço para acessar o meu ingresso?",
      answer: "Assim que o seu pagamento for aprovado, você pode acessá-lo a qualquer momento fazendo login na plataforma e clicando em 'Meus Ingressos'."
    },
    {
      categories: ['pagamentos', 'comprador'],
      question: "O pagamento via PIX demora quanto tempo para aprovar?",
      answer: "A aprovação do PIX é instantânea! Geralmente, em menos de 10 segundos após o pagamento no seu banco, o sistema já libera o seu ingresso."
    },
    {
      categories: ['produtor', 'pagamentos'],
      question: "Sou produtor, como recebo o dinheiro das vendas?",
      answer: "Os valores das vendas processadas via PIX são creditados diretamente na sua conta do Mercado Pago que você vinculará à sua conta desta plataforma. A taxa padrão do Mercado Pago para vendas via Pix com QR code dinâmico é de 0,99% (aproximadamente 1%) por transação, o dinheiro é disponibilizado na hora já com o desconto da taxa."
    },
    {
      categories: ['pagamentos', 'comprador', 'seguranca'],
      question: "Posso cancelar minha compra e pedir reembolso?",
      answer: "Sim. A solicitação deve ser feita diretamente ao responsável pelo evento com antecedência mínima de dois dias antes do evento."
    },
    {
      categories: ['produtor'],
      question: "Como funciona a validação na portaria?",
      answer: "Como produtor, você autoriza agentes de portaria utilizando o e-mail deles. A pessoa convidada acessará a plataforma e utilizará nosso Scanner integrado. O comprador só precisa apresentar o QR Code na entrada do evento para liberação."
    },
    {
      categories: ['seguranca', 'comprador', 'produtor'],
      question: "Como faço para excluir minha conta permanentemente?",
      answer: "Acesse o seu Perfil e clique em 'Privacidade e Exclusão de Conta'. Por segurança, será necessário confirmar sua senha atual e inserir um código enviado ao seu e-mail. Sua conta será suspensa imediatamente e agendada para exclusão definitiva em 30 dias, em conformidade com a LGPD."
    },
    {
      categories: ['seguranca'],
      question: "Solicitei a exclusão da minha conta, posso me arrepender?",
      answer: "Sim! Oferecemos uma carência de 30 dias após o pedido. Se você mudar de ideia dentro desse prazo, basta fazer login normalmente. O sistema exibirá uma tela segura com a opção 'Reativar Minha Conta', restaurando todo o seu acesso instantaneamente."
    },
    {
      categories: ['seguranca', 'comprador'],
      question: "Comprei ingresso de terceiros (cambistas), vocês garantem a entrada?",
      answer: "Não. O EventAqui não se responsabiliza por ingressos comprados fora da nossa plataforma oficial. Ingressos falsificados ou duplicados por terceiros serão bloqueados automaticamente pelo nosso validador na portaria."
    },
    {
      categories: ['seguranca', 'comprador'],
      question: "Posso excluir minha conta se eu ainda tiver ingressos para eventos futuros?",
      answer: "Se você possuir ingressos válidos para eventos que ainda não aconteceram, o sistema emitirá um alerta ao tentar excluir a conta. Será necessário confirmar explicitamente que você está abrindo mão desses ingressos ou solicitar o estorno antes de agendar a exclusão."
    },
    {
      categories: ['seguranca', 'produtor'],
      question: "Sou produtor de eventos. Posso excluir minha conta a qualquer momento?",
      answer: "Para garantir a segurança dos compradores, o sistema bloqueia automaticamente a exclusão de contas de produtores com eventos ativos ou futuros. É necessário realizar o evento, processar estornos e encerrar pendências financeiras antes da exclusão."
    },

  ];

  const filteredFaqs = faqs.filter(faq => {
    if (searchQuery) {
      return faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
             faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    }
    if (selectedCategory) {
      return faq.categories.includes(selectedCategory);
    }
    return true; 
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (selectedCategory) setSelectedCategory(null);
  };

  const handleCategoryClick = (categoryId: string) => {
    if (selectedCategory === categoryId) {
      setSelectedCategory(null); 
    } else {
      setSelectedCategory(categoryId);
      setSearchQuery(''); 

      if (window.innerWidth < 768) {
        setTimeout(() => {
          faqSectionRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }, 150);
      }
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-background flex flex-col transition-colors">
      
      {/* HERO SECTION - Busca */}
      <section className="bg-blue-600 dark:bg-blue-950/50 text-white py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl opacity-10 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white dark:bg-blue-400 rounded-full blur-3xl transition-colors"></div>
          <div className="absolute top-1/2 -left-24 w-72 h-72 bg-white dark:bg-blue-400 rounded-full blur-3xl transition-colors"></div>
        </div>

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-6">
            Como podemos te ajudar hoje?
          </h1>
          
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 dark:text-gray-500 transition-colors" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Digite sua dúvida (ex: cancelar ingresso)..."
              className="block w-full pl-12 pr-4 py-4 rounded-2xl border-0 ring-1 ring-inset ring-white/20 dark:ring-slate-700 bg-white dark:bg-slate-900/80 shadow-xl text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-lg transition-all"
            />
          </div>
        </div>
      </section>

      {/* ÁREA INTERATIVA */}
      <div ref={interactiveAreaRef} className="flex-1">
        
        {/* CATEGORIAS RÁPIDAS (Cards) */}
        {!searchQuery && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20 mb-8 sm:mb-16 w-full animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {categories.map((cat) => (
                <Card 
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.id)}
                  className={`border-0 transition-all duration-300 rounded-2xl cursor-pointer select-none dark:bg-card
                    ${selectedCategory === cat.id 
                      ? 'ring-2 ring-blue-500 dark:ring-blue-400 scale-[1.02] sm:scale-105 shadow-xl bg-white dark:bg-slate-800' 
                      : selectedCategory 
                        ? 'opacity-50 grayscale-40 scale-[0.98] sm:scale-95 hover:opacity-100 hover:scale-100 shadow-sm' 
                        : 'shadow-lg hover:-translate-y-1'
                    }
                  `}
                >
                  <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform ${cat.bg} ${cat.color} ${selectedCategory === cat.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                      <cat.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 transition-colors">{cat.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 transition-colors">{cat.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* PERGUNTAS FREQUENTES (FAQ) */}
        <section ref={faqSectionRef} className={`max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mb-20 w-full ${searchQuery ? 'mt-12' : 'scroll-mt-18'}`}>
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 transition-colors">
              {searchQuery ? 'Resultados da Busca' : selectedCategory ? 'Dúvidas Frequentes' : 'Perguntas Frequentes'}
            </h2>
            {!searchQuery && !selectedCategory && (
              <p className="text-gray-500 dark:text-gray-400 mt-2 transition-colors">As respostas para as dúvidas mais comuns da nossa comunidade.</p>
            )}
            {selectedCategory && (
              <p className="text-blue-600 dark:text-blue-400 font-medium mt-2 animate-in fade-in transition-colors">
                Exibindo resultados para: {categories.find(c => c.id === selectedCategory)?.title}
              </p>
            )}
          </div>

          <div className="space-y-4">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, index) => {
                const isForcedOpen = searchQuery.length > 0 || selectedCategory !== null;
                const isOpen = isForcedOpen || openFaqIndex === index;

                return (
                  <div 
                    key={index} 
                    className="group bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl shadow-sm transition-colors overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(index)}
                      className="flex w-full cursor-pointer items-center justify-between gap-3 p-6 font-bold text-gray-900 dark:text-gray-100 text-left focus:outline-none transition-colors"
                    >
                      {faq.question}
                      <span className={`shrink-0 rounded-full bg-gray-50 dark:bg-slate-800 p-1.5 text-gray-900 dark:text-gray-300 sm:p-3 transition-transform duration-500 ease-in-out ${isOpen ? '-rotate-180' : ''}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </span>
                    </button>
                    
                    <div 
                      className={`grid transition-all duration-500 ease-in-out ${
                        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="px-6 pb-6 text-gray-500 dark:text-gray-400 leading-relaxed transition-colors">
                          {faq.answer}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border shadow-sm transition-colors">
                <Search className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-4 transition-colors" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 transition-colors">Nenhum resultado encontrado</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-1 transition-colors">Não encontramos respostas para esta busca ou categoria.</p>
              </div>
            )}
          </div>
        </section>

      </div>

      {/* CALL TO ACTION - CONTATO */}
      <section className="bg-white dark:bg-background border-t border-gray-200 dark:border-border py-16 mt-auto transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-6 transition-colors">
            <MessageCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-3 transition-colors">Ainda precisa de ajuda?</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-2xl mx-auto transition-colors">
            Nossa equipe de suporte está pronta para resolver o seu problema. Nosso horário de atendimento é de segunda a sexta, das 09h às 18h.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a 
              href="mailto:eventaqui@gmail.com" 
              className="inline-flex items-center justify-center px-6 py-3.5 border border-transparent text-base font-bold rounded-xl shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors w-full sm:w-auto"
            >
              <Mail className="w-5 h-5 mr-2" />
              Enviar E-mail
            </a>
            <Link 
              href="/" 
              className="inline-flex items-center justify-center px-6 py-3.5 border border-gray-200 dark:border-slate-700 text-base font-bold rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors w-full sm:w-auto"
            >
              Voltar ao Início
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}