
import React from 'react';
import { FileText, Plus, Search, Filter, CheckCircle, XCircle, Clock } from 'lucide-react';

const BudgetsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-serif text-3xl font-bold text-stone-900">Orçamentos</h2>
          <p className="text-stone-500">Gestão de orçamentos e aprovações.</p>
        </div>
        <button className="flex items-center justify-center space-x-2 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-bold uppercase tracking-widest text-white hover:bg-stone-800">
          <Plus size={18} />
          <span>Novo Orçamento</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Clock size={20} /></div>
            <span className="text-xs font-bold text-stone-400">Pendentes</span>
          </div>
          <p className="mt-4 text-2xl font-bold text-stone-900">14</p>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg"><CheckCircle size={20} /></div>
            <span className="text-xs font-bold text-stone-400">Aprovados</span>
          </div>
          <p className="mt-4 text-2xl font-bold text-stone-900">32</p>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg"><XCircle size={20} /></div>
            <span className="text-xs font-bold text-stone-400">Recusados</span>
          </div>
          <p className="mt-4 text-2xl font-bold text-stone-900">5</p>
        </div>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-stone-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Search size={18} className="text-gray-400" />
            </span>
            <input
              type="text"
              placeholder="Buscar orçamento..."
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
            />
          </div>
          <button className="p-2 border rounded-lg hover:bg-stone-50 text-stone-500">
            <Filter size={18} />
          </button>
        </div>
        <table className="w-full text-left">
          <thead className="bg-stone-50 text-xs font-bold uppercase tracking-widest text-stone-500">
            <tr>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Descrição</th>
              <th className="px-6 py-4">Valor</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {[1, 2, 3].map((i) => (
              <tr key={i} className="hover:bg-stone-50">
                <td className="px-6 py-4 font-bold text-stone-900">Camila Rocha</td>
                <td className="px-6 py-4 text-stone-500">Pacote Noiva - Teste de Penteado + Maquiagem</td>
                <td className="px-6 py-4 font-medium text-stone-900">R$ 1.800,00</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">Pendente</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-2">
                    <button className="p-1.5 text-stone-400 hover:text-green-600 transition-colors"><CheckCircle size={18} /></button>
                    <button className="p-1.5 text-stone-400 hover:text-red-600 transition-colors"><XCircle size={18} /></button>
                    <button className="p-1.5 text-stone-400 hover:text-stone-900 transition-colors"><FileText size={18} /></button>
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
