
import React from 'react';
import { UserPlus, Shield, Mail, MoreVertical } from 'lucide-react';

const CollaboratorsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-serif text-3xl font-bold text-stone-900">Colaboradores</h2>
          <p className="text-stone-500">Gerencie sua equipe e níveis de acesso.</p>
        </div>
        <button className="flex items-center justify-center space-x-2 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-bold uppercase tracking-widest text-white hover:bg-stone-800">
          <UserPlus size={18} />
          <span>Novo Colaborador</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Admin Card */}
        <div className="rounded-xl border bg-white p-6 shadow-sm border-t-4 border-t-stone-900">
          <div className="flex items-start justify-between">
            <div className="h-16 w-16 rounded-2xl bg-stone-100 flex items-center justify-center font-bold text-stone-400 text-xl border-2 border-stone-200">A</div>
            <span className="text-[10px] font-bold uppercase tracking-widest bg-stone-900 text-white px-2 py-0.5 rounded">ADMIN</span>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-bold text-stone-900">Administrador Latitude</h3>
            <div className="mt-2 flex items-center space-x-2 text-stone-400 text-xs">
              <Mail size={14} />
              <span>admlatitude22@gmail.com</span>
            </div>
            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs text-stone-500">
                <Shield size={14} />
                <span>Acesso Total</span>
              </div>
              <button className="p-1 text-stone-400 hover:text-stone-900"><MoreVertical size={16} /></button>
            </div>
          </div>
        </div>

        {/* Collaborator Card */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="h-16 w-16 rounded-2xl bg-stone-100 flex items-center justify-center font-bold text-stone-400 text-xl border-2 border-stone-200">P</div>
            <span className="text-[10px] font-bold uppercase tracking-widest bg-stone-100 text-stone-600 px-2 py-0.5 rounded">COLAB</span>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-bold text-stone-900">Patrícia Lima</h3>
            <div className="mt-2 flex items-center space-x-2 text-stone-400 text-xs">
              <Mail size={14} />
              <span>patricia@latitude22.com</span>
            </div>
            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs text-stone-500">
                <Shield size={14} className="text-amber-500" />
                <span>Restrito</span>
              </div>
              <button className="p-1 text-stone-400 hover:text-stone-900"><MoreVertical size={16} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaboratorsPage;
