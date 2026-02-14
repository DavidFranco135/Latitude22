
import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Search, Grid, List, Save, X } from 'lucide-react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';

const GalleryAdminPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ url: '', title: '', category: 'Geral' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setGalleryItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsub;
  }, []);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.url) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'gallery'), {
        ...newItem,
        createdAt: new Date()
      });
      setShowAddModal(false);
      setNewItem({ url: '', title: '', category: 'Geral' });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir esta mídia permanentemente?')) {
      await deleteDoc(doc(db, 'gallery', id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-serif text-3xl font-bold text-stone-100">Portfólio & Mídias</h2>
          <p className="text-stone-500">Curadoria visual para a vitrine pública do Salão.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center space-x-2 rounded-lg bg-amber-600 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-amber-700 shadow-xl shadow-amber-900/20 transition-all"
        >
          <Plus size={18} />
          <span>Adicionar Foto</span>
        </button>
      </div>

      <div className="rounded-xl border border-white/5 bg-stone-900 p-4 shadow-2xl flex items-center justify-between">
        <div className="flex items-center space-x-2 bg-stone-950 p-1 rounded-lg">
          <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-amber-600 text-white shadow-lg' : 'text-stone-500 hover:text-stone-300'}`}>
            <Grid size={18} />
          </button>
          <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-amber-600 text-white shadow-lg' : 'text-stone-500 hover:text-stone-300'}`}>
            <List size={18} />
          </button>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">{galleryItems.length} Itens Publicados</p>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {galleryItems.map((item) => (
            <div key={item.id} className="group relative aspect-square overflow-hidden rounded-xl border border-white/5 bg-stone-950 shadow-xl">
              <img src={item.url} alt="" className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500" />
              <div className="absolute inset-0 bg-stone-950/80 opacity-0 transition-opacity group-hover:opacity-100 flex flex-col items-center justify-center space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500 border border-amber-500/30 px-3 py-1.5 rounded bg-amber-500/10">{item.title || 'Sem título'}</span>
                <button onClick={() => handleDelete(item.id)} className="p-3 rounded-full bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/30">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-white/5 bg-stone-900 shadow-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-stone-950 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">
              <tr>
                <th className="px-6 py-5">Preview</th>
                <th className="px-6 py-5">Título / Legenda</th>
                <th className="px-6 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-stone-300">
              {galleryItems.map((item) => (
                <tr key={item.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <img src={item.url} className="h-16 w-16 rounded-lg object-cover border border-white/10" alt="" />
                  </td>
                  <td className="px-6 py-4 font-bold text-stone-100 tracking-wide">{item.title || 'Mídia Latitude22'}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/90 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl bg-stone-900 p-8 shadow-2xl border border-white/10">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-serif text-2xl font-bold text-stone-100">Nova Mídia</h3>
              <button onClick={() => setShowAddModal(false)} className="text-stone-500 hover:text-white"><X size={24} /></button>
            </div>
            <form onSubmit={handleAddItem} className="space-y-6">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-2 block">Link da Imagem (URL)</label>
                <input 
                  type="url" 
                  required 
                  value={newItem.url}
                  onChange={e => setNewItem({...newItem, url: e.target.value})}
                  className="w-full rounded-lg border border-white/10 bg-stone-950 p-4 text-sm text-stone-200 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" 
                  placeholder="https://images.unsplash.com/..."
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-2 block">Legenda de Exibição</label>
                <input 
                  type="text" 
                  value={newItem.title}
                  onChange={e => setNewItem({...newItem, title: e.target.value})}
                  className="w-full rounded-lg border border-white/10 bg-stone-950 p-4 text-sm text-stone-200 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" 
                  placeholder="Ex: Cerimônia Garden"
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full rounded-lg bg-amber-600 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white hover:bg-amber-700 shadow-xl shadow-amber-900/20 disabled:opacity-50 transition-all"
              >
                {loading ? 'Processando...' : 'Publicar no Site'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryAdminPage;
