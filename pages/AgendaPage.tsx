import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, Clock, Plus, ChevronLeft, ChevronRight, Filter, Edit2, Trash2, MoreVertical, X } from 'lucide-react';
import { collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface Appointment {
  id: string;
  time: string;
  client: string;
  service: string;
  status: 'confirmado' | 'pendente' | 'concluido' | 'cancelado';
  date: string;
  notes?: string;
  createdAt?: any;
}

const AgendaPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    time: '',
    client: '',
    service: '',
    status: 'pendente' as 'confirmado' | 'pendente' | 'concluido' | 'cancelado',
    date: new Date().toISOString().split('T')[0],
    notes: ''
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
    
    if (!formData.time || !formData.client || !formData.service) {
      showMessage('Erro: Preencha todos os campos obrigatórios');
      return;
    }

    try {
      if (editingAppointment) {
        await updateDoc(doc(db, 'appointments', editingAppointment.id), formData);
        showMessage('Agendamento atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'appointments'), {
          ...formData,
          createdAt: new Date()
        });
        showMessage('Agendamento criado com sucesso!');
      }
      closeModal();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      showMessage('Erro ao salvar agendamento');
    }
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setFormData({
      time: appointment.time,
      client: appointment.client,
      service: appointment.service,
      status: appointment.status,
      date: appointment.date,
      notes: appointment.notes || ''
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
      service: '',
      status: 'pendente',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      confirmado: 'bg-stone-800/50 border-l-4 border-l-amber-600',
      pendente: 'bg-stone-800/30 border-l-4 border-l-blue-600',
      concluido: 'bg-stone-950 border-l-4 border-l-green-600 opacity-70',
      cancelado: 'bg-stone-950 border-l-4 border-l-red-600 opacity-50'
    };
    return colors[status as keyof typeof colors] || colors.pendente;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      confirmado: 'bg-amber-600/20 text-amber-500 border-amber-500/20',
      pendente: 'bg-blue-600/20 text-blue-500 border-blue-500/20',
      concluido: 'bg-green-600/20 text-green-500 border-green-500/20',
      cancelado: 'bg-red-600/20 text-red-500 border-red-500/20'
    };
    return badges[status as keyof typeof badges] || badges.pendente;
  };

  const selectedDateAppointments = appointments.filter(
    app => app.date === formData.date
  );

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

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Date Selection Panel */}
        <div className="w-full shrink-0 lg:w-80">
          <div className="rounded-xl border border-white/5 bg-stone-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-bold text-stone-100">
                {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </h3>
              <div className="flex space-x-1">
                <button 
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setCurrentDate(newDate);
                  }}
                  className="rounded p-1 hover:bg-stone-800 text-stone-400"
                >
                  <ChevronLeft size={16} />
                </button>
                <button 
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setCurrentDate(newDate);
                  }}
                  className="rounded p-1 hover:bg-stone-800 text-stone-400"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-widest">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
                <div key={d} className="py-2 text-stone-600">{d}</div>
              ))}
              {Array.from({ length: 35 }).map((_, i) => {
                const dayNum = i - 5;
                const isSelected = dayNum === 15;
                return (
                  <button 
                    key={i} 
                    onClick={() => {
                      const newDate = new Date(currentDate);
                      newDate.setDate(dayNum);
                      setFormData({...formData, date: newDate.toISOString().split('T')[0]});
                    }}
                    className={`aspect-square rounded-lg flex items-center justify-center transition-all ${
                      isSelected ? 'bg-amber-600 text-white shadow-lg' : 
                      dayNum > 0 && dayNum <= 30 ? 'text-stone-400 hover:bg-stone-800' : 'text-stone-800'
                    }`}
                  >
                    {dayNum > 0 && dayNum <= 30 ? dayNum : ''}
                  </button>
                );
              })}
            </div>
            
            <div className="mt-10 space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Status</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-sm text-stone-400">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  <span>Confirmado</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-stone-400">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span>Pendente</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-stone-400">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span>Concluído</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline View */}
        <div className="flex-1 rounded-xl border border-white/5 bg-stone-900 shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-stone-900/50">
            <div className="flex items-center space-x-3">
              <CalendarIcon size={20} className="text-amber-600" />
              <span className="font-bold text-stone-100">
                {new Date(formData.date).toLocaleDateString('pt-BR', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })}
              </span>
            </div>
          </div>
          
          <div className="relative h-[600px] overflow-y-auto p-6 scrollbar-hide">
            <div className="space-y-4">
              {hours.map((hour) => {
                const app = selectedDateAppointments.find(a => a.time === hour);
                return (
                  <div key={hour} className="flex group">
                    <div className="w-16 shrink-0 py-2 text-[10px] font-bold text-stone-600 uppercase tracking-widest">
                      {hour}
                    </div>
                    <div className="flex-1 border-l border-white/5 pl-8 py-1 relative">
                      {app ? (
                        <div className={`rounded-xl border border-white/5 p-4 shadow-xl transition-all hover:scale-[1.01] ${getStatusColor(app.status)}`}>
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-stone-100">{app.client}</h4>
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-bold uppercase tracking-[0.2em] px-2 py-1 rounded-full border ${getStatusBadge(app.status)}`}>
                                {app.status}
                              </span>
                              
                              <div className="relative">
                                <button 
                                  onClick={() => setActiveMenuId(activeMenuId === app.id ? null : app.id)}
                                  className="p-1 text-stone-500 hover:text-white transition-colors"
                                >
                                  <MoreVertical size={14} />
                                </button>

                                {activeMenuId === app.id && (
                                  <div ref={menuRef} className="absolute right-0 top-6 z-50 w-48 rounded-lg bg-stone-800 border border-white/10 shadow-xl overflow-hidden">
                                    <div className="py-1">
                                      <button 
                                        onClick={() => handleEdit(app)}
                                        className="flex w-full items-center gap-2 px-4 py-2 text-xs text-stone-300 hover:bg-stone-700 hover:text-white"
                                      >
                                        <Edit2 size={12} /> Editar
                                      </button>
                                      
                                      {app.status !== 'confirmado' && (
                                        <button 
                                          onClick={() => updateStatus(app.id, 'confirmado')}
                                          className="flex w-full items-center gap-2 px-4 py-2 text-xs text-stone-300 hover:bg-stone-700 hover:text-white"
                                        >
                                          Confirmar
                                        </button>
                                      )}
                                      
                                      {app.status !== 'concluido' && (
                                        <button 
                                          onClick={() => updateStatus(app.id, 'concluido')}
                                          className="flex w-full items-center gap-2 px-4 py-2 text-xs text-stone-300 hover:bg-stone-700 hover:text-white"
                                        >
                                          Marcar como Concluído
                                        </button>
                                      )}

                                      <div className="h-px bg-white/10 my-1"></div>

                                      <button 
                                        onClick={() => handleDelete(app.id, app.client)}
                                        className="flex w-full items-center gap-2 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10"
                                      >
                                        <Trash2 size={12} /> Cancelar
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-stone-500 mt-2 font-medium">{app.service}</p>
                          {app.notes && (
                            <p className="text-xs text-stone-600 mt-1 italic">{app.notes}</p>
                          )}
                        </div>
                      ) : (
                        <button 
                          onClick={() => {
                            setFormData({...formData, time: hour});
                            setShowModal(true);
                          }}
                          className="w-full h-10 rounded-xl border border-dashed border-white/5 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-stone-600 hover:text-amber-500 hover:bg-white/5 transition-all"
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
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-stone-900 border border-white/10 shadow-2xl p-6">
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
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">
                    Cliente *
                  </label>
                  <input 
                    type="text" 
                    required
                    value={formData.client}
                    onChange={e => setFormData({...formData, client: e.target.value})}
                    className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none"
                    placeholder="Nome do cliente"
                  />
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
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
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
    </div>
  );
};

export default AgendaPage;
