import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc,
  query, where, serverTimestamp, Timestamp, addDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { Reserva, ReservaConfig, ReservaStatus, TipoDiaria } from '../types';

// ─── CONFIG ──────────────────────────────────────────────────────────────────

export const getReservaConfig = async (): Promise<ReservaConfig> => {
  try {
    const snap = await getDoc(doc(db, 'reservaConfig', 'default'));
    if (snap.exists()) return snap.data() as ReservaConfig;
  } catch (e) { console.warn('Erro ao buscar config:', e); }
  return {
    valorDiaUtil: 1500, valorSabado: 2500, valorDomingo: 2000,
    valorFimDeSemana: 4000, percentualReserva: 30,
    whatsappLink: 'https://wa.me/5521000000000',
    reservaOnlineAtiva: true, pagamentoAutomaticoAtivo: false,
    expiracaoHoras: 48, salonNome: 'Salão Latitude22',
    salonCnpj: '', salonContato: '', pixChave: ''
  };
};

export const saveReservaConfig = async (config: Partial<ReservaConfig>) => {
  await setDoc(doc(db, 'reservaConfig', 'default'), config, { merge: true });
};

// ─── CÁLCULO ─────────────────────────────────────────────────────────────────

export const calcularTipoDiaria = (dateStr: string): TipoDiaria => {
  const dow = new Date(dateStr + 'T12:00:00').getDay();
  if (dow === 6) return 'sabado';
  if (dow === 0) return 'domingo';
  return 'util';
};

export const calcularValor = (tipo: TipoDiaria, config: ReservaConfig): number => {
  switch (tipo) {
    case 'sabado':      return config.valorSabado;
    case 'domingo':     return config.valorDomingo;
    case 'fimdesemana': return config.valorFimDeSemana;
    default:            return config.valorDiaUtil;
  }
};

// ─── TOKEN / PROTOCOLO ────────────────────────────────────────────────────────

export const gerarToken = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

export const gerarProtocolo = (): string => {
  const n = new Date();
  return `L22-${n.getFullYear()}${String(n.getMonth()+1).padStart(2,'0')}${String(n.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*9000+1000)}`;
};

// ─── DISPONIBILIDADE ─────────────────────────────────────────────────────────
//
// ⚠️ REGRA: só RESERVADO e CONFIRMADO bloqueiam o calendário.
//    PENDENTE_PAGAMENTO NÃO bloqueia — o cliente só reservou depois de pagar.

export const getDatasOcupadas = async (): Promise<string[]> => {
  try {
    const q    = query(
      collection(db, 'reservas'),
      where('status', 'in', [ReservaStatus.RESERVADO, ReservaStatus.CONFIRMADO])
    );
    const snap = await getDocs(q);
    const set  = new Set<string>();
    snap.docs.forEach(d => {
      const r = d.data();
      if (r.data) set.add(r.data as string);
      if (Array.isArray(r.datas)) (r.datas as string[]).forEach(dt => set.add(dt));
    });
    return Array.from(set);
  } catch (e) {
    console.warn('Erro datas ocupadas:', e);
    return [];
  }
};

export const verificarDisponibilidade = async (data: string): Promise<boolean> => {
  const status = [ReservaStatus.RESERVADO, ReservaStatus.CONFIRMADO];
  const s1 = await getDocs(query(collection(db, 'reservas'), where('data', '==', data), where('status', 'in', status)));
  if (!s1.empty) return false;
  const s2 = await getDocs(query(collection(db, 'reservas'), where('datas', 'array-contains', data), where('status', 'in', status)));
  return s2.empty;
};

// ─── CRIAR RASCUNHO ───────────────────────────────────────────────────────────
//
// Cria a reserva com status PENDENTE_PAGAMENTO.
// A data NÃO é bloqueada — só bloqueia quando o admin marcar como pago.

