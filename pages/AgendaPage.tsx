
import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, Plus, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

const AgendaPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const hours = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', 
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', 
    '18:00', '18:30', '19:00', '19:30'
  ];

  const appointments = [
    { id: 1, time: '10:00', client: 'Juliana Mendes', service: 'Coloração', status: 'confirmado' },
    { id: 2, time: '14:30', client: 'Maria Oliveira', service: 'Corte', status: 'pendente' },
    { id: 3, time: '16:00', client: 'Bia Santos', service: 'Tratamento', status: 'concluido' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-serif text-3xl font-bold text-stone-900">Agenda</h2>
          <p className="text-stone-500">Gerencie horários e disponibilidades.</p>
        </div>
        <button className="flex items-center justify-center space-x-2 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-bold uppercase tracking-widest text-white hover:bg-stone-800">
          <Plus size={18} />
          <span>Novo Agendamento</span>
        </button>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Date Selection Panel */}
        <div className="w-full shrink-0 lg:w-80">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-stone-800">Calendário</h3>
              <div className="flex space-x-1">
                <button className="rounded p-1 hover:bg-stone-100"><ChevronLeft size={16} /></button>
                <button className="rounded p-1 hover:bg-stone-100"><ChevronRight size={16} /></button>
              </div>
            </div>
            {/* Simple Mock Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
                <div key={d} className="py-2 font-bold text-stone-400">{d}</div>
              ))}
              {Array.from({ length: 31 }).map((_, i) => (
                <button 
                  key={i} 
                  className={`aspect-square rounded-full flex items-center justify-center transition-colors ${
                    i + 1 === 15 ? 'bg-stone-900 text-white' : 'hover:bg-stone-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="mt-8 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400">Filtros</h4>
              <div className="space-y-2">
                <label className="flex items-center space-x-3 text-sm">
                  <input type="checkbox" className="rounded text-stone-900 focus:ring-stone-900" defaultChecked />
                  <span>Todos Colaboradores</span>
                </label>
                <label className="flex items-center space-x-3 text-sm">
                  <input type="checkbox" className="rounded text-stone-900 focus:ring-stone-900" />
                  <span>Corte</span>
                </label>
                <label className="flex items-center space-x-3 text-sm">
                  <input type="checkbox" className="rounded text-stone-900 focus:ring-stone-900" />
                  <span>Coloração</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline View */}
        <div className="flex-1 rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="p-6 border-b flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CalendarIcon size={20} className="text-stone-400" />
              <span className="font-bold text-stone-800">Quarta-feira, 15 de Outubro</span>
            </div>
            <button className="p-2 hover:bg-stone-50 rounded-full text-stone-400">
              <Filter size={18} />
            </button>
          </div>
          <div className="relative h-[600px] overflow-y-auto p-6">
            <div className="space-y-4">
              {hours.map((hour) => {
                const app = appointments.find(a => a.time === hour);
                return (
                  <div key={hour} className="flex group">
                    <div className="w-16 shrink-0 py-2 text-xs font-bold text-stone-400">
                      {hour}
                    </div>
                    <div className="flex-1 border-l-2 border-stone-100 pl-6 py-1 relative">
                      {app ? (
                        <div className={`rounded-lg border-l-4 p-3 shadow-sm transition-transform hover:scale-[1.01] ${
                          app.status === 'confirmado' ? 'bg-blue-50 border-blue-500' :
                          app.status === 'pendente' ? 'bg-amber-50 border-amber-500' :
                          'bg-stone-50 border-stone-500'
                        }`}>
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-stone-900">{app.client}</h4>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{app.status}</span>
                          </div>
                          <p className="text-xs text-stone-500 mt-1">{app.service}</p>
                        </div>
                      ) : (
                        <button className="w-full h-8 rounded-lg border border-dashed border-stone-200 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs text-stone-400 hover:bg-stone-50 transition-all">
                          Reservar horário
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgendaPage;
