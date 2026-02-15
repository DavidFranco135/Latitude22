import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Edit2, X, Image as ImageIcon, MoreVertical, Plus, Loader2, Folder, ArrowLeft } from 'lucide-react';
import { collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

const IMGBB_API_KEY = '9f8d8580331d26fcb2e3fae394e63b7f';

interface Album {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  photoCount?: number;
  createdAt?: any;
}

interface Photo {
  id: string;
  albumId: string;
  url: string;
  title: string;
  description?: string;
  createdAt?: any;
}

const GalleryPage: React.FC = () => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [message, setMessage] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [albumForm, setAlbumForm] = useState({ name: '', description: '' });
  const [photoForm, setPhotoForm] = useState({ title: '', description: '', url: '' });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'albums'), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Album));
      setAlbums(items.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      }));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedAlbum) {
      setPhotos([]);
      return;
    }
    const q = query(collection(db, 'photos'), where('albumId', '==', selectedAlbum.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Photo));
      setPhotos(items.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      }));
    });
    return () => unsubscribe();
  }, [selectedAlbum]);

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
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Erro ao comprimir'));
          }, 'image/jpeg', 0.85);
        };
      };
    });
  };

  const uploadToImgBB = async (file: File): Promise<string> => {
    setUploadProgress('Comprimindo imagem...');
    const compressedBlob = await compressImage(file);
    
    setUploadProgress('Enviando para ImgBB...');
    const formData = new FormData();
    formData.append('image', compressedBlob);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Erro ao enviar');
    
    setUploadProgress('Processando...');
    const data = await response.json();
    return data.data.url;
  };

  const handlePhotoUpload = async (file: File) => {
    if (!file || !selectedAlbum) return;

    if (!file.type.startsWith('image/')) {
      showMessage('❌ Selecione uma imagem válida.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showMessage('❌ Imagem muito grande. Máximo 10MB.');
      return;
    }

    setUploading(true);
    try {
      const imageUrl = await uploadToImgBB(file);
      setPhotoForm({...photoForm, url: imageUrl});
      setUploadProgress('');
      showMessage('✅ Imagem carregada!');
    } catch (error) {
      console.error('Erro:', error);
      showMessage('❌ Erro ao enviar.');
      setUploadProgress('');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!albumForm.name) {
      showMessage('❌ Adicione um nome.');
      return;
    }

    setUploading(true);
    try {
      if (editingAlbum) {
        await updateDoc(doc(db, 'albums', editingAlbum.id), {
          name: albumForm.name,
          description: albumForm.description
        });
        showMessage('✅ Álbum atualizado!');
      } else {
        await addDoc(collection(db, 'albums'), {
          name: albumForm.name,
          description: albumForm.description,
          photoCount: 0,
          createdAt: new Date()
        });
        showMessage('✅ Álbum criado!');
      }
      closeAlbumModal();
    } catch (error) {
      console.error('Erro:', error);
      showMessage('❌ Erro ao salvar.');
    } finally {
      setUploading(false);
    }
  };

  const handleSavePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoForm.title || !photoForm.url || !selectedAlbum) {
      showMessage('❌ Adicione título e imagem.');
      return;
    }

    setUploading(true);
    try {
      if (editingPhoto) {
        await updateDoc(doc(db, 'photos', editingPhoto.id), {
          title: photoForm.title,
          description: photoForm.description
        });
        showMessage('✅ Foto atualizada!');
      } else {
        await addDoc(collection(db, 'photos'), {
          albumId: selectedAlbum.id,
          title: photoForm.title,
          description: photoForm.description,
          url: photoForm.url,
          createdAt: new Date()
        });
        
        await updateDoc(doc(db, 'albums', selectedAlbum.id), {
          photoCount: photos.length + 1,
          coverUrl: photoForm.url
        });
        
        showMessage('✅ Foto adicionada!');
      }
      closePhotoModal();
    } catch (error) {
      console.error('Erro:', error);
      showMessage('❌ Erro ao salvar.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAlbum = async (id: string, name: string) => {
    if (!window.confirm(`Remover álbum "${name}" e todas as fotos?`)) return;

    setUploading(true);
    try {
      const photosQuery = query(collection(db, 'photos'), where('albumId', '==', id));
      const photosSnapshot = await getDocs(photosQuery);
      
      for (const photoDoc of photosSnapshot.docs) {
        await deleteDoc(photoDoc.ref);
      }

      await deleteDoc(doc(db, 'albums', id));
      showMessage('✅ Álbum removido!');
      setActiveMenuId(null);
    } catch (error) {
      console.error('Erro:', error);
      showMessage('❌ Erro ao remover.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (id: string, title: string) => {
    if (!window.confirm(`Remover "${title}"?`)) return;

    setUploading(true);
    try {
      await deleteDoc(doc(db, 'photos', id));
      
      if (selectedAlbum) {
        await updateDoc(doc(db, 'albums', selectedAlbum.id), {
          photoCount: Math.max(0, photos.length - 1)
        });
      }

      showMessage('✅ Foto removida!');
      setActiveMenuId(null);
    } catch (error) {
      console.error('Erro:', error);
      showMessage('❌ Erro ao remover.');
    } finally {
      setUploading(false);
    }
  };

  const closeAlbumModal = () => {
    setShowAlbumModal(false);
    setEditingAlbum(null);
    setAlbumForm({ name: '', description: '' });
  };

  const closePhotoModal = () => {
    setShowPhotoModal(false);
    setEditingPhoto(null);
    setPhotoForm({ title: '', description: '', url: '' });
    setUploadProgress('');
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg text-sm font-bold text-center ${message.includes('❌') ? 'bg-red-500/20 text-red-500 border border-red-500/20' : 'bg-green-500/20 text-green-500 border border-green-500/20'}`}>
          {message}
        </div>
      )}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          {selectedAlbum && (
            <button onClick={() => setSelectedAlbum(null)} className="p-2 rounded-lg bg-stone-900 border border-white/5 text-stone-400 hover:text-white transition-all">
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h2 className="font-serif text-3xl font-bold text-stone-100">
              {selectedAlbum ? selectedAlbum.name : 'Galeria de Fotos'}
            </h2>
            <p className="text-stone-500">
              {selectedAlbum ? `${photos.length} foto(s)` : `${albums.length} álbum(ns)`}
            </p>
          </div>
        </div>
        <button 
          onClick={() => selectedAlbum ? setShowPhotoModal(true) : setShowAlbumModal(true)}
          disabled={uploading}
          className="flex items-center justify-center space-x-2 rounded-lg bg-amber-600 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-amber-700 shadow-xl transition-all disabled:opacity-50"
        >
          <Plus size={18} />
          <span>{selectedAlbum ? 'Adicionar Foto' : 'Criar Álbum'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {!selectedAlbum ? (
          albums.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-white/5 bg-stone-900 p-16 text-center">
              <Folder size={48} className="mx-auto text-stone-700 mb-4" />
              <p className="text-stone-500 text-lg font-semibold mb-2">Nenhum álbum</p>
              <p className="text-stone-600 text-sm">Clique em "Criar Álbum"</p>
            </div>
          ) : (
            albums.map((album) => (
              <div key={album.id} onClick={() => setSelectedAlbum(album)} className="group relative aspect-square overflow-hidden rounded-xl bg-stone-900 border border-white/5 shadow-xl hover:border-amber-500/30 transition-all cursor-pointer">
                {album.coverUrl ? (
                  <img src={album.coverUrl} alt={album.name} className="h-full w-full object-cover opacity-70 group-hover:opacity-90 transition-all" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-stone-950">
                    <Folder size={64} className="text-stone-700" />
                  </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-transparent">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-white font-bold text-lg mb-1">{album.name}</h3>
                    <p className="text-stone-400 text-xs">{album.photoCount || 0} fotos</p>
                  </div>
                </div>

                <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setActiveMenuId(activeMenuId === album.id ? null : album.id)} className="p-2 rounded-full bg-stone-950/80 backdrop-blur-sm text-stone-400 hover:text-white hover:bg-stone-900 transition-all opacity-0 group-hover:opacity-100">
                    <MoreVertical size={16} />
                  </button>

                  {activeMenuId === album.id && (
                    <div ref={menuRef} className="absolute right-0 top-10 z-50 w-48 rounded-lg bg-stone-800 border border-white/10 shadow-xl overflow-hidden">
                      <button onClick={() => { setEditingAlbum(album); setAlbumForm({ name: album.name, description: album.description || '' }); setShowAlbumModal(true); setActiveMenuId(null); }} className="flex w-full items-center gap-2 px-4 py-2 text-xs text-stone-300 hover:bg-stone-700 hover:text-white">
                        <Edit2 size={12} /> Editar
                      </button>
                      <div className="h-px bg-white/10"></div>
                      <button onClick={() => handleDeleteAlbum(album.id, album.name)} className="flex w-full items-center gap-2 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10">
                        <Trash2 size={12} /> Excluir
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )
        ) : (
          photos.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-white/5 bg-stone-900 p-16 text-center">
              <ImageIcon size={48} className="mx-auto text-stone-700 mb-4" />
              <p className="text-stone-500 text-lg font-semibold mb-2">Nenhuma foto</p>
              <p className="text-stone-600 text-sm">Clique em "Adicionar Foto"</p>
            </div>
          ) : (
            photos.map((photo) => (
              <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-xl bg-stone-900 border border-white/5 shadow-xl hover:border-amber-500/30 transition-all">
                <img src={photo.url} alt={photo.title} className="h-full w-full object-cover opacity-90 group-hover:opacity-100 transition-all group-hover:scale-105 duration-500" loading="lazy" />
                
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-transparent opacity-0 group-hover:opacity-100 transition-all">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-white font-bold text-sm mb-1 uppercase tracking-wide">{photo.title}</h3>
                    {photo.description && <p className="text-stone-400 text-xs line-clamp-2">{photo.description}</p>}
                  </div>
                </div>

                <div className="absolute top-3 right-3">
                  <button onClick={() => setActiveMenuId(activeMenuId === photo.id ? null : photo.id)} className="p-2 rounded-full bg-stone-950/80 backdrop-blur-sm text-stone-400 hover:text-white hover:bg-stone-900 transition-all opacity-0 group-hover:opacity-100">
                    <MoreVertical size={16} />
                  </button>

                  {activeMenuId === photo.id && (
                    <div ref={menuRef} className="absolute right-0 top-10 z-50 w-48 rounded-lg bg-stone-800 border border-white/10 shadow-xl overflow-hidden">
                      <button onClick={() => { setEditingPhoto(photo); setPhotoForm({ title: photo.title, description: photo.description || '', url: photo.url }); setShowPhotoModal(true); setActiveMenuId(null); }} className="flex w-full items-center gap-2 px-4 py-2 text-xs text-stone-300 hover:bg-stone-700 hover:text-white">
                        <Edit2 size={12} /> Editar
                      </button>
                      <div className="h-px bg-white/10"></div>
                      <button onClick={() => handleDeletePhoto(photo.id, photo.title)} className="flex w-full items-center gap-2 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10">
                        <Trash2 size={12} /> Excluir
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )
        )}
      </div>

      {/* Modal Álbum */}
      {showAlbumModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-stone-900 border border-white/10 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-xl font-bold text-stone-100">{editingAlbum ? 'Editar Álbum' : 'Criar Álbum'}</h3>
              <button onClick={closeAlbumModal} disabled={uploading} className="text-stone-500 hover:text-white"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSaveAlbum} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Nome *</label>
                <input type="text" required value={albumForm.name} onChange={e => setAlbumForm({...albumForm, name: e.target.value})} disabled={uploading} className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none" placeholder="Ex: Casamento Maria & João" />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Descrição</label>
                <textarea value={albumForm.description} onChange={e => setAlbumForm({...albumForm, description: e.target.value})} disabled={uploading} rows={3} className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none resize-none" placeholder="Opcional" />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={closeAlbumModal} disabled={uploading} className="flex-1 rounded-lg border border-white/10 bg-stone-950 px-6 py-3 text-xs font-bold uppercase tracking-widest text-stone-400 hover:bg-stone-800 transition-all">Cancelar</button>
                <button type="submit" disabled={uploading} className="flex-1 rounded-lg bg-amber-600 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-amber-700 transition-all disabled:opacity-50">{editingAlbum ? 'Salvar' : 'Criar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Foto */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-stone-900 border border-white/10 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-xl font-bold text-stone-100">{editingPhoto ? 'Editar Foto' : 'Adicionar Foto'}</h3>
              <button onClick={closePhotoModal} disabled={uploading} className="text-stone-500 hover:text-white"><X size={20} /></button>
            </div>

            {uploadProgress && (
              <div className="mb-6 p-4 rounded-lg bg-amber-600/10 border border-amber-600/20">
                <div className="flex items-center gap-3">
                  <Loader2 className="animate-spin text-amber-500" size={20} />
                  <span className="text-amber-500 font-semibold">{uploadProgress}</span>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSavePhoto} className="space-y-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-3 block">Imagem *</label>
                
                {photoForm.url ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-stone-950 border border-white/5">
                    <img src={photoForm.url} alt="Preview" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setPhotoForm({...photoForm, url: ''})} disabled={uploading} className="absolute top-3 right-3 p-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-white/10 rounded-xl p-12 text-center hover:border-amber-500/50 transition-all">
                    <input type="file" accept="image/*" className="hidden" id="photoUpload" onChange={(e) => { const file = e.target.files?.[0]; if (file) handlePhotoUpload(file); }} disabled={uploading} />
                    <label htmlFor="photoUpload" className={`cursor-pointer flex flex-col items-center ${uploading ? 'pointer-events-none opacity-50' : ''}`}>
                      {uploading ? (
                        <>
                          <Loader2 className="animate-spin text-amber-500 mb-4" size={48} />
                          <p className="text-stone-400 font-semibold">{uploadProgress}</p>
                        </>
                      ) : (
                        <>
                          <Upload size={48} className="text-stone-600 mb-4" />
                          <p className="text-stone-300 font-semibold mb-2">📸 Selecionar Imagem</p>
                          <p className="text-stone-600 text-sm">JPG, PNG (máx 10MB)</p>
                        </>
                      )}
                    </label>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Título *</label>
                <input type="text" required value={photoForm.title} onChange={e => setPhotoForm({...photoForm, title: e.target.value})} disabled={uploading} className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none" placeholder="Ex: Cerimônia" />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Descrição</label>
                <textarea value={photoForm.description} onChange={e => setPhotoForm({...photoForm, description: e.target.value})} disabled={uploading} rows={3} className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none resize-none" placeholder="Opcional" />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={closePhotoModal} disabled={uploading} className="flex-1 rounded-lg border border-white/10 bg-stone-950 px-6 py-3 text-xs font-bold uppercase tracking-widest text-stone-400 hover:bg-stone-800 transition-all">Cancelar</button>
                <button type="submit" disabled={uploading || !photoForm.url || !photoForm.title} className="flex-1 rounded-lg bg-amber-600 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-amber-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {uploading && <Loader2 className="animate-spin" size={14} />}
                  {editingPhoto ? 'Salvar' : 'Adicionar'}
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
