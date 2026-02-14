
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserRole } from '../types';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  FileText, 
  Image, 
  DollarSign, 
  FileSignature, 
  UserPlus, 
  Settings,
  LogOut
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';

interface SidebarProps {
  role: UserRole;
}

const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const location = useLocation();
  const isAdmin = role === UserRole.ADMIN;

  const menuItems = [
    { label: 'Visão Geral', path: '/dashboard', icon: <LayoutDashboard size={18} />, show: true },
    { label: 'Calendário de Eventos', path: '/agenda', icon: <Calendar size={18} />, show: true },
    { label: 'Hóspedes & Clientes', path: '/clientes', icon: <Users size={18} />, show: true },
    { label: 'Orçamentos', path: '/orcamentos', icon: <FileText size={18} />, show: true },
    { label: 'Portfólio Galeria', path: '/galeria', icon: <Image size={18} />, show: true },
    { label: 'Financeiro', path: '/financeiro', icon: <DollarSign size={18} />, show: isAdmin },
    { label: 'Contratos Digitais', path: '/contratos', icon: <FileSignature size={18} />, show: isAdmin },
    { label: 'Minha Equipe', path: '/colaboradores', icon: <UserPlus size={18} />, show: isAdmin },
    { label: 'Configurações', path: '/configuracoes', icon: <Settings size={18} />, show: isAdmin },
  ];

  return (
    <div className="hidden h-screen w-72 flex-col bg-stone-950 text-stone-400 md:flex border-r border-white/5">
      <div className="flex h-24 flex-col items-center justify-center border-b border-white/5 bg-stone-950/50">
        <h1 className="font-serif text-xl font-bold tracking-[0.2em] text-white">LATITUDE22</h1>
        <span className="text-[8px] uppercase tracking-[0.4em] text-amber-600 font-bold">Gerenciamento</span>
      </div>
      
      <nav className="flex-1 space-y-1 p-6">
        {menuItems.filter(item => item.show).map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 rounded-lg px-4 py-3.5 transition-all duration-200 group ${
                isActive 
                  ? 'bg-amber-600/10 text-amber-500 border border-amber-600/20' 
                  : 'hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className={`${isActive ? 'text-amber-500' : 'text-stone-500 group-hover:text-amber-500'} transition-colors`}>
                {item.icon}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-6 border-t border-white/5">
        <button 
          onClick={() => signOut(auth)}
          className="flex w-full items-center space-x-3 rounded-lg px-4 py-3.5 text-stone-500 hover:bg-red-900/10 hover:text-red-400 transition-all group"
        >
          <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[11px] font-bold uppercase tracking-widest">Encerrar Sessão</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
