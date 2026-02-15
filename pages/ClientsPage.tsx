import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, MoreVertical, Phone, Mail, Calendar, Edit2, Trash2, Eye, X } from 'lucide-react';
import { collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf_cnpj?: string;
  address?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  lastEvent?: string;
  totalRevenue?: number;
  since?: string;
  createdAt?: any;
}

const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf_cnpj: '',
    address: '',
    city: '',
    state: '',
    zipcode: '',
    lastEvent: '',
    totalRevenue: 0,
    since: new Date().getFullYear().toString()
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'clients'),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
        setClients(data);
        setFilteredClients(data);
      },
      (error) => {
        console.error('Erro ao carregar clientes:', error);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const filtered = clients.filter(client =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm)
    );
    setFilteredClients(filtered);
  }, [searchTerm, clients]);

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
    
    if (!formData.name || !formData.email || !formData.phone) {
      showMessage('Erro: Preencha todos os campos obrigatórios');
      return;
    }

    try {
      if (editingClient) {
        await updateDoc(doc(db, 'clients', editingClient.id), formData);
        showMessage('Cliente atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'clients'), {
          ...formData,
          createdAt: new Date()
        });
        showMessage('Cliente adicionado com sucesso!');
      }
      closeModal();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      showMessage('Erro ao salvar cliente');
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone,
      cpf_cnpj: client.cpf_cnpj || '',
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      zipcode: client.zipcode || '',
      lastEvent: client.lastEvent || '',
      totalRevenue: client.totalRevenue || 0,
      since: client.since || new Date().getFullYear().toString()
    });
    setShowModal(true);
    setActiveMenuId(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja remover ${name}?`)) {
      try {
        await deleteDoc(doc(db, 'clients', id));
        showMessage('Cliente removido com sucesso!');
        setActiveMenuId(null);
      } catch (error) {
        console.error('Erro ao deletar:', error);
        showMessage('Erro ao remover cliente');
      }
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingClient(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      cpf_cnpj: '',
      address: '',
      city: '',
      state: '',
      zipcode: '',
      lastEvent: '',
      totalRevenue: 0,
      since: new Date().getFullYear().toString()
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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
          <h2 className="font-serif text-3xl font-bold text-stone-100">Clientes & Anfitriões</h2>
          <p className="text-stone-500">Base completa de registros do Salão Latitude22.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center space-x-2 rounded-lg bg-amber-600 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-amber-700 shadow-xl shadow-amber-900/20 transition-all"
        >
          <UserPlus size={18} />
          <span>Novo Cliente</span>
        </button>
      </div>

      <div className="rounded-xl border border-white/5 bg-stone-900 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5 bg-stone-900/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Search size={18} className="text-stone-600" />
            </span>
            <input
              type="text"
              placeholder="Buscar anfitrião..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-stone-950 py-2.5 pl-10 pr-4 text-sm text-stone-200 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 transition-all"
            />
          </div>
          <div className="flex space-x-2">
            <button className="rounded-lg border border-white/10 bg-stone-950 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-amber-500 transition-colors">
              Exportar
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-white/5 bg-stone-950/50">
              <tr>
                <th className="px-6 py-4">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-stone-600">Nome</span>
                </th>
                <th className="px-6 py-4">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-stone-600">Contato</span>
                </th>
                <th className="px-6 py-4">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-stone-600">Último Evento</span>
                </th>
                <th className="px-6 py-4">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-stone-600">Faturamento</span>
                </th>
                <th className="px-6 py-4 text-right">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-stone-600">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-stone-600">
                    <p className="text-sm font-medium">Nenhum cliente encontrado</p>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className="border-b border-white/5 hover:bg-white/2.5 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-lg bg-amber-600/20 flex items-center justify-center border border-amber-600/30 text-amber-500 font-bold text-xs">
                          {getInitials(client.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-stone-100">{client.name}</p>
                          {client.cpf_cnpj && <p className="text-[10px] text-stone-600">{client.cpf_cnpj}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center text-stone-400 space-x-2">
                        <Phone size={14} className="text-amber-600" />
                        <span>{client.phone}</span>
                      </div>
                      <div className="flex items-center text-stone-400 space-x-2">
                        <Mail size={14} className="text-amber-600" />
                        <span className="text-xs">{client.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {client.lastEvent ? (
                        <div className="flex items-center text-stone-400 space-x-2">
                          <Calendar size={14} />
                          <span className="font-medium">{client.lastEvent}</span>
                        </div>
                      ) : (
                        <span className="text-stone-600">-</span>
                      )}
                    </td>
                    <td className="px-6 py-5 font-bold text-amber-500">
                      {formatCurrency(client.totalRevenue || 0)}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="relative inline-block">
                        <button 
                          onClick={() => setActiveMenuId(activeMenuId === client.id ? null : client.id)}
                          className="text-stone-500 hover:text-amber-500 transition-colors"
                        >
                          <MoreVertical size={18} />
                        </button>

                        {activeMenuId === client.id && (
                          <div ref={menuRef} className="absolute right-0 top-8 z-50 w-48 rounded-lg bg-stone-800 border border-white/10 shadow-xl overflow-hidden">
                            <div className="py-1">
                              <button 
                                onClick={() => handleEdit(client)}
                                className="flex w-full items-center gap-2 px-4 py-2 text-xs text-stone-300 hover:bg-stone-700 hover:text-white"
                              >
                                <Edit2 size={12} /> Editar Cliente
                              </button>
                              
                              <button 
                                onClick={() => {
                                  alert('Visualizar histórico completo do cliente');
                                  setActiveMenuId(null);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-xs text-stone-300 hover:bg-stone-700 hover:text-white"
                              >
                                <Eye size={12} /> Ver Histórico
                              </button>

                              <div className="h-px bg-white/10 my-1"></div>

                              <button 
                                onClick={() => handleDelete(client.id, client.name)}
                                className="flex w-full items-center gap-2 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10"
                              >
                                <Trash2 size={12} /> Excluir Cliente
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-stone-900 border border-white/10 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-xl font-bold text-stone-100">
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </h3>
              <button onClick={closeModal} className="text-stone-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Dados Pessoais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">
                    Nome Completo *
                  </label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none"
                    placeholder="Joana Santos"
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
                    className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none"
                    placeholder="joana@email.com"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">
                    Telefone *
                  </label>
                  <input 
                    type="tel" 
                    required
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none"
                    placeholder="(11) 98877-6655"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">
                    CPF ou CNPJ
                  </label>
                  <input
                    type="text"
                    value={formData.cpf_cnpj}
                    onChange={(e) => setFormData({...formData, cpf_cnpj: e.target.value})}
                    className="w-full rounded-lg border border-white/10 bg-stone-950 px-4 py-3 text-sm text-stone-200 focus:border-amber-600 focus:outline-none"
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  />
                </div>
              </div>

              {/* Endereço */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">
                  Endereço Completo
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full rounded-lg border border-white/10 bg-stone-950 px-4 py-3 text-sm text-stone-200 focus:border-amber-600 focus:outline-none"
                  placeholder="Rua, número, complemento"
                />
              </div>

              {/* Cidade, Estado e CEP */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full rounded-lg border border-white/10 bg-stone-950 px-4 py-3 text-sm text-stone-200 focus:border-amber-600 focus:outline-none"
                    placeholder="Rio de Janeiro"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">
                    UF
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value.toUpperCase()})}
                    className="w-full rounded-lg border border-white/10 bg-stone-950 px-4 py-3 text-sm text-stone-200 focus:border-amber-600 focus:outline-none"
                    placeholder="RJ"
                    maxLength={2}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">
                    CEP
                  </label>
                  <input
                    type="text"
                    value={formData.zipcode}
                    onChange={(e) => setFormData({...formData, zipcode: e.target.value})}
                    className="w-full rounded-lg border border-white/10 bg-stone-950 px-4 py-3 text-sm text-stone-200 focus:border-amber-600 focus:outline-none"
                    placeholder="00000-000"
                  />
                </div>
              </div>

              {/* Informações Adicionais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">
                    Cliente Desde
                  </label>
                  <input 
                    type="text" 
                    value={formData.since}
                    onChange={e => setFormData({...formData, since: e.target.value})}
                    className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none"
                    placeholder="2024"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">
                    Último Evento
                  </label>
                  <input 
                    type="text" 
                    value={formData.lastEvent}
                    onChange={e => setFormData({...formData, lastEvent: e.target.value})}
                    className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none"
                    placeholder="12 Out 2024"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">
                  Faturamento Total (R$)
                </label>
                <input 
                  type="number" 
                  value={formData.totalRevenue}
                  onChange={e => setFormData({...formData, totalRevenue: parseFloat(e.target.value) || 0})}
                  className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none"
                  placeholder="15250.00"
                  step="0.01"
                />
              </div>

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
                  className="flex-1 rounded-lg bg-amber-600 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-amber-700 transition-all"
                >
                  {editingClient ? 'Salvar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsPage;
