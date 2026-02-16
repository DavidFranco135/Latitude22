import React, { useState, useEffect } from 'react';
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
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';

interface SidebarProps {
  role: UserRole;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ role, isMobileOpen = false, onMobileClose }) => {
  const location = useLocation();
  const isAdmin = role === UserRole.ADMIN;
  const [isCollapsed, setIsCollapsed] = useState(false);

  // DEBUG
  useEffect(() => {
    console.log('🔵 Sidebar - isMobileOpen:', isMobileOpen);
  }, [isMobileOpen]);

  // Prevenir scroll quando menu estiver aberto
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      console.log('🔒 Body scroll bloqueado');
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      console.log('🔓 Body scroll desbloqueado');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isMobileOpen]);

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
    <>
      {/* =====================================================
          OVERLAY MOBILE - FUNCIONA EM QUALQUER ORIENTAÇÃO
      ===================================================== */}
      <div 
        className={`fixed inset-0 bg-stone-950/80 backdrop-blur-sm md:hidden transition-opacity duration-300 ${
          isMobileOpen ? 'opacity-100 z-[998] pointer-events-auto' : 'opacity-0 z-[-1] pointer-events-none'
        }`}
        onClick={() => {
          console.log('🔘 Overlay clicado');
          onMobileClose?.();
        }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          minHeight: '100vh',
          maxHeight: '100vh'
        }}
      />

      {/* =====================================================
          OVERLAY MOBILE - PARA ESCURECER QUANDO SIDEBAR ABRE
      ===================================================== */}
      <div 
        className={`fixed inset-0 bg-stone-950/80 backdrop-blur-sm md:hidden transition-opacity duration-300 ${
          isMobileOpen ? 'opacity-100 z-[998] pointer-events-auto' : 'opacity-0 z-[-1] pointer-events-none'
        }`}
        onClick={() => {
          console.log('🔘 Overlay clicado');
          onMobileClose?.();
        }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          minHeight: '100vh',
          maxHeight: '100vh'
        }}
      />

      {/* =====================================================
          SIDEBAR DESKTOP
      ===================================================== */}
      <aside className={`hidden md:flex h-screen flex-col bg-stone-950 text-stone-400 border-r border-white/5 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-72'}`}>
        {/* Header */}
        <div className={`flex h-24 flex-col items-center justify-center border-b border-white/5 bg-stone-950/50 relative`}>
          {!isCollapsed && (
            <>
              <h1 className="font-serif text-lg font-bold tracking-[0.3em] text-white uppercase">Eventos</h1>
              <span className="text-[8px] uppercase tracking-[0.4em] text-amber-600 font-bold">& Festas</span>
            </>
          )}
          {isCollapsed && (
            <span className="font-serif text-2xl font-bold text-amber-600">E&F</span>
          )}
          
          {/* Botão de Colapso */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-stone-900 border border-white/10 text-stone-500 hover:text-amber-500 hover:border-amber-500/50 transition-all"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
        
        {/* Menu Items */}
        <nav className="flex-1 space-y-1 p-6 overflow-y-auto">
          {menuItems.filter(item => item.show).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={isCollapsed ? item.label : ''}
                className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} rounded-lg px-4 py-3.5 transition-all duration-200 group ${
                  isActive 
                    ? 'bg-amber-600/10 text-amber-500 border border-amber-600/20' 
                    : 'hover:bg-white/5 hover:text-white'
                }`}
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
        
        {/* Logout */}
        <div className="p-6 border-t border-white/5">
          <button 
            onClick={() => signOut(auth)}
            title={isCollapsed ? 'Encerrar Sessão' : ''}
            className={`flex w-full items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} rounded-lg px-4 py-3.5 text-stone-500 hover:bg-red-900/10 hover:text-red-400 transition-all group`}
          >
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
            {!isCollapsed && (
              <span className="text-[11px] font-bold uppercase tracking-widest">Encerrar Sessão</span>
            )}
          </button>
        </div>
      </aside>

      {/* =====================================================
          SIDEBAR MOBILE - PORTRAIT E LANDSCAPE
          SUPER ROBUSTO - VAI FUNCIONAR COM CERTEZA!
      ===================================================== */}
      <aside 
        className={`md:hidden flex flex-col bg-stone-950 text-stone-400 border-r border-white/5 transition-transform duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '280px',
          maxWidth: '80vw',
          height: '100vh',
          minHeight: '100vh',
          maxHeight: '100vh',
          zIndex: 999,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header Compacto */}
        <div 
          className="flex flex-col items-center justify-center border-b border-white/5 bg-stone-950 relative"
          style={{ 
            height: '80px',
            minHeight: '80px',
            flexShrink: 0 
          }}
        >
          <h1 className="font-serif text-base font-bold tracking-[0.3em] text-white uppercase">Eventos</h1>
          <span className="text-[7px] uppercase tracking-[0.4em] text-amber-600 font-bold mt-0.5">& Festas</span>
          
          {/* Botão Fechar */}
          <button
            onClick={() => {
              console.log('🔘 Botão X clicado');
              onMobileClose?.();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-all active:scale-95"
            aria-label="Fechar menu"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        
        {/* Menu Items - Com Scroll */}
        <nav 
          className="flex-1 space-y-0.5 p-3 overflow-y-auto"
          style={{ 
            flex: '1 1 auto',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {menuItems.filter(item => item.show).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => {
                  console.log('🔘 Menu item clicado:', item.path);
                  onMobileClose?.();
                }}
                className={`flex items-center space-x-3 rounded-lg px-3 py-3.5 transition-all duration-200 active:scale-95 ${
                  isActive 
                    ? 'bg-amber-600/10 text-amber-500 border border-amber-600/20' 
                    : 'hover:bg-white/5 text-stone-300 hover:text-white'
                }`}
                style={{ minHeight: '48px' }}
              >
                <span className={`flex-shrink-0 ${isActive ? 'text-amber-500' : 'text-stone-400'}`}>
                  {item.icon}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider leading-tight">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
        
        {/* Logout */}
        <div 
          className="p-3 border-t border-white/5 bg-stone-950"
          style={{ 
            flexShrink: 0,
            minHeight: 'auto' 
          }}
        >
          <button 
            onClick={() => {
              console.log('🔘 Logout clicado');
              signOut(auth);
            }}
            className="flex w-full items-center space-x-3 rounded-lg px-3 py-3.5 text-stone-400 hover:bg-red-900/10 hover:text-red-400 transition-all active:scale-95"
            style={{ minHeight: '48px' }}
          >
            <LogOut size={18} className="flex-shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Encerrar Sessão</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
