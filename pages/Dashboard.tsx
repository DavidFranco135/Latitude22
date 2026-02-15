import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { CalendarCheck, Users, DollarSign, Clock, Sparkles, ArrowRight, FileText } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';

interface DashboardData {
  totalAppointments: number;
  totalClients: number;
  totalRevenue: number;
  pendingBudgets: number;
  recentClients: any[];
  monthlyData: any[];
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData>({
    totalAppointments: 0,
    totalClients: 0,
    totalRevenue: 0,
    pendingBudgets: 0,
    recentClients: [],
    monthlyData: []
  });

  useEffect(() => {
    // Carregar agendamentos
    const unsubAppointments = onSnapshot(collection(db, 'appointments'), (snapshot) => {
      const appointments = snapshot.docs.map(doc => doc.data());
      const confirmed = appointments.filter((a: any) => a.status === 'confirmado').length;
      setData(prev => ({ ...prev, totalAppointments: confirmed }));
    });

    // Carregar clientes
    const unsubClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
      const clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const recentClients = clients.slice(0, 4);
      setData(prev => ({ 
        ...prev, 
        totalClients: clients.length,
        recentClients: recentClients
      }));
    });

    // Carregar orçamentos pendentes
    const qBudgets = query(collection(db, 'budgets'), where('status', '==', 'pending'));
    const unsubBudgets = onSnapshot(qBudgets, (snapshot) => {
      setData(prev => ({ ...prev, pendingBudgets: snapshot.docs.length }));
    });

    // Carregar dados financeiros
    const unsubFinancial = onSnapshot(collection(db, 'financial'), (snapshot) => {
      const transactions = snapshot.docs.map(doc => doc.data());
      const income = transactions
        .filter((t: any) => t.type === 'income')
        .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
      
      // Agrupar por mês
      const monthlyRevenue: { [key: string]: number } = {};
      transactions.forEach((t: any) => {
        if (t.type === 'income' && t.date) {
          const date = new Date(t.date);
          const monthKey = `${date.getMonth() + 1}/${date.getFullYear()}`;
          monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + t.amount;
        }
      });

      // Converter para formato do gráfico
      const monthlyData = Object.entries(monthlyRevenue)
        .slice(-6)
        .map(([month, value]) => ({
          name: month.split('/')[0],
          faturamento: value
        }));

      setData(prev => ({ 
        ...prev, 
        totalRevenue: income,
        monthlyData: monthlyData.length > 0 ? monthlyData : [
          { name: 'Jan', faturamento: 0 },
          { name: 'Fev', faturamento: 0 },
          { name: 'Mar', faturamento: 0 },
          { name: 'Abr', faturamento: 0 },
          { name: 'Mai', faturamento: 0 },
          { name: 'Jun', faturamento: 0 }
        ]
      }));
    });

    return () => {
      unsubAppointments();
      unsubClients();
      unsubBudgets();
      unsubFinancial();
    };
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-amber-600 mb-2">
            <Sparkles size={16} />
            <span className="text-[10px] font-bold uppercase tracking-[0.4em]">Visão Estratégica</span>
          </div>
          <h2 className="font-serif text-4xl font-bold text-stone-100 tracking-tight">Status Latitude22</h2>
        </div>
        <div className="bg-stone-900 border border-white/5 rounded-full px-6 py-2 flex items-center space-x-3">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Banco de Dados Sincronizado</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <button 
          onClick={() => navigate('/agenda')}
          className="glass p-8 rounded-2xl group hover:border-amber-600/30 transition-all cursor-pointer text-left"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 rounded-xl bg-stone-950 border border-white/5 text-amber-500">
              <CalendarCheck />
            </div>
            <span className="text-[10px] font-bold text-green-500">Ativos</span>
          </div>
          <div className="mt-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">Eventos Confirmados</p>
            <h4 className="text-3xl font-bold text-white mt-1">{data.totalAppointments}</h4>
          </div>
        </button>

        <button 
          onClick={() => navigate('/orcamentos')}
          className="glass p-8 rounded-2xl group hover:border-amber-600/30 transition-all cursor-pointer text-left"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 rounded-xl bg-stone-950 border border-white/5 text-stone-400">
              <FileText />
            </div>
            <span className="text-[10px] font-bold text-amber-500">{data.pendingBudgets} Novos</span>
          </div>
          <div className="mt-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">Leads & Propostas</p>
            <h4 className="text-3xl font-bold text-white mt-1">{data.pendingBudgets}</h4>
          </div>
        </button>

        <button 
          onClick={() => navigate('/financeiro')}
          className="glass p-8 rounded-2xl group hover:border-amber-600/30 transition-all cursor-pointer text-left"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 rounded-xl bg-stone-950 border border-white/5 text-green-500">
              <DollarSign />
            </div>
            <span className="text-[10px] font-bold text-stone-500">Total</span>
          </div>
          <div className="mt-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">Receita Total</p>
            <h4 className="text-3xl font-bold text-white mt-1">{formatCurrency(data.totalRevenue)}</h4>
          </div>
        </button>

        <button 
          onClick={() => navigate('/clientes')}
          className="glass p-8 rounded-2xl group hover:border-amber-600/30 transition-all cursor-pointer text-left"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 rounded-xl bg-stone-950 border border-white/5 text-amber-500">
              <Users />
            </div>
            <span className="text-[10px] font-bold text-stone-500">Base</span>
          </div>
          <div className="mt-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">Total de Clientes</p>
            <h4 className="text-3xl font-bold text-white mt-1">{data.totalClients}</h4>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 glass p-8 rounded-2xl">
          <h3 className="text-stone-100 font-bold mb-8 flex items-center justify-between">
            Faturamento Mensal
            <span className="text-[10px] text-stone-500 font-normal">ÚLTIMOS 6 MESES</span>
          </h3>
          <div className="h-72 w-full">
            {data.monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.monthlyData}>
                  <defs>
                    <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d97706" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#44403c" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="#44403c" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ background: '#0c0a09', border: '1px solid #292524', color: '#e7e5e4', borderRadius: '8px' }}
                    formatter={(value: any) => formatCurrency(value)}
                  />
                  <Area type="monotone" dataKey="faturamento" stroke="#d97706" strokeWidth={3} fill="url(#goldGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-stone-600">
                Nenhum dado financeiro disponível
              </div>
            )}
          </div>
        </div>

        <div className="glass p-8 rounded-2xl">
          <h3 className="text-stone-100 font-bold mb-8">Últimos Clientes</h3>
          <div className="space-y-6">
            {data.recentClients.length > 0 ? (
              data.recentClients.map((client: any, index) => (
                <button
                  key={client.id || index}
                  onClick={() => navigate('/clientes')}
                  className="flex items-center justify-between group cursor-pointer w-full"
                >
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-amber-600/10 flex items-center justify-center text-amber-500 border border-amber-600/20">
                      <Users size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-stone-200 uppercase tracking-tight">{client.name}</p>
                      <p className="text-[10px] text-stone-500 font-medium">
                        {client.lastEvent || 'Novo Cliente'}
                      </p>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-stone-700 group-hover:text-amber-500 transition-all group-hover:translate-x-1" />
                </button>
              ))
            ) : (
              <div className="text-center py-8 text-stone-600">
                <Users size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">Nenhum cliente cadastrado</p>
              </div>
            )}
          </div>
          
          {data.recentClients.length > 0 && (
            <button
              onClick={() => navigate('/clientes')}
              className="mt-8 w-full py-3 rounded-lg border border-white/5 text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-amber-500 hover:border-amber-500/30 transition-all"
            >
              Ver Todos os Clientes
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
