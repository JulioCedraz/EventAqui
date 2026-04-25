import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Toaster } from "@/components/ui/sonner";
import EmailConfirmationHandler from '@/components/EmailConfirmationHandler';
import ReactivationGuard from '@/components/ReactivationGuard';

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
        <ReactivationGuard />
        <Header />
        
        <main className="grow flex flex-col">
          {children}
        </main>

        <Footer />
        
        <Toaster richColors position="top-right" />

        <EmailConfirmationHandler />
      </body>
    </html>
  );
}