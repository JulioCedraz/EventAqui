import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '../components/Header';

const inter = Inter({ subsets: ['latin'] });

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
      <body className={`${inter.className} bg-gray-50 min-h-screen flex flex-col`}>
        <Header />
        <div className="flex-grow">
          {children}
        </div>
      </body>
    </html>
  );
}