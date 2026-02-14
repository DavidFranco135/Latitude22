
import React from 'react';
import { Search, UserPlus, MoreVertical, Phone, Mail, Calendar } from 'lucide-react';

const ClientsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-serif text-3xl font-bold text-stone-100">Clientes & Anfitriões</h2>
          <p className="text-stone-500">Base completa de registros do Salão Latitude22.</p>
        </div>
        <button className="flex items-center justify-center space-x-2 rounded-lg bg-amber-600 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-amber-700 shadow-xl shadow-amber-900/20 transition-all">
          <UserPlus size={18} />
          <span>Novo Cliente</span>
        </button>
      </div>

      <div className="rounded-xl border border-white/5 bg-stone-900 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5 bg-stone-900/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Search size={18} className="text-stone-600" />
            </span>
            <input
              type="text"
              placeholder="Buscar anfitrião..."
              className="w-full rounded-lg border border-white/10 bg-stone-950 py-2.5 pl-10 pr-4 text-sm text-stone-200 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 transition-all"
            />
          </div>
          <div className="flex space-x-2">
            <button className="rounded-lg border border-white/10 bg-stone-950 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-amber-500 transition-colors">Exportar</button>
            <button className="rounded-lg border border-white/10 bg-stone-950 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-amber-500 transition-colors">Filtros</button>
          </div>
        </div>
        
        <table className="w-full text-left">
          <thead className="bg-stone-950 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">
            <tr>
              <th className="px-6 py-5">Cliente</th>
              <th className="px-6 py-5">Contato</th>
              <th className="px-6 py-5">Último Evento</th>
              <th className="px-6 py-5">Faturamento Acumulado</th>
              <th className="px-6 py-5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <tr key={i} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-5">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-stone-800 flex items-center justify-center font-bold text-amber-500 border border-amber-500/20">JS</div>
                    <div>
                      <p className="font-bold text-stone-100">Joana Santos</p>
                      <p className="text-[10px] text-stone-500 uppercase font-bold tracking-widest">Desde 2022</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5 space-y-1">
                  <div className="flex items-center text-stone-400 space-x-2">
                    <Phone size={14} className="text-amber-600" />
                    <span>(11) 98877-6655</span>
                  </div>
                  <div className="flex items-center text-stone-400 space-x-2">
                    <Mail size={14} className="text-amber-600" />
                    <span className="text-xs">joana.santos@email.com</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center text-stone-400 space-x-2">
                    <Calendar size={14} />
                    <span className="font-medium">12 Out 2024</span>
                  </div>
                </td>
                <td className="px-6 py-5 font-bold text-amber-500">R$ 15.250,00</td>
                <td className="px-6 py-5 text-right">
                  <button className="text-stone-500 hover:text-amber-500 transition-colors">
                    <MoreVertical size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClientsPage;
