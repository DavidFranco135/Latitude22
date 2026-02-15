import React, { useState } from 'react';
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
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';

interface SidebarProps {
  role: UserRole;
}

const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const location = useLocation();
  const isAdmin = role === UserRole.ADMIN;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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

  const handleLogout = async () => {
    await signOut(auth);
  };

  const toggleMobile = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={toggleMobile}
        className="fixed top-4 left-4 z-[60] p-2 rounded-lg bg-stone-900 border border-white/10 text-stone-400 hover:text-white md:hidden"
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-[55] bg-black/50 md:hidden"
          onClick={toggleMobile}
        />
      )}

      {/* Sidebar Desktop */}
      <div
        className={`hidden md:flex h-screen flex-col bg-stone-950 text-stone-400 border-r border-white/5 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        {/* Header */}
        <div className="flex h-24 flex-col items-center justify-center border-b border-white/5 bg-stone-950/50 relative">
          {!isCollapsed && (
            <>
              <h1 className="font-serif text-xl font-bold tracking-[0.2em] text-white">LATITUDE22</h1>
              <span className="text-[8px] uppercase tracking-[0.4em] text-amber-600 font-bold">Gerenciamento</span>
            </>
          )}
          {isCollapsed && (
            <span className="font-serif text-2xl font-bold text-white">L22</span>
          )}
          
          {/* Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-stone-900 border border-white/10 text-stone-500 hover:text-amber-500 hover:border-amber-500/50 transition-all"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          {menuItems.filter(item => item.show).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center rounded-lg px-4 py-3.5 transition-all duration-200 group ${
                  isActive
                    ? 'bg-amber-600/10 text-amber-500 border border-amber-600/20'
                    : 'hover:bg-white/5 hover:text-white'
                } ${isCollapsed ? 'justify-center' : 'space-x-3'}`}
                title={isCollapsed ? item.label : ''}
              >
                <span className={`${isActive ? 'text-amber-500' : 'text-stone-500 group-hover:text-amber-500'} transition-colors`}>
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <span className="text-[11px] font-bold uppercase tracking-widest">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={`p-4 border-t border-white/5 ${isCollapsed ? 'px-2' : 'px-6'}`}>
          <button
            onClick={handleLogout}
            className={`flex w-full items-center rounded-lg px-4 py-3.5 text-stone-500 hover:bg-red-900/10 hover:text-red-400 transition-all group ${
              isCollapsed ? 'justify-center' : 'space-x-3'
            }`}
            title={isCollapsed ? 'Encerrar Sessão' : ''}
          >
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
            {!isCollapsed && (
              <span className="text-[11px] font-bold uppercase tracking-widest">Encerrar Sessão</span>
            )}
          </button>
        </div>
      </div>

      {/* Sidebar Mobile */}
      <div
        className={`fixed inset-y-0 left-0 z-[56] w-72 flex-col bg-stone-950 text-stone-400 border-r border-white/5 transform transition-transform duration-300 md:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex h-24 flex-col items-center justify-center border-b border-white/5 bg-stone-950/50">
          <h1 className="font-serif text-xl font-bold tracking-[0.2em] text-white">LATITUDE22</h1>
          <span className="text-[8px] uppercase tracking-[0.4em] text-amber-600 font-bold">Gerenciamento</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 p-6 overflow-y-auto">
          {menuItems.filter(item => item.show).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={toggleMobile}
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

        {/* Footer */}
        <div className="p-6 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="flex w-full items-center space-x-3 rounded-lg px-4 py-3.5 text-stone-500 hover:bg-red-900/10 hover:text-red-400 transition-all group"
          >
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[11px] font-bold uppercase tracking-widest">Encerrar Sessão</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
