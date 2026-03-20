'use client';

import { useState } from 'react';

interface CheckoutProps {
  eventoId: string;
}

export default function CheckoutButton({ eventoId }: CheckoutProps) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{ qrCodeBase64: string; pixCopiaECola: string } | null>(null);
  const [erro, setErro] = useState('');

  const handleComprar = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro('');

    try {
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventoId, nomeComprador: nome, emailComprador: email }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.erro || 'Erro ao gerar pagamento');

      setPixData({
        qrCodeBase64: data.qrCodeBase64,
        pixCopiaECola: data.pixCopiaECola,
      });
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (pixData) {
    return (
      <div className="p-6 bg-green-50 rounded-xl border border-green-200 text-center">
        <h3 className="text-xl font-bold text-green-800 mb-4">Ingresso Reservado!</h3>
        <p className="text-sm text-gray-600 mb-4">Escaneie o QR Code abaixo no app do seu banco para confirmar a compra.</p>
        
        <img 
          src={`data:image/jpeg;base64,${pixData.qrCodeBase64}`} 
          alt="QR Code Pix" 
          className="mx-auto w-48 h-48 mb-4 border rounded-lg shadow-sm"
        />
        
        <div className="text-left">
          <label className="text-xs text-gray-500 font-semibold">Ou use o Copia e Cola:</label>
          <input 
            type="text" 
            readOnly 
            value={pixData.pixCopiaECola} 
            className="w-full mt-1 p-2 text-xs border rounded bg-white text-gray-800 focus:outline-none"
            onClick={(e) => {
              (e.target as HTMLInputElement).select();
              navigator.clipboard.writeText(pixData.pixCopiaECola);
              alert('Código copiado!');
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleComprar} className="space-y-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Garanta sua vaga</h3>
      
      {erro && <p className="text-red-500 text-sm font-medium">{erro}</p>}
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
        <input 
          type="text" 
          required 
          value={nome} 
          onChange={(e) => setNome(e.target.value)}
          className="mt-1 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="Ex: João da Silva"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">E-mail</label>
        <input 
          type="email" 
          required 
          value={email} 
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="joao@medicina.com"
        />
      </div>
      
      <button 
        type="submit" 
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors disabled:bg-blue-300"
      >
        {loading ? 'Gerando Pix...' : 'Comprar com Pix'}
      </button>
    </form>
  );
}