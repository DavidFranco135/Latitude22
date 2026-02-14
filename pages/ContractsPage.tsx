
import React from 'react';
import { FileSignature, Plus, Search, FileText, Download, CheckCircle } from 'lucide-react';

const ContractsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-serif text-3xl font-bold text-stone-100">Contratos Jurídicos</h2>
          <p className="text-stone-500">Geração de instrumentos jurídicos e assinaturas digitais.</p>
        </div>
        <button className="flex items-center justify-center space-x-2 rounded-lg bg-amber-600 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-amber-700 shadow-xl shadow-amber-900/20">
          <Plus size={18} />
          <span>Redigir Contrato</span>
        </button>
      </div>

      <div className="rounded-xl border border-white/5 bg-stone-900 shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-white/5 bg-stone-900/50">
          <div className="relative w-full sm:w-80">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4">
              <Search size={18} className="text-stone-600" />
            </span>
            <input
              type="text"
              placeholder="Pesquisar por anfitrião..."
              className="w-full rounded-full border border-white/10 bg-stone-950 py-2.5 pl-12 pr-4 text-sm text-stone-200 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 transition-all"
            />
          </div>
        </div>
        <table className="w-full text-left">
          <thead className="bg-stone-950 text-[10px] font-bold uppercase tracking-[0.3em] text-stone-600">
            <tr>
              <th className="px-8 py-5">Protocolo</th>
              <th className="px-8 py-5">Contratante</th>
              <th className="px-8 py-5">Valor Contratual</th>
              <th className="px-8 py-5">Data Evento</th>
              <th className="px-8 py-5">Vigência</th>
              <th className="px-8 py-5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm text-stone-300">
            {[1, 2].map((i) => (
              <tr key={i} className="hover:bg-white/5 transition-colors">
                <td className="px-8 py-5 text-stone-500 font-mono text-xs uppercase">LAT22-CT-{2024 + i}</td>
                <td className="px-8 py-5 font-bold text-stone-100 uppercase tracking-wide">Fernanda Lima</td>
                <td className="px-8 py-5 font-bold text-amber-500 tracking-tight">R$ 25.450,00</td>
                <td className="px-8 py-5 text-stone-500 font-medium">10 Out 2024</td>
                <td className="px-8 py-5">
                  <span className="inline-flex items-center space-x-2 rounded-full bg-green-500/10 px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-green-500 border border-green-500/20">
                    <CheckCircle size={10} />
                    <span>Assinado</span>
                  </span>
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="flex justify-end space-x-3">
                    <button title="Exibir" className="p-2 text-stone-500 hover:text-white transition-all bg-stone-950 rounded-lg border border-white/5"><FileText size={18} /></button>
                    <button title="Baixar" className="p-2 text-stone-500 hover:text-amber-500 transition-all bg-stone-950 rounded-lg border border-white/5"><Download size={18} /></button>
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
