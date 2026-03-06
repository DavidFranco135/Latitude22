import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc,
  query, where, serverTimestamp, Timestamp, addDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { Reserva, ReservaConfig, ReservaStatus, TipoDiaria } from '../types';

// ─── CONFIG ─────────────────────────────────────────────────────────────────

export const getReservaConfig = async (): Promise<ReservaConfig> => {
  try {
    const snap = await getDoc(doc(db, 'reservaConfig', 'default'));
    if (snap.exists()) return snap.data() as ReservaConfig;
  } catch (e) {
    console.warn('Erro ao buscar config de reservas:', e);
  }
  return {
    valorDiaUtil: 1500,
    valorSabado: 2500,
    valorDomingo: 2000,
    valorFimDeSemana: 4000,
    percentualReserva: 30,
    whatsappLink: 'https://wa.me/5521000000000',
    reservaOnlineAtiva: true,
    pagamentoAutomaticoAtivo: false,
    expiracaoHoras: 48,
    salonNome: 'Salão Latitude22',
    salonCnpj: '',
    salonContato: '',
    pixChave: ''
  };
};

export const saveReservaConfig = async (config: Partial<ReservaConfig>) => {
  await setDoc(doc(db, 'reservaConfig', 'default'), config, { merge: true });
};

// ─── CÁLCULO ─────────────────────────────────────────────────────────────────

export const calcularTipoDiaria = (dateStr: string): TipoDiaria => {
  const date = new Date(dateStr + 'T12:00:00');
  const dow = date.getDay();
  if (dow === 6) return 'sabado';
  if (dow === 0) return 'domingo';
  return 'util';
};

export const calcularValor = (tipo: TipoDiaria, config: ReservaConfig): number => {
  switch (tipo) {
    case 'sabado': return config.valorSabado;
    case 'domingo': return config.valorDomingo;
    case 'fimdesemana': return config.valorFimDeSemana;
    default: return config.valorDiaUtil;
  }
};

// ─── TOKEN E PROTOCOLO ───────────────────────────────────────────────────────

export const gerarToken = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 12 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
};

export const gerarProtocolo = (): string => {
  const now = new Date();
  return `L22-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 9000 + 1000)}`;
};

// ─── DISPONIBILIDADE ─────────────────────────────────────────────────────────

export const verificarDisponibilidade = async (data: string): Promise<boolean> => {
  const q = query(
    collection(db, 'reservas'),
    where('data', '==', data),
    where('status', 'in', [
      ReservaStatus.PENDENTE_PAGAMENTO,
      ReservaStatus.RESERVADO,
      ReservaStatus.CONFIRMADO
    ])
  );
  const snap = await getDocs(q);
  return snap.empty;
};

export const getDatasOcupadas = async (): Promise<string[]> => {
  try {
    const q = query(
      collection(db, 'reservas'),
      where('status', 'in', [
        ReservaStatus.PENDENTE_PAGAMENTO,
        ReservaStatus.RESERVADO,
        ReservaStatus.CONFIRMADO
      ])
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data().data as string);
  } catch (e) {
    console.warn('Erro ao buscar datas ocupadas:', e);
    return [];
  }
};

// ─── CRIAR RESERVA ───────────────────────────────────────────────────────────

export const criarReserva = async (
  data: string,
  tipoDiaria: TipoDiaria,
  config: ReservaConfig,
  cliente: {
    nome: string;
    cpfCnpj: string;
    telefone: string;
    email: string;
    tipoEvento: string;
    numConvidados: number;
  },
  criadoPorAdmin = false
): Promise<Reserva> => {
  const disponivel = await verificarDisponibilidade(data);
  if (!disponivel) {
    throw new Error('Esta data não está disponível. Por favor, escolha outra.');
  }

  const valorTotal = calcularValor(tipoDiaria, config);
  const valorReserva = Math.ceil(valorTotal * config.percentualReserva / 100);
  const token = gerarToken();

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + config.expiracaoHoras);

  const reservaData: Omit<Reserva, 'id'> = {
    token,
    data,
    tipoDiaria,
    valorTotal,
    valorReserva,
    percentualReserva: config.percentualReserva,
    status: ReservaStatus.PENDENTE_PAGAMENTO,
    clienteNome: cliente.nome,
    clienteCpfCnpj: cliente.cpfCnpj,
    clienteTelefone: cliente.telefone,
    clienteEmail: cliente.email,
    tipoEvento: cliente.tipoEvento,
    numConvidados: cliente.numConvidados,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
    criadoPorAdmin
  };

  const ref = await addDoc(collection(db, 'reservas'), reservaData);
  return { id: ref.id, ...reservaData } as Reserva;
};

// ─── CONFIRMAR PAGAMENTO ─────────────────────────────────────────────────────

export const confirmarPagamento = async (
  reservaId: string,
  valorNovoPagamento: number,  // valor recebido NESTA transação
  formaPagamento: string,
  transacaoId?: string
): Promise<string> => {
  const ref = doc(db, 'reservas', reservaId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Reserva não encontrada.');

  const reserva = snap.data() as Reserva;
  const protocolo = reserva.protocolo || gerarProtocolo();

  // ⚠️ ACUMULA: soma o novo ao que já foi pago antes
  const valorJaPago    = Number(reserva.valorPago) || 0;
  const valorTotalPago = valorJaPago + valorNovoPagamento;
  const isPago100      = valorTotalPago >= reserva.valorTotal;
  // saldoPendente = quanto falta APÓS esta transação (0 se quitado)
  const saldoPendente  = Math.max(0, reserva.valorTotal - valorTotalPago);

  await updateDoc(ref, {
    status:        isPago100 ? ReservaStatus.CONFIRMADO : ReservaStatus.RESERVADO,
    valorPago:     valorTotalPago,   // total acumulado
    saldoPendente,                   // 0 quando quitado → some do "A Receber"
    formaPagamento,
    transacaoId:   transacaoId || '',
    protocolo,
    dataPagamento: serverTimestamp()
  });

  // Lança APENAS o valor desta transação no financeiro
  const isQuitacao = valorJaPago > 0;
  await addDoc(collection(db, 'financial'), {
    type:        'income',
    amount:      valorNovoPagamento,
    description: isQuitacao
      ? `Quitação — ${protocolo} — ${reserva.clienteNome}`
      : `Reserva ${protocolo} — ${reserva.clienteNome}`,
    date:        new Date().toISOString().split('T')[0],
    category:    isQuitacao ? 'Reserva — Quitação' : (isPago100 ? 'Reserva — Pagamento Total' : 'Reserva — Sinal/Entrada'),
    reservaId,
    createdAt:   serverTimestamp()
  });

  return protocolo;
};

export const cancelarReserva = async (reservaId: string): Promise<void> => {
  await updateDoc(doc(db, 'reservas', reservaId), {
    status: ReservaStatus.CANCELADO
  });
};

// ─── BUSCAR ──────────────────────────────────────────────────────────────────

export const getReservaPorToken = async (token: string): Promise<Reserva | null> => {
  try {
    const q = query(collection(db, 'reservas'), where('token', '==', token));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as Reserva;
  } catch (e) {
    return null;
  }
};

export const getReservaById = async (id: string): Promise<Reserva | null> => {
  try {
    const snap = await getDoc(doc(db, 'reservas', id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Reserva;
  } catch (e) {
    return null;
  }
};

export const getAllReservas = async (): Promise<Reserva[]> => {
  try {
    const snap = await getDocs(collection(db, 'reservas'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Reserva));
  } catch (e) {
    return [];
  }
};