export const criarReservaRascunho = async (
  dias: Array<{ dateStr: string; tipoDiaria: TipoDiaria; valor: number }>,
  config: ReservaConfig,
  cliente: {
    nome: string; cpfCnpj: string; telefone: string; email: string;
    tipoEvento: string; numConvidados: number;
    tipoPagamentoSolicitado?: 'reserva' | 'total';
  }
): Promise<Reserva> => {
  if (!dias.length) throw new Error('Selecione pelo menos uma data.');

  for (const dia of dias) {
    const ok = await verificarDisponibilidade(dia.dateStr);
    if (!ok) {
      const [y, m, d] = dia.dateStr.split('-');
      throw new Error(`A data ${d}/${m}/${y} já foi reservada. Escolha outra.`);
    }
  }

  const valorTotal   = dias.reduce((s, d) => s + d.valor, 0);
  const valorReserva = Math.ceil(valorTotal * config.percentualReserva / 100);
  const token        = gerarToken();
  const primo        = dias[0];

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + config.expiracaoHoras);

  const data: any = {
    token,
    data:                    primo.dateStr,
    datas:                   dias.map(d => d.dateStr),
    diasDetalhes:            dias,
    tipoDiaria:              primo.tipoDiaria,
    valorTotal,
    valorReserva,
    percentualReserva:       config.percentualReserva,
    status:                  ReservaStatus.PENDENTE_PAGAMENTO,
    clienteNome:             cliente.nome,
    clienteCpfCnpj:          cliente.cpfCnpj,
    clienteTelefone:         cliente.telefone,
    clienteEmail:            cliente.email,
    tipoEvento:              cliente.tipoEvento,
    numConvidados:           cliente.numConvidados,
    tipoPagamentoSolicitado: cliente.tipoPagamentoSolicitado || 'reserva',
    createdAt:               serverTimestamp(),
    expiresAt:               Timestamp.fromDate(expiresAt),
    criadoPorAdmin:          false
  };

  const ref = await addDoc(collection(db, 'reservas'), data);
  return { id: ref.id, ...data } as Reserva;
};

// ─── CONFIRMAR PAGAMENTO (admin) ──────────────────────────────────────────────
//
// Quando o admin clica "Marcar como Pago" → status vira RESERVADO ou CONFIRMADO
// → a data é bloqueada automaticamente no getDatasOcupadas()

export const confirmarPagamento = async (
  reservaId: string,
  valorPago: number,
  formaPagamento: string,
  transacaoId?: string
): Promise<string> => {
  const ref  = doc(db, 'reservas', reservaId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Reserva não encontrada.');

  const reserva   = snap.data() as Reserva;
  const isPago100 = valorPago >= reserva.valorTotal;
  const protocolo = (reserva as any).protocolo || gerarProtocolo();

  // AQUI a data é bloqueada: status → RESERVADO ou CONFIRMADO
  await updateDoc(ref, {
    status:        isPago100 ? ReservaStatus.CONFIRMADO : ReservaStatus.RESERVADO,
    valorPago,
    formaPagamento,
    transacaoId:   transacaoId || '',
    protocolo,
    dataPagamento: serverTimestamp()
  });

  // Registra no financeiro
  await addDoc(collection(db, 'financial'), {
    type:        'income',
    amount:      valorPago,
    description: `Reserva ${protocolo} — ${reserva.clienteNome}`,
    date:        new Date().toISOString(),
    reservaId,
    createdAt:   serverTimestamp()
  });

  return protocolo;
};

export const cancelarReserva = async (reservaId: string): Promise<void> => {
  await updateDoc(doc(db, 'reservas', reservaId), { status: ReservaStatus.CANCELADO });
};

// ─── BUSCAR ───────────────────────────────────────────────────────────────────

export const getReservaPorToken = async (token: string): Promise<Reserva | null> => {
  try {
    const snap = await getDocs(query(collection(db, 'reservas'), where('token', '==', token)));
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as Reserva;
  } catch { return null; }
};

export const getReservaById = async (id: string): Promise<Reserva | null> => {
  try {
    const snap = await getDoc(doc(db, 'reservas', id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Reserva;
  } catch { return null; }
};

export const getAllReservas = async (): Promise<Reserva[]> => {
  try {
    const snap = await getDocs(collection(db, 'reservas'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Reserva));
  } catch { return []; }
};

// Retrocompatibilidade
export const criarReserva = criarReservaRascunho as any;
