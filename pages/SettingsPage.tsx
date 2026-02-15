import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, Camera, Instagram, MessageCircle, Globe, Sparkles, Upload, 
  X, Users, MoreVertical, Shield, Trash2, Edit2, CheckCircle, Ban, Image, Loader2,
  Plus, ArrowUp, ArrowDown, ImageIcon, Video, Type, Mail
} from 'lucide-react';
import { doc, getDoc, setDoc, collection, onSnapshot, addDoc, deleteDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';

const IMGBB_API_KEY = '9f8d8580331d26fcb2e3fae394e63b7f';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  photoUrl: string;
  hasAccess: boolean;
}

interface SlideItem {
  id: string;
  type: 'image' | 'video' | 'text';
  url?: string;
  title?: string;
  description?: string;
  backgroundColor?: string;
  textColor?: string;
  order: number;
}

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<any>({
    coverImage: '',
    heroImage: '',
    aboutImage: '',
    venueTitle: 'LATITUDE22',
    venueSubtitle: 'Eventos & Festas',
    address: '',
    whatsapp: '',
    instagram: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingAbout, setUploadingAbout] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [newMember, setNewMember] = useState<Partial<TeamMember>>({
    name: '', role: '', email: '', hasAccess: false, photoUrl: ''
  });
  
  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [showSlideModal, setShowSlideModal] = useState(false);
  const [editingSlide, setEditingSlide] = useState<SlideItem | null>(null);
  const [uploadingSlide, setUploadingSlide] = useState(false);
  const [newSlide, setNewSlide] = useState<Partial<SlideItem>>({
    type: 'image',
    title: '',
    description: '',
    url: '',
    backgroundColor: '#0c0a09',
    textColor: '#e7e5e4',
    order: 0
  });
  
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'general'));
        if (docSnap.exists()) {
          setSettings(docSnap.data());
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'team'), (snapshot) => {
      const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamMember));
      setTeamMembers(members);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'slides'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SlideItem));
      setSlides(items);
    });
    return () => unsub();
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

  // FUNÇÃO DE UPLOAD PARA IMGBB - CORRIGIDA
  // UPLOAD IMGBB - VERSÃO CORRIGIDA E TESTADA
  const uploadToImgBB = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        try {
          setUploadProgress('Enviando para ImgBB...');
          
          // Extrai APENAS a parte base64 (remove "data:image/...;base64,")
          const base64String = (reader.result as string).split(',')[1];
          
          if (!base64String) {
            throw new Error('Falha ao converter imagem');
          }
          
          const formData = new FormData();
          formData.append('image', base64String);
          
          const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
          });
          
          if (!response.ok) {
            const errorData = await response.text();
            console.error('Erro ImgBB Response:', errorData);
            throw new Error(`Falha HTTP: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (data.success && data.data && data.data.url) {
            setUploadProgress('');
            resolve(data.data.url);
          } else {
            console.error('Resposta ImgBB:', data);
            throw new Error('ImgBB não retornou URL válida');
          }
        } catch (error) {
          console.error('Erro no upload:', error);
          setUploadProgress('');
          reject(error);
        }
      };
      
      reader.onerror = () => {
        setUploadProgress('');
        reject(new Error('Erro ao ler arquivo'));
      };
      
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (file: File, imageType: 'cover' | 'hero' | 'about') => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showMessage('❌ Erro: Selecione uma imagem válida.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showMessage('❌ Erro: Imagem muito grande. Máximo 10MB.');
      return;
    }

    const setUploading = imageType === 'cover' ? setUploadingCover : imageType === 'hero' ? setUploadingHero : setUploadingAbout;
    setUploading(true);

    try {
      const imageUrl = await uploadToImgBB(file);
      const newSettings = { ...settings };
      if (imageType === 'cover') newSettings.coverImage = imageUrl;
      else if (imageType === 'hero') newSettings.heroImage = imageUrl;
      else newSettings.aboutImage = imageUrl;
      
      setSettings(newSettings);
      await setDoc(doc(db, 'settings', 'general'), newSettings, { merge: true });
      
      setUploadProgress('');
      showMessage('✅ Imagem carregada e salva!');
    } catch (error) {
      console.error('Erro:', error);
      setUploadProgress('');
      showMessage('❌ Erro ao enviar imagem.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'general'), settings, { merge: true });
      showMessage('✅ Configurações salvas!');
    } catch (err) {
      console.error('Erro:', err);
      showMessage('❌ Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  // TEAM MEMBERS
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name || !newMember.email) {
      showMessage('❌ Preencha nome e email!');
      return;
    }

    try {
      if (editingMember) {
        await updateDoc(doc(db, 'team', editingMember.id), {
          name: newMember.name,
          role: newMember.role || '',
          email: newMember.email,
          photoUrl: newMember.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(newMember.name)}`
        });
        showMessage('✅ Membro atualizado!');
      } else {
        await addDoc(collection(db, 'team'), {
          ...newMember,
          photoUrl: newMember.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(newMember.name!)}`,
          hasAccess: false
        });
        showMessage('✅ Membro adicionado!');
      }
      closeModal();
    } catch (error) {
      console.error('Erro:', error);
      showMessage('❌ Erro ao salvar membro.');
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (window.confirm('Excluir este membro?')) {
      try {
        await deleteDoc(doc(db, 'team', id));
        showMessage('✅ Membro removido!');
        setActiveMenuId(null);
      } catch (error) {
        console.error('Erro:', error);
        showMessage('❌ Erro ao remover.');
      }
    }
  };

  const toggleAccess = async (member: TeamMember) => {
    try {
      await updateDoc(doc(db, 'team', member.id), { hasAccess: !member.hasAccess });
      showMessage(member.hasAccess ? '❌ Acesso revogado!' : '✅ Acesso liberado!');
      setActiveMenuId(null);
    } catch (error) {
      console.error('Erro:', error);
      showMessage('❌ Erro ao alterar acesso.');
    }
  };

  const openEditModal = (member: TeamMember) => {
    setEditingMember(member);
    setNewMember({
      name: member.name,
      role: member.role,
      email: member.email,
      photoUrl: member.photoUrl,
      hasAccess: member.hasAccess
    });
    setShowMemberModal(true);
    setActiveMenuId(null);
  };

  const closeModal = () => {
    setShowMemberModal(false);
    setEditingMember(null);
    setNewMember({ name: '', role: '', email: '', hasAccess: false, photoUrl: '' });
  };

  // SLIDES - Upload de imagens para slides (CORRIGIDO)
  const handleSlideFileUpload = async (file: File) => {
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      showMessage('❌ Selecione uma imagem ou vídeo.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      showMessage('❌ Arquivo muito grande. Máximo 50MB.');
      return;
    }

    setUploadingSlide(true);

    try {
      if (isImage) {
        console.log('🔄 Iniciando upload de imagem para slide:', file.name);
        const imageUrl = await uploadToImgBB(file);
        console.log('✅ Upload concluído! URL:', imageUrl);
        
        // IMPORTANTE: Usar função callback para garantir que o estado seja atualizado
        setNewSlide(prevSlide => ({
          ...prevSlide,
          url: imageUrl,
          type: 'image'
        }));
        
        setUploadProgress('');
        showMessage('✅ Imagem carregada! Agora adicione título e clique em Adicionar.');
        console.log('✅ Estado atualizado com URL:', imageUrl);
      } else {
        showMessage('⚠️ Para vídeos, insira a URL diretamente');
      }
    } catch (error) {
      console.error('❌ Erro no upload do slide:', error);
      setUploadProgress('');
      showMessage('❌ Erro ao fazer upload. Tente novamente.');
    } finally {
      setUploadingSlide(false);
    }
  };

  const handleSaveSlide = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('🔄 Tentando salvar slide. Estado atual:', newSlide);

    if (newSlide.type !== 'text' && !newSlide.url) {
      console.error('❌ URL da imagem está vazia! Estado:', newSlide);
      showMessage('❌ Adicione uma imagem/vídeo ou URL!');
      return;
    }

    if (newSlide.type === 'text' && !newSlide.title && !newSlide.description) {
      showMessage('❌ Adicione título ou descrição!');
      return;
    }

    try {
      const slideData = {
        type: newSlide.type,
        url: newSlide.url || '',
        title: newSlide.title || '',
        description: newSlide.description || '',
        backgroundColor: newSlide.backgroundColor || '#0c0a09',
        textColor: newSlide.textColor || '#e7e5e4',
        order: editingSlide ? editingSlide.order : slides.length
      };

      console.log('💾 Salvando slide com dados:', slideData);

      if (editingSlide) {
        await updateDoc(doc(db, 'slides', editingSlide.id), slideData);
        console.log('✅ Slide atualizado no Firestore');
        showMessage('✅ Slide atualizado!');
      } else {
        const docRef = await addDoc(collection(db, 'slides'), slideData);
        console.log('✅ Slide salvo no Firestore com ID:', docRef.id);
        showMessage('✅ Slide adicionado!');
      }
      closeSlideModal();
    } catch (error) {
      console.error('❌ Erro ao salvar slide no Firestore:', error);
      showMessage('❌ Erro ao salvar slide. Verifique o console.');
    }
  };

  const handleDeleteSlide = async (id: string) => {
    if (window.confirm('Excluir este slide?')) {
      try {
        await deleteDoc(doc(db, 'slides', id));
        showMessage('✅ Slide removido!');
        setActiveMenuId(null);
      } catch (error) {
        console.error('Erro:', error);
        showMessage('❌ Erro ao remover.');
      }
    }
  };

  const moveSlide = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = slides.findIndex(s => s.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= slides.length) return;

    try {
      await updateDoc(doc(db, 'slides', slides[currentIndex].id), { order: newIndex });
      await updateDoc(doc(db, 'slides', slides[newIndex].id), { order: currentIndex });
      showMessage('✅ Ordem atualizada!');
    } catch (error) {
      console.error('Erro:', error);
      showMessage('❌ Erro ao reordenar.');
    }
  };

  const openEditSlideModal = (slide: SlideItem) => {
    setEditingSlide(slide);
    setNewSlide({
      type: slide.type,
      url: slide.url || '',
      title: slide.title || '',
      description: slide.description || '',
      backgroundColor: slide.backgroundColor || '#0c0a09',
      textColor: slide.textColor || '#e7e5e4',
      order: slide.order
    });
    setShowSlideModal(true);
    setActiveMenuId(null);
  };

  const closeSlideModal = () => {
    setShowSlideModal(false);
    setEditingSlide(null);
    setNewSlide({
      type: 'image',
      title: '',
      description: '',
      url: '',
      backgroundColor: '#0c0a09',
      textColor: '#e7e5e4',
      order: 0
    });
  };

  return (
    <div className="space-y-8">
      {message && (
        <div className={`p-4 rounded-lg text-xs font-bold uppercase tracking-widest text-center ${
          message.includes('❌') || message.includes('Erro') 
            ? 'bg-red-500/20 text-red-500 border border-red-500/20' 
            : 'bg-green-500/20 text-green-500 border border-green-500/20'
        }`}>
          {message}
        </div>
      )}

      <div>
        <h2 className="font-serif text-4xl font-bold text-stone-100">Configurações do Site</h2>
        <p className="text-stone-500 mt-2">Gerencie a aparência e conteúdo da página pública.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Imagens Principais */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/5 bg-stone-900 p-8 shadow-2xl">
            <h3 className="font-bold text-stone-100 mb-6 flex items-center">
              <Camera size={18} className="mr-2 text-amber-500" />
              Imagens da Página
            </h3>

            {/* Capa Hero */}
            <div className="mb-6">
              <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">
                Imagem de Capa (Hero)
              </label>
              <div className="relative aspect-video rounded-xl overflow-hidden bg-stone-950 border border-white/5">
                {settings.coverImage ? (
                  <>
                    <img src={settings.coverImage} alt="Capa" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setSettings({ ...settings, coverImage: '' })}
                      className="absolute top-3 right-3 p-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="coverUpload"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, 'cover');
                      }}
                      disabled={uploadingCover}
                    />
                    <label
                      htmlFor="coverUpload"
                      className={`cursor-pointer flex flex-col items-center ${uploadingCover ? 'pointer-events-none' : ''}`}
                    >
                      {uploadingCover ? (
                        <>
                          <Loader2 className="animate-spin text-amber-500 mb-2" size={32} />
                          <p className="text-stone-500 text-xs">{uploadProgress}</p>
                        </>
                      ) : (
                        <>
                          <Upload size={32} className="text-stone-600 mb-2" />
                          <p className="text-stone-400 text-sm">Clique para enviar</p>
                        </>
                      )}
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Imagem About */}
            <div className="mb-6">
              <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">
                Imagem Sobre
              </label>
              <div className="relative aspect-video rounded-xl overflow-hidden bg-stone-950 border border-white/5">
                {settings.aboutImage ? (
                  <>
                    <img src={settings.aboutImage} alt="Sobre" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setSettings({ ...settings, aboutImage: '' })}
                      className="absolute top-3 right-3 p-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="aboutUpload"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, 'about');
                      }}
                      disabled={uploadingAbout}
                    />
                    <label
                      htmlFor="aboutUpload"
                      className={`cursor-pointer flex flex-col items-center ${uploadingAbout ? 'pointer-events-none' : ''}`}
                    >
                      {uploadingAbout ? (
                        <>
                          <Loader2 className="animate-spin text-amber-500 mb-2" size={32} />
                          <p className="text-stone-500 text-xs">{uploadProgress}</p>
                        </>
                      ) : (
                        <>
                          <Upload size={32} className="text-stone-600 mb-2" />
                          <p className="text-stone-400 text-sm">Clique para enviar</p>
                        </>
                      )}
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Informações do Site */}
          <div className="rounded-2xl border border-white/5 bg-stone-900 p-8 shadow-2xl">
            <h3 className="font-bold text-stone-100 mb-6 flex items-center">
              <Sparkles size={18} className="mr-2 text-amber-500" />
              Informações do Site
            </h3>

            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <Sparkles size={16} className="text-stone-400 w-32" />
                <input
                  type="text"
                  value={settings.venueTitle}
                  onChange={e => setSettings({...settings, venueTitle: e.target.value})}
                  className="flex-1 bg-transparent border-b border-white/10 py-2 text-sm text-stone-300 focus:border-amber-500 outline-none"
                  placeholder="Nome do Local"
                />
              </div>

              <div className="flex items-center gap-4">
                <Type size={16} className="text-stone-400 w-32" />
                <input
                  type="text"
                  value={settings.venueSubtitle}
                  onChange={e => setSettings({...settings, venueSubtitle: e.target.value})}
                  className="flex-1 bg-transparent border-b border-white/10 py-2 text-sm text-stone-300 focus:border-amber-500 outline-none"
                  placeholder="Subtítulo"
                />
              </div>

              <div className="flex items-center gap-4">
                <Mail size={16} className="text-stone-400 w-32" />
                <input
                  type="email"
                  value={settings.email}
                  onChange={e => setSettings({...settings, email: e.target.value})}
                  className="flex-1 bg-transparent border-b border-white/10 py-2 text-sm text-stone-300 focus:border-amber-500 outline-none"
                  placeholder="contato@email.com"
                />
              </div>

              <div className="flex items-center gap-4">
                <Instagram size={16} className="text-stone-400 w-32" />
                <input
                  type="text"
                  value={settings.instagram}
                  onChange={e => setSettings({...settings, instagram: e.target.value})}
                  className="flex-1 bg-transparent border-b border-white/10 py-2 text-sm text-stone-300 focus:border-amber-500 outline-none"
                  placeholder="@seuinstagram"
                />
              </div>

              <div className="flex items-center gap-4">
                <MessageCircle size={16} className="text-stone-400 w-32" />
                <input
                  type="text"
                  value={settings.whatsapp}
                  onChange={e => setSettings({...settings, whatsapp: e.target.value})}
                  className="flex-1 bg-transparent border-b border-white/10 py-2 text-sm text-stone-300 focus:border-amber-500 outline-none"
                  placeholder="5511999999999"
                />
              </div>

              <div className="flex items-center gap-4">
                <Globe size={16} className="text-stone-400 w-32" />
                <input
                  type="text"
                  value={settings.address}
                  onChange={e => setSettings({...settings, address: e.target.value})}
                  className="flex-1 bg-transparent border-b border-white/10 py-2 text-sm text-stone-300 focus:border-amber-500 outline-none"
                  placeholder="Endereço Completo"
                />
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button 
                onClick={handleSaveSettings}
                disabled={loading}
                className="flex items-center justify-center space-x-3 rounded-lg bg-amber-600 px-10 py-4 text-xs font-bold uppercase tracking-widest text-white hover:bg-amber-700 shadow-2xl shadow-amber-900/40 disabled:opacity-50 transition-all"
              >
                <Save size={16} />
                <span>{loading ? 'Salvando...' : 'Salvar Configurações'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Slider/Carrossel */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/5 bg-stone-900 p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-stone-100 flex items-center">
                <ImageIcon size={18} className="mr-2 text-amber-500" />
                Slider da Página Inicial
              </h3>
              <button 
                onClick={() => setShowSlideModal(true)}
                className="p-2 rounded-full bg-amber-600/20 text-amber-500 hover:bg-amber-600 hover:text-white transition-all"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {slides.length === 0 && (
                <p className="text-xs text-stone-500 text-center py-8">
                  Nenhum slide cadastrado. Clique em + para adicionar.
                </p>
              )}
              
              {slides.map((slide, index) => (
                <div key={slide.id} className="relative group flex items-center gap-4 p-4 rounded-xl bg-stone-950 border border-white/5 hover:border-amber-500/30 transition-all">
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => moveSlide(slide.id, 'up')}
                      disabled={index === 0}
                      className="p-1 rounded bg-stone-800 text-stone-500 hover:text-amber-500 disabled:opacity-30 transition-all"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => moveSlide(slide.id, 'down')}
                      disabled={index === slides.length - 1}
                      className="p-1 rounded bg-stone-800 text-stone-500 hover:text-amber-500 disabled:opacity-30 transition-all"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>

                  <div className="flex-shrink-0">
                    {slide.type === 'image' && slide.url && (
                      <img src={slide.url} alt={slide.title} className="w-20 h-20 object-contain rounded-lg bg-stone-950" />
                    )}
                    {slide.type === 'video' && (
                      <div className="w-20 h-20 bg-stone-800 rounded-lg flex items-center justify-center">
                        <Video size={24} className="text-stone-600" />
                      </div>
                    )}
                    {slide.type === 'text' && (
                      <div className="w-20 h-20 bg-stone-800 rounded-lg flex items-center justify-center">
                        <Type size={24} className="text-stone-600" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
                        {slide.type === 'image' ? 'Imagem' : slide.type === 'video' ? 'Vídeo' : 'Texto'}
                      </span>
                      <span className="text-xs text-stone-600">#{index + 1}</span>
                    </div>
                    <p className="text-sm font-bold text-stone-200 truncate">{slide.title || 'Sem título'}</p>
                    {slide.description && (
                      <p className="text-xs text-stone-500 truncate mt-1">{slide.description}</p>
                    )}
                  </div>

                  <div className="relative">
                    <button 
                      onClick={() => setActiveMenuId(activeMenuId === slide.id ? null : slide.id)}
                      className="p-2 text-stone-500 hover:text-white transition-colors"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {activeMenuId === slide.id && (
                      <div ref={menuRef} className="absolute right-0 top-8 z-50 w-48 rounded-lg bg-stone-800 border border-white/10 shadow-xl overflow-hidden">
                        <button 
                          onClick={() => openEditSlideModal(slide)}
                          className="flex w-full items-center gap-2 px-4 py-2 text-xs text-stone-300 hover:bg-stone-700 hover:text-white"
                        >
                          <Edit2 size={12} /> Editar
                        </button>

                        <div className="h-px bg-white/10"></div>

                        <button 
                          onClick={() => handleDeleteSlide(slide.id)}
                          className="flex w-full items-center gap-2 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 size={12} /> Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Equipe */}
          <div className="rounded-2xl border border-white/5 bg-stone-900 p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-stone-100 flex items-center">
                <Users size={18} className="mr-2 text-amber-500" />
                Equipe
              </h3>
              <button 
                onClick={() => setShowMemberModal(true)}
                className="p-2 rounded-full bg-amber-600/20 text-amber-500 hover:bg-amber-600 hover:text-white transition-all"
              >
                <span className="text-xl font-bold leading-none">+</span>
              </button>
            </div>

            <div className="space-y-4">
              {teamMembers.length === 0 && (
                <p className="text-xs text-stone-500 text-center py-4">Nenhum membro cadastrado.</p>
              )}
              
              {teamMembers.map((member) => (
                <div key={member.id} className="relative group flex items-center justify-between p-3 rounded-xl bg-stone-950 border border-white/5 hover:border-amber-500/30 transition-all">
                  <div className="flex items-center gap-3">
                    <img 
                      src={member.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}`} 
                      alt={member.name} 
                      className="w-10 h-10 rounded-full object-cover border border-white/10" 
                    />
                    <div>
                      <p className="text-sm font-bold text-stone-200">{member.name}</p>
                      <p className="text-xs uppercase tracking-wider text-stone-500">{member.role}</p>
                    </div>
                  </div>

                  <div className="relative">
                    <button 
                      onClick={() => setActiveMenuId(activeMenuId === member.id ? null : member.id)}
                      className="p-2 text-stone-500 hover:text-white transition-colors"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {activeMenuId === member.id && (
                      <div ref={menuRef} className="absolute right-0 top-8 z-50 w-48 rounded-lg bg-stone-800 border border-white/10 shadow-xl overflow-hidden">
                        <button 
                          onClick={() => openEditModal(member)}
                          className="flex w-full items-center gap-2 px-4 py-2 text-xs text-stone-300 hover:bg-stone-700 hover:text-white"
                        >
                          <Edit2 size={12} /> Editar
                        </button>
                        
                        <button 
                          onClick={() => toggleAccess(member)}
                          className="flex w-full items-center gap-2 px-4 py-2 text-xs text-stone-300 hover:bg-stone-700 hover:text-white"
                        >
                          {member.hasAccess ? (
                            <><Ban size={12} className="text-red-400" /> Revogar</>
                          ) : (
                            <><CheckCircle size={12} className="text-green-400" /> Liberar</>
                          )}
                        </button>

                        <div className="h-px bg-white/10"></div>

                        <button 
                          onClick={() => handleDeleteMember(member.id)}
                          className="flex w-full items-center gap-2 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 size={12} /> Excluir
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div 
                    className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-stone-900 ${member.hasAccess ? 'bg-green-500' : 'bg-stone-600'}`} 
                  ></div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-white/5">
              <div className="flex items-start gap-2">
                <Shield size={14} className="text-amber-600 mt-1" />
                <p className="text-xs text-stone-500 leading-relaxed">
                  Membros com <span className="text-green-500 font-bold">Acesso Liberado</span> podem gerenciar conteúdo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Membro */}
      {showMemberModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-stone-900 border border-white/10 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-xl font-bold text-stone-100">
                {editingMember ? 'Editar Membro' : 'Novo Membro'}
              </h3>
              <button onClick={closeModal} className="text-stone-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveMember} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-1 block">Nome *</label>
                <input 
                  type="text" 
                  required
                  value={newMember.name}
                  onChange={e => setNewMember({...newMember, name: e.target.value})}
                  className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none"
                  placeholder="Ana Silva"
                />
              </div>
              
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-1 block">Cargo</label>
                <input 
                  type="text" 
                  value={newMember.role}
                  onChange={e => setNewMember({...newMember, role: e.target.value})}
                  className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none"
                  placeholder="Cerimonialista"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-1 block">E-mail *</label>
                <input 
                  type="email" 
                  required
                  value={newMember.email}
                  onChange={e => setNewMember({...newMember, email: e.target.value})}
                  className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none"
                  placeholder="email@exemplo.com"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-1 block">URL da Foto</label>
                <input 
                  type="url" 
                  value={newMember.photoUrl}
                  onChange={e => setNewMember({...newMember, photoUrl: e.target.value})}
                  className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-stone-400 focus:border-amber-500 outline-none"
                  placeholder="https://..."
                />
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full rounded-lg bg-amber-600 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-amber-700 transition-all"
                >
                  {editingMember ? 'Salvar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Slide */}
      {showSlideModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-stone-900 border border-white/10 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-xl font-bold text-stone-100">
                {editingSlide ? 'Editar Slide' : 'Novo Slide'}
              </h3>
              <button onClick={closeSlideModal} className="text-stone-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveSlide} className="space-y-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Tipo de Slide *</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewSlide({...newSlide, type: 'image'})}
                    className={`p-4 rounded-lg border transition-all ${
                      newSlide.type === 'image' 
                        ? 'border-amber-500 bg-amber-500/10 text-amber-500' 
                        : 'border-white/10 text-stone-500 hover:border-amber-500/30'
                    }`}
                  >
                    <ImageIcon size={24} className="mx-auto mb-2" />
                    <p className="text-xs font-bold uppercase">Imagem</p>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setNewSlide({...newSlide, type: 'video'})}
                    className={`p-4 rounded-lg border transition-all ${
                      newSlide.type === 'video' 
                        ? 'border-amber-500 bg-amber-500/10 text-amber-500' 
                        : 'border-white/10 text-stone-500 hover:border-amber-500/30'
                    }`}
                  >
                    <Video size={24} className="mx-auto mb-2" />
                    <p className="text-xs font-bold uppercase">Vídeo</p>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setNewSlide({...newSlide, type: 'text'})}
                    className={`p-4 rounded-lg border transition-all ${
                      newSlide.type === 'text' 
                        ? 'border-amber-500 bg-amber-500/10 text-amber-500' 
                        : 'border-white/10 text-stone-500 hover:border-amber-500/30'
                    }`}
                  >
                    <Type size={24} className="mx-auto mb-2" />
                    <p className="text-xs font-bold uppercase">Texto</p>
                  </button>
                </div>
              </div>

              {(newSlide.type === 'image' || newSlide.type === 'video') && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-3 block">
                    {newSlide.type === 'image' ? 'Imagem' : 'URL do Vídeo'} *
                  </label>
                  
                  {newSlide.type === 'image' && !newSlide.url && (
                    <div className="border-2 border-dashed border-white/10 rounded-xl p-12 text-center hover:border-amber-500/50 transition-all">
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        id="slideImageUpload" 
                        onChange={(e) => { 
                          const file = e.target.files?.[0]; 
                          if (file) handleSlideFileUpload(file); 
                        }} 
                        disabled={uploadingSlide} 
                      />
                      <label htmlFor="slideImageUpload" className={`cursor-pointer flex flex-col items-center ${uploadingSlide ? 'pointer-events-none opacity-50' : ''}`}>
                        {uploadingSlide ? (
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

                  {(newSlide.type === 'video' || newSlide.url) && (
                    <div>
                      {newSlide.url && newSlide.type === 'image' && (
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-stone-950 border border-white/5 mb-3">
                          <img src={newSlide.url} alt="Preview" className="h-full w-full object-contain" />
                          <button 
                            type="button" 
                            onClick={() => setNewSlide({...newSlide, url: ''})} 
                            className="absolute top-3 right-3 p-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                      
                      {newSlide.type === 'video' && (
                        <input 
                          type="url" 
                          required={newSlide.type === 'video'}
                          value={newSlide.url}
                          onChange={e => setNewSlide({...newSlide, url: e.target.value})}
                          className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none"
                          placeholder="https://..."
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Título</label>
                <input 
                  type="text" 
                  value={newSlide.title}
                  onChange={e => setNewSlide({...newSlide, title: e.target.value})}
                  className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none"
                  placeholder="Ex: Bem-vindo ao Latitude22"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Descrição</label>
                <textarea 
                  value={newSlide.description}
                  onChange={e => setNewSlide({...newSlide, description: e.target.value})}
                  rows={3}
                  className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none resize-none"
                  placeholder="Descrição do slide"
                />
              </div>

              {newSlide.type === 'text' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Cor de Fundo</label>
                    <input 
                      type="color" 
                      value={newSlide.backgroundColor}
                      onChange={e => setNewSlide({...newSlide, backgroundColor: e.target.value})}
                      className="w-full h-12 rounded-lg bg-stone-950 border border-white/10 cursor-pointer"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Cor do Texto</label>
                    <input 
                      type="color" 
                      value={newSlide.textColor}
                      onChange={e => setNewSlide({...newSlide, textColor: e.target.value})}
                      className="w-full h-12 rounded-lg bg-stone-950 border border-white/10 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={closeSlideModal}
                  className="flex-1 rounded-lg border border-white/10 bg-stone-950 px-6 py-3 text-xs font-bold uppercase tracking-widest text-stone-400 hover:bg-stone-800 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={uploadingSlide}
                  className="flex-1 rounded-lg bg-amber-600 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-amber-700 transition-all disabled:opacity-50"
                >
                  {editingSlide ? 'Salvar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
