import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '../components/Header';
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'EventAqui - Ingressos Rápidos',
  description: 'Compre ingressos com PIX de forma rápida, segura e sem taxas desnecessárias.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} font-sans antialiased bg-gray-50 min-h-screen flex flex-col`}>
        <Header />
        
        <main className="grow flex flex-col">
          {children}
        </main>

        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}