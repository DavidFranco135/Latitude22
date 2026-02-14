import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, Camera, Instagram, MessageCircle, Globe, Sparkles, Upload, 
  X, Users, MoreVertical, Shield, Trash2, Edit2, CheckCircle, Ban 
} from 'lucide-react';
import { doc, getDoc, setDoc, collection, onSnapshot, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../services/firebase';

// Interface para Membros da Equipe
interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string; // Usado para liberação de acesso
  photoUrl: string;
  hasAccess: boolean; // Se pode logar no sistema
}

const SettingsPage: React.FC = () => {
  // --- Estados de Configuração Geral ---
  const [settings, setSettings] = useState<any>({
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
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingAbout, setUploadingAbout] = useState(false);

  // --- Estados da Equipe ---
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [newMember, setNewMember] = useState<Partial<TeamMember>>({
    name: '', role: '', email: '', hasAccess: false, photoUrl: ''
  });
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null); // Para o menu de 3 pontinhos
  const menuRef = useRef<HTMLDivElement>(null); // Para fechar o menu ao clicar fora

  // --- Effects ---

  // Carregar Configurações
  useEffect(() => {
    const fetchSettings = async () => {
      const docSnap = await getDoc(doc(db, 'settings', 'general'));
      if (docSnap.exists()) {
        setSettings(docSnap.data());
      }
    };
    fetchSettings();
  }, []);

  // Carregar Equipe (Real-time)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'team'), (snapshot) => {
      const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamMember));
      setTeamMembers(members);
    });
    return () => unsub();
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

  // --- Funções de Imagem (CORRIGIDAS) ---

  const handleImageUpload = async (file: File, imageType: 'hero' | 'about') => {
    if (!file) return;

    const setUploading = imageType === 'hero' ? setUploadingHero : setUploadingAbout;
    setUploading(true);

    try {
      const timestamp = Date.now();
      const fileName = `${imageType}-${timestamp}-${file.name}`;
      const storageRef = ref(storage, `branding/${fileName}`);

      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Atualiza estado local
      const newSettings = { ...settings };
      if (imageType === 'hero') newSettings.heroImage = downloadURL;
      else newSettings.aboutImage = downloadURL;
      
      setSettings(newSettings);

      // CORREÇÃO: Salva DIRETAMENTE no Firestore para não perder a imagem
      await setDoc(doc(db, 'settings', 'general'), newSettings, { merge: true });

      setMessage('Imagem carregada e salva com sucesso!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      setMessage('Erro ao salvar imagem no banco de dados.');
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
      setMessage('Erro ao salvar configurações.');
    } finally {
      setLoading(false);
    }
  };

  // --- Funções de Gestão de Equipe ---

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name || !newMember.email) return;

    try {
      if (editingMember) {
        // Editar existente
        await updateDoc(doc(db, 'team', editingMember.id), {
          name: newMember.name,
          role: newMember.role,
          email: newMember.email,
          photoUrl: newMember.photoUrl || 'https://ui-avatars.com/api/?name=' + newMember.name
        });
        setMessage('Membro atualizado!');
      } else {
        // Criar novo
        await addDoc(collection(db, 'team'), {
          ...newMember,
          photoUrl: newMember.photoUrl || 'https://ui-avatars.com/api/?name=' + newMember.name,
          createdAt: new Date(),
          hasAccess: false // Padrão sem acesso
        });
        setMessage('Membro adicionado!');
      }
      closeModal();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Erro ao salvar membro:", error);
      setMessage('Erro ao salvar membro.');
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este membro da equipe?')) {
      await deleteDoc(doc(db, 'team', id));
      setActiveMenuId(null);
    }
  };

  const toggleAccess = async (member: TeamMember) => {
    try {
      await updateDoc(doc(db, 'team', member.id), {
        hasAccess: !member.hasAccess
      });
      setActiveMenuId(null);
    } catch (error) {
      console.error("Erro ao alterar acesso", error);
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
    <div className="space-y-10 pb-20">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-amber-600 mb-1">
            <Sparkles size={16} />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Branding & Visual</span>
          </div>
          <h2 className="font-serif text-4xl font-bold text-stone-100 tracking-tight">Configurações do Sistema</h2>
        </div>
      </div>

      {/* Mensagens de Feedback */}
      {message && (
        <div className={`p-4 rounded-lg text-[10px] font-bold uppercase tracking-widest text-center animate-bounce ${message.includes('Erro') ? 'bg-red-500/20 text-red-500 border border-red-500/20' : 'bg-green-500/20 text-green-500 border border-green-500/20'}`}>
          {message}
        </div>
      )}

      {/* Grid Principal */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        
        {/* Coluna Esquerda: Branding (Existente) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Seção de Imagens */}
          <div className="rounded-2xl border border-white/5 bg-stone-900 p-8 shadow-2xl">
            <h3 className="mb-8 font-bold text-stone-100 flex items-center">
              <Camera size={18} className="mr-2 text-amber-500" />
              Impacto Visual (Salva Automático)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Hero Image */}
              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500 block">Capa Principal</label>
                <div className="relative group aspect-video rounded-xl overflow-hidden bg-stone-950 border border-white/5">
                  <img src={settings.heroImage || 'https://via.placeholder.com/400'} className="h-full w-full object-cover opacity-40 group-hover:opacity-60 transition-all" alt="" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
                    <label className="cursor-pointer">
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
                        {uploadingHero ? 'Enviando...' : 'Upload da Capa'}
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* About Image */}
              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500 block">Destaque Secundário</label>
                <div className="relative group aspect-video rounded-xl overflow-hidden bg-stone-950 border border-white/5">
                  <img src={settings.aboutImage || 'https://via.placeholder.com/400'} className="h-full w-full object-cover opacity-40 group-hover:opacity-60 transition-all" alt="" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
                    <label className="cursor-pointer">
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
                        {uploadingAbout ? 'Enviando...' : 'Upload do Sobre'}
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Seção de Textos e Redes Sociais */}
          <div className="rounded-2xl border border-white/5 bg-stone-900 p-8 shadow-2xl space-y-6">
            <h3 className="font-bold text-stone-100">Informações Básicas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={settings.venueTitle}
                onChange={e => setSettings({...settings, venueTitle: e.target.value})}
                className="w-full rounded-lg border border-white/10 bg-stone-950 p-4 text-sm text-stone-200 focus:ring-1 focus:ring-amber-500 outline-none"
                placeholder="Nome do Local"
              />
              <input
                type="text"
                value={settings.venueSubtitle}
                onChange={e => setSettings({...settings, venueSubtitle: e.target.value})}
                className="w-full rounded-lg border border-white/10 bg-stone-950 p-4 text-sm text-stone-200 focus:ring-1 focus:ring-amber-500 outline-none"
                placeholder="Subtítulo"
              />
            </div>
            
            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-4">
                <Instagram size={18} className="text-stone-500" />
                <input
                  type="text"
                  value={settings.instagram}
                  onChange={e => setSettings({...settings, instagram: e.target.value})}
                  className="flex-1 bg-transparent border-b border-white/10 py-2 text-sm text-stone-300 focus:border-amber-500 outline-none"
                  placeholder="@instagram"
                />
              </div>
              <div className="flex items-center gap-4">
                <MessageCircle size={18} className="text-stone-500" />
                <input
                  type="text"
                  value={settings.whatsapp}
                  onChange={e => setSettings({...settings, whatsapp: e.target.value})}
                  className="flex-1 bg-transparent border-b border-white/10 py-2 text-sm text-stone-300 focus:border-amber-500 outline-none"
                  placeholder="WhatsApp (apenas números)"
                />
              </div>
              <div className="flex items-center gap-4">
                <Globe size={18} className="text-stone-500" />
                <input
                  type="text"
                  value={settings.address}
                  onChange={e => setSettings({...settings, address: e.target.value})}
                  className="flex-1 bg-transparent border-b border-white/10 py-2 text-sm text-stone-300 focus:border-amber-500 outline-none"
                  placeholder="Endereço Completo"
                />
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button 
                onClick={handleSaveSettings}
                disabled={loading}
                className="flex items-center justify-center space-x-3 rounded-lg bg-stone-800 border border-white/10 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-300 hover:bg-amber-600 hover:text-white hover:border-amber-600 transition-all"
              >
                <Save size={16} />
                <span>{loading ? 'Salvando...' : 'Salvar Textos'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Coluna Direita: NOVA SEÇÃO DE EQUIPE */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/5 bg-stone-900 p-8 shadow-2xl h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-stone-100 flex items-center">
                <Users size={18} className="mr-2 text-amber-500" />
                Equipe & Acesso
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
                <div key={member.id} className="group flex items-center justify-between p-3 rounded-xl bg-stone-950 border border-white/5 hover:border-amber-500/30 transition-all">
                  <div className="flex items-center gap-3">
                    <img src={member.photoUrl || `https://ui-avatars.com/api/?name=${member.name}`} alt={member.name} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                    <div>
                      <p className="text-sm font-bold text-stone-200">{member.name}</p>
                      <p className="text-[10px] uppercase tracking-wider text-stone-500">{member.role}</p>
                    </div>
                  </div>

                  <div className="relative">
                    {/* Botão 3 Pontinhos */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === member.id ? null : member.id);
                      }}
                      className="p-2 text-stone-500 hover:text-white transition-colors"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {/* Dropdown Menu */}
                    {activeMenuId === member.id && (
                      <div ref={menuRef} className="absolute right-0 top-8 z-50 w-48 rounded-lg bg-stone-800 border border-white/10 shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="py-1">
                          <button 
                            onClick={() => openEditModal(member)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-xs text-stone-300 hover:bg-stone-700 hover:text-white"
                          >
                            <Edit2 size={12} /> Editar Dados
                          </button>
                          
                          <button 
                            onClick={() => toggleAccess(member)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-xs text-stone-300 hover:bg-stone-700 hover:text-white"
                          >
                            {member.hasAccess ? (
                              <><Ban size={12} className="text-red-400" /> Revogar Acesso</>
                            ) : (
                              <><CheckCircle size={12} className="text-green-400" /> Liberar Acesso</>
                            )}
                          </button>

                          <div className="h-px bg-white/10 my-1"></div>

                          <button 
                            onClick={() => handleDeleteMember(member.id)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 size={12} /> Excluir Membro
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Indicador de Status */}
                  <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-stone-900 ${member.hasAccess ? 'bg-green-500' : 'bg-stone-600'}`} title={member.hasAccess ? "Acesso Permitido" : "Sem Acesso"}></div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-white/5">
               <div className="flex items-start gap-2">
                 <Shield size={14} className="text-amber-600 mt-1" />
                 <p className="text-[10px] text-stone-500 leading-relaxed">
                   Membros com <span className="text-green-500 font-bold">Acesso Liberado</span> podem gerenciar a galeria e ver orçamentos. O e-mail deve ser vinculado a uma conta Google ou Login.
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
              <h3 className="font-serif text-xl font-bold text-stone-100">{editingMember ? 'Editar Membro' : 'Novo Membro'}</h3>
              <button onClick={closeModal} className="text-stone-500 hover:text-white"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSaveMember} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">Nome Completo</label>
                <input 
                  type="text" 
                  required
                  value={newMember.name}
                  onChange={e => setNewMember({...newMember, name: e.target.value})}
                  className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none"
                  placeholder="Ex: Ana Silva"
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">Cargo / Função</label>
                <input 
                  type="text" 
                  value={newMember.role}
                  onChange={e => setNewMember({...newMember, role: e.target.value})}
                  className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none"
                  placeholder="Ex: Cerimonialista"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">E-mail de Acesso</label>
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
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">URL da Foto (Opcional)</label>
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
                  {editingMember ? 'Salvar Alterações' : 'Adicionar à Equipe'}
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
