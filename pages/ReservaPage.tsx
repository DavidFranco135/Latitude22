import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, AlertCircle, Loader, CheckCircle,
  MessageCircle, FileText, Calendar, Trash2, Plus, Send, Star
} from 'lucide-react';
import {
  getReservaConfig, calcularTipoDiaria, calcularValor, calcularDias,
  isFeriado, getFeriado,
  getDatasOcupadas, getReservaPorToken, criarReservaRascunho
} from '../services/reservas';
import { gerarComprovantePDF } from '../services/pdf';
import { ReservaConfig, ReservaStatus, TipoDiaria, Reserva } from '../types';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const fmtDate = (str: string) => {
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
};

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

type Step = 'calendario' | 'formulario' | 'solicitado';

interface DiaSelecionado {
  dateStr: string;
  tipoDiaria: TipoDiaria;
  valor: number;
}

const ReservaPage: React.FC = () => {
  const { token }  = useParams<{ token?: string }>();
  const navigate   = useNavigate();

  const [config, setConfig]           = useState<ReservaConfig | null>(null);
  const [datasOcupadas, setDatasOcup] = useState<string[]>([]);
  const [step, setStep]               = useState<Step>('calendario');
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');

  const [diasSelecionados, setDiasSelecionados] = useState<DiaSelecionado[]>([]);

  const today = new Date();
  const [calYear,  setCalYear]  = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const [form, setForm] = useState({
    nome: '', cpfCnpj: '', telefone: '',
    email: '', tipoEvento: '', numConvidados: ''
  });

  const [reservaCriada, setReservaCriada] = useState<Reserva | null>(null);

  const valorTotal   = diasSelecionados.reduce((s, d) => s + d.valor, 0);
  const valorReserva = config ? Math.ceil(valorTotal * config.percentualReserva / 100) : 0;

  useEffect(() => {
    const init = async () => {
      try {
        const [cfg, ocupadas] = await Promise.all([getReservaConfig(), getDatasOcupadas()]);
        setConfig(cfg);
        setDatasOcup(ocupadas);

        if (token) {
          const r = await getReservaPorToken(token);
          if (r) {
            setReservaCriada(r);
            setDiasSelecionados([{ dateStr: r.data, tipoDiaria: r.tipoDiaria, valor: r.valorTotal }]);
            setForm({
              nome: r.clienteNome, cpfCnpj: r.clienteCpfCnpj,
              telefone: r.clienteTelefone, email: r.clienteEmail,
              tipoEvento: r.tipoEvento, numConvidados: String(r.numConvidados)
            });
            setStep('solicitado');
          }
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [token]);

  const toggleData = useCallback((dateStr: string) => {
    if (!config) return;
    setDiasSelecionados(prev => {
      const exists = prev.find(d => d.dateStr === dateStr);
      // Adiciona ou remove a data, mantendo ordenado
      const novasDatas = exists
        ? prev.filter(d => d.dateStr !== dateStr).map(d => d.dateStr)
        : [...prev.map(d => d.dateStr), dateStr].sort();
      // Recalcula todos os dias com a lógica de pacote (Sex+Sáb+Dom)
      return calcularDias(novasDatas, config);
    });
  }, [config]);

  const removerDia = (dateStr: string) => {
    if (!config) return;
    setDiasSelecionados(prev => {
      const novasDatas = prev.filter(d => d.dateStr !== dateStr).map(d => d.dateStr);
      return calcularDias(novasDatas, config);
    });
  };

  // Monta a mensagem do WhatsApp para o admin
  const montarMsgWhatsApp = (tipo: 'reserva' | 'total', reserva: Reserva) => {
    const valorCobrar = tipo === 'reserva' ? reserva.valorReserva : reserva.valorTotal;
    const linhasDatas = (Array.isArray((reserva as any).datas) ? (reserva as any).datas : [reserva.data])
      .map((d: string) => `• ${fmtDate(d)}`)
      .join('\n');

    return (
      `🎉 *Nova Solicitação de Reserva*\n\n` +
      `👤 *Cliente:* ${reserva.clienteNome}\n` +
      `📞 *Telefone:* ${reserva.clienteTelefone}\n` +
      `✉️ *E-mail:* ${reserva.clienteEmail}\n` +
      `🎊 *Evento:* ${reserva.tipoEvento}\n` +
      `👥 *Convidados:* ${reserva.numConvidados}\n\n` +
      `📅 *Data(s) solicitada(s):*\n${linhasDatas}\n\n` +
      `💰 *Valor total:* ${fmt(reserva.valorTotal)}\n` +
      `${tipo === 'reserva'
        ? `✅ *Opção escolhida: RESERVA (${reserva.percentualReserva}%)*\n💵 *Valor a cobrar: ${fmt(valorCobrar)}*`
        : `✅ *Opção escolhida: PAGAMENTO TOTAL*\n💵 *Valor a cobrar: ${fmt(valorCobrar)}*`
      }\n\n` +
      `🔑 *Token:* ${reserva.token}\n` +
      `🔗 Link: ${window.location.origin}/#/reserva/${reserva.token}`
    );
  };

  // Passo 2 → cria rascunho e vai para solicitado
  const handleSubmit = async (tipo: 'reserva' | 'total') => {
    if (!config) return;
    const { nome, cpfCnpj, telefone, email, tipoEvento, numConvidados } = form;
    if (!nome || !cpfCnpj || !telefone || !email || !tipoEvento || !numConvidados) {
      setError('Preencha todos os campos obrigatórios.'); return;
    }
    setSubmitting(true); setError('');
    try {
      const r = await criarReservaRascunho(diasSelecionados, config, {
        nome, cpfCnpj, telefone, email,
        tipoEvento, numConvidados: Number(numConvidados),
        tipoPagamentoSolicitado: tipo   // salva o que o cliente escolheu
      });
      setReservaCriada(r);
      setStep('solicitado');

      // Abre WhatsApp do admin automaticamente com a mensagem pré-preenchida
      const msg = montarMsgWhatsApp(tipo, r);
      const wpp = config.whatsappLink?.replace('https://wa.me/', '') || '';
      if (wpp) {
        setTimeout(() => {
          window.open(`https://wa.me/${wpp}?text=${encodeURIComponent(msg)}`, '_blank');
        }, 600);
      }
    } catch (e: any) {
      setError(e.message || 'Erro ao criar solicitação. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── CALENDÁRIO ─────────────────────────────────────────────────────────────
  const renderCalendario = () => {
    const firstDay    = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const cells: (number | null)[] = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
    ];
    const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); } else setCalMonth(m => m-1); };
    const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); } else setCalMonth(m => m+1); };

    return (
      <div className="space-y-5">
        <div className="glass p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white text-xl font-bold">‹</button>
            <h3 className="font-serif text-lg text-white font-bold">{MESES[calMonth]} {calYear}</h3>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white text-xl font-bold">›</button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {DIAS.map(d => <div key={d} className="text-center text-[9px] font-bold text-stone-600 uppercase py-1">{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const dateStr   = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const cellDate  = new Date(dateStr + 'T12:00:00');
              const isPast    = cellDate < today;
              const isOcup    = datasOcupadas.includes(dateStr);
              const isSel     = diasSelecionados.some(d => d.dateStr === dateStr);
              const dow       = cellDate.getDay();
              const isSex     = dow === 5;
              const isWE      = dow === 0 || dow === 6;  // Sáb ou Dom
              const isFer     = config ? isFeriado(dateStr, config) : false;
              const feriado   = config ? getFeriado(dateStr, config) : null;

              // Verifica se faz parte de pacote Sex+Sáb+Dom
              const isPartePacote = isSel && diasSelecionados.find(d => d.dateStr === dateStr)?.tipoDiaria === 'fimdesemana';

              let cls = 'aspect-square rounded-lg text-[13px] font-semibold transition-all flex flex-col items-center justify-center relative ';
              if (isPast)           cls += 'text-stone-800 cursor-not-allowed';
              else if (isOcup)      cls += 'bg-red-900/20 text-red-700 cursor-not-allowed line-through text-[11px]';
              else if (isSel && isPartePacote) cls += 'bg-purple-600 text-white ring-2 ring-purple-400 cursor-pointer scale-105';
              else if (isSel)       cls += 'bg-amber-600 text-white ring-2 ring-amber-400 cursor-pointer scale-105';
              else if (isFer)       cls += 'text-rose-400 bg-rose-900/20 hover:bg-rose-600/30 cursor-pointer border border-rose-800/30';
              else if (isSex)       cls += 'text-violet-400 hover:bg-violet-600/20 cursor-pointer';
              else if (isWE)        cls += 'text-amber-400 hover:bg-amber-600/20 cursor-pointer';
              else                  cls += 'text-stone-300 hover:bg-stone-800 cursor-pointer hover:text-white';

              return (
                <button key={i} disabled={isPast || isOcup} onClick={() => toggleData(dateStr)} className={cls} title={feriado ? feriado.nome : undefined}>
                  {day}
                  {isFer && !isPast && !isOcup && (
                    <Star size={6} className="absolute bottom-1 fill-rose-400 text-rose-400"/>
                  )}
                  {isSel && isPartePacote && !isFer && (
                    <span className="absolute bottom-0.5 text-[6px] text-purple-200 leading-none font-bold">PKG</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="mt-5 flex flex-wrap gap-3 text-[10px] text-stone-500 pt-4 border-t border-white/5">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-600 inline-block"/>Selecionado</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-600 inline-block"/>Pacote Sex+Sáb+Dom</span>
            <span className="flex items-center gap-1.5 text-rose-400"><span className="w-3 h-3 rounded bg-rose-900/30 border border-rose-800/40 inline-block"/>Feriado ★</span>
            <span className="flex items-center gap-1.5 text-violet-400"><span className="w-3 h-3 rounded bg-violet-600/20 inline-block"/>Sexta-feira</span>
            <span className="flex items-center gap-1.5 text-amber-500"><span className="w-3 h-3 rounded bg-amber-600/20 inline-block"/>Sáb / Dom</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-900/30 inline-block"/>Ocupado</span>
          </div>
        </div>

        {/* Tabela de preços */}
        {config && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest px-1">Tabela de preços</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Dia Útil',                 val: config.valorDiaUtil,       color: 'text-stone-300' },
                { label: 'Sexta-feira',              val: config.valorSexta ?? config.valorDiaUtil, color: 'text-violet-400' },
                { label: 'Sábado',                   val: config.valorSabado,        color: 'text-amber-500' },
                { label: 'Domingo',                  val: config.valorDomingo,       color: 'text-amber-500' },
                { label: 'Pacote Sex + Sáb + Dom',   val: config.valorFimDeSemana,   color: 'text-purple-400' },
                { label: 'Feriado',                  val: config.valorFeriado,       color: 'text-rose-400' },
              ].map(({ label, val, color }) => (
                <div key={label} className="glass rounded-xl p-3 border border-white/5">
                  <p className="text-[9px] text-stone-500 uppercase tracking-widest leading-tight">{label}</p>
                  <p className={`text-sm font-bold mt-0.5 ${color}`}>{fmt(val)}</p>
                </div>
              ))}
            </div>

            {/* Feriados deste mês */}
            {(() => {
              const feriadosMes = (config.feriados || []).filter(f => {
                const [fy, fm] = f.dateStr.split('-');
                return Number(fy) === calYear && Number(fm) - 1 === calMonth;
              });
              if (!feriadosMes.length) return null;
              return (
                <div className="glass rounded-xl p-3 border border-rose-800/20">
                  <p className="text-[9px] font-bold text-rose-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Star size={10} className="fill-rose-400"/>Feriados em {MESES[calMonth]}
                  </p>
                  <div className="space-y-1">
                    {feriadosMes.map(f => {
                      const [, , dd] = f.dateStr.split('-');
                      return (
                        <div key={f.dateStr} className="flex justify-between text-xs">
                          <span className="text-stone-400">dia {dd} · <span className="text-rose-300">{f.nome}</span></span>
                          <span className="text-rose-400 font-bold">{fmt(f.valor ?? config.valorFeriado)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Dias selecionados */}
        {diasSelecionados.length > 0 && (
          <div className="glass p-5 rounded-2xl border border-amber-600/20 space-y-3">
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
              <Calendar size={14} />{diasSelecionados.length} data{diasSelecionados.length > 1 ? 's' : ''} selecionada{diasSelecionados.length > 1 ? 's' : ''}
            </p>

            {/* Aviso de pacote ativo */}
            {diasSelecionados.some(d => d.tipoDiaria === 'fimdesemana') && (
              <div className="flex items-center gap-2 bg-purple-900/20 border border-purple-800/30 rounded-lg px-3 py-2">
                <span className="text-purple-400 text-xs font-bold">🎉 Pacote Fim de Semana aplicado!</span>
                <span className="text-stone-500 text-[10px]">Sex + Sáb + Dom com desconto</span>
              </div>
            )}

            {diasSelecionados.map(dia => {
              const tipoLabel: Record<TipoDiaria, string> = {
                util:'Dia Útil', sabado:'Sábado', domingo:'Domingo',
                fimdesemana:'Pacote Fim de Semana', sexta:'Sexta-feira', feriado:'Feriado'
              };
              const feriadoNome = dia.tipoDiaria === 'feriado' && config
                ? getFeriado(dia.dateStr, config)?.nome : null;
              return (
                <div key={dia.dateStr} className="flex items-center justify-between bg-stone-900 rounded-lg px-4 py-2.5 border border-white/5">
                  <div>
                    <p className="text-sm font-bold text-white">{fmtDate(dia.dateStr)}</p>
                    <p className="text-[10px] text-stone-500">
                      {tipoLabel[dia.tipoDiaria]}
                      {feriadoNome && <span className="text-rose-400 ml-1">· {feriadoNome}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className={`text-sm font-bold ${dia.tipoDiaria === 'feriado' ? 'text-rose-400' : dia.tipoDiaria === 'fimdesemana' ? 'text-purple-400' : 'text-amber-500'}`}>{fmt(dia.valor)}</p>
                    <button onClick={() => removerDia(dia.dateStr)} className="text-stone-600 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
            <div className="border-t border-white/10 pt-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-stone-400">Total</span>
                <span className="font-bold text-white">{fmt(valorTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-400">Para reservar ({config?.percentualReserva}%)</span>
                <span className="font-bold text-amber-500">{fmt(valorReserva)}</span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => {
            if (!diasSelecionados.length) { setError('Selecione pelo menos uma data.'); return; }
            setError(''); setStep('formulario');
          }}
          disabled={!diasSelecionados.length}
          className="w-full py-4 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-900/30"
        >
          <Plus size={16} />Continuar com {diasSelecionados.length || 0} data{diasSelecionados.length !== 1 ? 's' : ''}
        </button>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-900/20 p-3 text-sm text-red-400 border border-red-900/40">
            <AlertCircle size={16} className="flex-shrink-0"/>{error}
          </div>
        )}
      </div>
    );
  };

  // ── FORMULÁRIO ─────────────────────────────────────────────────────────────
  const renderFormulario = () => {
    const tipoLabel: Record<TipoDiaria, string> = { util:'Dia Útil', sabado:'Sábado', domingo:'Domingo', fimdesemana:'Fim de Semana' };
    const fields: Array<{ label: string; key: keyof typeof form; type: string; placeholder: string }> = [
      { label: 'Nome Completo *',       key: 'nome',          type: 'text',   placeholder: 'Seu nome' },
      { label: 'CPF / CNPJ *',          key: 'cpfCnpj',       type: 'text',   placeholder: '000.000.000-00' },
      { label: 'Telefone / WhatsApp *', key: 'telefone',      type: 'tel',    placeholder: '(21) 90000-0000' },
      { label: 'E-mail *',              key: 'email',         type: 'email',  placeholder: 'seu@email.com' },
      { label: 'Tipo de Evento *',      key: 'tipoEvento',    type: 'text',   placeholder: 'Casamento, Festa...' },
      { label: 'Nº de Convidados *',    key: 'numConvidados', type: 'number', placeholder: '100' },
    ];

    return (
      <div className="space-y-5">
        {/* Resumo */}
        <div className="glass p-5 rounded-2xl border border-amber-600/20 space-y-2">
          <p className="text-[9px] text-stone-500 uppercase tracking-widest mb-3">Resumo das datas</p>
          {diasSelecionados.map(dia => (
            <div key={dia.dateStr} className="flex justify-between text-sm">
              <span className="text-stone-300 font-semibold">{fmtDate(dia.dateStr)}</span>
              <span className="text-stone-500 text-xs">{tipoLabel[dia.tipoDiaria]}</span>
              <span className="text-amber-500 font-bold">{fmt(dia.valor)}</span>
            </div>
          ))}
          <div className="border-t border-white/10 pt-3 flex flex-col gap-1">
            <div className="flex justify-between">
              <span className="text-[10px] text-stone-500 uppercase tracking-wider">Total</span>
              <span className="font-bold text-white">{fmt(valorTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] text-amber-600 uppercase tracking-wider">Para reservar ({config?.percentualReserva}%)</span>
              <span className="font-bold text-amber-500">{fmt(valorReserva)}</span>
            </div>
          </div>
        </div>

        {/* Campos */}
        <div className="glass p-5 rounded-2xl space-y-4">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Seus dados</p>
          {fields.map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{label}</label>
              <input type={type} value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-stone-900 px-4 py-3 text-sm text-white focus:border-amber-500/50 focus:outline-none transition-all placeholder:text-stone-600"
              />
            </div>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-900/20 p-3 text-sm text-red-400 border border-red-900/40">
            <AlertCircle size={16} className="flex-shrink-0"/>{error}
          </div>
        )}

        {/* Como funciona */}
        <div className="glass p-4 rounded-xl border border-white/5 space-y-2">
          <p className="text-[9px] font-bold text-stone-500 uppercase tracking-widest">Como funciona</p>
          {[
            'Você escolhe pagar a reserva ou o total',
            'Abrimos o WhatsApp do salão com os detalhes',
            'O salão envia o PIX ou link de pagamento',
            'Você paga e envia o comprovante',
            'A data é confirmada e bloqueada no calendário',
          ].map((txt, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-amber-600/20 text-amber-500 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
              <p className="text-xs text-stone-400">{txt}</p>
            </div>
          ))}
        </div>

        {/* Botões de escolha */}
        <p className="text-[10px] text-stone-500 uppercase tracking-widest text-center font-bold">Escolha como deseja pagar</p>

        <div className="grid grid-cols-1 gap-3">
          {/* Opção reserva */}
          <button
            onClick={() => handleSubmit('reserva')}
            disabled={submitting}
            className="w-full rounded-xl bg-amber-600/10 border border-amber-600/30 hover:border-amber-500 hover:bg-amber-600/20 p-5 text-left transition-all disabled:opacity-50"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-[9px] text-stone-500 uppercase tracking-widest">Opção 1 — Reservar a data</p>
              <span className="text-[9px] bg-amber-600/10 text-amber-500 px-2 py-0.5 rounded-full border border-amber-600/20 font-bold">Recomendado</span>
            </div>
            <p className="text-2xl font-bold text-amber-500">{fmt(valorReserva)}</p>
            <p className="text-[10px] text-stone-500 mt-1">{config?.percentualReserva}% do total · saldo restante: {fmt(Math.max(0, valorTotal - valorReserva))}</p>
            <div className="flex items-center gap-2 mt-3 text-amber-500 text-xs font-bold">
              {submitting
                ? <><Loader size={13} className="animate-spin"/>Criando solicitação...</>
                : <><MessageCircle size={13}/>Solicitar via WhatsApp</>}
            </div>
          </button>

          {/* Opção total */}
          <button
            onClick={() => handleSubmit('total')}
            disabled={submitting}
            className="w-full rounded-xl bg-stone-900 border border-white/10 hover:border-white/20 p-5 text-left transition-all disabled:opacity-50"
          >
            <p className="text-[9px] text-stone-500 uppercase tracking-widest mb-1">Opção 2 — Pagamento total</p>
            <p className="text-2xl font-bold text-white">{fmt(valorTotal)}</p>
            <p className="text-[10px] text-stone-500 mt-1">Confirma o evento imediatamente após pagamento</p>
            <div className="flex items-center gap-2 mt-3 text-stone-400 text-xs font-bold">
              {submitting
                ? <><Loader size={13} className="animate-spin"/>Criando solicitação...</>
                : <><MessageCircle size={13}/>Solicitar via WhatsApp</>}
            </div>
          </button>
        </div>

        <button onClick={() => { setStep('calendario'); setError(''); }}
          className="w-full py-3 rounded-lg border border-white/10 text-stone-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-all">
          ← Voltar ao calendário
        </button>
      </div>
    );
  };

  // ── SOLICITADO ─────────────────────────────────────────────────────────────
  const renderSolicitado = () => {
    const isConfirmado = reservaCriada?.status === ReservaStatus.CONFIRMADO;
    const isReservado  = reservaCriada?.status === ReservaStatus.RESERVADO;
    const isPendente   = reservaCriada?.status === ReservaStatus.PENDENTE_PAGAMENTO;
    const wpp          = config?.whatsappLink?.replace('https://wa.me/', '') || '';

    const reabrirWpp = () => {
      if (!reservaCriada || !wpp) return;
      const tipo = (reservaCriada as any).tipoPagamentoSolicitado || 'reserva';
      const msg  = montarMsgWhatsApp(tipo, reservaCriada);
      window.open(`https://wa.me/${wpp}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    return (
      <div className="space-y-5">
        {/* Status */}
        {(isConfirmado || isReservado) ? (
          <div className="glass p-5 rounded-2xl border border-green-600/30 flex items-center gap-3">
            <CheckCircle size={22} className="text-green-500 flex-shrink-0"/>
            <div>
              <p className="font-bold text-green-400 text-sm">
                {isConfirmado ? '🎉 Evento Confirmado!' : '✅ Data Reservada!'}
              </p>
              <p className="text-[10px] text-stone-400 mt-0.5">
                Protocolo: <span className="text-white font-bold">{reservaCriada?.protocolo}</span>
              </p>
            </div>
          </div>
        ) : isPendente ? (
          <div className="glass p-5 rounded-2xl border border-amber-600/30 flex items-start gap-3">
            <Send size={20} className="text-amber-500 flex-shrink-0 mt-0.5"/>
            <div>
              <p className="font-bold text-amber-400 text-sm">Solicitação enviada!</p>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                O salão vai te enviar o PIX ou link de pagamento pelo WhatsApp. Após você pagar e enviar o comprovante, a data será confirmada.
              </p>
            </div>
          </div>
        ) : null}

        {/* Detalhes da solicitação */}
        {reservaCriada && (
          <div className="glass p-5 rounded-2xl space-y-4">
            <p className="text-[9px] text-stone-500 uppercase tracking-widest font-bold">Detalhes da solicitação</p>

            <div className="space-y-2">
              {(Array.isArray((reservaCriada as any).datas)
                ? (reservaCriada as any).datas
                : [reservaCriada.data]
              ).map((d: string) => (
                <div key={d} className="flex justify-between text-sm bg-stone-900 rounded-lg px-4 py-2.5 border border-white/5">
                  <span className="text-white font-bold">{fmtDate(d)}</span>
                  <span className="text-amber-500 font-bold">
                    {fmt(diasSelecionados.find(ds => ds.dateStr === d)?.valor || reservaCriada.valorTotal)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-stone-400">Valor total</span>
                <span className="text-white font-bold">{fmt(reservaCriada.valorTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-400">Valor de reserva ({reservaCriada.percentualReserva}%)</span>
                <span className="text-amber-500 font-bold">{fmt(reservaCriada.valorReserva)}</span>
              </div>
            </div>

            <div className="bg-stone-900 rounded-lg p-3 border border-white/5">
              <p className="text-[9px] text-stone-500 uppercase tracking-widest mb-1">Token da reserva</p>
              <p className="text-xs text-stone-300 font-mono">{reservaCriada.token}</p>
            </div>
          </div>
        )}

        {/* Próximos passos */}
        {isPendente && (
          <div className="glass p-5 rounded-2xl border border-white/5 space-y-3">
            <p className="text-[9px] text-stone-500 uppercase tracking-widest font-bold">Próximos passos</p>
            {[
              { num: '1', txt: 'O salão vai entrar em contato pelo WhatsApp', ok: true },
              { num: '2', txt: 'Você receberá a chave PIX ou link de pagamento', ok: false },
              { num: '3', txt: 'Efetue o pagamento e envie o comprovante', ok: false },
              { num: '4', txt: 'A data será bloqueada e confirmada no sistema', ok: false },
            ].map(({ num, txt, ok }) => (
              <div key={num} className="flex items-start gap-3">
                <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${ok ? 'bg-green-600/20 text-green-500' : 'bg-stone-800 text-stone-500'}`}>{num}</span>
                <p className="text-xs text-stone-400">{txt}</p>
              </div>
            ))}
          </div>
        )}

        {/* Botão reabrir WhatsApp */}
        {isPendente && wpp && (
          <button onClick={reabrirWpp}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-bold uppercase tracking-widest transition-all shadow-lg">
            <MessageCircle size={16}/>Reabrir WhatsApp
          </button>
        )}

        {/* PDF comprovante */}
        {reservaCriada && (isConfirmado || isReservado) && config && (
          <button onClick={() => gerarComprovantePDF(reservaCriada, config!)}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border border-white/10 text-stone-300 hover:text-white text-xs font-bold uppercase tracking-widest transition-all">
            <FileText size={16}/>Baixar Comprovante PDF
          </button>
        )}

        <button onClick={() => navigate('/')}
          className="w-full py-3 rounded-lg border border-white/5 text-stone-600 hover:text-stone-400 text-xs font-bold uppercase tracking-widest transition-all">
          Voltar ao site
        </button>
      </div>
    );
  };

  // ── GUARDS ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-600 border-t-transparent"/>
    </div>
  );

  if (config && !config.reservaOnlineAtiva && !token) return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-8 text-center gap-6">
      <h2 className="font-serif text-2xl text-white">Reservas Online Indisponíveis</h2>
      <p className="text-stone-400 text-sm max-w-xs">Entre em contato pelo WhatsApp.</p>
      {config.whatsappLink && (
        <a href={config.whatsappLink} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-8 py-3.5 rounded-full font-bold text-sm uppercase tracking-widest">
          <MessageCircle size={16}/>WhatsApp
        </a>
      )}
      <button onClick={() => navigate('/')} className="text-stone-500 hover:text-white text-xs uppercase tracking-widest">Voltar</button>
    </div>
  );

  const stepInfo: Record<Step, { num: number; label: string }> = {
    calendario: { num: 1, label: 'Escolha as Datas' },
    formulario: { num: 2, label: 'Seus Dados' },
    solicitado: { num: 3, label: 'Solicitação' }
  };

  return (
    <div className="min-h-screen bg-stone-950 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-xs text-stone-500 hover:text-white transition-colors mb-6">
            <ArrowLeft size={14}/>Voltar ao site
          </button>
          <h1 className="font-serif text-3xl font-bold text-white tracking-tight">Reservar Data</h1>
          <p className="text-amber-500 text-[10px] uppercase tracking-[0.4em] mt-1">{config?.salonNome || 'Latitude22'}</p>

          <div className="flex items-center mt-6">
            {(['calendario','formulario','solicitado'] as Step[]).map((s, i) => (
              <React.Fragment key={s}>
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border transition-all
                    ${step === s ? 'border-amber-500 bg-amber-600/10 text-amber-500'
                      : stepInfo[step].num > stepInfo[s].num ? 'border-amber-800 bg-amber-900/20 text-amber-700'
                      : 'border-stone-700 text-stone-600'}`}>
                    {stepInfo[step].num > stepInfo[s].num ? '✓' : i+1}
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider hidden sm:block ${step===s?'text-amber-500':'text-stone-600'}`}>
                    {stepInfo[s].label}
                  </span>
                </div>
                {i < 2 && <div className="flex-1 h-px bg-stone-800 mx-2"/>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {step === 'calendario' && renderCalendario()}
        {step === 'formulario' && renderFormulario()}
        {step === 'solicitado' && renderSolicitado()}

        <p className="text-center text-[9px] text-stone-700 mt-8 uppercase tracking-widest">
          © {new Date().getFullYear()} {config?.salonNome || 'Latitude22'} · Produzido por NIKLAUS
        </p>
      </div>
    </div>
  );
};

export default ReservaPage;
