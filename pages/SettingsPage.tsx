import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, Camera, Instagram, MessageCircle, Globe, Sparkles, Upload, 
  X, Users, MoreVertical, Shield, Trash2, Edit2, CheckCircle, Ban, Image
} from 'lucide-react';
import { doc, getDoc, setDoc, collection, onSnapshot, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

// API Key do ImgBB
const IMGBB_API_KEY = '9f8d8580331d26fcb2e3fae394e63b7f';

// Interface para Membros da Equipe
interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  photoUrl: string;
  hasAccess: boolean;
}

const SettingsPage: React.FC = () => {
  // --- Estados de Configuração Geral ---
  const [settings, setSettings] = useState<any>({
    coverImage: '', // NOVA CAPA
    heroImage: '',
    aboutImage: '',
    venueTitle: 'LATITUDE22',
    venueSubtitle: 'Eventos & Festas',
    address: '',
    whatsapp: '',
    instagram: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingAbout, setUploadingAbout] = useState(false);

  // --- Estados da Equipe ---
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [newMember, setNewMember] = useState<Partial<TeamMember>>({
    name: '', role: '', email: '', hasAccess: false, photoUrl: ''
  });
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // --- Effects ---

  // Carregar Configurações
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'general'));
        if (docSnap.exists()) {
          setSettings(docSnap.data());
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        setMessage('Erro ao carregar configurações. Verifique suas permissões.');
      }
    };
    fetchSettings();
  }, []);

  // Carregar Equipe (Real-time)
  useEffect(() => {
    try {
      const unsub = onSnapshot(
        collection(db, 'team'), 
        (snapshot) => {
          const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamMember));
          setTeamMembers(members);
        },
        (error) => {
          console.error('Erro ao carregar equipe:', error);
        }
      );
      return () => unsub();
    } catch (error) {
      console.error('Erro ao configurar listener da equipe:', error);
    }
  }, []);

  // Fechar menu de 3 pontinhos ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Funções de Upload com ImgBB ---

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

  const handleImageUpload = async (file: File, imageType: 'cover' | 'hero' | 'about') => {
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      setMessage('Erro: Por favor, selecione uma imagem válida.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    // Validar tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage('Erro: Imagem muito grande. Use imagens menores que 5MB.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    const setUploading = imageType === 'cover' ? setUploadingCover : imageType === 'hero' ? setUploadingHero : setUploadingAbout;
    setUploading(true);

    try {
      // Upload para ImgBB
      const imageUrl = await uploadToImgBB(file);

      // Atualizar estado local
      const newSettings = { ...settings };
      if (imageType === 'cover') {
        newSettings.coverImage = imageUrl;
      } else if (imageType === 'hero') {
        newSettings.heroImage = imageUrl;
      } else {
        newSettings.aboutImage = imageUrl;
      }
      
      setSettings(newSettings);

      // Salvar diretamente no Firestore
      await setDoc(doc(db, 'settings', 'general'), newSettings, { merge: true });

      setMessage('Imagem carregada e salva com sucesso!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      setMessage('Erro ao enviar imagem. Tente novamente.');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    setMessage('');
    try {
      await setDoc(doc(db, 'settings', 'general'), settings, { merge: true });
      setMessage('Identidade atualizada com sucesso!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Erro ao salvar:', err);
      setMessage('Erro ao salvar configurações. Verifique suas permissões.');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // --- Funções de Gestão de Equipe ---

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name || !newMember.email) {
      setMessage('Preencha nome e email!');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      if (editingMember) {
        // Editar existente
        await updateDoc(doc(db, 'team', editingMember.id), {
          name: newMember.name,
          role: newMember.role || '',
          email: newMember.email,
          photoUrl: newMember.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(newMember.name)}`
        });
        setMessage('Membro atualizado!');
      } else {
        // Criar novo
        await addDoc(collection(db, 'team'), {
          name: newMember.name,
          role: newMember.role || '',
          email: newMember.email,
          photoUrl: newMember.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(newMember.name)}`,
          createdAt: new Date(),
          hasAccess: false
        });
        setMessage('Membro adicionado!');
      }
      closeModal();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Erro ao salvar membro:", error);
      setMessage('Erro ao salvar membro. Verifique suas permissões.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este membro da equipe?')) {
      try {
        await deleteDoc(doc(db, 'team', id));
        setActiveMenuId(null);
        setMessage('Membro removido!');
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        console.error("Erro ao deletar membro:", error);
        setMessage('Erro ao remover membro.');
        setTimeout(() => setMessage(''), 3000);
      }
    }
  };

  const toggleAccess = async (member: TeamMember) => {
    try {
      await updateDoc(doc(db, 'team', member.id), {
        hasAccess: !member.hasAccess
      });
      setActiveMenuId(null);
      setMessage(member.hasAccess ? 'Acesso revogado!' : 'Acesso liberado!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Erro ao alterar acesso", error);
      setMessage('Erro ao alterar acesso.');
      setTimeout(() => setMessage(''), 3000);
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

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-amber-600 mb-1">
            <Sparkles size={16} />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Branding & Visual</span>
          </div>
          <h2 className="font-serif text-4xl font-bold text-stone-100 tracking-tight">Personalização do Site</h2>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg text-[10px] font-bold uppercase tracking-widest text-center animate-bounce ${message.includes('Erro') ? 'bg-red-500/20 text-red-500 border border-red-500/20' : 'bg-green-500/20 text-green-500 border border-green-500/20'}`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          {/* NOVA SEÇÃO: Capa da Página Pública */}
          <div className="rounded-2xl border border-white/5 bg-stone-900 p-8 shadow-2xl">
            <h3 className="mb-8 font-bold text-stone-100 flex items-center">
              <Image size={18} className="mr-2 text-amber-500" />
              Capa da Página Pública (Banner Principal)
            </h3>
            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500 block">
                Imagem de Capa (Recomendado: 1920x600px)
              </label>
              <div className="relative group aspect-[16/5] rounded-xl overflow-hidden bg-stone-950 border border-white/5">
                <img 
                  src={settings.coverImage || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=100'} 
                  className="h-full w-full object-cover opacity-60 group-hover:opacity-80 transition-all" 
                  alt="Cover" 
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
                  <input
                    type="url"
                    value={settings.coverImage}
                    onChange={e => setSettings({...settings, coverImage: e.target.value})}
                    className="w-full max-w-xl rounded-lg border border-white/10 bg-stone-900/80 backdrop-blur-md py-3 px-4 text-xs text-stone-200 placeholder:text-stone-600 focus:ring-1 focus:ring-amber-500 outline-none"
                    placeholder="Coloque a URL da capa..."
                  />
                  <div className="flex items-center gap-2 w-full max-w-xl">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-stone-500">ou</span>
                    <label className="flex-1 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, 'cover');
                        }}
                        disabled={uploadingCover}
                      />
                      <div className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-amber-600/90 backdrop-blur-md py-2 px-4 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-amber-700 transition-all">
                        {uploadingCover ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                            <span>Enviando...</span>
                          </>
                        ) : (
                          <>
                            <Upload size={14} />
                            <span>Upload da Capa (máx 5MB)</span>
                          </>
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Branding Images */}
          <div className="rounded-2xl border border-white/5 bg-stone-900 p-8 shadow-2xl">
            <h3 className="mb-8 font-bold text-stone-100 flex items-center">
              <Camera size={18} className="mr-2 text-amber-500" />
              Imagens de Impacto Visual
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Hero Image */}
              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500 block">Seção Hero (Principal)</label>
                <div className="relative group aspect-video rounded-xl overflow-hidden bg-stone-950 border border-white/5">
                  <img 
                    src={settings.heroImage || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3'} 
                    className="h-full w-full object-cover opacity-40 group-hover:opacity-60 transition-all" 
                    alt="Hero" 
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
                    <input
                      type="url"
                      value={settings.heroImage}
                      onChange={e => setSettings({...settings, heroImage: e.target.value})}
                      className="w-full rounded-lg border border-white/10 bg-stone-900/80 backdrop-blur-md py-3 px-4 text-xs text-stone-200 placeholder:text-stone-600 focus:ring-1 focus:ring-amber-500 outline-none"
                      placeholder="URL da imagem..."
                    />
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-stone-500">ou</span>
                      <label className="flex-1 cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file, 'hero');
                          }}
                          disabled={uploadingHero}
                        />
                        <div className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-amber-600/90 backdrop-blur-md py-2 px-4 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-amber-700 transition-all">
                          {uploadingHero ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                              <span>Enviando...</span>
                            </>
                          ) : (
                            <>
                              <Upload size={14} />
                              <span>Upload (máx 5MB)</span>
                            </>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* About Image */}
              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500 block">Seção Sobre Nós</label>
                <div className="relative group aspect-video rounded-xl overflow-hidden bg-stone-950 border border-white/5">
                  <img 
                    src={settings.aboutImage || 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622'} 
                    className="h-full w-full object-cover opacity-40 group-hover:opacity-60 transition-all" 
                    alt="About" 
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
                    <input
                      type="url"
                      value={settings.aboutImage}
                      onChange={e => setSettings({...settings, aboutImage: e.target.value})}
                      className="w-full rounded-lg border border-white/10 bg-stone-900/80 backdrop-blur-md py-3 px-4 text-xs text-stone-200 placeholder:text-stone-600 focus:ring-1 focus:ring-amber-500 outline-none"
                      placeholder="URL da imagem..."
                    />
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-stone-500">ou</span>
                      <label className="flex-1 cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file, 'about');
                          }}
                          disabled={uploadingAbout}
                        />
                        <div className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-amber-600/90 backdrop-blur-md py-2 px-4 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-amber-700 transition-all">
                          {uploadingAbout ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                              <span>Enviando...</span>
                            </>
                          ) : (
                            <>
                              <Upload size={14} />
                              <span>Upload (máx 5MB)</span>
                            </>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Identity & Socials */}
          <div className="rounded-2xl border border-white/5 bg-stone-900 p-8 shadow-2xl">
            <h3 className="mb-6 font-bold text-stone-100">Identidade & Contatos</h3>
            
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 w-32">Nome do Venue</span>
                <input
                  type="text"
                  value={settings.venueTitle}
                  onChange={e => setSettings({...settings, venueTitle: e.target.value})}
                  className="flex-1 bg-transparent border-b border-white/10 py-2 text-sm text-stone-300 focus:border-amber-500 outline-none"
                  placeholder="LATITUDE22"
                />
              </div>

              <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 w-32">Segmento</span>
                <input
                  type="text"
                  value={settings.venueSubtitle}
                  onChange={e => setSettings({...settings, venueSubtitle: e.target.value})}
                  className="flex-1 bg-transparent border-b border-white/10 py-2 text-sm text-stone-300 focus:border-amber-500 outline-none"
                  placeholder="Eventos & Festas"
                />
              </div>

              <div className="flex items-center gap-4">
                <Instagram size={16} className="text-amber-500 w-32" />
                <input
                  type="text"
                  value={settings.instagram}
                  onChange={e => setSettings({...settings, instagram: e.target.value})}
                  className="flex-1 bg-transparent border-b border-white/10 py-2 text-sm text-stone-300 focus:border-amber-500 outline-none"
                  placeholder="@latitude22_"
                />
              </div>

              <div className="flex items-center gap-4">
                <MessageCircle size={16} className="text-green-500 w-32" />
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
                className="flex items-center justify-center space-x-3 rounded-lg bg-amber-600 px-10 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white hover:bg-amber-700 shadow-2xl shadow-amber-900/40 disabled:opacity-50 transition-all hover:-translate-y-1"
              >
                <Save size={16} />
                <span>{loading ? 'Salvando...' : 'Salvar Configurações'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Equipe & Acesso */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/5 bg-stone-900 p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-stone-100 flex items-center">
                <Users size={18} className="mr-2 text-amber-500" />
                Equipe
              </h3>
              <button 
                onClick={() => setShowMemberModal(true)}
                className="p-2 rounded-full bg-amber-600/20 text-amber-500 hover:bg-amber-600 hover:text-white transition-all"
                title="Adicionar Membro"
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
                      <p className="text-[10px] uppercase tracking-wider text-stone-500">{member.role}</p>
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
                        <div className="py-1">
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

                          <div className="h-px bg-white/10 my-1"></div>

                          <button 
                            onClick={() => handleDeleteMember(member.id)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 size={12} /> Excluir
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div 
                    className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-stone-900 ${member.hasAccess ? 'bg-green-500' : 'bg-stone-600'}`} 
                    title={member.hasAccess ? "Acesso Permitido" : "Sem Acesso"}
                  ></div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-white/5">
              <div className="flex items-start gap-2">
                <Shield size={14} className="text-amber-600 mt-1" />
                <p className="text-[10px] text-stone-500 leading-relaxed">
                  Membros com <span className="text-green-500 font-bold">Acesso Liberado</span> podem gerenciar conteúdo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Adicionar/Editar Membro */}
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
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">
                  Nome Completo *
                </label>
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
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">
                  Cargo / Função
                </label>
                <input 
                  type="text" 
                  value={newMember.role}
                  onChange={e => setNewMember({...newMember, role: e.target.value})}
                  className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none"
                  placeholder="Cerimonialista"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">
                  E-mail de Acesso *
                </label>
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
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">
                  URL da Foto (Opcional)
                </label>
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
                  className="w-full rounded-lg bg-amber-600 py-3 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-amber-700 transition-all"
                >
                  {editingMember ? 'Salvar' : 'Adicionar'}
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
