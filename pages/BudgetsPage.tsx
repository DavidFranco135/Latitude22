
import React from 'react';
import { FileText, Plus, Search, Filter, CheckCircle, XCircle, Clock } from 'lucide-react';

const BudgetsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-serif text-3xl font-bold text-stone-100">Propostas & Orçamentos</h2>
          <p className="text-stone-500">Gestão de leads e aprovações de contratos.</p>
        </div>
        <button className="flex items-center justify-center space-x-2 rounded-lg bg-amber-600 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-amber-700 shadow-xl shadow-amber-900/20">
          <Plus size={18} />
          <span>Nova Proposta</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-white/5 bg-stone-900 p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg border border-amber-500/20"><Clock size={20} /></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Pendentes</span>
          </div>
          <p className="mt-4 text-3xl font-bold text-stone-100">14</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-stone-900 p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-green-500/10 text-green-500 rounded-lg border border-green-500/20"><CheckCircle size={20} /></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Aprovados</span>
          </div>
          <p className="mt-4 text-3xl font-bold text-stone-100">32</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-stone-900 p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20"><XCircle size={20} /></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Recusados</span>
          </div>
          <p className="mt-4 text-3xl font-bold text-stone-100">5</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-stone-900 shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-white/5 bg-stone-900/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4">
              <Search size={18} className="text-stone-600" />
            </span>
            <input
              type="text"
              placeholder="Buscar orçamento..."
              className="w-full rounded-full border border-white/10 bg-stone-950 py-2.5 pl-12 pr-4 text-sm text-stone-200 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
            />
          </div>
          <button className="p-2.5 border border-white/10 rounded-lg hover:bg-stone-800 text-stone-500 hover:text-amber-500 transition-all">
            <Filter size={18} />
          </button>
        </div>
        <table className="w-full text-left">
          <thead className="bg-stone-950 text-[10px] font-bold uppercase tracking-[0.3em] text-stone-600">
            <tr>
              <th className="px-8 py-5">Cliente</th>
              <th className="px-8 py-5">Pacote / Descrição</th>
              <th className="px-8 py-5">Valor</th>
              <th className="px-8 py-5">Status</th>
              <th className="px-8 py-5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm text-stone-300">
            {[1, 2, 3].map((i) => (
              <tr key={i} className="hover:bg-white/5 transition-colors">
                <td className="px-8 py-5 font-bold text-stone-100 uppercase tracking-wide">Camila Rocha</td>
                <td className="px-8 py-5 text-stone-500 font-medium tracking-wide">Pacote Latitude Premium - Jantar + Open Bar</td>
                <td className="px-8 py-5 font-bold text-amber-500 tracking-tight">R$ 12.800,00</td>
                <td className="px-8 py-5">
                  <span className="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-500 border border-amber-500/20">Aguardando</span>
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="flex justify-end space-x-2">
                    <button title="Aprovar" className="p-2 text-stone-500 hover:text-green-500 transition-all bg-stone-950 rounded-lg border border-white/5"><CheckCircle size={16} /></button>
                    <button title="Recusar" className="p-2 text-stone-500 hover:text-red-500 transition-all bg-stone-950 rounded-lg border border-white/5"><XCircle size={16} /></button>
                    <button title="PDF" className="p-2 text-stone-500 hover:text-amber-500 transition-all bg-stone-950 rounded-lg border border-white/5"><FileText size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BudgetsPage;
