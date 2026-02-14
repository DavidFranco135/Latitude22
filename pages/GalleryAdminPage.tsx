import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Edit2, X, Image as ImageIcon, MoreVertical, Plus } from 'lucide-react';
import { collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

// API Key do ImgBB
const IMGBB_API_KEY = '9f8d8580331d26fcb2e3fae394e63b7f';

interface GalleryItem {
  id: string;
  url: string;
  title: string;
  description?: string;
  createdAt?: any;
}

const GalleryPage: React.FC = () => {
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url: ''
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'gallery'),
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryItem));
        setGalleryItems(items.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        }));
      },
      (error) => {
        console.error('Erro ao carregar galeria:', error);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const uploadToImgBB = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Erro ao fazer upload da imagem');
    }

    const data = await response.json();
    return data.data.url;
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showMessage('Erro: Por favor, selecione uma imagem válida.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showMessage('Erro: Imagem muito grande. Use imagens menores que 5MB.');
      return;
    }

    setUploading(true);

    try {
      const imageUrl = await uploadToImgBB(file);
      setFormData({...formData, url: imageUrl});
      showMessage('Imagem carregada! Adicione um título e salve.');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      showMessage('Erro ao enviar imagem. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.url) {
      showMessage('Erro: Adicione um título e uma imagem.');
      return;
    }

    try {
      if (editingItem) {
        await updateDoc(doc(db, 'gallery', editingItem.id), {
          title: formData.title,
          description: formData.description,
          url: formData.url
        });
        showMessage('Foto atualizada com sucesso!');
      } else {
        await addDoc(collection(db, 'gallery'), {
          ...formData,
          createdAt: new Date()
        });
        showMessage('Foto adicionada à galeria!');
      }
      closeModal();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      showMessage('Erro ao salvar foto. Verifique suas permissões.');
    }
  };

  const handleEdit = (item: GalleryItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description || '',
      url: item.url
    });
    setShowModal(true);
    setActiveMenuId(null);
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Tem certeza que deseja remover "${title}" da galeria?`)) {
      try {
        await deleteDoc(doc(db, 'gallery', id));
        showMessage('Foto removida da galeria!');
        setActiveMenuId(null);
      } catch (error) {
        console.error('Erro ao deletar:', error);
        showMessage('Erro ao remover foto.');
      }
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({ title: '', description: '', url: '' });
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg text-[10px] font-bold uppercase tracking-widest text-center ${message.includes('Erro') ? 'bg-red-500/20 text-red-500 border border-red-500/20' : 'bg-green-500/20 text-green-500 border border-green-500/20'}`}>
          {message}
        </div>
      )}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-serif text-3xl font-bold text-stone-100">Galeria de Fotos</h2>
          <p className="text-stone-500">Gerencie as imagens exibidas no site público.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center space-x-2 rounded-lg bg-amber-600 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-amber-700 shadow-xl shadow-amber-900/20 transition-all"
        >
          <Plus size={18} />
          <span>Adicionar Foto</span>
        </button>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {galleryItems.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-white/5 bg-stone-900 p-16 text-center">
            <ImageIcon size={48} className="mx-auto text-stone-700 mb-4" />
            <p className="text-stone-500 text-lg font-semibold mb-2">Nenhuma foto na galeria</p>
            <p className="text-stone-600 text-sm">Clique em "Adicionar Foto" para começar</p>
          </div>
        ) : (
          galleryItems.map((item) => (
            <div key={item.id} className="group relative aspect-square overflow-hidden rounded-xl bg-stone-900 border border-white/5 shadow-xl hover:border-amber-500/30 transition-all">
              <img 
                src={item.url} 
                alt={item.title} 
                className="h-full w-full object-cover opacity-90 group-hover:opacity-100 transition-all group-hover:scale-105 duration-500"
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-transparent opacity-0 group-hover:opacity-100 transition-all">
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-bold text-sm mb-1 uppercase tracking-wide">{item.title}</h3>
                  {item.description && (
                    <p className="text-stone-400 text-xs line-clamp-2">{item.description}</p>
                  )}
                </div>
              </div>

              {/* Menu Button */}
              <div className="absolute top-3 right-3">
                <button 
                  onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                  className="p-2 rounded-full bg-stone-950/80 backdrop-blur-sm text-stone-400 hover:text-white hover:bg-stone-900 transition-all opacity-0 group-hover:opacity-100"
                >
                  <MoreVertical size={16} />
                </button>

                {activeMenuId === item.id && (
                  <div ref={menuRef} className="absolute right-0 top-10 z-50 w-48 rounded-lg bg-stone-800 border border-white/10 shadow-xl overflow-hidden">
                    <div className="py-1">
                      <button 
                        onClick={() => handleEdit(item)}
                        className="flex w-full items-center gap-2 px-4 py-2 text-xs text-stone-300 hover:bg-stone-700 hover:text-white"
                      >
                        <Edit2 size={12} /> Editar
                      </button>

                      <div className="h-px bg-white/10 my-1"></div>

                      <button 
                        onClick={() => handleDelete(item.id, item.title)}
                        className="flex w-full items-center gap-2 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 size={12} /> Excluir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info Box */}
      <div className="rounded-xl border border-white/5 bg-stone-900 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-600/10 rounded-lg">
            <ImageIcon size={20} className="text-amber-500" />
          </div>
          <div>
            <h3 className="font-bold text-stone-100 mb-2">Dicas para Fotos da Galeria</h3>
            <ul className="text-stone-400 text-sm space-y-2">
              <li>• Use imagens de alta qualidade (mínimo 1200x800px)</li>
              <li>• Formato recomendado: JPG ou PNG</li>
              <li>• Tamanho máximo: 5MB por imagem</li>
              <li>• As fotos aparecem automaticamente no site público</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-stone-900 border border-white/10 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-xl font-bold text-stone-100">
                {editingItem ? 'Editar Foto' : 'Adicionar Nova Foto'}
              </h3>
              <button onClick={closeModal} className="text-stone-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Upload Area */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-3 block">
                  Imagem *
                </label>
                
                {formData.url ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-stone-950 border border-white/5">
                    <img 
                      src={formData.url} 
                      alt="Preview" 
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, url: ''})}
                      className="absolute top-3 right-3 p-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-white/10 rounded-xl p-12 text-center hover:border-amber-500/50 transition-all">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="imageUpload"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                      disabled={uploading}
                    />
                    <label 
                      htmlFor="imageUpload" 
                      className="cursor-pointer flex flex-col items-center"
                    >
                      {uploading ? (
                        <>
                          <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent mb-4"></div>
                          <p className="text-stone-400 font-semibold">Enviando imagem...</p>
                        </>
                      ) : (
                        <>
                          <Upload size={48} className="text-stone-600 mb-4" />
                          <p className="text-stone-300 font-semibold mb-2">
                            Clique para selecionar uma imagem
                          </p>
                          <p className="text-stone-600 text-sm">
                            JPG, PNG ou WEBP (máx 5MB)
                          </p>
                        </>
                      )}
                    </label>
                  </div>
                )}

                {/* URL Manual */}
                <div className="mt-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2">
                    Ou cole a URL da imagem:
                  </p>
                  <input 
                    type="url" 
                    value={formData.url}
                    onChange={e => setFormData({...formData, url: e.target.value})}
                    className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none"
                    placeholder="https://exemplo.com/imagem.jpg"
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2 block">
                  Título *
                </label>
                <input 
                  type="text" 
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none"
                  placeholder="Ex: Salão Principal, Decoração de Mesa"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2 block">
                  Descrição (Opcional)
                </label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none resize-none"
                  placeholder="Adicione uma descrição para a foto..."
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-lg border border-white/10 bg-stone-950 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:bg-stone-800 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={uploading}
                  className="flex-1 rounded-lg bg-amber-600 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-amber-700 transition-all disabled:opacity-50"
                >
                  {editingItem ? 'Salvar Alterações' : 'Adicionar à Galeria'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryPage;
