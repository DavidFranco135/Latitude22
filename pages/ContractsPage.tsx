
import React from 'react';
import { FileSignature, Plus, Search, FileText, Download, CheckCircle } from 'lucide-react';

const ContractsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-serif text-3xl font-bold text-stone-900">Contratos</h2>
          <p className="text-stone-500">Geração e acompanhamento de contratos digitais.</p>
        </div>
        <button className="flex items-center justify-center space-x-2 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-bold uppercase tracking-widest text-white hover:bg-stone-800">
          <Plus size={18} />
          <span>Novo Contrato</span>
        </button>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-stone-50/50">
          <div className="relative w-full sm:w-80">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Search size={18} className="text-gray-400" />
            </span>
            <input
              type="text"
              placeholder="Pesquisar por cliente..."
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
            />
          </div>
        </div>
        <table className="w-full text-left">
          <thead className="bg-stone-50 text-xs font-bold uppercase tracking-widest text-stone-500">
            <tr>
              <th className="px-6 py-4">ID</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Valor</th>
              <th className="px-6 py-4">Data Início</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {[1, 2].map((i) => (
              <tr key={i} className="hover:bg-stone-50">
                <td className="px-6 py-4 text-stone-400 font-mono">#CT-2024-00{i}</td>
                <td className="px-6 py-4 font-bold text-stone-900">Fernanda Lima</td>
                <td className="px-6 py-4 text-stone-900">R$ 2.450,00</td>
                <td className="px-6 py-4 text-stone-500">10 Out 2024</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center space-x-1 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                    <CheckCircle size={12} />
                    <span>Ativo</span>
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-2">
                    <button title="Visualizar" className="p-1.5 text-stone-400 hover:text-stone-900"><FileText size={18} /></button>
                    <button title="Download PDF" className="p-1.5 text-stone-400 hover:text-stone-900"><Download size={18} /></button>
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

export default ContractsPage;
