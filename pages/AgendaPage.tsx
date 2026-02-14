
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
    { id: 1, time: '10:00', client: 'Juliana Mendes', service: 'Visita Técnica', status: 'confirmado' },
    { id: 2, time: '14:30', client: 'Maria Oliveira', service: 'Degustação Buffet', status: 'pendente' },
    { id: 3, time: '16:00', client: 'Bia Santos', service: 'Reunião Decoração', status: 'concluido' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-serif text-3xl font-bold text-stone-100">Agenda de Eventos</h2>
          <p className="text-stone-500">Controle de datas, visitas e montagens.</p>
        </div>
        <button className="flex items-center justify-center space-x-2 rounded-lg bg-amber-600 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-amber-700 shadow-xl shadow-amber-900/20 transition-all">
          <Plus size={18} />
          <span>Novo Agendamento</span>
        </button>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Date Selection Panel */}
        <div className="w-full shrink-0 lg:w-80">
          <div className="rounded-xl border border-white/5 bg-stone-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-bold text-stone-100">Novembro 2024</h3>
              <div className="flex space-x-1">
                <button className="rounded p-1 hover:bg-stone-800 text-stone-400"><ChevronLeft size={16} /></button>
                <button className="rounded p-1 hover:bg-stone-800 text-stone-400"><ChevronRight size={16} /></button>
              </div>
            </div>
            {/* Simple Mock Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-widest">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
                <div key={d} className="py-2 text-stone-600">{d}</div>
              ))}
              {Array.from({ length: 30 }).map((_, i) => (
                <button 
                  key={i} 
                  className={`aspect-square rounded-lg flex items-center justify-center transition-all ${
                    i + 1 === 15 ? 'bg-amber-600 text-white shadow-lg' : 'text-stone-400 hover:bg-stone-800'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="mt-10 space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Status</h4>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 text-sm text-stone-400 hover:text-stone-200 cursor-pointer">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  <span>Visitas Marcadas</span>
                </label>
                <label className="flex items-center space-x-3 text-sm text-stone-400 hover:text-stone-200 cursor-pointer">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span>Montagens</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline View */}
        <div className="flex-1 rounded-xl border border-white/5 bg-stone-900 shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-stone-900/50">
            <div className="flex items-center space-x-3">
              <CalendarIcon size={20} className="text-amber-600" />
              <span className="font-bold text-stone-100">Quarta-feira, 15 de Outubro</span>
            </div>
            <button className="p-2 hover:bg-stone-800 rounded-full text-stone-500">
              <Filter size={18} />
            </button>
          </div>
          <div className="relative h-[600px] overflow-y-auto p-6 scrollbar-hide">
            <div className="space-y-4">
              {hours.map((hour) => {
                const app = appointments.find(a => a.time === hour);
                return (
                  <div key={hour} className="flex group">
                    <div className="w-16 shrink-0 py-2 text-[10px] font-bold text-stone-600 uppercase tracking-widest">
                      {hour}
                    </div>
                    <div className="flex-1 border-l border-white/5 pl-8 py-1 relative">
                      {app ? (
                        <div className={`rounded-xl border border-white/5 p-4 shadow-xl transition-all hover:scale-[1.01] ${
                          app.status === 'confirmado' ? 'bg-stone-800/50 border-l-4 border-l-amber-600' :
                          app.status === 'pendente' ? 'bg-stone-800/30 border-l-4 border-l-stone-600' :
                          'bg-stone-950 border-l-4 border-l-stone-800 opacity-50'
                        }`}>
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-stone-100">{app.client}</h4>
                            <span className={`text-[9px] font-bold uppercase tracking-[0.2em] px-2 py-1 rounded-full ${
                              app.status === 'confirmado' ? 'bg-amber-600/20 text-amber-500' : 'bg-stone-700 text-stone-400'
                            }`}>{app.status}</span>
                          </div>
                          <p className="text-xs text-stone-500 mt-2 font-medium">{app.service}</p>
                        </div>
                      ) : (
                        <button className="w-full h-10 rounded-xl border border-dashed border-white/5 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-stone-600 hover:text-amber-500 hover:bg-white/5 transition-all">
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
