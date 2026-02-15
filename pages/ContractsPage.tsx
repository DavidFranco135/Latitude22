import React, { useState, useEffect } from 'react';
import { FileSignature, Plus, Search, FileText, Download, CheckCircle, Edit2, Trash2 } from 'lucide-react';
import { collection, onSnapshot, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Contract {
  id: string;
  protocol: string;
  clientName: string;
  amount: number;
  eventDate: string;
  status: 'pending' | 'signed' | 'cancelled';
  createdAt?: any;
  eventType?: string;
  address?: string;
  observations?: string;
}

const ContractsPage: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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

  const filteredContracts = contracts.filter(c => {
    const matchesSearch = c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.protocol.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? c.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

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

  const updateStatus = async (id: string, newStatus: 'signed' | 'cancelled') => {
    try {
      await updateDoc(doc(db, 'contracts', id), { status: newStatus });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status do contrato');
    }
  };

  const deleteContract = async (id: string, clientName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o contrato de ${clientName}?`)) {
      try {
        await deleteDoc(doc(db, 'contracts', id));
      } catch (error) {
        console.error('Erro ao excluir:', error);
        alert('Erro ao excluir contrato');
      }
    }
  };

  const exportContractToPDF = (contract: Contract) => {
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('LATITUDE22', 105, 25, { align: 'center' });
    
    doc.setFontSize(18);
    doc.text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', 105, 35, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Protocolo: ${contract.protocol}`, 105, 42, { align: 'center' });
    
    // Linha decorativa
    doc.setDrawColor(217, 119, 6);
    doc.setLineWidth(0.5);
    doc.line(20, 48, 190, 48);
    
    // Partes do Contrato
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('CONTRATANTE', 20, 60);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Nome: ${contract.clientName}`, 20, 68);
    if (contract.address) {
      const splitAddress = doc.splitTextToSize(`Endereço: ${contract.address}`, 170);
      doc.text(splitAddress, 20, 74);
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CONTRATADA', 20, 90);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Razão Social: Latitude22 Eventos e Festas Ltda', 20, 98);
    doc.text('CNPJ: 00.000.000/0001-00', 20, 104);
    doc.text('Endereço: [Endereço da Latitude22]', 20, 110);
    
    // Objeto do Contrato
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('OBJETO DO CONTRATO', 20, 125);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Tipo de Evento: ${contract.eventType || 'Não especificado'}`, 20, 133);
    doc.text(`Data do Evento: ${new Date(contract.eventDate).toLocaleDateString('pt-BR')}`, 20, 139);
    doc.text(`Valor Total: ${formatCurrency(contract.amount)}`, 20, 145);
    
    if (contract.observations) {
      doc.text('Observações:', 20, 155);
      const splitObs = doc.splitTextToSize(contract.observations, 170);
      doc.text(splitObs, 20, 163);
    }
    
    // Cláusulas (exemplo simplificado)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CLÁUSULAS CONTRATUAIS', 20, 180);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const clauses = [
      '1. DO OBJETO: A CONTRATADA se compromete a prestar os serviços de locação de espaço para eventos conforme especificado.',
      '2. DO VALOR: O valor total do contrato é de ' + formatCurrency(contract.amount) + ', a ser pago conforme condições acordadas.',
      '3. DAS OBRIGAÇÕES: Ambas as partes se comprometem a cumprir fielmente as cláusulas deste instrumento.',
      '4. DA RESCISÃO: O contrato poderá ser rescindido mediante comunicação prévia de 30 dias.',
      '5. DO FORO: Fica eleito o foro da comarca de [Cidade] para dirimir quaisquer questões oriundas deste contrato.'
    ];
    
    let yPos = 188;
    clauses.forEach(clause => {
      const splitClause = doc.splitTextToSize(clause, 170);
      doc.text(splitClause, 20, yPos);
      yPos += splitClause.length * 5 + 3;
    });
    
    // Assinaturas
    doc.setFontSize(10);
    doc.text('_________________________________________', 40, 260);
    doc.text('CONTRATANTE', 40, 266);
    doc.text(contract.clientName, 40, 272);
    
    doc.text('_________________________________________', 120, 260);
    doc.text('CONTRATADA', 120, 266);
    doc.text('Latitude22 Eventos', 120, 272);
    
    // Rodapé
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Documento gerado em: ${new Date().toLocaleString('pt-BR')}`, 105, 285, { align: 'center' });
    doc.text('© Latitude22 - Este documento possui validade jurídica', 105, 290, { align: 'center' });
    
    doc.save(`contrato-${contract.protocol}-${contract.clientName.replace(/\s/g, '-')}.pdf`);
  };

  const exportAllToPDF = () => {
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('LATITUDE22', 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Relatório de Contratos', 105, 28, { align: 'center' });
    
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
    const signedCount = contracts.filter(c => c.status === 'signed').length;
    const pendingCount = contracts.filter(c => c.status === 'pending').length;
    const cancelledCount = contracts.filter(c => c.status === 'cancelled').length;
    
    doc.text(`Total de Contratos: ${filteredContracts.length}`, 14, 53);
    doc.text(`Assinados: ${signedCount}`, 14, 59);
    doc.text(`Pendentes: ${pendingCount}`, 14, 65);
    doc.text(`Cancelados: ${cancelledCount}`, 14, 71);
    
    const totalValue = filteredContracts.reduce((sum, c) => sum + c.amount, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(`Valor Total: ${formatCurrency(totalValue)}`, 14, 77);
    
    // Tabela
    const tableData = filteredContracts.map(c => [
      c.protocol,
      c.clientName,
      formatCurrency(c.amount),
      new Date(c.eventDate).toLocaleDateString('pt-BR'),
      getStatusBadge(c.status).text
    ]);
    
    autoTable(doc, {
      startY: 85,
      head: [['Protocolo', 'Contratante', 'Valor', 'Data Evento', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [217, 119, 6], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 50 },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 30 },
        4: { cellWidth: 30 }
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
    
    doc.save(`relatorio-contratos-${new Date().getTime()}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-serif text-3xl font-bold text-stone-100">Contratos Jurídicos</h2>
          <p className="text-stone-500">Geração de instrumentos jurídicos e assinaturas digitais.</p>
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
            <span>Redigir Contrato</span>
          </button>
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
              placeholder="Pesquisar por anfitrião ou protocolo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-full border border-white/10 bg-stone-950 py-2.5 pl-12 pr-4 text-sm text-stone-200 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 transition-all"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-stone-950 px-4 py-2.5 text-sm text-stone-200 focus:border-amber-600 outline-none"
          >
            <option value="">Todos os status</option>
            <option value="signed">Assinados</option>
            <option value="pending">Pendentes</option>
            <option value="cancelled">Cancelados</option>
          </select>
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
                    {searchTerm || statusFilter ? 'Nenhum contrato encontrado' : 'Nenhum contrato cadastrado'}
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
                          <button 
                            onClick={() => exportContractToPDF(contract)}
                            title="Baixar PDF" 
                            className="p-2 text-stone-500 hover:text-amber-500 transition-all bg-stone-950 rounded-lg border border-white/5"
                          >
                            <Download size={18} />
                          </button>
                          {contract.status === 'pending' && (
                            <button 
                              onClick={() => updateStatus(contract.id, 'signed')}
                              title="Marcar como Assinado" 
                              className="p-2 text-stone-500 hover:text-green-500 transition-all bg-stone-950 rounded-lg border border-white/5"
                            >
                              <CheckCircle size={18} />
                            </button>
                          )}
                          <button 
                            onClick={() => deleteContract(contract.id, contract.clientName)}
                            title="Excluir" 
                            className="p-2 text-stone-500 hover:text-red-500 transition-all bg-stone-950 rounded-lg border border-white/5"
                          >
                            <Trash2 size={18} />
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
