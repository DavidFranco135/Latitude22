import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Download, Plus, Search, X } from 'lucide-react';
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  category: string;
  createdAt?: any;
  appointmentId?: string;
}

interface Appointment {
  id: string;
  time: string;
  client: string;
  clientId?: string;
  service: string;
  status: 'confirmado' | 'pendente' | 'concluido' | 'cancelado' | 'pago';
  date: string;
  notes?: string;
  createdAt?: any;
  totalValue?: number;
  depositValue?: number;
  remainingValue?: number;
  paymentDate?: string;
}

const FinancialPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'income' | 'expense' | 'balance' | 'receivable'>('balance');
  
  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    type: 'income' as 'income' | 'expense',
    date: new Date().toISOString().split('T')[0],
    category: 'Evento'
  });

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

  // Listener para agendamentos (para calcular valores a receber)
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'appointments'),
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
        setAppointments(items);
      },
      (error) => console.error('Erro ao carregar agendamentos:', error)
    );
    return () => unsubscribe();
  }, []);

  const filteredTransactions = transactions.filter(t => {
    const tDate = new Date(t.date);
    const matchesMonth = filterMonth ? (tDate.getMonth() + 1) === parseInt(filterMonth) : true;
    const matchesYear = filterYear ? tDate.getFullYear() === parseInt(filterYear) : true;
    const matchesSearch = searchTerm ? 
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase()) : true;
    
    return matchesMonth && matchesYear && matchesSearch;
  });

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  // Calcular valores a receber (agendamentos com saldo restante)
  const totalReceivable = appointments
    .filter(apt => apt.status !== 'cancelado' && apt.status !== 'pago')
    .reduce((sum, apt) => sum + (apt.remainingValue || 0), 0);

  const chartData = filteredTransactions.slice(0, 6).reverse().map(t => ({
    name: new Date(t.date).toLocaleDateString('pt-BR', { month: 'short' }),
    valor: t.type === 'income' ? t.amount : -t.amount
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleSave = async () => {
    try {
      if (!formData.description || formData.amount <= 0) {
        alert('Preencha todos os campos corretamente!');
        return;
      }

      console.log('💾 Salvando lançamento:', formData);
      await addDoc(collection(db, 'financial'), {
        ...formData,
        createdAt: new Date()
      });
      
      console.log('✅ Lançamento salvo!');
      setShowModal(false);
      setFormData({
        description: '',
        amount: 0,
        type: 'income',
        date: new Date().toISOString().split('T')[0],
        category: 'Evento'
      });
    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      alert('Erro ao salvar lançamento');
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('LATITUDE22', 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Relatório Financeiro', 105, 28, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    const filterText = [];
    if (filterMonth) filterText.push(`Mês: ${filterMonth}`);
    if (filterYear) filterText.push(`Ano: ${filterYear}`);
    if (filterText.length > 0) {
      doc.text(`Filtros: ${filterText.join(' | ')}`, 105, 35, { align: 'center' });
    }
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 105, 40, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO FINANCEIRO', 14, 50);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Receitas: ${formatCurrency(totalIncome)}`, 14, 58);
    doc.text(`Despesas: ${formatCurrency(totalExpense)}`, 14, 64);
    doc.setFont('helvetica', 'bold');
    doc.text(`Saldo: ${formatCurrency(balance)}`, 14, 70);
    
    const tableData = filteredTransactions.map(t => [
      new Date(t.date).toLocaleDateString('pt-BR'),
      t.description,
      t.category,
      t.type === 'income' ? 'Entrada' : 'Saída',
      formatCurrency(t.amount)
    ]);
    
    autoTable(doc, {
      startY: 80,
      head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [217, 119, 6], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 60 },
        2: { cellWidth: 35 },
        3: { cellWidth: 25 },
        4: { cellWidth: 35, halign: 'right' }
      },
      styles: { fontSize: 9 }
    });
    
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Página ${i} de ${pageCount}`, 105, 285, { align: 'center' });
      doc.text('© Latitude22 - Sistema de Gestão', 105, 290, { align: 'center' });
    }
    
    doc.save(`relatorio-financeiro-${new Date().getTime()}.pdf`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="font-serif text-4xl font-bold text-stone-100">Tesouraria Latitude22</h2>
          <p className="text-stone-500 mt-2">Gestão financeira de alta precisão para o Salão.</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={exportToPDF}
            className="flex items-center space-x-2 px-6 py-3 rounded-xl border border-white/10 bg-stone-900 text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-amber-500 hover:border-amber-500/30 transition-all"
          >
            <Download size={16} />
            <span>Exportar PDF</span>
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="px-8 py-3 rounded-xl bg-amber-600 text-white text-xs font-bold uppercase tracking-widest shadow-xl shadow-amber-900/20 hover:bg-amber-700 transition-all flex items-center space-x-2"
          >
            <Plus size={18} />
            <span>Lançamento Rápido</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-xl border border-white/5 bg-stone-900 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600" />
            <input
              type="text"
              placeholder="Buscar por descrição ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-stone-950 py-2.5 pl-10 pr-4 text-sm text-stone-200 focus:border-amber-600 focus:outline-none"
            />
          </div>
          
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="rounded-lg border border-white/10 bg-stone-950 px-4 py-2.5 text-sm text-stone-200 focus:border-amber-600 outline-none"
          >
            <option value="">Todos os meses</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2024, i).toLocaleDateString('pt-BR', { month: 'long' })}
              </option>
            ))}
          </select>

          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="rounded-lg border border-white/10 bg-stone-950 px-4 py-2.5 text-sm text-stone-200 focus:border-amber-600 outline-none"
          >
            <option value="">Todos os anos</option>
            {[2023, 2024, 2025, 2026].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          {(filterMonth || filterYear || searchTerm) && (
            <button
              onClick={() => {
                setFilterMonth('');
                setFilterYear('');
                setSearchTerm('');
              }}
              className="px-4 py-2.5 rounded-lg border border-white/10 bg-stone-950 text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-amber-500 transition-all"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <button 
          onClick={() => setActiveTab('income')}
          className={`rounded-2xl border border-white/5 bg-stone-900 p-8 border-l-4 border-l-green-600 bg-green-600/5 text-left transition-all hover:bg-green-600/10 ${activeTab === 'income' ? 'ring-2 ring-green-600' : ''}`}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-green-600/80">Receitas Totais</p>
          <h4 className="text-3xl font-bold text-green-500 mt-2">{formatCurrency(totalIncome)}</h4>
          <div className="mt-4 flex items-center text-green-600 text-xs font-bold uppercase tracking-widest">
            <TrendingUp size={14} className="mr-1" /> Entradas
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('expense')}
          className={`rounded-2xl border border-white/5 bg-stone-900 p-8 border-l-4 border-l-red-600 bg-red-600/5 text-left transition-all hover:bg-red-600/10 ${activeTab === 'expense' ? 'ring-2 ring-red-600' : ''}`}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-red-600/80">Despesas Totais</p>
          <h4 className="text-3xl font-bold text-red-500 mt-2">{formatCurrency(totalExpense)}</h4>
          <div className="mt-4 flex items-center text-red-600 text-xs font-bold uppercase tracking-widest">
            <TrendingDown size={14} className="mr-1" /> Saídas
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('balance')}
          className={`rounded-2xl border border-white/5 bg-stone-900 p-8 border-l-4 border-l-amber-600 bg-amber-600/5 text-left transition-all hover:bg-amber-600/10 ${activeTab === 'balance' ? 'ring-2 ring-amber-600' : ''}`}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-amber-600/80">Saldo Consolidado</p>
          <h4 className="text-3xl font-bold text-amber-500 mt-2">{formatCurrency(balance)}</h4>
          <div className="mt-4 flex items-center text-amber-600 text-xs font-bold uppercase tracking-widest">
            Liquidez Imediata
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('receivable')}
          className={`rounded-2xl border border-white/5 bg-stone-900 p-8 border-l-4 border-l-blue-600 bg-blue-600/5 text-left transition-all hover:bg-blue-600/10 ${activeTab === 'receivable' ? 'ring-2 ring-blue-600' : ''}`}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600/80">A Receber</p>
          <h4 className="text-3xl font-bold text-blue-500 mt-2">{formatCurrency(totalReceivable)}</h4>
          <div className="mt-4 flex items-center text-blue-600 text-xs font-bold uppercase tracking-widest">
            Valores Pendentes
          </div>
        </button>
      </div>

      {/* Gráficos */}
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
                  <Tooltip cursor={{fill: 'rgba(255,255,255,0.02)'}} contentStyle={{backgroundColor: '#0c0a09', border: '1px solid #292524', borderRadius: '8px'}} formatter={(value: any) => formatCurrency(value)} />
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
              Nenhum lançamento no período filtrado
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/5 bg-stone-900 overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-stone-100 font-bold">
              {activeTab === 'income' && 'Receitas'}
              {activeTab === 'expense' && 'Despesas'}
              {activeTab === 'balance' && 'Todos Lançamentos'}
              {activeTab === 'receivable' && 'A Receber'}
            </h3>
            <span className="text-xs text-stone-500 font-bold uppercase tracking-widest">
              {activeTab === 'receivable' 
                ? `${appointments.filter(apt => apt.status !== 'cancelado' && apt.status !== 'pago' && apt.remainingValue > 0).length} itens`
                : `${activeTab === 'income' 
                    ? filteredTransactions.filter(t => t.type === 'income').length 
                    : activeTab === 'expense' 
                    ? filteredTransactions.filter(t => t.type === 'expense').length 
                    : filteredTransactions.length} itens`
              }
            </span>
          </div>
          <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
            {activeTab === 'receivable' ? (
              // Lista de agendamentos com valores a receber
              appointments
                .filter(apt => apt.status !== 'cancelado' && apt.status !== 'pago' && apt.remainingValue > 0)
                .length === 0 ? (
                <div className="p-8 text-center text-stone-600">
                  Nenhum valor a receber
                </div>
              ) : (
                appointments
                  .filter(apt => apt.status !== 'cancelado' && apt.status !== 'pago' && apt.remainingValue > 0)
                  .map((appointment) => (
                    <div key={appointment.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-all">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 rounded bg-blue-500/10 text-blue-500">
                          <DollarSign size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-stone-200">{appointment.client}</p>
                          <p className="text-xs text-stone-600 font-medium">
                            {new Date(appointment.date).toLocaleDateString('pt-BR')} • {appointment.service}
                          </p>
                          <p className="text-xs text-stone-500 mt-1">
                            Total: {formatCurrency(appointment.totalValue || 0)} | Entrada: {formatCurrency(appointment.depositValue || 0)}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-blue-500">
                        {formatCurrency(appointment.remainingValue || 0)}
                      </p>
                    </div>
                  ))
              )
            ) : (
              // Lista de transações filtradas por tipo
              (activeTab === 'balance' 
                ? filteredTransactions 
                : filteredTransactions.filter(t => t.type === activeTab)
              ).length === 0 ? (
                <div className="p-8 text-center text-stone-600">
                  Nenhum lançamento encontrado
                </div>
              ) : (
                (activeTab === 'balance' 
                  ? filteredTransactions 
                  : filteredTransactions.filter(t => t.type === activeTab)
                ).slice(0, 10).map((transaction) => (
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
              )
            )}
          </div>
        </div>
      </div>

      {/* Modal de Lançamento */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-stone-900 rounded-2xl border border-white/10 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-stone-100">Novo Lançamento</h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-stone-800 text-stone-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Descrição</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full rounded-lg border border-white/10 bg-stone-950 px-4 py-2.5 text-sm text-stone-200 focus:border-amber-600 focus:outline-none"
                  placeholder="Ex: Festa de Casamento"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Valor (R$)</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                  className="w-full rounded-lg border border-white/10 bg-stone-950 px-4 py-2.5 text-sm text-stone-200 focus:border-amber-600 focus:outline-none"
                  placeholder="0,00"
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Tipo</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setFormData({...formData, type: 'income'})}
                    className={`py-3 rounded-lg border font-bold text-xs uppercase tracking-widest transition-all ${
                      formData.type === 'income'
                        ? 'bg-green-600/10 border-green-600 text-green-500'
                        : 'border-white/10 text-stone-500 hover:border-white/20'
                    }`}
                  >
                    Entrada
                  </button>
                  <button
                    onClick={() => setFormData({...formData, type: 'expense'})}
                    className={`py-3 rounded-lg border font-bold text-xs uppercase tracking-widest transition-all ${
                      formData.type === 'expense'
                        ? 'bg-red-600/10 border-red-600 text-red-500'
                        : 'border-white/10 text-stone-500 hover:border-white/20'
                    }`}
                  >
                    Saída
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Data</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full rounded-lg border border-white/10 bg-stone-950 px-4 py-2.5 text-sm text-stone-200 focus:border-amber-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2 block">Categoria</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full rounded-lg border border-white/10 bg-stone-950 px-4 py-2.5 text-sm text-stone-200 focus:border-amber-600 focus:outline-none"
                >
                  <option value="Evento">Evento</option>
                  <option value="Reserva">Reserva/Entrada</option>
                  <option value="Fornecedor">Fornecedor</option>
                  <option value="Equipe">Equipe</option>
                  <option value="Infraestrutura">Infraestrutura</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-stone-500 hover:text-white hover:border-white/20 text-xs font-bold uppercase tracking-widest transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 rounded-xl bg-amber-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-amber-700 transition-all"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialPage;
