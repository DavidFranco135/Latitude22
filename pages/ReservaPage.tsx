import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Copy, AlertCircle, Loader, CheckCircle,
  MessageCircle, FileText, Calendar, Trash2, Plus
} from 'lucide-react';
import {
  getReservaConfig, criarReserva, calcularTipoDiaria,
  calcularValor, getDatasOcupadas, getReservaPorToken
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

type Step = 'calendario' | 'formulario' | 'pagamento';

interface DiasSelecionados {
  dateStr: string;
  tipoDiaria: TipoDiaria;
  valor: number;
}

// Cria uma reserva por dia selecionado; retorna a primeira criada (usada como referência)
const criarReservasMultiplas = async (
  dias: DiasSelecionados[],
  config: ReservaConfig,
  cliente: {
    nome: string; cpfCnpj: string; telefone: string;
    email: string; tipoEvento: string; numConvidados: number;
  }
): Promise<Reserva> => {
  // Criamos cada reserva sequencialmente para evitar race condition de disponibilidade
  let primeira: Reserva | null = null;
  for (const dia of dias) {
    const r = await criarReserva(dia.dateStr, dia.tipoDiaria, config, cliente);
    if (!primeira) primeira = r;
  }
  return primeira!;
};

const ReservaPage: React.FC = () => {
  const { token }  = useParams<{ token?: string }>();
  const navigate   = useNavigate();

  const [config, setConfig]           = useState<ReservaConfig | null>(null);
  const [datasOcupadas, setDatasOcup] = useState<string[]>([]);
  const [step, setStep]               = useState<Step>('calendario');
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');
  const [copied, setCopied]           = useState(false);

  // Multi-day selection
  const [diasSelecionados, setDiasSelecionados] = useState<DiasSelecionados[]>([]);

  // Calendar navigation
  const today = new Date();
  const [calYear, setCalYear]   = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const [form, setForm] = useState({
    nome: '', cpfCnpj: '', telefone: '',
    email: '', tipoEvento: '', numConvidados: ''
  });

  const [reservaCriada, setReservaCriada] = useState<Reserva | null>(null);

  // Totals
  const valorTotal   = diasSelecionados.reduce((s, d) => s + d.valor, 0);
  const valorReserva = config
    ? Math.ceil(valorTotal * config.percentualReserva / 100)
    : 0;

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
            // Reconstruct single day
            setDiasSelecionados([{
              dateStr: r.data,
              tipoDiaria: r.tipoDiaria,
              valor: r.valorTotal
            }]);
            setForm({
              nome: r.clienteNome, cpfCnpj: r.clienteCpfCnpj,
              telefone: r.clienteTelefone, email: r.clienteEmail,
              tipoEvento: r.tipoEvento, numConvidados: String(r.numConvidados)
            });
            setStep('pagamento');
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
      if (exists) {
        return prev.filter(d => d.dateStr !== dateStr);
      }
      const tipo  = calcularTipoDiaria(dateStr);
      const valor = calcularValor(tipo, config);
      return [...prev, { dateStr, tipoDiaria: tipo, valor }].sort((a, b) =>
        a.dateStr.localeCompare(b.dateStr)
      );
    });
  }, [config]);

  const removerDia = (dateStr: string) =>
    setDiasSelecionados(prev => prev.filter(d => d.dateStr !== dateStr));

  const handleSubmit = async () => {
    if (!config) return;
    const { nome, cpfCnpj, telefone, email, tipoEvento, numConvidados } = form;
    if (!nome || !cpfCnpj || !telefone || !email || !tipoEvento || !numConvidados) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }
    if (diasSelecionados.length === 0) {
      setError('Selecione pelo menos uma data.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const r = await criarReservasMultiplas(diasSelecionados, config, {
        nome, cpfCnpj, telefone, email,
        tipoEvento, numConvidados: Number(numConvidados)
      });
      setReservaCriada(r);
      setStep('pagamento');
    } catch (e: any) {
      setError(e.message || 'Erro ao criar reserva. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const linkReserva = reservaCriada
    ? `${window.location.origin}/#/reserva/${reservaCriada.token}`
    : '';

  const copiarLink = () => {
    navigator.clipboard.writeText(linkReserva);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // ── CALENDÁRIO ─────────────────────────────────────────────────────────────
  const renderCalendario = () => {
    const firstDay    = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const cells: (number | null)[] = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
    ];
    const prevMonth = () => {
      if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
      else setCalMonth(m => m - 1);
    };
    const nextMonth = () => {
      if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
      else setCalMonth(m => m + 1);
    };

    return (
      <div className="space-y-5">
        {/* Calendário */}
        <div className="glass p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth}
              className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white text-xl font-bold">‹</button>
            <h3 className="font-serif text-lg text-white font-bold">{MESES[calMonth]} {calYear}</h3>
            <button onClick={nextMonth}
              className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white text-xl font-bold">›</button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {DIAS.map(d => (
              <div key={d} className="text-center text-[9px] font-bold text-stone-600 uppercase py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const dateStr  = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const cellDate = new Date(dateStr + 'T12:00:00');
              const isPast   = cellDate < today;
              const isOcup   = datasOcupadas.includes(dateStr);
              const isSel    = diasSelecionados.some(d => d.dateStr === dateStr);
              const dow      = cellDate.getDay();
              const isWE     = dow === 0 || dow === 6;

              let cls = 'aspect-square rounded-lg text-[13px] font-semibold transition-all flex items-center justify-center ';
              if (isPast)
                cls += 'text-stone-800 cursor-not-allowed';
              else if (isOcup)
                cls += 'bg-red-900/20 text-red-800 cursor-not-allowed line-through text-[11px]';
              else if (isSel)
                cls += 'bg-amber-600 text-white ring-2 ring-amber-400 cursor-pointer scale-105';
              else if (isWE)
                cls += 'text-amber-400 hover:bg-amber-600/20 cursor-pointer hover:text-amber-200';
              else
                cls += 'text-stone-300 hover:bg-stone-800 cursor-pointer hover:text-white';

              return (
                <button
                  key={i}
                  disabled={isPast || isOcup}
                  onClick={() => toggleData(dateStr)}
                  className={cls}
                  title={isOcup ? 'Data indisponível' : dateStr}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-4 text-[10px] text-stone-500 pt-4 border-t border-white/5">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-600 inline-block"/>Selecionado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-900/40 inline-block"/>Ocupado
            </span>
            <span className="flex items-center gap-1.5 text-amber-500">
              <span className="w-3 h-3 rounded bg-amber-600/20 inline-block"/>Fim de semana
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-stone-800 inline-block"/>Dia útil
            </span>
          </div>
        </div>

        {/* Tabela de preços */}
        {config && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Dia Útil',      val: config.valorDiaUtil },
              { label: 'Sábado',        val: config.valorSabado },
              { label: 'Domingo',       val: config.valorDomingo },
              { label: 'Fim de Semana', val: config.valorFimDeSemana }
            ].map(({ label, val }) => (
              <div key={label} className="glass rounded-xl p-3 border border-white/5">
                <p className="text-[9px] text-stone-500 uppercase tracking-widest">{label}</p>
                <p className="text-sm font-bold text-amber-500 mt-0.5">{fmt(val)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Dias selecionados */}
        {diasSelecionados.length > 0 && (
          <div className="glass p-5 rounded-2xl border border-amber-600/20 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={14} /> {diasSelecionados.length} dia{diasSelecionados.length > 1 ? 's' : ''} selecionado{diasSelecionados.length > 1 ? 's' : ''}
              </p>
            </div>

            {diasSelecionados.map(dia => {
              const tipoLabel: Record<TipoDiaria, string> = {
                util: 'Dia Útil', sabado: 'Sábado', domingo: 'Domingo', fimdesemana: 'Fim de Semana'
              };
              return (
                <div key={dia.dateStr}
                  className="flex items-center justify-between bg-stone-900 rounded-lg px-4 py-2.5 border border-white/5">
                  <div>
                    <p className="text-sm font-bold text-white">{fmtDate(dia.dateStr)}</p>
                    <p className="text-[10px] text-stone-500">{tipoLabel[dia.tipoDiaria]}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-bold text-amber-500">{fmt(dia.valor)}</p>
                    <button onClick={() => removerDia(dia.dateStr)}
                      className="text-stone-600 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Resumo de valores */}
            <div className="border-t border-white/10 pt-3 space-y-2 mt-2">
              <div className="flex justify-between text-sm">
                <span className="text-stone-400">Valor total dos dias</span>
                <span className="font-bold text-white">{fmt(valorTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-400">
                  Para reservar ({config?.percentualReserva || 30}%)
                </span>
                <span className="font-bold text-amber-500">{fmt(valorReserva)}</span>
              </div>
              <div className="flex justify-between text-xs text-stone-600 pt-1">
                <span>Saldo restante após reserva</span>
                <span>{fmt(Math.max(0, valorTotal - valorReserva))}</span>
              </div>
            </div>
          </div>
        )}

        {/* Botão avançar */}
        <button
          onClick={() => {
            if (diasSelecionados.length === 0) {
              setError('Selecione pelo menos uma data no calendário.');
              return;
            }
            setError('');
            setStep('formulario');
          }}
          disabled={diasSelecionados.length === 0}
          className="w-full py-4 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-900/30"
        >
          <Plus size={16} />
          Continuar com {diasSelecionados.length} data{diasSelecionados.length !== 1 ? 's' : ''}
        </button>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-900/20 p-3 text-sm text-red-400 border border-red-900/40">
            <AlertCircle size={16} className="flex-shrink-0" />{error}
          </div>
        )}
      </div>
    );
  };

  // ── FORMULÁRIO ─────────────────────────────────────────────────────────────
  const renderFormulario = () => {
    const tipoLabel: Record<TipoDiaria, string> = {
      util: 'Dia Útil', sabado: 'Sábado', domingo: 'Domingo', fimdesemana: 'Fim de Semana'
    };

    const fields: Array<{
      label: string; key: keyof typeof form;
      type: string; placeholder: string;
    }> = [
      { label: 'Nome Completo *',         key: 'nome',          type: 'text',   placeholder: 'Seu nome' },
      { label: 'CPF / CNPJ *',            key: 'cpfCnpj',       type: 'text',   placeholder: '000.000.000-00' },
      { label: 'Telefone / WhatsApp *',   key: 'telefone',      type: 'tel',    placeholder: '(21) 90000-0000' },
      { label: 'E-mail *',                key: 'email',         type: 'email',  placeholder: 'seu@email.com' },
      { label: 'Tipo de Evento *',        key: 'tipoEvento',    type: 'text',   placeholder: 'Casamento, Festa, Formatura...' },
      { label: 'Nº de Convidados *',      key: 'numConvidados', type: 'number', placeholder: '100' },
    ];

    return (
      <div className="space-y-5">
        {/* Resumo das datas */}
        <div className="glass p-5 rounded-2xl border border-amber-600/20 space-y-2">
          <p className="text-[9px] text-stone-500 uppercase tracking-widest mb-3">
            Resumo da sua reserva
          </p>
          {diasSelecionados.map(dia => (
            <div key={dia.dateStr}
              className="flex items-center justify-between text-sm">
              <span className="text-stone-300 font-semibold">{fmtDate(dia.dateStr)}</span>
              <span className="text-stone-500 text-xs">{tipoLabel[dia.tipoDiaria]}</span>
              <span className="text-amber-500 font-bold">{fmt(dia.valor)}</span>
            </div>
          ))}
          <div className="border-t border-white/10 pt-3 flex flex-col gap-1.5 mt-1">
            <div className="flex justify-between">
              <span className="text-[10px] text-stone-500 uppercase tracking-wider">Total</span>
              <span className="text-base font-bold text-white">{fmt(valorTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] text-amber-600 uppercase tracking-wider">
                Valor para reservar ({config?.percentualReserva}%)
              </span>
              <span className="text-base font-bold text-amber-500">{fmt(valorReserva)}</span>
            </div>
          </div>
        </div>

        {/* Campos */}
        <div className="glass p-5 rounded-2xl space-y-4">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Seus dados</p>
          {fields.map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{label}</label>
              <input
                type={type}
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-stone-900 px-4 py-3 text-sm text-white focus:border-amber-500/50 focus:outline-none transition-all placeholder:text-stone-600"
              />
            </div>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-900/20 p-3 text-sm text-red-400 border border-red-900/40">
            <AlertCircle size={16} className="flex-shrink-0" />{error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => { setStep('calendario'); setError(''); }}
            className="flex-1 py-3.5 rounded-lg border border-white/10 text-stone-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all"
          >
            Voltar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-3.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-amber-900/30"
          >
            {submitting
              ? <><Loader size={15} className="animate-spin" />Criando...</>
              : 'Ver Pagamento'}
          </button>
        </div>
      </div>
    );
  };

  // ── PAGAMENTO ──────────────────────────────────────────────────────────────
  const renderPagamento = () => {
    const isConfirmado = reservaCriada?.status === ReservaStatus.CONFIRMADO;
    const isReservado  = reservaCriada?.status === ReservaStatus.RESERVADO;
    const vTotal   = reservaCriada ? reservaCriada.valorTotal  : valorTotal;
    const vReserva = reservaCriada ? reservaCriada.valorReserva : valorReserva;

    return (
      <div className="space-y-5">
        {(isConfirmado || isReservado) && (
          <div className="glass p-5 rounded-2xl border border-green-600/30 flex items-center gap-3">
            <CheckCircle size={22} className="text-green-500 flex-shrink-0" />
            <div>
              <p className="font-bold text-green-400 text-sm">
                {isConfirmado ? 'Evento Confirmado!' : 'Data Reservada!'}
              </p>
              <p className="text-[10px] text-stone-400">
                Protocolo: <span className="text-white font-bold">{reservaCriada?.protocolo}</span>
              </p>
            </div>
          </div>
        )}

        {linkReserva && (
          <div className="glass p-5 rounded-2xl border border-white/10">
            <p className="text-[9px] text-stone-500 uppercase tracking-widest mb-2">Link desta reserva</p>
            <p className="text-xs text-stone-400 break-all mb-3 leading-relaxed">{linkReserva}</p>
            <button
              onClick={copiarLink}
              className="flex items-center gap-2 text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors"
            >
              <Copy size={13} />{copied ? '✓ Copiado!' : 'Copiar link'}
            </button>
          </div>
        )}

        <div className="glass p-6 rounded-2xl space-y-4">
          <h3 className="font-bold text-white">Como pagar</h3>

          {/* Datas reservadas */}
          {diasSelecionados.length > 0 && (
            <div className="bg-stone-900 rounded-xl p-4 border border-white/5 space-y-1.5">
              <p className="text-[9px] text-stone-500 uppercase tracking-widest mb-2">Datas</p>
              {diasSelecionados.map(dia => (
                <div key={dia.dateStr} className="flex justify-between text-sm">
                  <span className="text-stone-300">{fmtDate(dia.dateStr)}</span>
                  <span className="text-amber-500 font-semibold">{fmt(dia.valor)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            {/* Opção 1: Reservar */}
            <div className="bg-stone-900 border border-amber-600/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[9px] text-stone-500 uppercase tracking-widest">
                  Opção 1 — Reservar a data
                </p>
                <span className="text-[9px] bg-amber-600/10 text-amber-500 px-2 py-0.5 rounded-full border border-amber-600/20">
                  Recomendado
                </span>
              </div>
              <p className="text-2xl font-bold text-amber-500">{fmt(vReserva)}</p>
              <p className="text-[10px] text-stone-500 mt-0.5">
                {config?.percentualReserva}% do total · Saldo: {fmt(Math.max(0, vTotal - vReserva))}
              </p>
            </div>

            {/* Opção 2: Total */}
            <div className="bg-stone-900 border border-white/10 rounded-xl p-4">
              <p className="text-[9px] text-stone-500 uppercase tracking-widest mb-1">
                Opção 2 — Pagamento total
              </p>
              <p className="text-2xl font-bold text-white">{fmt(vTotal)}</p>
              <p className="text-[10px] text-stone-500 mt-0.5">Confirma o evento imediatamente</p>
            </div>
          </div>

          {/* Chave PIX */}
          {config?.pixChave && (
            <div className="bg-stone-900 rounded-xl p-4 border border-green-900/30">
              <p className="text-[9px] text-stone-500 uppercase tracking-widest mb-2">Chave PIX</p>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-green-400 break-all">{config.pixChave}</p>
                <button
                  onClick={() => navigator.clipboard.writeText(config!.pixChave!)}
                  className="flex-shrink-0 flex items-center gap-1 text-[10px] text-stone-500 hover:text-green-400 transition-colors"
                >
                  <Copy size={12} />Copiar
                </button>
              </div>
              <p className="text-[9px] text-stone-600 mt-2 leading-relaxed">
                Após o pagamento, envie o comprovante via WhatsApp para confirmação.
              </p>
            </div>
          )}

          {/* WhatsApp */}
          {config?.whatsappLink && (
            <a
              href={`${config.whatsappLink}?text=${encodeURIComponent(
                `Olá! Fiz uma reserva.\n` +
                diasSelecionados.map(d => `• ${fmtDate(d.dateStr)} — ${fmt(d.valor)}`).join('\n') +
                `\nTotal: ${fmt(vTotal)}\nToken: ${reservaCriada?.token || ''}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold uppercase tracking-widest transition-all"
            >
              <MessageCircle size={16} />Confirmar pelo WhatsApp
            </a>
          )}

          {/* PDF */}
          {reservaCriada && (isConfirmado || isReservado) && config && (
            <button
              onClick={() => gerarComprovantePDF(reservaCriada, config!)}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-lg border border-white/10 text-stone-300 hover:text-white text-xs font-bold uppercase tracking-widest transition-all"
            >
              <FileText size={16} />Baixar Comprovante PDF
            </button>
          )}
        </div>

        <p className="text-center text-[9px] text-stone-600 leading-relaxed">
          Este link expira em {config?.expiracaoHoras || 48}h se não houver pagamento confirmado.
        </p>
      </div>
    );
  };

  // ── LOADING / DESATIVADO ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
      </div>
    );
  }

  if (config && !config.reservaOnlineAtiva && !token) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-8 text-center gap-6">
        <h2 className="font-serif text-2xl text-white">Reservas Online Indisponíveis</h2>
        <p className="text-stone-400 text-sm max-w-xs">
          No momento as reservas online estão desativadas. Entre em contato pelo WhatsApp.
        </p>
        {config.whatsappLink && (
          <a
            href={config.whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-8 py-3.5 rounded-full font-bold text-sm uppercase tracking-widest transition-all"
          >
            <MessageCircle size={16} />Falar pelo WhatsApp
          </a>
        )}
        <button
          onClick={() => navigate('/')}
          className="text-stone-500 hover:text-white text-xs uppercase tracking-widest transition-colors"
        >
          Voltar ao site
        </button>
      </div>
    );
  }

  // ── STEP INFO ─────────────────────────────────────────────────────────────
  const stepInfo: Record<Step, { num: number; label: string }> = {
    calendario: { num: 1, label: 'Escolha as Datas' },
    formulario: { num: 2, label: 'Seus Dados' },
    pagamento:  { num: 3, label: 'Pagamento' }
  };

  return (
    <div className="min-h-screen bg-stone-950 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xs text-stone-500 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft size={14} />Voltar ao site
          </button>
          <h1 className="font-serif text-3xl font-bold text-white tracking-tight">Reservar Data</h1>
          <p className="text-amber-500 text-[10px] uppercase tracking-[0.4em] mt-1">
            {config?.salonNome || 'Latitude22'}
          </p>

          {/* Steps */}
          <div className="flex items-center mt-6">
            {(['calendario', 'formulario', 'pagamento'] as Step[]).map((s, i) => (
              <React.Fragment key={s}>
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border transition-all
                    ${step === s
                      ? 'border-amber-500 bg-amber-600/10 text-amber-500'
                      : stepInfo[step].num > stepInfo[s].num
                        ? 'border-amber-800 bg-amber-900/20 text-amber-700'
                        : 'border-stone-700 text-stone-600'}`}>
                    {stepInfo[step].num > stepInfo[s].num ? '✓' : i + 1}
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider hidden sm:block transition-colors
                    ${step === s ? 'text-amber-500' : 'text-stone-600'}`}>
                    {stepInfo[s].label}
                  </span>
                </div>
                {i < 2 && <div className="flex-1 h-px bg-stone-800 mx-2" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {step === 'calendario' && renderCalendario()}
        {step === 'formulario' && renderFormulario()}
        {step === 'pagamento'  && renderPagamento()}

        <p className="text-center text-[9px] text-stone-700 mt-8 uppercase tracking-widest">
          © {new Date().getFullYear()} {config?.salonNome || 'Latitude22'} · Produzido por NIKLAUS
        </p>
      </div>
    </div>
  );
};

export default ReservaPage;
