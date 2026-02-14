import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Edit2, X, Image as ImageIcon, MoreVertical, Plus, Loader2 } from 'lucide-react';
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
  const [uploadProgress, setUploadProgress] = useState('');
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

  // Função para comprimir imagem
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Redimensionar se muito grande (máx 1920px)
          const maxSize = 1920;
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize;
              width = maxSize;
            } else {
              width = (width / height) * maxSize;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Converter para blob com qualidade 85%
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Erro ao comprimir imagem'));
              }
            },
            'image/jpeg',
            0.85
          );
        };
        img.onerror = () => reject(new Error('Erro ao carregar imagem'));
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    });
  };

  const uploadToImgBB = async (file: File | Blob): Promise<string> => {
    setUploadProgress('Preparando upload...');
    
    const formData = new FormData();
    formData.append('image', file);

    setUploadProgress('Enviando para servidor...');

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Erro ao fazer upload da imagem');
    }

    setUploadProgress('Processando...');
    const data = await response.json();
    return data.data.url;
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showMessage('Erro: Por favor, selecione uma imagem válida.');
      return;
    }

    // Aumentar limite para 10MB (antes da compressão)
    if (file.size > 10 * 1024 * 1024) {
      showMessage('Erro: Imagem muito grande. Use imagens menores que 10MB.');
      return;
    }

    setUploading(true);
    setUploadProgress('Comprimindo imagem...');

    try {
      // Comprimir a imagem primeiro
      const compressedBlob = await compressImage(file);
      
      // Verificar tamanho após compressão
      const compressedSizeMB = (compressedBlob.size / (1024 * 1024)).toFixed(2);
      console.log(`Tamanho original: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
      console.log(`Tamanho comprimido: ${compressedSizeMB}MB`);

      // Upload da imagem comprimida
      const imageUrl = await uploadToImgBB(compressedBlob);
      
      setFormData({...formData, url: imageUrl});
      setUploadProgress('');
      showMessage('✅ Imagem carregada! Adicione um título e salve.');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      setUploadProgress('');
      showMessage('❌ Erro ao enviar imagem. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.url) {
      showMessage('❌ Erro: Adicione um título e uma imagem.');
      return;
    }

    setUploading(true);
    setUploadProgress('Salvando no banco de dados...');

    try {
      if (editingItem) {
        await updateDoc(doc(db, 'gallery', editingItem.id), {
          title: formData.title,
          description: formData.description,
          url: formData.url
        });
        showMessage('✅ Foto atualizada com sucesso!');
      } else {
        await addDoc(collection(db, 'gallery'), {
          ...formData,
          createdAt: new Date()
        });
        showMessage('✅ Foto adicionada à galeria!');
      }
      setUploadProgress('');
      closeModal();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setUploadProgress('');
      showMessage('❌ Erro ao salvar foto. Verifique suas permissões.');
    } finally {
      setUploading(false);
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
      setUploading(true);
      try {
        await deleteDoc(doc(db, 'gallery', id));
        showMessage('✅ Foto removida da galeria!');
        setActiveMenuId(null);
      } catch (error) {
        console.error('Erro ao deletar:', error);
        showMessage('❌ Erro ao remover foto.');
      } finally {
        setUploading(false);
      }
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({ title: '', description: '', url: '' });
    setUploadProgress('');
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg text-sm font-bold text-center ${message.includes('❌') || message.includes('Erro') ? 'bg-red-500/20 text-red-500 border border-red-500/20' : 'bg-green-500/20 text-green-500 border border-green-500/20'}`}>
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
          disabled={uploading}
          className="flex items-center justify-center space-x-2 rounded-lg bg-amber-600 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-amber-700 shadow-xl shadow-amber-900/20 transition-all disabled:opacity-50"
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
                loading="lazy"
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
            <h3 className="font-bold text-stone-100 mb-2">✨ Otimização Automática</h3>
            <ul className="text-stone-400 text-sm space-y-2">
              <li>• <strong>Compressão inteligente:</strong> Imagens são automaticamente otimizadas</li>
              <li>• <strong>Upload rápido:</strong> Processamento local antes do envio</li>
              <li>• <strong>Tamanho máximo:</strong> 10MB (comprimido para ~1-2MB)</li>
              <li>• <strong>Formato:</strong> JPG, PNG ou WEBP</li>
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
              <button 
                onClick={closeModal} 
                disabled={uploading}
                className="text-stone-500 hover:text-white disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Progress Bar */}
            {uploadProgress && (
              <div className="mb-6 p-4 rounded-lg bg-amber-600/10 border border-amber-600/20">
                <div className="flex items-center gap-3">
                  <Loader2 className="animate-spin text-amber-500" size={20} />
                  <span className="text-amber-500 font-semibold">{uploadProgress}</span>
                </div>
              </div>
            )}
            
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
                      disabled={uploading}
                      className="absolute top-3 right-3 p-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-50"
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
                      className={`cursor-pointer flex flex-col items-center ${uploading ? 'pointer-events-none opacity-50' : ''}`}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="animate-spin text-amber-500 mb-4" size={48} />
                          <p className="text-stone-400 font-semibold">{uploadProgress}</p>
                        </>
                      ) : (
                        <>
                          <Upload size={48} className="text-stone-600 mb-4" />
                          <p className="text-stone-300 font-semibold mb-2">
                            📸 Clique para selecionar uma imagem
                          </p>
                          <p className="text-stone-600 text-sm">
                            JPG, PNG ou WEBP (máx 10MB)
                          </p>
                          <p className="text-amber-500 text-xs mt-2 font-semibold">
                            ⚡ Compressão automática ativada
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
                    disabled={uploading}
                    className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none disabled:opacity-50"
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
                  disabled={uploading}
                  className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none disabled:opacity-50"
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
                  disabled={uploading}
                  rows={3}
                  className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none resize-none disabled:opacity-50"
                  placeholder="Adicione uma descrição para a foto..."
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={closeModal}
                  disabled={uploading}
                  className="flex-1 rounded-lg border border-white/10 bg-stone-950 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:bg-stone-800 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={uploading || !formData.url || !formData.title}
                  className="flex-1 rounded-lg bg-amber-600 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-amber-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading && <Loader2 className="animate-spin" size={14} />}
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
