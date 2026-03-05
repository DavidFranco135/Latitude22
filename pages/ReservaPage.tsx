import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, AlertCircle, Loader, CheckCircle, MessageCircle, FileText } from 'lucide-react';
import {
  getReservaConfig, criarReserva, calcularTipoDiaria,
  calcularValor, getDatasOcupadas, getReservaPorToken
} from '../services/reservas';
import { gerarComprovantePDF } from '../services/pdf';
import { ReservaConfig, ReservaStatus, TipoDiaria, Reserva } from '../types';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

type Step = 'calendario' | 'formulario' | 'pagamento';

const ReservaPage: React.FC = () => {
  const { token }  = useParams<{ token?: string }>();
  const navigate   = useNavigate();

  const [config, setConfig]             = useState<ReservaConfig | null>(null);
  const [datasOcupadas, setDatasOcup]   = useState<string[]>([]);
  const [step, setStep]                 = useState<Step>('calendario');
  const [loading, setLoading]           = useState(true);
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState('');
  const [copied, setCopied]             = useState(false);

  const [dataSelecionada, setDataSel]   = useState('');
  const [tipoDiaria, setTipoDiaria]     = useState<TipoDiaria>('util');
  const [valorTotal, setValorTotal]     = useState(0);
  const [valorReserva, setValorReserva] = useState(0);

  const today    = new Date();
  const [calYear, setCalYear]   = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const [form, setForm] = useState({
    nome: '', cpfCnpj: '', telefone: '',
    email: '', tipoEvento: '', numConvidados: ''
  });

  const [reservaCriada, setReservaCriada] = useState<Reserva | null>(null);

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
            setDataSel(r.data);
            setTipoDiaria(r.tipoDiaria);
            setValorTotal(r.valorTotal);
            setValorReserva(r.valorReserva);
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

  const selecionarData = (dateStr: string) => {
    if (!config) return;
    const tipo    = calcularTipoDiaria(dateStr);
    const total   = calcularValor(tipo, config);
    const reserva = Math.ceil(total * config.percentualReserva / 100);
    setDataSel(dateStr);
    setTipoDiaria(tipo);
    setValorTotal(total);
    setValorReserva(reserva);
    setStep('formulario');
  };

  const handleSubmit = async () => {
    if (!config) return;
    const { nome, cpfCnpj, telefone, email, tipoEvento, numConvidados } = form;
    if (!nome || !cpfCnpj || !telefone || !email || !tipoEvento || !numConvidados) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const r = await criarReserva(dataSelecionada, tipoDiaria, config, {
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
    const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); } else setCalMonth(m => m-1); };
    const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); } else setCalMonth(m => m+1); };

    return (
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
            const dateStr  = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const cellDate = new Date(dateStr + 'T12:00:00');
            const isPast   = cellDate < today;
            const isOcup   = datasOcupadas.includes(dateStr);
            const dow      = cellDate.getDay();
            const isWE     = dow === 0 || dow === 6;
            let cls = 'aspect-square rounded-lg text-sm font-semibold transition-all flex items-center justify-center text-[13px] ';
            if (isPast)       cls += 'text-stone-800 cursor-not-allowed';
            else if (isOcup)  cls += 'bg-red-900/20 text-red-800 cursor-not-allowed line-through text-[11px]';
            else if (isWE)    cls += 'text-amber-400 hover:bg-amber-600/20 cursor-pointer hover:text-amber-200';
            else              cls += 'text-stone-300 hover:bg-stone-800 cursor-pointer hover:text-white';
            return (
              <button key={i} disabled={isPast || isOcup} onClick={() => selecionarData(dateStr)} className={cls}>
                {day}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap gap-4 text-[10px] text-stone-500 pt-4 border-t border-white/5">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-900/40 inline-block"/>Ocupado</span>
          <span className="flex items-center gap-1.5 text-amber-500"><span className="w-3 h-3 rounded bg-amber-600/20 inline-block"/>Fim de semana</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-stone-800 inline-block"/>Dia útil</span>
        </div>

        {config && (
          <div className="mt-5 pt-4 border-t border-white/5 grid grid-cols-2 gap-3">
            {[
              { label: 'Dia Útil',     val: config.valorDiaUtil },
              { label: 'Sábado',       val: config.valorSabado },
              { label: 'Domingo',      val: config.valorDomingo },
              { label: 'Fim de Semana',val: config.valorFimDeSemana }
            ].map(({ label, val }) => (
              <div key={label} className="bg-stone-900 rounded-lg p-3 border border-white/5">
                <p className="text-[9px] text-stone-500 uppercase tracking-widest">{label}</p>
                <p className="text-sm font-bold text-amber-500 mt-0.5">{fmt(val)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── FORMULÁRIO ─────────────────────────────────────────────────────────────
  const renderFormulario = () => {
    const tipoLabel: Record<TipoDiaria,string> = {
      util:'Dia Útil', sabado:'Sábado', domingo:'Domingo', fimdesemana:'Fim de Semana'
    };
    return (
      <div className="space-y-5">
        <div className="glass p-5 rounded-2xl border border-amber-600/20">
          <p className="text-[9px] text-stone-500 uppercase tracking-widest">Data Selecionada</p>
          <p className="text-xl font-bold text-amber-500 mt-1">
            {dataSelecionada.split('-').reverse().join('/')} · {tipoLabel[tipoDiaria]}
          </p>
          <div className="flex gap-6 mt-3">
            <div>
              <p className="text-[9px] text-stone-500 uppercase tracking-widest">Valor Total</p>
              <p className="font-bold text-white text-sm">{fmt(valorTotal)}</p>
            </div>
            <div>
              <p className="text-[9px] text-stone-500 uppercase tracking-widest">Reserva ({config?.percentualReserva}%)</p>
              <p className="font-bold text-amber-500 text-sm">{fmt(valorReserva)}</p>
            </div>
          </div>
        </div>

        <div className="glass p-6 rounded-2xl space-y-4">
          <h3 className="font-bold text-white">Seus Dados</h3>
          {([
            { key: 'nome',          label: 'Nome Completo *',          type: 'text',   placeholder: 'João da Silva' },
            { key: 'cpfCnpj',       label: 'CPF ou CNPJ *',            type: 'text',   placeholder: '000.000.000-00' },
            { key: 'telefone',      label: 'Telefone (WhatsApp) *',    type: 'tel',    placeholder: '(21) 99999-9999' },
            { key: 'email',         label: 'E-mail *',                 type: 'email',  placeholder: 'seu@email.com' },
            { key: 'tipoEvento',    label: 'Tipo de Evento *',         type: 'text',   placeholder: 'Casamento, Formatura, Aniversário...' },
            { key: 'numConvidados', label: 'Nº de Convidados *',       type: 'number', placeholder: '100' }
          ] as { key: keyof typeof form; label: string; type: string; placeholder: string }[]).map(({ key, label, type, placeholder }) => (
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
          <button onClick={() => { setStep('calendario'); setError(''); }}
            className="flex-1 py-3.5 rounded-lg border border-white/10 text-stone-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all">
            Voltar
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 py-3.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-amber-900/30">
            {submitting ? <><Loader size={15} className="animate-spin"/>Criando...</> : 'Confirmar e Ver Pagamento'}
          </button>
        </div>
      </div>
    );
  };

  // ── PAGAMENTO ──────────────────────────────────────────────────────────────
  const renderPagamento = () => {
    const isConfirmado = reservaCriada?.status === ReservaStatus.CONFIRMADO;
    const isReservado  = reservaCriada?.status === ReservaStatus.RESERVADO;
    return (
      <div className="space-y-5">
        {(isConfirmado || isReservado) && (
          <div className="glass p-5 rounded-2xl border border-green-600/30 flex items-center gap-3">
            <CheckCircle size={22} className="text-green-500 flex-shrink-0" />
            <div>
              <p className="font-bold text-green-400 text-sm">{isConfirmado ? 'Evento Confirmado!' : 'Data Reservada!'}</p>
              <p className="text-[10px] text-stone-400">Protocolo: <span className="text-white font-bold">{reservaCriada?.protocolo}</span></p>
            </div>
          </div>
        )}

        {linkReserva && (
          <div className="glass p-5 rounded-2xl border border-white/10">
            <p className="text-[9px] text-stone-500 uppercase tracking-widest mb-2">Link desta reserva</p>
            <p className="text-xs text-stone-400 break-all mb-3 leading-relaxed">{linkReserva}</p>
            <button onClick={copiarLink}
              className="flex items-center gap-2 text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors">
              <Copy size={13} />{copied ? '✓ Copiado!' : 'Copiar link'}
            </button>
          </div>
        )}

        <div className="glass p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white">Como pagar</h3>
            <span className="text-[9px] text-stone-500 uppercase tracking-widest">
              {dataSelecionada.split('-').reverse().join('/')}
            </span>
          </div>

          <div className="space-y-3">
            <div className="bg-stone-900 border border-amber-600/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[9px] text-stone-500 uppercase tracking-widest">Opção 1 — Reservar a data</p>
                <span className="text-[9px] bg-amber-600/10 text-amber-500 px-2 py-0.5 rounded-full border border-amber-600/20">Recomendado</span>
              </div>
              <p className="text-2xl font-bold text-amber-500">{fmt(valorReserva)}</p>
              <p className="text-[10px] text-stone-500 mt-0.5">{config?.percentualReserva}% do total · Saldo: {fmt(valorTotal - valorReserva)}</p>
            </div>

            <div className="bg-stone-900 border border-white/10 rounded-xl p-4">
              <p className="text-[9px] text-stone-500 uppercase tracking-widest mb-1">Opção 2 — Pagamento total</p>
              <p className="text-2xl font-bold text-white">{fmt(valorTotal)}</p>
              <p className="text-[10px] text-stone-500 mt-0.5">Confirma o evento imediatamente</p>
            </div>
          </div>

          {config?.pixChave && (
            <div className="bg-stone-900 rounded-xl p-4 border border-green-900/30">
              <p className="text-[9px] text-stone-500 uppercase tracking-widest mb-2">Chave PIX</p>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-green-400 break-all">{config.pixChave}</p>
                <button onClick={() => navigator.clipboard.writeText(config.pixChave!)}
                  className="flex-shrink-0 flex items-center gap-1 text-[10px] text-stone-500 hover:text-green-400 transition-colors">
                  <Copy size={12}/>Copiar
                </button>
              </div>
              <p className="text-[9px] text-stone-600 mt-2 leading-relaxed">
                Após o pagamento, envie o comprovante via WhatsApp para confirmação.
              </p>
            </div>
          )}

          {config?.whatsappLink && (
            <a href={`${config.whatsappLink}?text=${encodeURIComponent(
              `Olá! Fiz uma reserva para o dia ${dataSelecionada.split('-').reverse().join('/')}. Token: ${reservaCriada?.token || ''}`
            )}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold uppercase tracking-widest transition-all">
              <MessageCircle size={16}/>Confirmar pelo WhatsApp
            </a>
          )}

          {reservaCriada && (isConfirmado || isReservado) && config && (
            <button onClick={() => gerarComprovantePDF(reservaCriada, config)}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-lg border border-white/10 text-stone-300 hover:text-white text-xs font-bold uppercase tracking-widest transition-all">
              <FileText size={16}/>Baixar Comprovante PDF
            </button>
          )}
        </div>

        <p className="text-center text-[9px] text-stone-600 leading-relaxed">
          Este link expira em {config?.expiracaoHoras || 48}h se não houver pagamento confirmado.
        </p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-600 border-t-transparent"/>
      </div>
    );
  }

  if (config && !config.reservaOnlineAtiva && !token) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-8 text-center gap-6">
        <h2 className="font-serif text-2xl text-white">Reservas Online Indisponíveis</h2>
        <p className="text-stone-400 text-sm max-w-xs">No momento as reservas online estão desativadas. Entre em contato pelo WhatsApp.</p>
        {config.whatsappLink && (
          <a href={config.whatsappLink} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-8 py-3.5 rounded-full font-bold text-sm uppercase tracking-widest transition-all">
            <MessageCircle size={16}/>Falar pelo WhatsApp
          </a>
        )}
        <button onClick={() => navigate('/')} className="text-stone-500 hover:text-white text-xs uppercase tracking-widest transition-colors">Voltar ao site</button>
      </div>
    );
  }

  const stepInfo: Record<Step, { num: number; label: string }> = {
    calendario: { num: 1, label: 'Escolha a Data' },
    formulario: { num: 2, label: 'Seus Dados' },
    pagamento:  { num: 3, label: 'Pagamento' }
  };

  return (
    <div className="min-h-screen bg-stone-950 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <button onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xs text-stone-500 hover:text-white transition-colors mb-6">
            <ArrowLeft size={14}/>Voltar ao site
          </button>
          <h1 className="font-serif text-3xl font-bold text-white tracking-tight">Reservar Data</h1>
          <p className="text-amber-500 text-[10px] uppercase tracking-[0.4em] mt-1">{config?.salonNome || 'Salão Latitude22'}</p>

          <div className="flex items-center mt-6">
            {(['calendario','formulario','pagamento'] as Step[]).map((s, i) => (
              <React.Fragment key={s}>
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border transition-all
                    ${step === s ? 'border-amber-500 bg-amber-600/10 text-amber-500'
                      : stepInfo[step].num > stepInfo[s].num ? 'border-amber-800 bg-amber-900/20 text-amber-700'
                      : 'border-stone-700 text-stone-600'}`}>
                    {stepInfo[step].num > stepInfo[s].num ? '✓' : i+1}
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider hidden sm:block transition-colors
                    ${step === s ? 'text-amber-500' : 'text-stone-600'}`}>
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
        {step === 'pagamento'  && renderPagamento()}

        <p className="text-center text-[9px] text-stone-700 mt-8 uppercase tracking-widest">
          © {new Date().getFullYear()} {config?.salonNome || 'Latitude22'} · Produzido por NIKLAUS
        </p>
      </div>
    </div>
  );
};

export default ReservaPage;
