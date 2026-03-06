import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight,
  Edit2, Trash2, MoreVertical, X, UserPlus, Search,
  BookOpen, DollarSign, CheckCircle
} from 'lucide-react';
import {
  collection, onSnapshot, addDoc, deleteDoc, updateDoc,
  doc, getDocs, query, where
} from 'firebase/firestore';
import { db } from '../services/firebase';

// ─── TIPOS ───────────────────────────────────────────────────────────────────

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
  totalValue?: number;
  depositValue?: number;
  remainingValue?: number;
  paymentDate?: string;
}

interface ReservaOnline {
  id: string;
  date: string;
  datas: string[];
  client: string;
  tipoEvento: string;
  status: string;
  valorTotal: number;
  valorPago: number;
  saldoPendente: number;
  protocolo?: string;
  telefone?: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

const fmtBR = (str: string) => {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
};

const STATUS_COR: Record<string, string> = {
  confirmado: 'border-l-4 border-l-amber-600 bg-stone-800/50',
  pendente:   'border-l-4 border-l-blue-600  bg-stone-800/30',
  concluido:  'border-l-4 border-l-green-600 bg-stone-950 opacity-70',
  pago:       'border-l-4 border-l-emerald-600 bg-stone-800/50',
  cancelado:  'border-l-4 border-l-red-600   bg-stone-950 opacity-50',
};

const STATUS_BADGE: Record<string, string> = {
  confirmado: 'bg-amber-600/20   text-amber-500  border-amber-500/20',
  pendente:   'bg-blue-600/20    text-blue-500   border-blue-500/20',
  concluido:  'bg-green-600/20   text-green-500  border-green-500/20',
  pago:       'bg-emerald-600/20 text-emerald-500 border-emerald-500/20',
  cancelado:  'bg-red-600/20     text-red-500    border-red-500/20',
};

const RESERVA_COR: Record<string, string> = {
  reservado:          'border-l-4 border-l-blue-500   bg-blue-900/20',
  confirmado:         'border-l-4 border-l-green-500  bg-green-900/20',
  cancelado:          'border-l-4 border-l-red-600    bg-stone-950 opacity-50',
  pendente_pagamento: 'border-l-4 border-l-amber-500  bg-amber-900/20',
  expirado:           'border-l-4 border-l-stone-700  bg-stone-900 opacity-40',
};

const RESERVA_BADGE: Record<string, string> = {
  reservado:          'bg-blue-600/20  text-blue-400  border-blue-500/20',
  confirmado:         'bg-green-600/20 text-green-400 border-green-500/20',
  cancelado:          'bg-red-600/20   text-red-400   border-red-500/20',
  pendente_pagamento: 'bg-amber-600/20 text-amber-400 border-amber-500/20',
  expirado:           'bg-stone-600/20 text-stone-500 border-stone-500/20',
};

const RESERVA_LABEL: Record<string, string> = {
  reservado:          'Sinal Pago — Saldo Pendente',
  confirmado:         'Pago Integralmente',
  cancelado:          'Cancelado',
  pendente_pagamento: 'Aguardando Pagamento',
  expirado:           'Expirado',
};

const HOURS = [
  '09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','12:30','13:00','13:30','14:00','14:30',
  '15:00','15:30','16:00','16:30','17:00','17:30',
  '18:00','18:30','19:00','19:30','20:00','20:30',
];

// ─── COMPONENTE ──────────────────────────────────────────────────────────────

const AgendaPage: React.FC = () => {
  const [appointments,   setAppointments]   = useState<Appointment[]>([]);
  const [reservasOnline, setReservasOnline] = useState<ReservaOnline[]>([]);
  const [clients,        setClients]        = useState<Client[]>([]);
  const [viewMode,       setViewMode]       = useState<'day' | 'all'>('day');
  const [selectedDate,   setSelectedDate]   = useState(new Date().toISOString().split('T')[0]);
  const [filterMonth,    setFilterMonth]    = useState('');
  const [filterYear,     setFilterYear]     = useState('');
  const [searchTerm,     setSearchTerm]     = useState('');
  const [showModal,      setShowModal]      = useState(false);
  const [showClientModal,setShowClientModal]= useState(false);
  const [editingApt,     setEditingApt]     = useState<Appointment | null>(null);
  const [activeMenuId,   setActiveMenuId]   = useState<string | null>(null);
  const [message,        setMessage]        = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const emptyForm = {
    time: '', client: '', clientId: '', service: '',
    status: 'pendente' as Appointment['status'],
    date: selectedDate, notes: '',
    totalValue: 0, depositValue: 0, remainingValue: 0,
  };
  const [formData, setFormData]       = useState(emptyForm);
  const [newClient, setNewClient]     = useState({ name: '', email: '', phone: '' });

  // ── Listeners ──────────────────────────────────────────────────────────────

  // 1. Agendamentos manuais — TODOS, sem filtro de status
  useEffect(() => {
    return onSnapshot(collection(db, 'appointments'), snap => {
      setAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment)));
    });
  }, []);

  // 2. Reservas online — TODOS os status (não só ativos)
  //    Para o calendário mostrar confirmadas, pendentes, reservadas, etc.
  useEffect(() => {
    return onSnapshot(collection(db, 'reservas'), snap => {
      const items: ReservaOnline[] = snap.docs.map(d => {
        const r        = d.data();
        const total    = Number(r.valorTotal)    || 0;
        const pago     = Number(r.valorPago)     || 0;
        const saldo    = Number(r.saldoPendente) >= 0
          ? Number(r.saldoPendente)
          : Math.max(0, total - pago);
        const datas: string[] = Array.isArray(r.datas) && r.datas.length
          ? r.datas
          : r.data ? [r.data] : [];
        return {
          id:          d.id,
          date:        r.data || datas[0] || '',
          datas,
          client:      r.clienteNome   || '—',
          tipoEvento:  r.tipoEvento    || 'Evento',
          status:      r.status        || 'pendente_pagamento',
          valorTotal:  total,
          valorPago:   pago,
          saldoPendente: saldo,
          protocolo:   r.protocolo,
          telefone:    r.clienteTelefone,
        };
      });
      setReservasOnline(items);
    });
  }, []);

  // 3. Clientes
  useEffect(() => {
    return onSnapshot(collection(db, 'clients'), snap => {
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client)));
    });
  }, []);

  // Fecha menu ao clicar fora
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setActiveMenuId(null);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // ── Filtros ─────────────────────────────────────────────────────────────────

  // Filtro comum para qualquer data string
  const passaFiltroMesAno = (dateStr: string) => {
    if (!dateStr) return true;
    const d = new Date(dateStr + 'T12:00:00');
    if (filterMonth && (d.getMonth() + 1) !== parseInt(filterMonth)) return false;
    if (filterYear  && d.getFullYear()    !== parseInt(filterYear))  return false;
    return true;
  };

  // Agendamentos manuais filtrados
  const aptFiltrados = appointments.filter(a => {
    if (!passaFiltroMesAno(a.date)) return false;
    if (searchTerm && !a.client.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    // Modo dia: só mostra do dia selecionado
    if (viewMode === 'day' && a.date !== selectedDate) return false;
    return true;
  });

  // Reservas online filtradas
  const reservasFiltradas = reservasOnline.filter(r => {
    const datas = r.datas.length ? r.datas : [r.date];
    // Filtro mês/ano: basta UMA das datas passar
    if (filterMonth || filterYear) {
      if (!datas.some(passaFiltroMesAno)) return false;
    }
    if (searchTerm && !r.client.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    // Modo dia: basta UMA das datas bater com o dia selecionado
    if (viewMode === 'day' && !datas.includes(selectedDate)) return false;
    return true;
  });

  const totalItens = aptFiltrados.length + reservasFiltradas.length;

  // ── Navegação ──────────────────────────────────────────────────────────────

  const shiftDay = (delta: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    const novo = d.toISOString().split('T')[0];
    setSelectedDate(novo);
    setFormData(f => ({ ...f, date: novo }));
  };

  // ── Mensagem ───────────────────────────────────────────────────────────────

  const showMsg = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3500);
  };

  // ── CRUD Appointments ───────────────────────────────────────────────────────

  const lancarFinanceiro = async (apt: Appointment, tipo: 'entrada' | 'pagamento_total', valor: number) => {
    if (valor <= 0) return;
    await addDoc(collection(db, 'financial'), {
      description:     tipo === 'entrada'
        ? `Entrada — ${apt.service} (${apt.client})`
        : `Pagamento Final — ${apt.service} (${apt.client})`,
      amount:          valor,
      type:            'income',
      date:            apt.date,
      category:        tipo === 'entrada' ? 'Reserva' : 'Evento',
      createdAt:       new Date(),
      appointmentId:   apt.id,
      appointmentType: tipo,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.time || !formData.client || !formData.service || !formData.date) {
      showMsg('Preencha todos os campos obrigatórios!');
      return;
    }
    const total   = parseFloat(String(formData.totalValue))   || 0;
    const deposit = parseFloat(String(formData.depositValue)) || 0;
    const payload = { ...formData, totalValue: total, depositValue: deposit, remainingValue: total - deposit, createdAt: new Date() };

    if (editingApt) {
      await updateDoc(doc(db, 'appointments', editingApt.id), payload);
      showMsg('Agendamento atualizado!');
    } else {
      const ref = await addDoc(collection(db, 'appointments'), payload);
      if (deposit > 0) await lancarFinanceiro({ ...payload, id: ref.id } as Appointment, 'entrada', deposit);
      showMsg('Agendamento criado!');
    }
    closeModal();
  };

  const handleDelete = async (id: string, client: string) => {
    const apt = appointments.find(a => a.id === id);
    if (!apt) return;
    const pago = apt.status === 'pago' ? (apt.totalValue || 0) : (apt.depositValue || 0);
    let msg = `Cancelar agendamento de ${client}?`;
    if (pago > 0) msg += `\n\nValor lançado: ${fmt(pago)}\nOs lançamentos financeiros serão removidos.`;
    if (!window.confirm(msg)) return;
    const snap = await getDocs(query(collection(db, 'financial'), where('appointmentId', '==', id)));
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
    await deleteDoc(doc(db, 'appointments', id));
    showMsg(`Removido${snap.size > 0 ? ` — ${snap.size} lançamento(s) estornado(s)` : ''}`);
    setActiveMenuId(null);
  };

  const updateStatus = async (id: string, status: Appointment['status']) => {
    await updateDoc(doc(db, 'appointments', id), { status });
    showMsg('Status atualizado!');
    setActiveMenuId(null);
  };

  const handleMarcarPago = async (apt: Appointment) => {
    setActiveMenuId(null);
    if (!confirm(`Confirmar pagamento de ${fmt(apt.remainingValue || 0)}?\nLançará o saldo no financeiro.`)) return;
    const existing = await getDocs(query(
      collection(db, 'financial'),
      where('appointmentId', '==', apt.id),
      where('appointmentType', '==', 'pagamento_total')
    ));
    if (!existing.empty) { showMsg('⚠️ Já marcado como pago!'); return; }
    await updateDoc(doc(db, 'appointments', apt.id), { status: 'pago', paymentDate: new Date().toISOString() });
    await lancarFinanceiro(apt, 'pagamento_total', apt.remainingValue || 0);
    showMsg('✓ Pagamento registrado!');
  };

  const handleNewClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name || !newClient.email || !newClient.phone) { showMsg('Preencha todos os campos'); return; }
    const ref = await addDoc(collection(db, 'clients'), { ...newClient, createdAt: new Date() });
    setFormData(f => ({ ...f, client: newClient.name, clientId: ref.id }));
    setShowClientModal(false);
    setNewClient({ name: '', email: '', phone: '' });
    showMsg('Cliente adicionado!');
  };

  const openNewModal = (hora = '') => {
    setEditingApt(null);
    setFormData({ ...emptyForm, date: selectedDate, time: hora });
    setShowModal(true);
  };

  const openEditModal = (apt: Appointment) => {
    setEditingApt(apt);
    setFormData({
      time: apt.time, client: apt.client, clientId: apt.clientId || '',
      service: apt.service, status: apt.status, date: apt.date,
      notes: apt.notes || '', totalValue: apt.totalValue || 0,
      depositValue: apt.depositValue || 0, remainingValue: apt.remainingValue || 0,
    });
    setShowModal(true);
    setActiveMenuId(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingApt(null);
    setFormData({ ...emptyForm, date: selectedDate });
  };

  // ── Cards ──────────────────────────────────────────────────────────────────

  const MenuApt = ({ apt }: { apt: Appointment }) => (
    activeMenuId === apt.id ? (
      <div ref={menuRef} className="absolute right-0 top-8 z-[200] w-52 rounded-lg bg-stone-800 border border-white/10 shadow-xl overflow-hidden">
        <button onClick={e => { e.stopPropagation(); openEditModal(apt); }}
          className="flex w-full items-center gap-3 px-4 py-3 text-sm text-stone-300 hover:bg-stone-700 hover:text-white">
          <Edit2 size={14}/>Editar
        </button>
        {apt.status !== 'confirmado' && (
          <button onClick={e => { e.stopPropagation(); updateStatus(apt.id, 'confirmado'); }}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm text-stone-300 hover:bg-stone-700 hover:text-white">
            <CheckCircle size={14}/>Confirmar
          </button>
        )}
        {apt.status !== 'concluido' && (
          <button onClick={e => { e.stopPropagation(); updateStatus(apt.id, 'concluido'); }}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm text-stone-300 hover:bg-stone-700 hover:text-white">
            <CheckCircle size={14}/>Marcar Concluído
          </button>
        )}
        {apt.status !== 'pago' && apt.status !== 'cancelado' && (apt.remainingValue || 0) > 0 && (
          <button onClick={e => { e.stopPropagation(); handleMarcarPago(apt); }}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm text-green-400 hover:bg-stone-700">
            <DollarSign size={14}/>Marcar como Pago
          </button>
        )}
        <div className="h-px bg-white/10"/>
        <button onClick={e => { e.stopPropagation(); handleDelete(apt.id, apt.client); }}
          className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10">
          <Trash2 size={14}/>Cancelar
        </button>
      </div>
    ) : null
  );

  const InfoFinanceira = ({ apt }: { apt: Appointment }) => (
    (apt.totalValue || 0) > 0 ? (
      <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-stone-500">Total</span>
          <span className="text-stone-200 font-bold">{fmt(apt.totalValue!)}</span>
        </div>
        {(apt.depositValue || 0) > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-green-500">✓ Entrada</span>
            <span className="text-green-400 font-bold">{fmt(apt.depositValue!)}</span>
          </div>
        )}
        {(apt.remainingValue || 0) > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-amber-500">Restante</span>
            <span className="text-amber-400 font-bold">{fmt(apt.remainingValue!)}</span>
          </div>
        )}
      </div>
    ) : null
  );

  const CardReserva = ({ r, showAllDates = false }: { r: ReservaOnline; showAllDates?: boolean }) => (
    <div className={`rounded-xl p-4 border border-white/5 ${RESERVA_COR[r.status] || 'border-l-4 border-l-stone-600 bg-stone-900'} transition-all`}>
      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-900/30 text-indigo-400 border border-indigo-700/30">
          <BookOpen size={9}/>Online
        </span>
        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${RESERVA_BADGE[r.status] || 'bg-stone-700/20 text-stone-400 border-stone-600/20'}`}>
          {RESERVA_LABEL[r.status] || r.status}
        </span>
        {r.protocolo && <span className="text-[9px] text-stone-600 font-mono">{r.protocolo}</span>}
      </div>

      <h4 className="font-bold text-white uppercase tracking-tight">{r.client}</h4>
      <p className="text-xs text-stone-500 mt-0.5">{r.tipoEvento}</p>

      {/* Datas — no modo dia mostra todas; no modo all destaca a relevante */}
      <div className="flex flex-wrap gap-1.5 mt-2">
        {r.datas.map(d => (
          <span key={d} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            d === selectedDate && viewMode === 'day'
              ? 'bg-amber-600/20 text-amber-400 border border-amber-700/30'
              : 'bg-stone-800 text-stone-400'
          }`}>
            {fmtBR(d)}
          </span>
        ))}
      </div>

      {/* Valores */}
      {r.valorTotal > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-stone-500">Valor Total</span>
            <span className="text-stone-200 font-bold">{fmt(r.valorTotal)}</span>
          </div>
          {r.valorPago > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-green-500">✓ Pago</span>
              <span className="text-green-400 font-bold">{fmt(r.valorPago)}</span>
            </div>
          )}
          {r.saldoPendente > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-amber-500">Saldo a receber</span>
              <span className="text-amber-400 font-bold">{fmt(r.saldoPendente)}</span>
            </div>
          )}
        </div>
      )}
      {r.telefone && <p className="text-[10px] text-stone-600 mt-2">📱 {r.telefone}</p>}
    </div>
  );

  // ── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Toast */}
      {message && (
        <div className={`p-4 rounded-lg text-[10px] font-bold uppercase tracking-widest text-center transition-all ${
          message.includes('Erro') || message.includes('⚠')
            ? 'bg-red-500/20 text-red-500 border border-red-500/20'
            : 'bg-green-500/20 text-green-500 border border-green-500/20'
        }`}>{message}</div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-serif text-3xl font-bold text-stone-100">Agenda de Eventos</h2>
          <p className="text-stone-500 text-sm mt-1">
            Agendamentos manuais + Reservas online sincronizadas em tempo real.
          </p>
        </div>
        <button onClick={() => openNewModal()}
          className="flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-amber-700 shadow-xl shadow-amber-900/20 transition-all">
          <Plus size={18}/>Novo Agendamento
        </button>
      </div>

      {/* Filtros */}
      <div className="rounded-xl border border-white/5 bg-stone-900 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600"/>
            <input type="text" placeholder="Buscar cliente..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-stone-950 py-2.5 pl-9 pr-4 text-sm text-stone-200 focus:border-amber-600 focus:outline-none"/>
          </div>
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            className="rounded-lg border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-stone-200 focus:border-amber-600 outline-none">
            <option value="">Todos os meses</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2024, i).toLocaleDateString('pt-BR', { month: 'long' })}
              </option>
            ))}
          </select>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
            className="rounded-lg border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-stone-200 focus:border-amber-600 outline-none">
            <option value="">Todos os anos</option>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {/* Modo de visualização */}
          <div className="flex gap-2">
            <button onClick={() => setViewMode('day')}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                viewMode === 'day' ? 'bg-amber-600 text-white' : 'border border-white/10 bg-stone-950 text-stone-500 hover:text-amber-500'
              }`}>Dia</button>
            <button onClick={() => setViewMode('all')}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                viewMode === 'all' ? 'bg-amber-600 text-white' : 'border border-white/10 bg-stone-950 text-stone-500 hover:text-amber-500'
              }`}>Todos</button>
          </div>
        </div>
      </div>

      {/* ── Painel principal ── */}
      <div className="rounded-xl border border-white/5 bg-stone-900 shadow-2xl overflow-hidden">

        {/* Header do modo */}
        {viewMode === 'day' ? (
          <div className="flex items-center justify-between border-b border-white/5 p-6">
            <button onClick={() => shiftDay(-1)} className="p-2 rounded-lg hover:bg-white/5 text-stone-500 hover:text-white transition-all">
              <ChevronLeft size={20}/>
            </button>
            <div className="text-center">
              <h3 className="font-bold text-xl text-white uppercase tracking-tight">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
              <p className="text-xs text-stone-500 mt-0.5 uppercase tracking-widest">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}
              </p>
              {totalItens > 0 && (
                <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mt-1">
                  {totalItens} evento{totalItens !== 1 ? 's' : ''} neste dia
                </p>
              )}
            </div>
            <button onClick={() => shiftDay(1)} className="p-2 rounded-lg hover:bg-white/5 text-stone-500 hover:text-white transition-all">
              <ChevronRight size={20}/>
            </button>
          </div>
        ) : (
          <div className="border-b border-white/5 p-6 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-bold text-xl text-white uppercase tracking-tight">Todos os Eventos</h3>
              <p className="text-xs text-stone-500 mt-1 uppercase tracking-widest">
                {aptFiltrados.length > 0 && `${aptFiltrados.length} agendamento${aptFiltrados.length !== 1 ? 's' : ''} manuais`}
                {aptFiltrados.length > 0 && reservasFiltradas.length > 0 && ' · '}
                {reservasFiltradas.length > 0 && `${reservasFiltradas.length} reserva${reservasFiltradas.length !== 1 ? 's' : ''} online`}
                {totalItens === 0 && 'Nenhum evento encontrado'}
              </p>
            </div>
            <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest">
              <span className="flex items-center gap-1.5 text-amber-500">
                <span className="w-2 h-2 rounded-full bg-amber-500"/>Manual
              </span>
              <span className="flex items-center gap-1.5 text-indigo-400">
                <BookOpen size={10}/>Online
              </span>
            </div>
          </div>
        )}

        <div className="p-6">

          {/* ═══════════════ MODO DIA ═══════════════ */}
          {viewMode === 'day' && (
            <div className="space-y-4">
              {/* Reservas online deste dia — acima da grade */}
              {reservasFiltradas.length > 0 && (
                <div className="space-y-3 pb-2 border-b border-white/5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                    <BookOpen size={11}/>Reservas Online — {fmtBR(selectedDate)}
                  </p>
                  {reservasFiltradas.map(r => <CardReserva key={r.id} r={r}/>)}
                </div>
              )}

              {/* Grade horária — agendamentos manuais */}
              <div className="grid gap-1.5">
                {HOURS.map(hora => {
                  const apt = aptFiltrados.find(a => a.time === hora);
                  return (
                    <div key={hora} className="relative group flex items-start gap-4">
                      <div className="w-16 pt-2 text-right flex-shrink-0">
                        <span className="text-[11px] font-bold text-stone-600 uppercase tracking-widest">{hora}</span>
                      </div>
                      {apt ? (
                        <div className={`flex-1 rounded-xl p-4 border border-white/5 ${STATUS_COR[apt.status] || ''} hover:shadow-lg transition-all`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h4 className="font-bold text-white uppercase tracking-tight text-sm">{apt.client}</h4>
                                <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${STATUS_BADGE[apt.status] || ''}`}>
                                  {apt.status}
                                </span>
                              </div>
                              <p className="text-xs text-stone-500">{apt.service}</p>
                              {apt.notes && <p className="text-xs text-stone-600 mt-1 italic">{apt.notes}</p>}
                              <InfoFinanceira apt={apt}/>
                            </div>
                            <div className="relative ml-2 flex-shrink-0">
                              <button onClick={e => { e.stopPropagation(); setActiveMenuId(activeMenuId === apt.id ? null : apt.id); }}
                                className="p-1.5 rounded hover:bg-white/10 text-stone-500 hover:text-white transition-all">
                                <MoreVertical size={16}/>
                              </button>
                              <MenuApt apt={apt}/>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => openNewModal(hora)}
                          className="flex-1 h-9 rounded-xl border border-dashed border-white/5 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-stone-600 hover:text-amber-500 hover:bg-white/5 transition-all">
                          + Reservar horário
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {totalItens === 0 && (
                <div className="text-center py-10 text-stone-600">
                  <CalendarIcon size={40} className="mx-auto mb-3 opacity-20"/>
                  <p className="text-sm">Nenhum evento neste dia</p>
                  <p className="text-xs mt-1 text-stone-700">Passe o mouse sobre um horário para agendar</p>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════ MODO TODOS ═══════════════ */}
          {viewMode === 'all' && (
            <div className="space-y-6">
              {totalItens === 0 ? (
                <div className="text-center py-12 text-stone-600">
                  <CalendarIcon size={48} className="mx-auto mb-4 opacity-20"/>
                  <p className="text-sm">Nenhum evento encontrado</p>
                  <p className="text-xs mt-1 text-stone-700">
                    {filterMonth || filterYear || searchTerm
                      ? 'Tente ajustar os filtros'
                      : 'Crie um novo agendamento ou aguarde reservas online'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Reservas online */}
                  {reservasFiltradas.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <BookOpen size={14} className="text-indigo-400"/>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                          Reservas Online ({reservasFiltradas.length})
                        </p>
                      </div>
                      {[...reservasFiltradas]
                        .sort((a, b) => (a.datas[0] || a.date).localeCompare(b.datas[0] || b.date))
                        .map(r => <CardReserva key={r.id} r={r}/>)}
                    </div>
                  )}

                  {/* Separador */}
                  {reservasFiltradas.length > 0 && aptFiltrados.length > 0 && (
                    <div className="border-t border-white/5"/>
                  )}

                  {/* Agendamentos manuais */}
                  {aptFiltrados.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <CalendarIcon size={14} className="text-amber-500"/>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
                          Agendamentos Manuais ({aptFiltrados.length})
                        </p>
                      </div>
                      {[...aptFiltrados]
                        .sort((a, b) => {
                          const dc = new Date(a.date).getTime() - new Date(b.date).getTime();
                          return dc !== 0 ? dc : a.time.localeCompare(b.time);
                        })
                        .map(apt => (
                          <div key={apt.id} className={`rounded-xl p-4 border border-white/5 ${STATUS_COR[apt.status] || ''} relative group hover:shadow-lg transition-all`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                  <span className="text-xs font-bold text-stone-400 bg-stone-950/50 px-3 py-1 rounded-lg">
                                    {fmtBR(apt.date)} · {apt.time}
                                  </span>
                                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${STATUS_BADGE[apt.status] || ''}`}>
                                    {apt.status}
                                  </span>
                                </div>
                                <h4 className="font-bold text-white uppercase tracking-tight">{apt.client}</h4>
                                <p className="text-xs text-stone-500 mt-0.5">{apt.service}</p>
                                {apt.notes && <p className="text-xs text-stone-600 mt-1 italic">{apt.notes}</p>}
                                <InfoFinanceira apt={apt}/>
                              </div>
                              <div className="relative ml-2 flex-shrink-0">
                                <button onClick={e => { e.stopPropagation(); setActiveMenuId(activeMenuId === apt.id ? null : apt.id); }}
                                  className="p-1.5 rounded hover:bg-white/10 text-stone-500 hover:text-white transition-all">
                                  <MoreVertical size={16}/>
                                </button>
                                <MenuApt apt={apt}/>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Modal Agendamento ── */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-stone-900 border border-white/10 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-xl font-bold text-stone-100">
                {editingApt ? 'Editar Agendamento' : 'Novo Agendamento'}
              </h3>
              <button onClick={closeModal} className="text-stone-500 hover:text-white"><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 flex items-center justify-between">
                    <span>Cliente *</span>
                    <button type="button" onClick={() => setShowClientModal(true)} className="text-amber-500 hover:text-amber-400 flex items-center gap-1">
                      <UserPlus size={12}/><span className="text-[9px]">Novo</span>
                    </button>
                  </label>
                  <select required value={formData.clientId}
                    onChange={e => { const c = clients.find(x => x.id === e.target.value); if (c) setFormData(f => ({ ...f, client: c.name, clientId: c.id })); }}
                    className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none">
                    <option value="">Selecione...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">Serviço *</label>
                  <select required value={formData.service} onChange={e => setFormData(f => ({ ...f, service: e.target.value }))}
                    className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none">
                    <option value="">Selecione...</option>
                    {['Visita Técnica','Degustação Buffet','Reunião Decoração','Montagem Evento','Evento'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">Data *</label>
                  <input type="date" required value={formData.date} onChange={e => setFormData(f => ({ ...f, date: e.target.value }))}
                    className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none"/>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">Horário *</label>
                  <select required value={formData.time} onChange={e => setFormData(f => ({ ...f, time: e.target.value }))}
                    className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none">
                    <option value="">Selecione...</option>
                    {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">Status</label>
                  <select value={formData.status} onChange={e => setFormData(f => ({ ...f, status: e.target.value as any }))}
                    className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none">
                    {['pendente','confirmado','concluido','pago','cancelado'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">💰 Valor Total (R$)</label>
                <input type="number" value={formData.totalValue}
                  onChange={e => { const t = parseFloat(e.target.value) || 0; setFormData(f => ({ ...f, totalValue: t, remainingValue: t - (f.depositValue || 0) })); }}
                  className="w-full rounded-lg border border-white/10 bg-stone-950 px-4 py-2.5 text-sm text-stone-200 focus:border-amber-600 focus:outline-none"
                  placeholder="0,00" step="0.01" min="0"/>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">💵 Valor de Entrada/Sinal (R$)</label>
                <input type="number" value={formData.depositValue}
                  onChange={e => { const d = parseFloat(e.target.value) || 0; setFormData(f => ({ ...f, depositValue: d, remainingValue: (f.totalValue || 0) - d })); }}
                  className="w-full rounded-lg border border-white/10 bg-stone-950 px-4 py-2.5 text-sm text-stone-200 focus:border-amber-600 focus:outline-none"
                  placeholder="0,00" step="0.01" min="0"/>
                {formData.totalValue > 0 && (
                  <p className="text-xs text-amber-400 mt-1">Restante: {fmt((formData.totalValue || 0) - (formData.depositValue || 0))}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">Observações</label>
                <textarea value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} rows={3}
                  className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none resize-none"
                  placeholder="Notas adicionais..."/>
              </div>

              <div className="flex gap-4 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 rounded-lg border border-white/10 bg-stone-950 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:bg-stone-800 transition-all">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 rounded-lg bg-amber-600 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-amber-700 transition-all">
                  {editingApt ? 'Salvar' : 'Agendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Novo Cliente ── */}
      {showClientModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-stone-950/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-stone-900 border border-white/10 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-xl font-bold text-stone-100">Adicionar Cliente</h3>
              <button onClick={() => setShowClientModal(false)} className="text-stone-500 hover:text-white"><X size={20}/></button>
            </div>
            <form onSubmit={handleNewClient} className="space-y-4">
              {[
                { label: 'Nome Completo *', key: 'name',  type: 'text',  ph: 'Nome do cliente'    },
                { label: 'Email *',         key: 'email', type: 'email', ph: 'email@exemplo.com'  },
                { label: 'Telefone *',      key: 'phone', type: 'tel',   ph: '(00) 00000-0000'    },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1 block">{f.label}</label>
                  <input type={f.type} required value={(newClient as any)[f.key]}
                    onChange={e => setNewClient(c => ({ ...c, [f.key]: e.target.value }))}
                    className="w-full rounded-lg bg-stone-950 border border-white/10 p-3 text-sm text-white focus:border-amber-500 outline-none"
                    placeholder={f.ph}/>
                </div>
              ))}
              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setShowClientModal(false)}
                  className="flex-1 rounded-lg border border-white/10 bg-stone-950 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:bg-stone-800 transition-all">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 rounded-lg bg-amber-600 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-amber-700 transition-all">
                  Adicionar
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
