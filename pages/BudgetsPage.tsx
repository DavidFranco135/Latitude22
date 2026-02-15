import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, Filter, CheckCircle, XCircle, Clock } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

interface Budget {
  id: string;
  clientName: string;
  package: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: any;
}

const BudgetsPage: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'budgets'),
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Budget));
        setBudgets(items.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        }));
      },
      (error) => console.error('Erro ao carregar orçamentos:', error)
    );
    return () => unsubscribe();
  }, []);

  const filteredBudgets = budgets.filter(b =>
    b.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.package.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingCount = budgets.filter(b => b.status === 'pending').length;
  const approvedCount = budgets.filter(b => b.status === 'approved').length;
  const rejectedCount = budgets.filter(b => b.status === 'rejected').length;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { text: 'Aguardando', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
      approved: { text: 'Aprovado', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
      rejected: { text: 'Recusado', color: 'bg-red-500/10 text-red-500 border-red-500/20' }
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-serif text-3xl font-bold text-stone-100">Propostas & Orçamentos</h2>
          <p className="text-stone-500">Gestão de leads e aprovações de contratos.</p>
        </div>
        <button className="flex items-center justify-center space-x-2 rounded-lg bg-amber-600 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-amber-700 shadow-xl shadow-amber-900/20">
          <Plus size={18} />
          <span>Nova Proposta</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-white/5 bg-stone-900 p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg border border-amber-500/20">
              <Clock size={20} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Pendentes</span>
          </div>
          <p className="mt-4 text-3xl font-bold text-stone-100">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-stone-900 p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-green-500/10 text-green-500 rounded-lg border border-green-500/20">
              <CheckCircle size={20} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Aprovados</span>
          </div>
          <p className="mt-4 text-3xl font-bold text-stone-100">{approvedCount}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-stone-900 p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20">
              <XCircle size={20} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Recusados</span>
          </div>
          <p className="mt-4 text-3xl font-bold text-stone-100">{rejectedCount}</p>
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-full border border-white/10 bg-stone-950 py-2.5 pl-12 pr-4 text-sm text-stone-200 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
            />
          </div>
          <button className="p-2.5 border border-white/10 rounded-lg hover:bg-stone-800 text-stone-500 hover:text-amber-500 transition-all">
            <Filter size={18} />
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-stone-950 text-xs font-bold uppercase tracking-widest text-stone-600">
              <tr>
                <th className="px-8 py-5">Cliente</th>
                <th className="px-8 py-5">Pacote / Descrição</th>
                <th className="px-8 py-5">Valor</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-stone-300">
              {filteredBudgets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-stone-500">
                    {searchTerm ? 'Nenhum orçamento encontrado' : 'Nenhum orçamento cadastrado'}
                  </td>
                </tr>
              ) : (
                filteredBudgets.map((budget) => {
                  const statusBadge = getStatusBadge(budget.status);
                  return (
                    <tr key={budget.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-8 py-5 font-bold text-stone-100 uppercase tracking-wide">{budget.clientName}</td>
                      <td className="px-8 py-5 text-stone-500 font-medium tracking-wide">{budget.package}</td>
                      <td className="px-8 py-5 font-bold text-amber-500 tracking-tight">{formatCurrency(budget.amount)}</td>
                      <td className="px-8 py-5">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest border ${statusBadge.color}`}>
                          {statusBadge.text}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end space-x-2">
                          <button title="Aprovar" className="p-2 text-stone-500 hover:text-green-500 transition-all bg-stone-950 rounded-lg border border-white/5">
                            <CheckCircle size={16} />
                          </button>
                          <button title="Recusar" className="p-2 text-stone-500 hover:text-red-500 transition-all bg-stone-950 rounded-lg border border-white/5">
                            <XCircle size={16} />
                          </button>
                          <button title="PDF" className="p-2 text-stone-500 hover:text-amber-500 transition-all bg-stone-950 rounded-lg border border-white/5">
                            <FileText size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BudgetsPage;
