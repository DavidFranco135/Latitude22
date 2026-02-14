
import React from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Filter,
  Plus,
  FileText
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

const data = [
  { name: 'Jan', valor: 4500, tipo: 'entrada' },
  { name: 'Fev', valor: 3800, tipo: 'entrada' },
  { name: 'Mar', valor: -1200, tipo: 'saida' },
  { name: 'Abr', valor: 5200, tipo: 'entrada' },
  { name: 'Mai', valor: 4900, tipo: 'entrada' },
  { name: 'Jun', valor: -1500, tipo: 'saida' },
];

const FinancialPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-serif text-3xl font-bold text-stone-900">Financeiro</h2>
          <p className="text-stone-500">Controle de caixa, faturamento e relatórios.</p>
        </div>
        <div className="flex space-x-2">
          <button className="flex items-center justify-center space-x-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-bold uppercase tracking-widest text-stone-600 hover:bg-stone-50">
            <Download size={18} />
            <span>Relatório PDF</span>
          </button>
          <button className="flex items-center justify-center space-x-2 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-bold uppercase tracking-widest text-white hover:bg-stone-800">
            <Plus size={18} />
            <span>Nova Entrada</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-6 shadow-sm border-l-4 border-l-green-500">
          <div className="flex items-center justify-between text-green-600">
            <TrendingUp size={20} />
            <span className="text-[10px] font-bold uppercase tracking-widest bg-green-50 px-2 py-0.5 rounded">Mensal</span>
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-500">Total de Entradas</h3>
            <p className="text-2xl font-bold text-gray-900">R$ 24.520,00</p>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm border-l-4 border-l-red-500">
          <div className="flex items-center justify-between text-red-600">
            <TrendingDown size={20} />
            <span className="text-[10px] font-bold uppercase tracking-widest bg-red-50 px-2 py-0.5 rounded">Mensal</span>
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-500">Total de Saídas</h3>
            <p className="text-2xl font-bold text-gray-900">R$ 8.140,00</p>
          </div>
        </div>
        <div className="rounded-xl border bg-stone-900 p-6 shadow-sm text-white">
          <div className="flex items-center justify-between text-stone-400">
            <DollarSign size={20} />
            <span className="text-[10px] font-bold uppercase tracking-widest bg-stone-800 px-2 py-0.5 rounded">Saldo Atual</span>
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-medium text-stone-400">Lucro Líquido</h3>
            <p className="text-2xl font-bold">R$ 16.380,00</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="mb-6 font-bold text-stone-800">Fluxo de Caixa Mensal</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill: '#fafaf9'}} />
              <Bar dataKey="valor">
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.valor > 0 ? '#22c55e' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-stone-50/50 flex items-center justify-between">
          <h3 className="font-bold text-stone-800">Transações Recentes</h3>
          <button className="p-2 hover:bg-stone-50 rounded-full text-stone-400">
            <Filter size={18} />
          </button>
        </div>
        <table className="w-full text-left">
          <thead className="bg-stone-50 text-xs font-bold uppercase tracking-widest text-stone-500">
            <tr>
              <th className="px-6 py-4">Referência</th>
              <th className="px-6 py-4">Data</th>
              <th className="px-6 py-4">Tipo</th>
              <th className="px-6 py-4">Valor</th>
              <th className="px-6 py-4 text-right">Recibo</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="hover:bg-stone-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium text-stone-900">Agendamento #2024-{i}</p>
                  <p className="text-xs text-stone-400">Cliente: Ana Silva</p>
                </td>
                <td className="px-6 py-4 text-stone-500">14 Out 2024</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">Entrada</span>
                </td>
                <td className="px-6 py-4 font-bold text-stone-900">R$ 150,00</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-stone-400 hover:text-stone-900">
                    <FileText size={18} />
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

export default FinancialPage;
