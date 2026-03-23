'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminDashboard() {
  const router = useRouter();
  
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  const [events, setEvents] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [price, setPrice] = useState('');
  const [totalSpots, setTotalSpots] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState('');

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setEvents(data);
    }
  };

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = session?.user?.email;

      const admins = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];

      if (!session || !userEmail || !admins.includes(userEmail)) {
        router.push('/');
      } else {
        setAuthorized(true);
        fetchEvents();
      }
      setIsCheckingAuth(false);
    };

    checkAdmin();
  }, [router]);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setEventDate('');
    setPrice('');
    setTotalSpots('');
    setImage(null);
    setImageError('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError('');
    const file = e.target.files?.[0] || null;

    if (!file) {
      setImage(null);
      return;
    }

    const maxSize = 3 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      setImageError('Formato inválido. Por favor, selecione uma imagem JPEG, PNG ou WEBP.');
      setImage(null);
      e.target.value = '';
      return;
    }

    if (file.size > maxSize) {
      setImageError('A imagem excede o tamanho máximo permitido de 3MB.');
      setImage(null);
      e.target.value = '';
      return;
    }

    setImage(file);
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    if (imageError) {
      setMessage({ text: 'Corrija o erro da imagem antes de salvar.', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      let image_url = null;

      if (image) {
        const maxSize = 3 * 1024 * 1024;
        if (image.size > maxSize) throw new Error('Imagem excede 3MB.');
        
        const fileExt = image.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('covers')
          .upload(fileName, image);

        if (uploadError) throw new Error('Erro ao fazer upload da imagem.');

        const { data: publicUrlData } = supabase.storage
          .from('covers')
          .getPublicUrl(fileName);
          
        image_url = publicUrlData.publicUrl;
      }

      const payload: any = {
        title,
        description,
        event_date: new Date(eventDate).toISOString(),
        price: parseFloat(price),
        total_spots: parseInt(totalSpots, 10),
      };

      if (image_url) payload.image_url = image_url;

      if (editingId) {
        const { error: updateError } = await supabase
          .from('events')
          .update(payload)
          .eq('id', editingId);

        if (updateError) throw updateError;
        setMessage({ text: 'Evento atualizado com sucesso!', type: 'success' });
      } else {
        const { error: insertError } = await supabase
          .from('events')
          .insert(payload);

        if (insertError) throw insertError;
        setMessage({ text: 'Evento criado com sucesso!', type: 'success' });
      }
      
      resetForm();
      fetchEvents();

    } catch (error: any) {
      setMessage({ text: error.message || 'Erro ao processar requisição', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (event: any) => {
    setEditingId(event.id);
    setTitle(event.title);
    setDescription(event.description || '');

    const formattedDate = new Date(event.event_date).toISOString().slice(0, 16);
    setEventDate(formattedDate);
    setPrice(event.price.toString());
    setTotalSpots(event.total_spots.toString());
    setImage(null);
    setImageError('');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = window.confirm("Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita e pode afetar ingressos vendidos.");
    
    if (!isConfirmed) return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setMessage({ text: 'Evento excluído com sucesso.', type: 'success' });
      
      if (editingId === id) resetForm();
      
      fetchEvents();
    } catch (error: any) {
      setMessage({ text: 'Erro ao excluir evento. Verifique se há ingressos vinculados a ele.', type: 'error' });
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 font-medium">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <main className="bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 grow">
      <div className="max-w-4xl mx-auto space-y-8">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Painel de Controle</h1>
            <p className="text-sm text-gray-500 mt-1">Gerencie a criação de eventos e o controle de portaria.</p>
          </div>
          <Link 
            href="/admin/checkin" 
            className="inline-flex items-center justify-center bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors shadow-sm w-full sm:w-auto"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Modo Portaria (Check-in)
          </Link>
        </div>

        <div className={`bg-white shadow-sm border rounded-2xl overflow-hidden transition-colors ${editingId ? 'border-blue-400 ring-1 ring-blue-100' : 'border-gray-200'}`}>
          <div className="px-6 py-8 sm:p-10">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'Editando Evento' : 'Criar Novo Evento'}
              </h2>
              {editingId && (
                <button onClick={resetForm} className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors">
                  Descartar Alterações
                </button>
              )}
            </div>
            
            {message.text && (
              <div className={`p-4 mb-8 rounded-lg flex items-start ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                <span className="text-sm font-medium">{message.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Título do Evento</label>
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="block w-full border border-gray-300 rounded-lg shadow-sm py-3 px-4 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Descrição</label>
                <textarea rows={4} required value={description} onChange={(e) => setDescription(e.target.value)} className="block w-full border border-gray-300 rounded-lg shadow-sm py-3 px-4 focus:ring-blue-500 focus:border-blue-500 sm:text-sm resize-none" />
              </div>

              <div className="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Data e Hora</label>
                  <input type="datetime-local" required value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="block w-full border border-gray-300 rounded-lg shadow-sm py-3 px-4 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Preço (R$)</label>
                  <input type="number" step="0.01" min="0" required value={price} onChange={(e) => setPrice(e.target.value)} className="block w-full border border-gray-300 rounded-lg shadow-sm py-3 px-4 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Vagas Totais</label>
                  <input type="number" min="1" required value={totalSpots} onChange={(e) => setTotalSpots(e.target.value)} className="block w-full border border-gray-300 rounded-lg shadow-sm py-3 px-4 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Capa do Evento {editingId && <span className="text-blue-500 font-normal">(Deixe em branco para manter a atual)</span>}
                  </label>
                  <input 
                    type="file" 
                    accept="image/jpeg, image/png, image/webp" 
                    onChange={handleImageChange} 
                    className={`block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold cursor-pointer transition-colors ${
                      imageError 
                        ? 'file:bg-red-50 file:text-red-700 hover:file:bg-red-100' 
                        : 'file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'
                    }`} 
                  />
                  {imageError ? (
                    <p className="mt-2 text-sm font-medium text-red-600 animate-in fade-in">
                      {imageError}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">
                      JPEG, PNG ou WEBP, menor que 3MB.
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-8 flex justify-end">
                <button type="submit" disabled={loading} className="w-full sm:w-auto bg-blue-600 border border-transparent rounded-xl shadow-sm py-3 px-8 text-base font-bold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 transition-all">
                  {loading ? 'Processando...' : editingId ? 'Salvar Alterações' : 'Publicar Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden mt-10">
          <div className="px-6 py-6 border-b border-gray-100 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900">Eventos Publicados ({events.length})</h2>
          </div>
          
          {events.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Nenhum evento cadastrado ainda.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {events.map((evt) => (
                <li key={evt.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    
                    <div className="w-16 h-16 rounded-lg bg-gray-200 shrink-0 overflow-hidden border border-gray-200">
                      {evt.image_url ? (
                        <img src={evt.image_url} alt="Capa" className="w-full h-full object-cover" />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-gray-400 text-xs">Sem foto</span>
                      )}
                    </div>
                    
                    <div>
                      <h3 className="font-bold text-gray-900 line-clamp-1">{evt.title}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(evt.event_date).toLocaleDateString('pt-BR')} • R$ {evt.price.toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <button 
                      onClick={() => handleEdit(evt)}
                      className="text-sm font-medium text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => handleDelete(evt.id)}
                      className="text-sm font-medium text-red-600 bg-red-50 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Excluir
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
      </div>
    </main>
  );
}