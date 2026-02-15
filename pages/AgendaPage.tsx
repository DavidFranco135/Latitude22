import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, Clock, Plus, ChevronLeft, ChevronRight, Filter, Edit2, Trash2, MoreVertical, X, UserPlus, Search } from 'lucide-react';
import { collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface Appointment {
  id: string;
  time: string;
  client: string;
  clientId?: string;
  service: string;
  status: 'confirmado' | 'pendente' | 'concluido' | 'cancelado' | 'pago';
  date: string;
  notes?: string;
  createdAt?: any;
  // NOVOS CAMPOS
  totalValue?: number;
  depositValue?: number;
  remainingValue?: number;
  paymentDate?: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
}

const AgendaPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
  time: '',
  client: '',
  clientId: '',
  service: '',
  status: 'pendente' as 'confirmado' | 'pendente' | 'concluido' | 'cancelado' | 'pago',
  date: new Date().toISOString().split('T')[0],
  notes: '',
  totalValue: 0,
  depositValue: 0,
  remainingValue: 0
});

  const [newClientForm, setNewClientForm] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const hours = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', 
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', 
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'
  ];

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'appointments'),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
        setAppointments(data);
      },
      (error) => {
        console.error('Erro ao carregar agendamentos:', error);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'clients'),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
        setClients(data);
      },
      (error) => {
        console.error('Erro ao carregar clientes:', error);
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
  // Função para lançar valores no financeiro
const lancarNoFinanceiro = async (
  appointment: Appointment, 
  tipo: 'entrada' | 'pagamento_total',
  valor: number
) => {
  try {
    if (!valor || valor <= 0) {
      console.log('Valor zerado, não lança no financeiro');
      return;
    }

    await addDoc(collection(db, 'financial'), {
      description: tipo === 'entrada' 
        ? `Entrada - ${appointment.service} (${appointment.client})`
        : `Pagamento Final - ${appointment.service} (${appointment.client})`,
      amount: valor,
      type: 'income',
      date: appointment.date,
      category: tipo === 'entrada' ? 'Reserva' : 'Evento',
      createdAt: new Date(),
      appointmentId: appointment.id,
      appointmentType: tipo
    });

    console.log(`✅ R$ ${valor.toFixed(2)} lançado no financeiro (${tipo})`);
    showMessage(`💰 R$ ${valor.toFixed(2)} registrado no financeiro!`);
  } catch (error) {
    console.error('Erro ao lançar no financeiro:', error);
  }
};

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!formData.time || !formData.client || !formData.service || !formData.date) {
    showMessage('Preencha todos os campos obrigatórios!');
    return;
  }

  try {
    const totalValue = parseFloat(String(formData.totalValue)) || 0;
    const depositValue = parseFloat(String(formData.depositValue)) || 0;

    const appointmentData = {
      ...formData,
      totalValue,
      depositValue,
      remainingValue: totalValue - depositValue,
      createdAt: new Date()
    };

    if (editingAppointment) {
      // EDITANDO
      await updateDoc(doc(db, 'appointments', editingAppointment.id), appointmentData);
      showMessage('Agendamento atualizado!');
    } else {
      // CRIANDO NOVO
      const docRef = await addDoc(collection(db, 'appointments'), appointmentData);
      
      // Se tiver valor de entrada, lança no financeiro
      if (depositValue > 0) {
        await lancarNoFinanceiro(
          { ...appointmentData, id: docRef.id } as Appointment, 
          'entrada',
          depositValue
        );
      }
      
      showMessage('Agendamento criado com sucesso!');
    }

    setShowModal(false);
    setEditingAppointment(null);
    setFormData({
      time: '',
      client: '',
      clientId: '',
      service: '',
      status: 'pendente',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      totalValue: 0,
      depositValue: 0,
      remainingValue: 0
    });
  } catch (error) {
    console.error('Erro:', error);
    showMessage('Erro ao salvar agendamento');
  }
};

  const handleNewClient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newClientForm.name || !newClientForm.email || !newClientForm.phone) {
      showMessage('Erro: Preencha todos os campos do cliente');
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'clients'), {
        ...newClientForm,
        createdAt: new Date()
      });
      showMessage('Cliente adicionado com sucesso!');
      setFormData({ ...formData, client: newClientForm.name, clientId: docRef.id });
      setShowClientModal(false);
      setNewClientForm({ name: '', email: '', phone: '' });
    } catch (error) {
      console.error('Erro ao adicionar cliente:', error);
      showMessage('Erro ao adicionar cliente');
    }
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setFormData({
      time: appointment.time,
      client: appointment.client,
      clientId: appointment.clientId || '',
      service: appointment.service,
      status: appointment.status,
      date: appointment.date,
      notes: appointment.notes || '',
      totalValue: appointment.totalValue || 0,
      depositValue: appointment.depositValue || 0,
      remainingValue: appointment.remainingValue || 0
    });
    setShowModal(true);
    setActiveMenuId(null);
  };

  const handleDelete = async (id: string, client: string) => {
    if (window.confirm(`Tem certeza que deseja cancelar o agendamento de ${client}?`)) {
      try {
        await deleteDoc(doc(db, 'appointments', id));
        showMessage('Agendamento removido com sucesso!');
        setActiveMenuId(null);
      } catch (error) {
        console.error('Erro ao deletar:', error);
        showMessage('Erro ao remover agendamento');
      }
    }
  };

  const updateStatus = async (id: string, newStatus: Appointment['status']) => {
    try {
      await updateDoc(doc(db, 'appointments', id), { status: newStatus });
      showMessage('Status atualizado!');
      setActiveMenuId(null);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      showMessage('Erro ao atualizar status');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAppointment(null);
    setFormData({
      time: '',
      client: '',
      clientId: '',
      service: '',
      status: 'pendente',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      totalValue: 0,
      depositValue: 0,
      remainingValue: 0
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      confirmado: 'bg-stone-800/50 border-l-4 border-l-amber-600',
      pendente: 'bg-stone-800/30 border-l-4 border-l-blue-600',
      concluido: 'bg-stone-950 border-l-4 border-l-green-600 opacity-70',
      pago: 'bg-stone-800/50 border-l-4 border-l-emerald-600',
      cancelado: 'bg-stone-950 border-l-4 border-l-red-600 opacity-50'
    };
    return colors[status as keyof typeof colors] || colors.pendente;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      confirmado: 'bg-amber-600/20 text-amber-500 border-amber-500/20',
      pendente: 'bg-blue-600/20 text-blue-500 border-blue-500/20',
      concluido: 'bg-green-600/20 text-green-500 border-green-500/20',
      pago: 'bg-emerald-600/20 text-emerald-500 border-emerald-500/20',
      cancelado: 'bg-red-600/20 text-red-500 border-red-500/20'
    };
    return badges[status as keyof typeof badges] || badges.pendente;
  };

  const handleClientSelect = (clientId: string) => {
    const selectedClient = clients.find(c => c.id === clientId);
    if (selectedClient) {
      setFormData({
        ...formData,
        client: selectedClient.name,
        clientId: clientId
      });
    }
  };

  // Filtrar agendamentos
  const filteredAppointments = appointments.filter(app => {
    const appDate = new Date(app.date);
    const matchesMonth = filterMonth ? (appDate.getMonth() + 1) === parseInt(filterMonth) : true;
    const matchesYear = filterYear ? appDate.getFullYear() === parseInt(filterYear) : true;
    const matchesSearch = searchTerm ? app.client.toLowerCase().includes(searchTerm.toLowerCase()) : true;
    const matchesSelectedDate = app.date === formData.date;
    
    return matchesMonth && matchesYear && matchesSearch && matchesSelectedDate;
  });

  // Navegação de datas
  const goToPrevDay = () => {
    const newDate = new Date(formData.date);
    newDate.setDate(newDate.getDate() - 1);
    setFormData({ ...formData, date: newDate.toISOString().split('T')[0] });
  };

  const goToNextDay = () => {
    const newDate = new Date(formData.date);
    newDate.setDate(newDate.getDate() + 1);
    setFormData({ ...formData, date: newDate.toISOString().split('T')[0] });
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
          <h2 className="font-serif text-3xl font-bold text-stone-100">Agenda de Eventos</h2>
          <p className="text-stone-500">Controle de datas, visitas e montagens.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center space-x-2 rounded-lg bg-amber-600 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-amber-700 shadow-xl shadow-amber-900/20 transition-all"
        >
          <Plus size={18} />
          <span>Novo Agendamento</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="rounded-xl border border-white/5 bg-stone-900 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600" />
            <input
              type="text"
              placeholder="Buscar por cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-stone-950 py-2.5 pl-10 pr-4 text-sm text-stone-200 focus:border-amber-600 focus:outline-none"
            />
          </div>
          
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="rounded-lg border border-white/10 bg-stone-950 px-4 py-2.5 text-sm text-stone-200 focus:border-amber-600 outline-none"
          >
            <option value="">Todos os meses</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2024, i).toLocaleDateString('pt-BR', { month: 'long' })}
              </option>
            ))}
          </select>

          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="rounded-lg border border-white/10 bg-stone-950 px-4 py-2.5 text-sm text-stone-200 focus:border-amber-600 outline-none"
          >
            <option value="">Todos os anos</option>
            {[2024, 2025, 2026].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Calendário */}
      <div className="rounded-xl border border-white/5 bg-stone-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/5 p-6">
          <button onClick={goToPrevDay} className="p-2 rounded-lg hover:bg-white/5 text-stone-500 hover:text-white transition-all">
            <ChevronLeft size={20} />
          </button>
          
          <div className="text-center">
            <h3 className="font-bold text-xl text-white uppercase tracking-tight">
              {new Date(formData.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </h3>
            <p className="text-xs text-stone-500 mt-1 uppercase tracking-widest">
              {new Date(formData.date).toLocaleDateString('pt-BR', { weekday: 'long' })}
            </p>
          </div>
          
          <button onClick={goToNextDay} className="p-2 rounded-lg hover:bg-white/5 text-stone-500 hover:text-white transition-all">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid gap-2">
            {hours.map(hour => {
              const appointment = filteredAppointments.find(app => app.time === hour);
              return (
                <div key={hour} className="relative group">
                  <div className="flex items-start gap-4">
                    <div className="w-20 pt-2 text-right">
                      <span className="text-xs font-bold text-stone-600 uppercase tracking-widest">{hour}</span>
                    </div>
                    {appointment ? (
                      <div className={`flex-1 rounded-xl p-4 border border-white/5 ${getStatusColor(appointment.status)} relative overflow-hidden group hover:shadow-lg transition-all`}>
                        <div className="relative z-10">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="font-bold text-white uppercase tracking-tight">{appointment.client}</h4>
                                <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border ${getStatusBadge(appointment.status)}`}>
                                  {appointment.status}
                                </span>
                              </div>
                            </div>
                            <div className="relative">
                              <button 
                                onClick={() => setActiveMenuId(activeMenuId === appointment.id ? null : appointment.id)}
                                className="p-1 rounded hover:bg-white/10 text-stone-500 hover:text-white transition-all"
                              >
                                <MoreVertical size={16} />
                              </button>

                              {activeMenuId === appointment.id && (
                                <div ref={menuRef} className="absolute right-0 top-8 z-50 w-48 rounded-lg bg-stone-800 border border-white/10 shadow-xl overflow-hidden">
                                  <div className="py-1">
                                    <button 
                                      onClick={() => handleEdit(appointment)}
                                      className="flex w-full items-center gap-2 px-4 py-2 text-xs text-stone-300 hover:bg-stone-700 hover:text-white"
                                    >
                                      <Edit2 size={12} /> Editar
                                    </button>
                                    
                                    {appointment.status !== 'confirmado' && (
                                      <button 
                                        onClick={() => updateStatus(appointment.id, 'confirmado')}
                                        className="flex w-full items-center gap-2 px-4 py-2 text-xs text-stone-300 hover:bg-stone-700 hover:text-white"
                                      >
                                        Confirmar
                                      </button>
                                    )}
                                    
                                    {appointment.status !== 'concluido' && (
                                      <button 
                                        onClick={() => updateStatus(appointment.id, 'concluido')}
                                        className="flex w-full items-center gap-2 px-4 py-2 text-xs text-stone-300 hover:bg-stone-700 hover:text-white"
                                      >
                                        Marcar como Concluído
                                      </button>
                                    )}
                                    
                                    {/* Botão Marcar como Pago */}
                                    {appointment.status !== 'pago' && appointment.status !== 'cancelado' && appointment.remainingValue > 0 && (
                                      <button
                                        onClick={async () => {
                                          setActiveMenuId(null);
                                          if (confirm(`Confirmar pagamento?\n\nValor restante: R$ ${appointment.remainingValue.toFixed(2)}\n\nIsso lançará o valor no financeiro.`)) {
                                            try {
                                              // Atualiza status
                                              await updateDoc(doc(db, 'appointments', appointment.id), {
                                                status: 'pago',
                                                paymentDate: new Date().toISOString()
                                              });
                                              
                                              // Lança valor restante no financeiro
                                              await lancarNoFinanceiro(appointment, 'pagamento_total', appointment.remainingValue);
                                              
                                              showMessage('✓ Pagamento registrado!');
                                            } catch (error) {
                                              console.error('Erro:', error);
                                              showMessage('Erro ao registrar pagamento');
                                            }
                                          }
                                        }}
                                        className="flex w-full items-center gap-2 px-4 py-2 text-xs text-green-400 hover:bg-green-500/10"
                                      >
                                        <i className="fas fa-dollar-sign w-4"></i>
                                        <span>Marcar como Pago</span>
                                      </button>
                                    )}

                                    <div className="h-px bg-white/10 my-1"></div>

                                    <button 
                                      onClick={() => handleDelete(appointment.id, appointment.client)}
                                      className="flex w-full items-center gap-2 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10"
                                    >
                                      <Trash2 size={12} /> Cancelar
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-stone-500 mt-2 font-medium">{appointment.service}</p>
                          {appointment.notes && (
                            <p className="text-xs text-stone-600 mt-1 italic">{appointment.notes}</p>
                          )}
                          
                          {/* Informações Financeiras */}
                          {appointment.totalValue > 0 && (
                            <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-stone-500">Valor Total:</span>
                                <span className="text-stone-200 font-bold">R$ {appointment.totalValue.toFixed(2)}</span>
                              </div>
                              {appointment.depositValue > 0 && (
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-green-500">✓ Entrada Paga:</span>
                                  <span className="text-green-400 font-bold">R$ {appointment.depositValue.toFixed(2)}</span>
                                </div>
                              )}
                              {appointment.remainingValue > 0 && (
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-amber-500">Restante:</span>
                                  <span className="text-amber-400 font-bold">R$ {appointment.remainingValue.toFixed(2)}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          setFormData({...formData, time: hour});
                          setShowModal(true);
                        }}
                        className="flex-1 h-10 rounded-xl border border-dashed border-white/5 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-stone-600 hover:text-amber-500 hover:bg-white/5 transition-all"
                      >
                        Reservar horário
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal de Agendamento */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-stone-900 border border-white/10 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-xl font-bold text-stone-100">
                {editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}
              </h3>
              <button onClick={closeModal} className="text-stone-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block flex items-center justify-between">
                    <span>Cliente *</span>
                    <button
                      type="button"
                      onClick={() => setShowClientModal(true)}
                      className="text-amber-500 hover:text-amber-400 flex items-center gap-1"
                    >
                      <UserPlus size={12} />
                      <span className="text-[9px]">Novo</span>
                    </button>
                  </label>
                  <select
                    required
                    value={formData.clientId}
                    onChange={(e) => handleClientSelect(e.target.value)}
                    className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none"
                  >
                    <option value="">Selecione um cliente...</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">
                    Serviço *
                  </label>
                  <select
                    required
                    value={formData.service}
                    onChange={e => setFormData({...formData, service: e.target.value})}
                    className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none"
                  >
                    <option value="">Selecione...</option>
                    <option value="Visita Técnica">Visita Técnica</option>
                    <option value="Degustação Buffet">Degustação Buffet</option>
                    <option value="Reunião Decoração">Reunião Decoração</option>
                    <option value="Montagem Evento">Montagem Evento</option>
                    <option value="Evento">Evento</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">
                    Data *
                  </label>
                  <input 
                    type="date" 
                    required
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">
                    Horário *
                  </label>
                  <select
                    required
                    value={formData.time}
                    onChange={e => setFormData({...formData, time: e.target.value})}
                    className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none"
                  >
                    <option value="">Selecione...</option>
                    {hours.map(hour => (
                      <option key={hour} value={hour}>{hour}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value as any})}
                    className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="concluido">Concluído</option>
                    <option value="pago">Pago</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>
              {/* VALOR TOTAL */}
<div>
  <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">
    💰 Valor Total (R$)
  </label>
  <input
    type="number"
    value={formData.totalValue}
    onChange={(e) => {
      const total = parseFloat(e.target.value) || 0;
      const deposit = parseFloat(String(formData.depositValue)) || 0;
      setFormData({
        ...formData, 
        totalValue: total,
        remainingValue: total - deposit
      });
    }}
    className="w-full rounded-lg border border-white/10 bg-stone-950 px-4 py-2.5 text-sm text-stone-200 focus:border-amber-600 focus:outline-none"
    placeholder="0,00"
    step="0.01"
    min="0"
  />
</div>

{/* VALOR DE ENTRADA */}
<div>
  <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">
    💵 Valor de Entrada/Sinal (R$)
  </label>
  <input
    type="number"
    value={formData.depositValue}
    onChange={(e) => {
      const deposit = parseFloat(e.target.value) || 0;
      const total = parseFloat(String(formData.totalValue)) || 0;
      setFormData({
        ...formData, 
        depositValue: deposit,
        remainingValue: total - deposit
      });
    }}
    className="w-full rounded-lg border border-white/10 bg-stone-950 px-4 py-2.5 text-sm text-stone-200 focus:border-amber-600 focus:outline-none"
    placeholder="0,00"
    step="0.01"
    min="0"
  />
  {formData.totalValue > 0 && (
    <p className="text-xs text-amber-400 mt-1">
      Restante a pagar: R$ {((formData.totalValue || 0) - (formData.depositValue || 0)).toFixed(2)}
    </p>
  )}
</div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">
                  Observações
                </label>
                <textarea 
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                  className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none resize-none"
                  placeholder="Notas adicionais sobre o agendamento..."
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
                  {editingAppointment ? 'Salvar' : 'Agendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Novo Cliente */}
      {showClientModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-stone-950/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-stone-900 border border-white/10 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-xl font-bold text-stone-100">Adicionar Cliente</h3>
              <button onClick={() => setShowClientModal(false)} className="text-stone-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleNewClient} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">
                  Nome Completo *
                </label>
                <input 
                  type="text" 
                  required
                  value={newClientForm.name}
                  onChange={e => setNewClientForm({...newClientForm, name: e.target.value})}
                  className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none"
                  placeholder="Nome do cliente"
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">
                  Email *
                </label>
                <input 
                  type="email" 
                  required
                  value={newClientForm.email}
                  onChange={e => setNewClientForm({...newClientForm, email: e.target.value})}
                  className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none"
                  placeholder="email@exemplo.com"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">
                  Telefone *
                </label>
                <input 
                  type="tel" 
                  required
                  value={newClientForm.phone}
                  onChange={e => setNewClientForm({...newClientForm, phone: e.target.value})}
                  className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowClientModal(false)}
                  className="flex-1 rounded-lg border border-white/10 bg-stone-950 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:bg-stone-800 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 rounded-lg bg-amber-600 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-amber-700 transition-all"
                >
                  Adicionar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgendaPage;
