import React from 'react';
import { UserProfile } from '../types';
import { Bell, Search, User, Menu } from 'lucide-react';

interface HeaderProps {
  user: UserProfile;
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onMenuClick }) => {
  const handleMenuClick = () => {
    console.log('🔘 Botão de menu clicado!');
    if (onMenuClick) {
      console.log('✅ onMenuClick existe, executando...');
      onMenuClick();
    } else {
      console.error('❌ onMenuClick não está definido!');
    }
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-white/5 bg-stone-900 px-4 md:px-8 shadow-md">
      <div className="flex items-center space-x-4">
        {/* Botão Menu Mobile - CORRIGIDO */}
        <button 
          onClick={handleMenuClick}
          className="md:hidden p-2 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-amber-500 transition-colors active:scale-95"
          aria-label="Abrir menu"
        >
          <Menu size={24} strokeWidth={2} />
        </button>

        <div className="relative w-full md:w-64">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <Search size={18} className="text-stone-500" />
          </span>
          <input
            type="text"
            placeholder="Pesquisar..."
            className="w-full rounded-full border border-white/10 bg-stone-950 py-1.5 pl-10 pr-4 text-sm text-stone-200 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 transition-all"
          />
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <button className="hidden sm:flex rounded-full p-2 text-stone-500 hover:bg-stone-800 hover:text-amber-500 transition-colors">
          <Bell size={20} />
        </button>
        <div className="flex items-center space-x-3 border-l border-white/5 pl-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-stone-100">{user.displayName}</p>
            <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">{user.role}</p>
          </div>
          <div className="h-10 w-10 overflow-hidden rounded-full bg-stone-800 flex items-center justify-center border border-amber-600/30">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName} className="h-full w-full object-cover" />
            ) : (
              <User size={20} className="text-amber-500" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
