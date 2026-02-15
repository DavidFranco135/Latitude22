import React, { useState, useEffect } from 'react';
import { FileSignature, Plus, Search, FileText, Download, CheckCircle } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

interface Contract {
  id: string;
  protocol: string;
  clientName: string;
  amount: number;
  eventDate: string;
  status: 'pending' | 'signed' | 'cancelled';
  createdAt?: any;
}

const ContractsPage: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'contracts'),
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contract));
        setContracts(items.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        }));
      },
      (error) => console.error('Erro ao carregar contratos:', error)
    );
    return () => unsubscribe();
  }, []);

  const filteredContracts = contracts.filter(c =>
    c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.protocol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      signed: { text: 'Assinado', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
      pending: { text: 'Pendente', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
      cancelled: { text: 'Cancelado', color: 'bg-red-500/10 text-red-500 border-red-500/20' }
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-serif text-3xl font-bold text-stone-100">Contratos Jurídicos</h2>
          <p className="text-stone-500">Geração de instrumentos jurídicos e assinaturas digitais.</p>
        </div>
        <button className="flex items-center justify-center space-x-2 rounded-lg bg-amber-600 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-amber-700 shadow-xl shadow-amber-900/20">
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-full border border-white/10 bg-stone-950 py-2.5 pl-12 pr-4 text-sm text-stone-200 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 transition-all"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-stone-950 text-xs font-bold uppercase tracking-widest text-stone-600">
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
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-stone-500">
                    {searchTerm ? 'Nenhum contrato encontrado' : 'Nenhum contrato cadastrado'}
                  </td>
                </tr>
              ) : (
                filteredContracts.map((contract) => {
                  const statusBadge = getStatusBadge(contract.status);
                  return (
                    <tr key={contract.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-8 py-5 text-stone-500 font-mono text-xs uppercase">{contract.protocol}</td>
                      <td className="px-8 py-5 font-bold text-stone-100 uppercase tracking-wide">{contract.clientName}</td>
                      <td className="px-8 py-5 font-bold text-amber-500 tracking-tight">{formatCurrency(contract.amount)}</td>
                      <td className="px-8 py-5 text-stone-500 font-medium">
                        {new Date(contract.eventDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-8 py-5">
                        <span className={`inline-flex items-center space-x-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest border ${statusBadge.color}`}>
                          <CheckCircle size={10} />
                          <span>{statusBadge.text}</span>
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end space-x-3">
                          <button title="Exibir" className="p-2 text-stone-500 hover:text-white transition-all bg-stone-950 rounded-lg border border-white/5">
                            <FileText size={18} />
                          </button>
                          <button title="Baixar" className="p-2 text-stone-500 hover:text-amber-500 transition-all bg-stone-950 rounded-lg border border-white/5">
                            <Download size={18} />
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

export default ContractsPage;
