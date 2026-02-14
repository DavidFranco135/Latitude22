
import React from 'react';
import { UserPlus, Shield, Mail, MoreVertical } from 'lucide-react';

const CollaboratorsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-serif text-3xl font-bold text-stone-100">Equipe Latitude22</h2>
          <p className="text-stone-500">Gestão de colaboradores, acessos e permissões do sistema.</p>
        </div>
        <button className="flex items-center justify-center space-x-2 rounded-lg bg-amber-600 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-amber-700 shadow-xl shadow-amber-900/20 transition-all">
          <UserPlus size={18} />
          <span>Novo Membro</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Admin Card */}
        <div className="rounded-2xl border border-white/5 bg-stone-900 p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-600/10 -mr-12 -mt-12 rounded-full blur-2xl group-hover:bg-amber-600/20 transition-all"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="h-20 w-20 rounded-2xl bg-stone-950 flex items-center justify-center font-bold text-amber-500 text-2xl border border-amber-600/30 shadow-inner">L22</div>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] bg-amber-600 text-white px-3 py-1 rounded-full shadow-lg shadow-amber-900/40">Master</span>
          </div>
          <div className="mt-8 relative z-10">
            <h3 className="text-xl font-bold text-stone-100 tracking-tight uppercase">Administrador</h3>
            <div className="mt-3 flex items-center space-x-3 text-stone-500 text-xs font-medium">
              <Mail size={14} className="text-amber-600" />
              <span>admlatitude22@gmail.com</span>
            </div>
            <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-amber-500/60">
                <Shield size={14} />
                <span>Privilégios Totais</span>
              </div>
              <button className="p-2 text-stone-600 hover:text-white transition-colors"><MoreVertical size={18} /></button>
            </div>
          </div>
        </div>

        {/* Collaborator Card */}
        <div className="rounded-2xl border border-white/5 bg-stone-900 p-8 shadow-2xl group hover:border-white/10 transition-all">
          <div className="flex items-start justify-between">
            <div className="h-20 w-20 rounded-2xl bg-stone-800 flex items-center justify-center font-bold text-stone-600 text-2xl border border-white/5 group-hover:border-amber-600/20 transition-all">PL</div>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] bg-stone-950 text-stone-500 border border-white/10 px-3 py-1 rounded-full">Operacional</span>
          </div>
          <div className="mt-8">
            <h3 className="text-xl font-bold text-stone-100 tracking-tight uppercase">Patrícia Lima</h3>
            <div className="mt-3 flex items-center space-x-3 text-stone-500 text-xs font-medium">
              <Mail size={14} className="text-stone-700" />
              <span>patricia@latitude22.com</span>
            </div>
            <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-stone-600">
                <Shield size={14} className="text-stone-700" />
                <span>Acesso Restrito</span>
              </div>
              <button className="p-2 text-stone-600 hover:text-white transition-colors"><MoreVertical size={18} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaboratorsPage;
