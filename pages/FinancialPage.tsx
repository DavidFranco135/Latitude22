
import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, Download, Plus, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const data = [
  { name: 'Jan', valor: 4500 },
  { name: 'Fev', valor: 3800 },
  { name: 'Mar', valor: -1200 },
  { name: 'Abr', valor: 5200 },
  { name: 'Mai', valor: 4900 },
  { name: 'Jun', valor: -1500 },
];

const FinancialPage: React.FC = () => {
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="font-serif text-4xl font-bold text-stone-100">Tesouraria & Cashflow</h2>
          <p className="text-stone-500 mt-2">Gestão financeira de alta precisão para o Salão.</p>
        </div>
        <div className="flex space-x-3">
          <button className="px-6 py-3 rounded-xl glass text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-white transition-all">
            Relatório Anual
          </button>
          <button className="px-8 py-3 rounded-xl bg-amber-600 text-white text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-amber-900/20 hover:bg-amber-700 transition-all">
            Lançamento Rápido
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-8 rounded-2xl border-l-4 border-l-green-600">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Receitas do Mês</p>
          <h4 className="text-3xl font-bold text-white mt-2">R$ 54.200,00</h4>
          <div className="mt-4 flex items-center text-green-500 text-xs font-bold">
            <TrendingUp size={14} className="mr-1" /> +8.4% vs mês ant.
          </div>
        </div>
        <div className="glass p-8 rounded-2xl border-l-4 border-l-red-600">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Despesas & Custos</p>
          <h4 className="text-3xl font-bold text-white mt-2">R$ 12.840,00</h4>
          <div className="mt-4 flex items-center text-red-500 text-xs font-bold">
            <TrendingDown size={14} className="mr-1" /> +2.1% em insumos
          </div>
        </div>
        <div className="glass p-8 rounded-2xl border-l-4 border-l-amber-600 bg-amber-600/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600/80">Saldo Consolidado</p>
          <h4 className="text-3xl font-bold text-amber-500 mt-2">R$ 41.360,00</h4>
          <div className="mt-4 flex items-center text-amber-600 text-xs font-bold uppercase tracking-widest">
            Liquidez Imediata
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass p-8 rounded-2xl">
          <h3 className="text-stone-100 font-bold mb-8">Fluxo Semestral</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1c1917" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#57534e', fontSize: 10}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#57534e', fontSize: 10}} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.02)'}} contentStyle={{backgroundColor: '#0c0a09', border: '1px solid #292524', borderRadius: '8px'}} />
                {/* Fixed: Moved radius to Bar and used a single numeric value to satisfy TypeScript constraints */}
                <Bar dataKey="valor" radius={4}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.valor > 0 ? '#16a34a' : '#dc2626'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-stone-100 font-bold">Últimos Lançamentos</h3>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600" />
              <input type="text" placeholder="Filtrar..." className="bg-stone-950 border border-white/5 rounded-full py-1.5 pl-9 pr-4 text-[10px] outline-none focus:border-amber-600" />
            </div>
          </div>
          <div className="divide-y divide-white/5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 flex items-center justify-between hover:bg-white/5 transition-all">
                <div className="flex items-center space-x-4">
                  <div className="p-2 rounded bg-green-500/10 text-green-500"><TrendingUp size={16} /></div>
                  <div>
                    <p className="text-sm font-bold text-stone-200">Parcela Contrato #2024</p>
                    <p className="text-[10px] text-stone-600 font-medium">15 Out • Débito em Conta</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-stone-100">+ R$ 2.450</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialPage;
