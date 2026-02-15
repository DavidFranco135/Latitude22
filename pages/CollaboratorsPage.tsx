import React, { useState, useEffect, useRef } from 'react';
import { UserPlus, Shield, Mail, MoreVertical, Edit2, Trash2, CheckCircle, XCircle, X } from 'lucide-react';
import { collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../services/firebase';

interface Collaborator {
  id: string;
  uid: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'staff' | 'viewer';
  status: 'active' | 'inactive';
  photoUrl?: string;
  createdAt?: any;
}

const CollaboratorsPage: React.FC = () => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'staff' as 'admin' | 'staff' | 'viewer'
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'collaborators'),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Collaborator));
        setCollaborators(data);
      },
      (error) => {
        console.error('Erro ao carregar colaboradores:', error);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fechar menu ao clicar fora
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.password) {
      showMessage('Erro: Preencha todos os campos obrigatórios');
      return;
    }

    if (formData.password.length < 6) {
      showMessage('Erro: A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      if (editingCollaborator) {
        // Apenas atualizar dados não-autenticação
        await updateDoc(doc(db, 'collaborators', editingCollaborator.id), {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          phone: formData.phone,
          photoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}`
        });
        showMessage('✅ Colaborador atualizado com sucesso!');
      } else {
        // Criar novo usuário no Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );

        // Salvar dados adicionais no Firestore
        await addDoc(collection(db, 'collaborators'), {
          uid: userCredential.user.uid,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          photoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}`,
          status: 'active',
          createdAt: new Date()
        });
        showMessage('✅ Colaborador criado! Email e senha enviados.');
      }
      closeModal();
    } catch (error: any) {
      console.error('Erro:', error);
      if (error.code === 'auth/email-already-in-use') {
        showMessage('❌ Este email já está em uso!');
      } else if (error.code === 'auth/weak-password') {
        showMessage('❌ Senha muito fraca. Use letras, números e símbolos.');
      } else {
        showMessage('❌ Erro ao criar colaborador: ' + (error.message || 'Tente novamente'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (collaborator: Collaborator) => {
    setEditingCollaborator(collaborator);
    setFormData({
      name: collaborator.name,
      email: collaborator.email,
      phone: collaborator.phone,
      role: collaborator.role,
      password: '' // Campo vazio para edição (não pode alterar senha)
    });
    setShowModal(true);
    setActiveMenuId(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja remover ${name}?`)) {
      try {
        await deleteDoc(doc(db, 'collaborators', id));
        showMessage('✅ Colaborador removido com sucesso!');
        setActiveMenuId(null);
      } catch (error) {
        console.error('Erro ao deletar:', error);
        showMessage('❌ Erro ao remover colaborador');
      }
    }
  };

  const toggleStatus = async (collaborator: Collaborator) => {
    try {
      await updateDoc(doc(db, 'collaborators', collaborator.id), {
        status: collaborator.status === 'active' ? 'inactive' : 'active'
      });
      showMessage(collaborator.status === 'active' ? '🔒 Acesso desativado!' : '🔓 Acesso ativado!');
      setActiveMenuId(null);
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      showMessage('❌ Erro ao alterar status');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCollaborator(null);
    setFormData({ 
      name: '', 
      email: '', 
      password: '', 
      phone: '', 
      role: 'staff' 
    });
  };

  const getRoleLabel = (role: string) => {
    const roles = {
      admin: { label: '⭐ Admin', color: 'bg-amber-600 text-white', privilege: 'Acesso Total' },
      staff: { label: '👤 Staff', color: 'bg-blue-600 text-white', privilege: 'Criar e Editar' },
      viewer: { label: '👁️ Visualizador', color: 'bg-stone-950 text-stone-500 border border-white/10', privilege: 'Apenas Visualizar' }
    };
    return roles[role as keyof typeof roles] || roles.staff;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg text-[10px] font-bold uppercase tracking-widest text-center ${message.includes('❌') || message.includes('Erro') ? 'bg-red-500/20 text-red-500 border border-red-500/20' : 'bg-green-500/20 text-green-500 border border-green-500/20'}`}>
          {message}
        </div>
      )}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-serif text-3xl font-bold text-stone-100">Equipe Latitude22</h2>
          <p className="text-stone-500">Gestão de colaboradores, acessos e permissões do sistema.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center space-x-2 rounded-lg bg-amber-600 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-amber-700 shadow-xl shadow-amber-900/20 transition-all disabled:opacity-50"
          disabled={loading}
        >
          <UserPlus size={18} />
          <span>Novo Membro</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {collaborators.map((collaborator) => {
          const roleInfo = getRoleLabel(collaborator.role);
          return (
            <div key={collaborator.id} className="rounded-2xl border border-white/5 bg-stone-900 p-8 shadow-2xl relative overflow-hidden group">
              {collaborator.role === 'admin' && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-600/10 -mr-12 -mt-12 rounded-full blur-2xl group-hover:bg-amber-600/20 transition-all"></div>
              )}
              
              <div className="flex items-start justify-between relative z-10">
                <div className={`h-20 w-20 rounded-2xl flex items-center justify-center font-bold text-2xl ${
                  collaborator.role === 'admin' 
                    ? 'bg-stone-950 text-amber-500 border border-amber-600/30 shadow-inner' 
                    : 'bg-stone-800 text-stone-600 border border-white/5 group-hover:border-amber-600/20'
                } transition-all`}>
                  {collaborator.photoUrl && collaborator.photoUrl.startsWith('http') && !collaborator.photoUrl.includes('ui-avatars') ? (
                    <img src={collaborator.photoUrl} alt={collaborator.name} className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    getInitials(collaborator.name)
                  )}
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full shadow-lg ${roleInfo.color}`}>
                  {roleInfo.label}
                </span>
              </div>
              
              <div className="mt-8 relative z-10">
                <h3 className="text-xl font-bold text-stone-100 tracking-tight uppercase">{collaborator.name}</h3>
                <div className="mt-3 flex items-center space-x-3 text-stone-500 text-xs font-medium">
                  <Mail size={14} className={collaborator.role === 'admin' ? 'text-amber-600' : 'text-stone-700'} />
                  <span>{collaborator.email}</span>
                </div>
                
                {collaborator.phone && (
                  <div className="mt-2 flex items-center space-x-3 text-stone-500 text-xs font-medium">
                    <span>📱</span>
                    <span>{collaborator.phone}</span>
                  </div>
                )}
                
                <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                  <div className={`flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest ${
                    collaborator.role === 'admin' ? 'text-amber-500/60' : 'text-stone-600'
                  }`}>
                    <Shield size={14} className={collaborator.role === 'admin' ? '' : 'text-stone-700'} />
                    <span>{roleInfo.privilege}</span>
                  </div>
                  
                  <div className="relative">
                    <button 
                      onClick={() => setActiveMenuId(activeMenuId === collaborator.id ? null : collaborator.id)}
                      className="p-2 text-stone-600 hover:text-white transition-colors"
                    >
                      <MoreVertical size={18} />
                    </button>

                    {activeMenuId === collaborator.id && (
                      <div ref={menuRef} className="absolute right-0 top-10 z-50 w-48 rounded-lg bg-stone-800 border border-white/10 shadow-xl overflow-hidden">
                        <div className="py-1">
                          <button 
                            onClick={() => handleEdit(collaborator)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-xs text-stone-300 hover:bg-stone-700 hover:text-white"
                          >
                            <Edit2 size={12} /> Editar Dados
                          </button>
                          
                          <button 
                            onClick={() => toggleStatus(collaborator)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-xs text-stone-300 hover:bg-stone-700 hover:text-white"
                          >
                            {collaborator.status === 'active' ? (
                              <><XCircle size={12} className="text-red-400" /> Desativar Acesso</>
                            ) : (
                              <><CheckCircle size={12} className="text-green-400" /> Ativar Acesso</>
                            )}
                          </button>

                          <div className="h-px bg-white/10 my-1"></div>

                          <button 
                            onClick={() => handleDelete(collaborator.id, collaborator.name)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 size={12} /> Excluir Membro
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Indicator */}
                <div className={`absolute top-0 right-0 w-3 h-3 rounded-full border-2 border-stone-900 ${
                  collaborator.status === 'active' ? 'bg-green-500' : 'bg-stone-600'
                }`}></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-stone-900 border border-white/10 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-xl font-bold text-stone-100">
                {editingCollaborator ? 'Editar Colaborador' : 'Novo Colaborador'}
              </h3>
              <button onClick={closeModal} className="text-stone-500 hover:text-white" disabled={loading}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">
                  Nome Completo *
                </label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none disabled:opacity-50"
                  placeholder="João Silva"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">
                  Email *
                </label>
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none disabled:opacity-50"
                  placeholder="joao@exemplo.com"
                  disabled={loading || !!editingCollaborator}
                />
              </div>

              {!editingCollaborator && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">
                    Senha Inicial *
                  </label>
                  <input 
                    type="password" 
                    required
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none disabled:opacity-50"
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    disabled={loading}
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">
                  Telefone
                </label>
                <input 
                  type="tel" 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none disabled:opacity-50"
                  placeholder="(21) 99999-9999"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">
                  Nível de Permissão
                </label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value as any})}
                  className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none disabled:opacity-50"
                  disabled={loading}
                >
                  <option value="viewer">👁️ Visualizador - Apenas visualizar</option>
                  <option value="staff">👤 Staff - Criar e editar</option>
                  <option value="admin">⭐ Admin - Acesso total</option>
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-lg border border-white/10 bg-stone-950 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:bg-stone-800 transition-all disabled:opacity-50"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 rounded-lg bg-amber-600 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-amber-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  {loading ? '⏳ Criando...' : (editingCollaborator ? 'Salvar' : 'Adicionar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaboratorsPage;
