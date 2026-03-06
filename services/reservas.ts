import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, serverTimestamp, Timestamp, addDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { Reserva, ReservaConfig, ReservaStatus, TipoDiaria, Feriado } from '../types';

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const CONFIG_DEFAULT: ReservaConfig = {
  valorDiaUtil: 1500, valorSabado: 2500, valorDomingo: 2000,
  valorFimDeSemana: 4000, valorSexta: 2000, valorFeriado: 2500,
  percentualReserva: 30,
  whatsappLink: 'https://wa.me/5521000000000',
  reservaOnlineAtiva: true, pagamentoAutomaticoAtivo: false,
  expiracaoHoras: 48, salonNome: 'Salão Latitude22',
  salonCnpj: '', salonContato: '', pixChave: '',
  feriados: []
};

export const getReservaConfig = async (): Promise<ReservaConfig> => {
  try {
    const snap = await getDoc(doc(db, 'reservaConfig', 'default'));
    if (snap.exists()) {
      const data = snap.data() as any;
      // Garante que feriados é sempre um array válido com campos normalizados
      const feriados: Feriado[] = Array.isArray(data.feriados)
        ? data.feriados
            .filter((f: any) => f && typeof f.dateStr === 'string' && f.dateStr.match(/^\d{4}-\d{2}-\d{2}$/))
            .map((f: any) => ({
              dateStr: String(f.dateStr).trim(),
              nome:    String(f.nome || '').trim(),
              valor:   f.valor != null && !isNaN(Number(f.valor)) ? Number(f.valor) : undefined
            }))
        : [];
      return { ...CONFIG_DEFAULT, ...data, feriados };
    }
  } catch (e) { console.warn('Erro ao buscar config:', e); }
  return { ...CONFIG_DEFAULT };
};

// Usa setDoc SEM merge para garantir que o array feriados seja sempre gravado por completo
export const saveReservaConfig = async (config: Partial<ReservaConfig>) => {
  const payload = {
    ...CONFIG_DEFAULT,
    ...config,
    // Normaliza feriados antes de salvar — remove campos undefined
    feriados: (config.feriados || []).map(f => ({
      dateStr: f.dateStr,
      nome:    f.nome,
      ...(f.valor != null ? { valor: f.valor } : {})
    }))
  };
  await setDoc(doc(db, 'reservaConfig', 'default'), payload);
};

// ─── CÁLCULO ─────────────────────────────────────────────────────────────────
//
// REGRAS DE TIPO:
//   • Feriado cadastrado                       → 'feriado'
//   • Sexta + Sábado + Domingo (conjunto)      → aplica 'fimdesemana' no total (veja calcularDias)
//   • Sexta isolada                            → 'sexta'
//   • Sábado isolado                           → 'sabado'
//   • Domingo isolado                          → 'domingo'
//   • Qualquer outro dia                       → 'util'

export const isFeriado = (dateStr: string, config: ReservaConfig): boolean =>
  (config.feriados || []).some(f => f.dateStr === dateStr);

export const getFeriado = (dateStr: string, config: ReservaConfig) =>
  (config.feriados || []).find(f => f.dateStr === dateStr);

export const calcularTipoDiaria = (dateStr: string, config?: ReservaConfig): TipoDiaria => {
  if (config && isFeriado(dateStr, config)) return 'feriado';
  const dow = new Date(dateStr + 'T12:00:00').getDay();
  if (dow === 5) return 'sexta';
  if (dow === 6) return 'sabado';
  if (dow === 0) return 'domingo';
  return 'util';
};

export const calcularValor = (tipo: TipoDiaria, config: ReservaConfig, dateStr?: string): number => {
  if (tipo === 'feriado' && dateStr) {
    const f = getFeriado(dateStr, config);
    return (f?.valor ?? config.valorFeriado) || config.valorFeriado || 2500;
  }
  switch (tipo) {
    case 'sexta':       return config.valorSexta      ?? config.valorDiaUtil;
    case 'sabado':      return config.valorSabado;
    case 'domingo':     return config.valorDomingo;
    case 'fimdesemana': return config.valorFimDeSemana;
    default:            return config.valorDiaUtil;
  }
};

