export enum UserRole {
  ADMIN = 'ADMIN',
  COLLABORATOR = 'COLLABORATOR'
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
}

export interface Client {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  observacoes?: string;
  createdAt: any;
}

export enum AppointmentStatus {
  PENDENTE = 'pendente',
  CONFIRMADO = 'confirmado',
  CONCLUIDO = 'concluido',
  CANCELADO = 'cancelado'
}

export interface Appointment {
  id: string;
  clientId: string;
  collaboratorId: string;
  data: string;
  horario: string;
  status: AppointmentStatus;
  clientName?: string;
  collaboratorName?: string;
}

export enum BudgetStatus {
  PENDENTE = 'pendente',
  APROVADO = 'aprovado',
  RECUSADO = 'recusado'
}

export interface Budget {
  id: string;
  clientId: string;
  descricao: string;
  valor: number;
  status: BudgetStatus;
  createdAt: any;
}

export interface FinancialEntry {
  id: string;
  tipo: 'entrada';
  valor: number;
  referencia: string;
  data: any;
}

export interface GalleryItem {
  id: string;
  url: string;
  type: 'foto' | 'video';
  category: string;
  createdAt: any;
}

export interface SalonSettings {
  id: string;
  name: string;
  logoURL: string;
  contact: string;
  instagram: string;
  whatsapp: string;
}

// ─── SISTEMA DE RESERVAS ────────────────────────────────────────────────────

export enum ReservaStatus {
  PENDENTE_PAGAMENTO = 'pendente_pagamento',
  RESERVADO = 'reservado',
  CONFIRMADO = 'confirmado',
  CANCELADO = 'cancelado',
  EXPIRADO = 'expirado'
}

export type TipoDiaria = 'util' | 'sabado' | 'domingo' | 'fimdesemana';

export interface ReservaConfig {
  id?: string;
  valorDiaUtil: number;
  valorSabado: number;
  valorDomingo: number;
  valorFimDeSemana: number;
  percentualReserva: number;
  whatsappLink: string;
  reservaOnlineAtiva: boolean;
  pagamentoAutomaticoAtivo: boolean;
  expiracaoHoras: number;
  mercadoPagoPublicKey?: string;
  mercadoPagoAccessToken?: string;
  salonNome?: string;
  salonCnpj?: string;
  salonContato?: string;
  pixChave?: string;
}

export interface Reserva {
  id: string;
  token: string;
  data: string;
  tipoDiaria: TipoDiaria;
  valorTotal: number;
  valorReserva: number;
  percentualReserva: number;
  status: ReservaStatus;
  clienteNome: string;
  clienteCpfCnpj: string;
  clienteTelefone: string;
  clienteEmail: string;
  tipoEvento: string;
  numConvidados: number;
  protocolo?: string;
  valorPago?: number;
  formaPagamento?: string;
  dataPagamento?: any;
  transacaoId?: string;
  mpPreferenceId?: string;
  createdAt: any;
  expiresAt?: any;
  criadoPorAdmin?: boolean;
}
