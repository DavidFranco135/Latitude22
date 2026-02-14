
import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  CalendarCheck, 
  Users, 
  DollarSign, 
  Clock, 
  ChevronUp, 
  ChevronDown,
  Sparkles
} from 'lucide-react';

const data = [
  { name: 'Jan', faturamento: 45000, eventos: 12 },
  { name: 'Fev', faturamento: 38000, eventos: 10 },
  { name: 'Mar', faturamento: 52000, eventos: 15 },
  { name: 'Abr', faturamento: 61000, eventos: 18 },
  { name: 'Mai', faturamento: 49000, eventos: 14 },
  { name: 'Jun', faturamento: 72000, eventos: 22 },
  { name: 'Jul', faturamento: 84000, eventos: 25 },
];

const StatCard = ({ title, value, sub, icon, trend, color }: any) => (
  <div className="rounded-2xl border border-white/5 bg-stone-900 p-7 shadow-xl transition-all hover:shadow-amber-900/10 hover:-translate-y-1">
    <div className="flex items-center justify-between">
      <div className={`rounded-xl p-3.5 ${color || 'bg-stone-800 text-amber-500'}`}>
        {icon}
      </div>
      {trend && (
        <span className={`flex items-center text-[10px] font-bold px-2 py-1 rounded-full ${trend > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
          {trend > 0 ? <ChevronUp size={12} className="mr-0.5" /> : <ChevronDown size={12} className="mr-0.5" />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div className="mt-6">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">{title}</h3>
      <p className="mt-1 text-2xl font-bold text-stone-100">{value}</p>
      <p className="mt-1.5 text-xs text-stone-600 font-medium">{sub}</p>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-amber-600 mb-1">
            <Sparkles size={16} />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Gestão Latitude22</span>
          </div>
          <h2 className="font-serif text-4xl font-bold text-stone-100 tracking-tight">Status do Buffet</h2>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-stone-400 bg-stone-900 border border-white/5 px-4 py-2.5 rounded-lg shadow-lg">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>Sistema Online</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Eventos Agendados" 
          value="48" 
          sub="Próximos 90 dias" 
          icon={<CalendarCheck size={20} />} 
          trend={18}
          color="bg-amber-600 text-white" 
        />
        <StatCard 
          title="Leads de Clientes" 
          value="124" 
          sub="Novas solicitações" 
          icon={<Users size={20} />} 
          trend={5.4} 
        />
        <StatCard 
          title="Faturamento Bruto" 
          value="R$ 184.200" 
          sub="Previsão mensal" 
          icon={<DollarSign size={20} />} 
          trend={12.1}
        />
        <StatCard 
          title="Contratos Pendentes" 
          value="09" 
          sub="Aguardando assinatura" 
          icon={<Clock size={20} />} 
          color="bg-stone-800 text-stone-400"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/5 bg-stone-900 p-8 shadow-2xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-stone-100">Performance de Vendas</h3>
              <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Faturamento real vs metas</p>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1c1917" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#78716c', fontWeight: 600}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#78716c'}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1c1917', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)', padding: '12px' }} 
                />
                <Area type="monotone" dataKey="faturamento" stroke="#d97706" strokeWidth={3} fillOpacity={1} fill="url(#colorFat)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-stone-900 p-8 shadow-2xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-stone-100">Demanda de Espaço</h3>
              <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Volume de eventos por mês</p>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1c1917" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#78716c', fontWeight: 600}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#78716c'}} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#1c1917', borderRadius: '12px', border: 'none' }} />
                <Bar dataKey="eventos" fill="#78716c" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-stone-900 shadow-2xl overflow-hidden">
        <div className="p-7 border-b border-white/5 flex items-center justify-between bg-stone-900/50">
          <h3 className="font-bold text-stone-100">Próximas Visitas Técnicas</h3>
          <button className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600 hover:text-amber-500 transition-colors">Relatório Completo</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-stone-950 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">
              <tr>
                <th className="px-8 py-5">Anfitrião</th>
                <th className="px-8 py-5">Tipo de Evento</th>
                <th className="px-8 py-5">Horário Marcado</th>
                <th className="px-8 py-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {[
                { name: 'Ricardo & Helena', type: 'Casamento Classic', time: 'Amanhã, 10:00', status: 'Confirmado' },
                { name: 'Empresa Alpha Tech', type: 'Festa de Final de Ano', time: 'Sexta, 15:30', status: 'Pendente' },
                { name: 'Bruna Oliveira', type: '15 Anos Garden', time: 'Sábado, 09:00', status: 'Finalizado' },
              ].map((item, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="px-8 py-5 font-bold text-stone-200">{item.name}</td>
                  <td className="px-8 py-5 text-stone-400 font-medium">{item.type}</td>
                  <td className="px-8 py-5 text-stone-400 font-medium">{item.time}</td>
                  <td className="px-8 py-5">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                      item.status === 'Confirmado' ? 'bg-green-500/10 text-green-500' :
                      item.status === 'Pendente' ? 'bg-amber-500/10 text-amber-500' :
                      'bg-stone-800 text-stone-400'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
