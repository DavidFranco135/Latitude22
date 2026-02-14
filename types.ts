
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
  data: string; // ISO Date
  horario: string; // HH:mm
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
