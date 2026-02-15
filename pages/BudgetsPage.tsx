import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, Filter, CheckCircle, XCircle, Clock, Download, Edit2, Trash2, Eye } from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Budget {
  id: string;
  clientName: string;
  package: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: any;
  clientEmail?: string;
  eventDate?: string;
  details?: string;
}

const BudgetsPage: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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

  const filteredBudgets = budgets.filter(b => {
    const matchesSearch = b.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.package.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? b.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

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

  const updateStatus = async (id: string, newStatus: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'budgets', id), { status: newStatus });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status do orçamento');
    }
  };

  const deleteBudget = async (id: string, clientName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o orçamento de ${clientName}?`)) {
      try {
        await deleteDoc(doc(db, 'budgets', id));
      } catch (error) {
        console.error('Erro ao excluir:', error);
        alert('Erro ao excluir orçamento');
      }
    }
  };

  const exportBudgetToPDF = (budget: Budget) => {
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('LATITUDE22', 105, 30, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text('Proposta Comercial', 105, 40, { align: 'center' });
    
    // Linha decorativa
    doc.setDrawColor(217, 119, 6);
    doc.setLineWidth(0.5);
    doc.line(20, 45, 190, 45);
    
    // Informações do Cliente
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO CLIENTE', 20, 60);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Cliente: ${budget.clientName}`, 20, 70);
    if (budget.clientEmail) doc.text(`Email: ${budget.clientEmail}`, 20, 76);
    if (budget.eventDate) doc.text(`Data do Evento: ${new Date(budget.eventDate).toLocaleDateString('pt-BR')}`, 20, 82);
    
    // Detalhes do Orçamento
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALHES DA PROPOSTA', 20, 100);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Pacote: ${budget.package}`, 20, 110);
    
    if (budget.details) {
      doc.text('Descrição:', 20, 120);
      const splitDetails = doc.splitTextToSize(budget.details, 170);
      doc.text(splitDetails, 20, 128);
    }
    
    // Valor
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(217, 119, 6);
    doc.text(`VALOR TOTAL: ${formatCurrency(budget.amount)}`, 105, 160, { align: 'center' });
    
    // Status
    doc.setFontSize(10);
    doc.setTextColor(0);
    const statusBadge = getStatusBadge(budget.status);
    doc.text(`Status: ${statusBadge.text}`, 20, 180);
    
    // Informações Adicionais
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text('Esta proposta é válida por 30 dias a partir da data de emissão.', 20, 200);
    doc.text('Forma de pagamento e condições serão acordadas separadamente.', 20, 206);
    
    // Rodapé
    doc.setFontSize(8);
    doc.text(`Documento gerado em: ${new Date().toLocaleString('pt-BR')}`, 105, 270, { align: 'center' });
    doc.text('© Latitude22 - Eventos & Festas', 105, 280, { align: 'center' });
    doc.text('www.latitude22.com.br', 105, 286, { align: 'center' });
    
    doc.save(`orcamento-${budget.clientName.replace(/\s/g, '-')}-${Date.now()}.pdf`);
  };

  const exportAllToPDF = () => {
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('LATITUDE22', 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Relatório de Orçamentos', 105, 28, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 105, 35, { align: 'center' });
    
    // Resumo
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO', 14, 45);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Total de Orçamentos: ${filteredBudgets.length}`, 14, 53);
    doc.text(`Aguardando: ${pendingCount}`, 14, 59);
    doc.text(`Aprovados: ${approvedCount}`, 14, 65);
    doc.text(`Recusados: ${rejectedCount}`, 14, 71);
    
    const totalValue = filteredBudgets.reduce((sum, b) => sum + b.amount, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(`Valor Total: ${formatCurrency(totalValue)}`, 14, 77);
    
    // Tabela
    const tableData = filteredBudgets.map(b => [
      b.clientName,
      b.package,
      formatCurrency(b.amount),
      getStatusBadge(b.status).text,
      b.createdAt ? new Date(b.createdAt.toDate()).toLocaleDateString('pt-BR') : '-'
    ]);
    
    autoTable(doc, {
      startY: 85,
      head: [['Cliente', 'Pacote', 'Valor', 'Status', 'Data']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [217, 119, 6], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 50 },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30 },
        4: { cellWidth: 25 }
      },
      styles: { fontSize: 9 }
    });
    
    // Rodapé
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Página ${i} de ${pageCount}`, 105, 285, { align: 'center' });
      doc.text('© Latitude22 - Sistema de Gestão', 105, 290, { align: 'center' });
    }
    
    doc.save(`relatorio-orcamentos-${new Date().getTime()}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-serif text-3xl font-bold text-stone-100">Propostas & Orçamentos</h2>
          <p className="text-stone-500">Gestão de leads e aprovações de contratos.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportAllToPDF}
            className="flex items-center space-x-2 rounded-lg border border-white/10 bg-stone-900 px-6 py-3 text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-amber-500 hover:border-amber-500/30 transition-all"
          >
            <Download size={16} />
            <span>Exportar PDF</span>
          </button>
          <button className="flex items-center justify-center space-x-2 rounded-lg bg-amber-600 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-amber-700 shadow-xl shadow-amber-900/20">
            <Plus size={18} />
            <span>Nova Proposta</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button 
          onClick={() => setStatusFilter(statusFilter === 'pending' ? '' : 'pending')}
          className={`rounded-xl border ${statusFilter === 'pending' ? 'border-amber-500/30 bg-amber-500/5' : 'border-white/5 bg-stone-900'} p-6 shadow-2xl hover:border-amber-500/20 transition-all text-left`}
        >
          <div className="flex items-center justify-between">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg border border-amber-500/20">
              <Clock size={20} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Pendentes</span>
          </div>
          <p className="mt-4 text-3xl font-bold text-stone-100">{pendingCount}</p>
        </button>
        
        <button 
          onClick={() => setStatusFilter(statusFilter === 'approved' ? '' : 'approved')}
          className={`rounded-xl border ${statusFilter === 'approved' ? 'border-green-500/30 bg-green-500/5' : 'border-white/5 bg-stone-900'} p-6 shadow-2xl hover:border-green-500/20 transition-all text-left`}
        >
          <div className="flex items-center justify-between">
            <div className="p-2 bg-green-500/10 text-green-500 rounded-lg border border-green-500/20">
              <CheckCircle size={20} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Aprovados</span>
          </div>
          <p className="mt-4 text-3xl font-bold text-stone-100">{approvedCount}</p>
        </button>
        
        <button 
          onClick={() => setStatusFilter(statusFilter === 'rejected' ? '' : 'rejected')}
          className={`rounded-xl border ${statusFilter === 'rejected' ? 'border-red-500/30 bg-red-500/5' : 'border-white/5 bg-stone-900'} p-6 shadow-2xl hover:border-red-500/20 transition-all text-left`}
        >
          <div className="flex items-center justify-between">
            <div className="p-2 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20">
              <XCircle size={20} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Recusados</span>
          </div>
          <p className="mt-4 text-3xl font-bold text-stone-100">{rejectedCount}</p>
        </button>
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
          {(searchTerm || statusFilter) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
              }}
              className="text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-amber-500 transition-all"
            >
              Limpar Filtros
            </button>
          )}
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
                    {searchTerm || statusFilter ? 'Nenhum orçamento encontrado com os filtros aplicados' : 'Nenhum orçamento cadastrado'}
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
                          {budget.status === 'pending' && (
                            <>
                              <button 
                                onClick={() => updateStatus(budget.id, 'approved')}
                                title="Aprovar" 
                                className="p-2 text-stone-500 hover:text-green-500 transition-all bg-stone-950 rounded-lg border border-white/5"
                              >
                                <CheckCircle size={16} />
                              </button>
                              <button 
                                onClick={() => updateStatus(budget.id, 'rejected')}
                                title="Recusar" 
                                className="p-2 text-stone-500 hover:text-red-500 transition-all bg-stone-950 rounded-lg border border-white/5"
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => exportBudgetToPDF(budget)}
                            title="Exportar PDF" 
                            className="p-2 text-stone-500 hover:text-amber-500 transition-all bg-stone-950 rounded-lg border border-white/5"
                          >
                            <FileText size={16} />
                          </button>
                          <button 
                            onClick={() => deleteBudget(budget.id, budget.clientName)}
                            title="Excluir" 
                            className="p-2 text-stone-500 hover:text-red-500 transition-all bg-stone-950 rounded-lg border border-white/5"
                          >
                            <Trash2 size={16} />
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