// ─── DETECÇÃO DE FIM DE SEMANA COMPLETO ──────────────────────────────────────
//
// Se o cliente selecionar Sexta + Sábado + Domingo consecutivos (ou qualquer
// combinação que forme um pacote Sex+Sáb+Dom), aplica o valorFimDeSemana
// no lugar de cobrar cada dia separado.

export const calcularDias = (
  datasStr: string[],
  config: ReservaConfig
): Array<{ dateStr: string; tipoDiaria: TipoDiaria; valor: number }> => {

  // Primeiro calcula o tipo individual de cada data
  const dias = datasStr.map(d => ({
    dateStr:    d,
    tipoDiaria: calcularTipoDiaria(d, config) as TipoDiaria,
    valor:      0
  }));

  // Detecta pacotes Sex+Sáb+Dom consecutivos
  const usados = new Set<string>();

  for (let i = 0; i < dias.length - 2; i++) {
    const a = dias[i], b = dias[i + 1], c = dias[i + 2];
    if (usados.has(a.dateStr) || usados.has(b.dateStr) || usados.has(c.dateStr)) continue;

    const dowA = new Date(a.dateStr + 'T12:00:00').getDay();
    const dowB = new Date(b.dateStr + 'T12:00:00').getDay();
    const dowC = new Date(c.dateStr + 'T12:00:00').getDay();

    // Sex=5, Sáb=6, Dom=0 — e devem ser dias consecutivos
    const isFimDeSemanaCompleto =
      dowA === 5 && dowB === 6 && dowC === 0 &&
      !isFeriado(a.dateStr, config) && !isFeriado(b.dateStr, config) && !isFeriado(c.dateStr, config);

    if (isFimDeSemanaCompleto) {
      // Distribui o valor do pacote entre os 3 dias (1/3 cada para o breakdown)
      const valorPacote = config.valorFimDeSemana;
      a.tipoDiaria = 'fimdesemana';
      b.tipoDiaria = 'fimdesemana';
      c.tipoDiaria = 'fimdesemana';
      // Valor fracionado só para exibição; o total é correto
      a.valor = Math.round(valorPacote / 3);
      b.valor = Math.round(valorPacote / 3);
      c.valor = valorPacote - 2 * Math.round(valorPacote / 3);
      usados.add(a.dateStr);
      usados.add(b.dateStr);
      usados.add(c.dateStr);
    }
  }

  // Dias que não fazem parte de pacote → valor individual
  dias.forEach(d => {
    if (!usados.has(d.dateStr)) {
      d.valor = calcularValor(d.tipoDiaria, config, d.dateStr);
    }
  });

  return dias;
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
// Registra o pagamento, muda o status, e lança no financeiro:
//   • 1 entrada = valorPago
//   • Se pagamento parcial (reserva/sinal): registra o saldo restante
//     como "a receber" no documento da própria reserva (campo saldoPendente)

export const confirmarPagamento = async (
  reservaId: string,
  valorPago: number,
  formaPagamento: string,
  transacaoId?: string
): Promise<string> => {
  const ref  = doc(db, 'reservas', reservaId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Reserva não encontrada.');

  const reserva    = snap.data() as Reserva;
  const isPago100  = valorPago >= reserva.valorTotal;
  const protocolo  = (reserva as any).protocolo || gerarProtocolo();
  const saldo      = Math.max(0, reserva.valorTotal - valorPago);
  const datas      = Array.isArray((reserva as any).datas) ? (reserva as any).datas : [reserva.data];
  const dataLabel  = datas.map((d: string) => { const [y,m,dia] = d.split('-'); return `${dia}/${m}/${y}`; }).join(', ');

  await updateDoc(ref, {
    status:         isPago100 ? ReservaStatus.CONFIRMADO : ReservaStatus.RESERVADO,
    valorPago,
    saldoPendente:  saldo,
    formaPagamento,
    transacaoId:    transacaoId || '',
    protocolo,
    dataPagamento:  serverTimestamp()
  });

  // ── Lançamento de ENTRADA no financeiro ──────────────────────────────────
  await addDoc(collection(db, 'financial'), {
    type:        'income',
    amount:      valorPago,
    description: `Reserva ${protocolo} — ${reserva.clienteNome} (${dataLabel})`,
    // date como 'YYYY-MM-DD' para filtros do FinancialPage funcionarem
    date:        new Date().toISOString().split('T')[0],
    category:    isPago100 ? 'Reserva — Pagamento Total' : 'Reserva — Sinal/Entrada',
    reservaId,
    protocolo,
    // Campos extras para o card "A Receber" da tesouraria identificar a origem
    origem:      'reserva_online',
    clienteNome: reserva.clienteNome,
    createdAt:   serverTimestamp()
  });

  // ── Sincroniza saldoPendente no documento da reserva ─────────────────────
  // Garante que o campo existe para o listener do FinancialPage calcular corretamente
  if (!isPago100 && saldo > 0) {
    // já foi feito no updateDoc acima com saldoPendente: saldo
  }

  return protocolo;
};

// ─── ESTORNAR LANÇAMENTOS DA RESERVA ─────────────────────────────────────────
//
// Busca e deleta todos os lançamentos em `financial` vinculados à reserva,
// e se havia pagamento real (valorPago > 0), registra um lançamento de ESTORNO
// para manter o histórico auditável.

const estornarFinanceiro = async (reserva: Reserva): Promise<void> => {
  const reservaId = reserva.id;

  // Busca todos os lançamentos com este reservaId
  const qFinancial = query(
    collection(db, 'financial'),
    where('reservaId', '==', reservaId)
  );
  const snapFinancial = await getDocs(qFinancial);

  // Soma o total que havia sido lançado como receita
  let totalEstornado = 0;
  for (const d of snapFinancial.docs) {
    const t = d.data();
    if (t.type === 'income' && t.amount > 0) totalEstornado += Number(t.amount);
    await deleteDoc(d.ref);   // remove o lançamento original
  }

  // Se houve dinheiro recebido, registra estorno para histórico
  if (totalEstornado > 0) {
    const protocolo = (reserva as any).protocolo || reservaId;
    const datas     = Array.isArray((reserva as any).datas) ? (reserva as any).datas : [reserva.data];
    const dataLabel = datas.map((d: string) => { const [y,m,dia] = d.split('-'); return `${dia}/${m}/${y}`; }).join(', ');

    await addDoc(collection(db, 'financial'), {
      type:        'expense',
      amount:      totalEstornado,
      description: `Estorno — Reserva ${protocolo} — ${reserva.clienteNome} (${dataLabel})`,
      date:        new Date().toISOString().split('T')[0],
      category:    'Estorno de Reserva',
      reservaId,
      protocolo,
      estorno:     true,
      createdAt:   serverTimestamp()
    });
  }
};

// Cancela → status CANCELADO → data volta ao calendário + estorna financeiro
export const cancelarReserva = async (reservaId: string): Promise<void> => {
  const snap = await getDoc(doc(db, 'reservas', reservaId));
  if (!snap.exists()) return;

  const reserva = { id: reservaId, ...snap.data() } as Reserva;

  // Só estorna se já havia pagamento registrado
  if (reserva.valorPago && reserva.valorPago > 0) {
    await estornarFinanceiro(reserva);
  }

  await updateDoc(doc(db, 'reservas', reservaId), {
    status:        ReservaStatus.CANCELADO,
    saldoPendente: 0,
    canceladoEm:   serverTimestamp()
  });
};

// Apaga permanentemente → estorna financeiro + deleta reserva
export const apagarReserva = async (reservaId: string): Promise<void> => {
  const snap = await getDoc(doc(db, 'reservas', reservaId));
  if (!snap.exists()) {
    await deleteDoc(doc(db, 'reservas', reservaId));
    return;
  }

  const reserva = { id: reservaId, ...snap.data() } as Reserva;

  if (reserva.valorPago && reserva.valorPago > 0) {
    await estornarFinanceiro(reserva);
  }

  await deleteDoc(doc(db, 'reservas', reservaId));
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
