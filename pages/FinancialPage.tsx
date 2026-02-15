import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Download, Plus, Search } from 'lucide-react';
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  category: string;
  createdAt?: any;
}

const FinancialPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'financial'),
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        setTransactions(items.sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA;
        }));
      },
      (error) => console.error('Erro ao carregar transações:', error)
    );
    return () => unsubscribe();
  }, []);

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  // Preparar dados para o gráfico
  const chartData = transactions.slice(0, 6).reverse().map(t => ({
    name: new Date(t.date).toLocaleDateString('pt-BR', { month: 'short' }),
    valor: t.type === 'income' ? t.amount : -t.amount
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="font-serif text-4xl font-bold text-stone-100">Tesouraria & Cashflow</h2>
          <p className="text-stone-500 mt-2">Gestão financeira de alta precisão para o Salão.</p>
        </div>
        <div className="flex space-x-3">
          <button className="px-6 py-3 rounded-xl border border-white/10 bg-stone-900 text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-white transition-all">
            Relatório Anual
          </button>
          <button className="px-8 py-3 rounded-xl bg-amber-600 text-white text-xs font-bold uppercase tracking-widest shadow-xl shadow-amber-900/20 hover:bg-amber-700 transition-all">
            Lançamento Rápido
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-white/5 bg-stone-900 p-8 border-l-4 border-l-green-600">
          <p className="text-xs font-bold uppercase tracking-widest text-stone-500">Receitas do Mês</p>
          <h4 className="text-3xl font-bold text-white mt-2">{formatCurrency(totalIncome)}</h4>
          <div className="mt-4 flex items-center text-green-500 text-xs font-bold">
            <TrendingUp size={14} className="mr-1" /> Entradas
          </div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-stone-900 p-8 border-l-4 border-l-red-600">
          <p className="text-xs font-bold uppercase tracking-widest text-stone-500">Despesas & Custos</p>
          <h4 className="text-3xl font-bold text-white mt-2">{formatCurrency(totalExpense)}</h4>
          <div className="mt-4 flex items-center text-red-500 text-xs font-bold">
            <TrendingDown size={14} className="mr-1" /> Saídas
          </div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-stone-900 p-8 border-l-4 border-l-amber-600 bg-amber-600/5">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-600/80">Saldo Consolidado</p>
          <h4 className="text-3xl font-bold text-amber-500 mt-2">{formatCurrency(balance)}</h4>
          <div className="mt-4 flex items-center text-amber-600 text-xs font-bold uppercase tracking-widest">
            Liquidez Imediata
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="rounded-2xl border border-white/5 bg-stone-900 p-8">
          <h3 className="text-stone-100 font-bold mb-8">Fluxo Recente</h3>
          {chartData.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1c1917" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#57534e', fontSize: 10}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#57534e', fontSize: 10}} />
                  <Tooltip cursor={{fill: 'rgba(255,255,255,0.02)'}} contentStyle={{backgroundColor: '#0c0a09', border: '1px solid #292524', borderRadius: '8px'}} />
                  <Bar dataKey="valor" radius={4}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.valor > 0 ? '#16a34a' : '#dc2626'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-stone-600">
              Nenhum lançamento registrado
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/5 bg-stone-900 overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-stone-100 font-bold">Últimos Lançamentos</h3>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600" />
              <input type="text" placeholder="Filtrar..." className="bg-stone-950 border border-white/5 rounded-full py-1.5 pl-9 pr-4 text-xs outline-none focus:border-amber-600" />
            </div>
          </div>
          <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-stone-600">
                Nenhum lançamento registrado
              </div>
            ) : (
              transactions.slice(0, 10).map((transaction) => (
                <div key={transaction.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-all">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded ${transaction.type === 'income' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {transaction.type === 'income' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-stone-200">{transaction.description}</p>
                      <p className="text-xs text-stone-600 font-medium">
                        {new Date(transaction.date).toLocaleDateString('pt-BR')} • {transaction.category}
                      </p>
                    </div>
                  </div>
                  <p className={`text-sm font-bold ${transaction.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                    {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialPage;
