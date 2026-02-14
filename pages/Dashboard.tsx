
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { CalendarCheck, Users, DollarSign, Clock, ChevronUp, Sparkles, ArrowRight } from 'lucide-react';

const data = [
  { name: 'Jan', faturamento: 45000, eventos: 12 },
  { name: 'Fev', faturamento: 38000, eventos: 10 },
  { name: 'Mar', faturamento: 52000, eventos: 15 },
  { name: 'Abr', faturamento: 61000, eventos: 18 },
  { name: 'Mai', faturamento: 49000, eventos: 14 },
  { name: 'Jun', faturamento: 72000, eventos: 22 },
];

const Dashboard: React.FC = () => {
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
        {[
          { label: 'Eventos Confirmados', value: '48', trend: '+12%', icon: <CalendarCheck />, color: 'text-amber-500' },
          { label: 'Leads & Propostas', value: '124', trend: '+5%', icon: <Users />, color: 'text-stone-400' },
          { label: 'Receita Prevista', value: 'R$ 184k', trend: '+20%', icon: <DollarSign />, color: 'text-green-500' },
          { label: 'Aguardando Assinatura', value: '09', trend: '-2', icon: <Clock />, color: 'text-amber-500' },
        ].map((stat, i) => (
          <div key={i} className="glass p-8 rounded-2xl group hover:border-amber-600/30 transition-all cursor-default">
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-xl bg-stone-950 border border-white/5 ${stat.color}`}>
                {stat.icon}
              </div>
              <span className="text-[10px] font-bold text-stone-500">{stat.trend}</span>
            </div>
            <div className="mt-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">{stat.label}</p>
              <h4 className="text-3xl font-bold text-white mt-1">{stat.value}</h4>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 glass p-8 rounded-2xl">
          <h3 className="text-stone-100 font-bold mb-8 flex items-center justify-between">
            Faturamento Mensal
            <span className="text-[10px] text-stone-500 font-normal">MÉDIA: R$ 56.000 / MÊS</span>
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#44403c" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#0c0a09', border: '1px solid #292524', color: '#e7e5e4' }} />
                <Area type="monotone" dataKey="faturamento" stroke="#d97706" strokeWidth={3} fill="url(#goldGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass p-8 rounded-2xl">
          <h3 className="text-stone-100 font-bold mb-8">Últimos Leads</h3>
          <div className="space-y-6">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-full bg-amber-600/10 flex items-center justify-center text-amber-500 border border-amber-600/20">
                    <Users size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-200 uppercase tracking-tight">Larissa Medeiros</p>
                    <p className="text-[10px] text-stone-500 font-medium">Casamento • Nov/2024</p>
                  </div>
                </div>
                <ArrowRight size={14} className="text-stone-700 group-hover:text-amber-500 transition-all group-hover:translate-x-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
