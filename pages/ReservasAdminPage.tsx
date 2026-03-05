import React, { useState, useEffect } from 'react';
import {
  Link2, Copy, CheckCircle, XCircle, Clock, DollarSign,
  FileText, Search, RefreshCw, Calendar, MessageCircle,
  Send, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import {
  getAllReservas, getReservaConfig, confirmarPagamento,
  cancelarReserva, criarReservaRascunho, calcularTipoDiaria, calcularValor
} from '../services/reservas';
import { gerarComprovantePDF } from '../services/pdf';
import { Reserva, ReservaConfig, ReservaStatus, TipoDiaria } from '../types';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const fmtDate = (str: string) => {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
};

const STATUS_COLORS: Record<ReservaStatus, string> = {
  [ReservaStatus.PENDENTE_PAGAMENTO]: 'text-amber-400 bg-amber-900/20 border-amber-800/40',
  [ReservaStatus.RESERVADO]:          'text-blue-400  bg-blue-900/20  border-blue-800/40',
  [ReservaStatus.CONFIRMADO]:         'text-green-400 bg-green-900/20 border-green-800/40',
  [ReservaStatus.CANCELADO]:          'text-red-400   bg-red-900/20   border-red-800/40',
  [ReservaStatus.EXPIRADO]:           'text-stone-500 bg-stone-900    border-stone-700'
};

const STATUS_LABEL: Record<ReservaStatus, string> = {
  [ReservaStatus.PENDENTE_PAGAMENTO]: 'Aguardando Pagamento',
  [ReservaStatus.RESERVADO]:          'Reservado (parcial)',
  [ReservaStatus.CONFIRMADO]:         'Confirmado',
  [ReservaStatus.CANCELADO]:          'Cancelado',
  [ReservaStatus.EXPIRADO]:           'Expirado'
};

const TIPO_PAG_LABEL: Record<string, string> = {
  reserva: 'Reserva (parcial)',
  total:   'Pagamento total'
};

const ReservasAdminPage: React.FC = () => {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [config,   setConfig]   = useState<ReservaConfig | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filtroStatus, setFiltroStatus] = useState<ReservaStatus | 'todos'>('todos');
  const [copied,   setCopied]   = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  // Modal confirmar pagamento
  const [modalPagamento, setModalPagamento] = useState<Reserva | null>(null);
  const [valorPago,      setValorPago]      = useState('');
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [transacaoId,    setTransacaoId]    = useState('');
  const [confirmando,    setConfirmando]    = useState(false);
  const [msgConfirm,     setMsgConfirm]     = useState('');

  // Modal gerar link manual
  const [modalLink,  setModalLink]  = useState(false);
  const [dataLink,   setDataLink]   = useState('');
  const [linkGerado, setLinkGerado] = useState('');
  const [gerandoLink,setGerandoLink]= useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const [r, c] = await Promise.all([getAllReservas(), getReservaConfig()]);
      setReservas(r.sort((a, b) => {
        // Pendentes primeiro, depois por data
        const order: Record<ReservaStatus, number> = {
          [ReservaStatus.PENDENTE_PAGAMENTO]: 0,
          [ReservaStatus.RESERVADO]:          1,
          [ReservaStatus.CONFIRMADO]:         2,
          [ReservaStatus.CANCELADO]:          3,
          [ReservaStatus.EXPIRADO]:           4
        };
        const diff = order[a.status] - order[b.status];
        return diff !== 0 ? diff : a.data.localeCompare(b.data);
      }));
      setConfig(c);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  // ── Helpers WhatsApp ───────────────────────────────────────────────────────
  const montarMsgCobranca = (r: Reserva, tipo: 'reserva' | 'total') => {
    const valor = tipo === 'reserva' ? r.valorReserva : r.valorTotal;
    const datas = (Array.isArray((r as any).datas) ? (r as any).datas : [r.data])
      .map((d: string) => `• ${fmtDate(d)}`).join('\n');
    const pixInfo = config?.pixChave ? `\n\n*Chave PIX:* ${config.pixChave}` : '';

    return (
      `Olá, ${r.clienteNome}! 🎉\n\n` +
      `Recebemos sua solicitação de reserva no *${config?.salonNome || 'Latitude22'}*.\n\n` +
      `📅 *Data(s):*\n${datas}\n\n` +
      `💰 *Valor a pagar:* *${fmt(valor)}*\n` +
      `(${tipo === 'reserva' ? `${r.percentualReserva}% de reserva — restante: ${fmt(r.valorTotal - valor)}` : 'Pagamento total'})\n` +
      pixInfo +
      `\n\nApós o pagamento, envie o comprovante aqui para confirmarmos a data. 😊`
    );
  };

  const abrirWppCliente = (r: Reserva) => {
    const tipo = (r as any).tipoPagamentoSolicitado || 'reserva';
    const tel  = r.clienteTelefone.replace(/\D/g, '');
    const msg  = montarMsgCobranca(r, tipo);
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // ── Copiar link ────────────────────────────────────────────────────────────
  const copiarLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/#/reserva/${token}`);
    setCopied(token);
    setTimeout(() => setCopied(''), 2500);
  };

  // ── Confirmar pagamento ────────────────────────────────────────────────────
  const abrirModalPagamento = (r: Reserva) => {
    const tipo = (r as any).tipoPagamentoSolicitado || 'reserva';
    setModalPagamento(r);
    setValorPago(String(tipo === 'total' ? r.valorTotal : r.valorReserva));
    setFormaPagamento('PIX');
    setTransacaoId('');
    setMsgConfirm('');
  };

  const handleConfirmar = async () => {
    if (!modalPagamento || !valorPago) return;
    setConfirmando(true);
    try {
      const protocolo = await confirmarPagamento(
        modalPagamento.id,
        Number(valorPago),
        formaPagamento,
        transacaoId || undefined
      );
      setMsgConfirm(`✅ Protocolo ${protocolo} — data bloqueada no calendário.`);
      setTimeout(() => { setModalPagamento(null); carregar(); }, 2000);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setConfirmando(false);
    }
  };

  const handleCancelar = async (id: string) => {
    if (!confirm('Cancelar esta reserva?')) return;
    await cancelarReserva(id);
    carregar();
  };

  // ── Gerar link manual ──────────────────────────────────────────────────────
  const handleGerarLink = async () => {
    if (!dataLink || !config) return;
    setGerandoLink(true);
    try {
      const tipo = calcularTipoDiaria(dataLink);
      const r = await criarReservaRascunho(
        [{ dateStr: dataLink, tipoDiaria: tipo, valor: calcularValor(tipo, config) }],
        config,
        { nome: 'A definir', cpfCnpj: '', telefone: '', email: '', tipoEvento: '', numConvidados: 0 }
      );
      setLinkGerado(`${window.location.origin}/#/reserva/${r.token}`);
      carregar();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setGerandoLink(false);
    }
  };

  // ── Filtros ────────────────────────────────────────────────────────────────
  const filtradas = reservas.filter(r => {
    const q = search.toLowerCase();
    const match =
      r.clienteNome.toLowerCase().includes(q) ||
      r.data.includes(q) ||
      (r.protocolo || '').includes(q) ||
      r.token.includes(q) ||
      r.clienteTelefone.includes(q);
    return match && (filtroStatus === 'todos' || r.status === filtroStatus);
  });

  const stats = {
    total:      reservas.length,
    pendentes:  reservas.filter(r => r.status === ReservaStatus.PENDENTE_PAGAMENTO).length,
    confirmados:reservas.filter(r => r.status === ReservaStatus.CONFIRMADO).length,
    receita:    reservas.filter(r => [ReservaStatus.RESERVADO, ReservaStatus.CONFIRMADO].includes(r.status))
                        .reduce((s, r) => s + (r.valorPago || 0), 0)
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-amber-600 mb-1">Gestão</p>
          <h2 className="font-serif text-4xl font-bold text-stone-100 tracking-tight">Reservas Online</h2>
        </div>
        <div className="flex gap-3">
          <button onClick={carregar}
            className="p-2.5 rounded-lg border border-white/10 text-stone-400 hover:text-white transition-all">
            <RefreshCw size={16}/>
          </button>
          <button onClick={() => { setModalLink(true); setLinkGerado(''); setDataLink(''); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-600/10 border border-amber-600/20 text-amber-500 text-xs font-bold uppercase tracking-widest hover:bg-amber-600/20 transition-all">
            <Link2 size={14}/>Gerar Link Manual
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total',       val: stats.total,                   color: 'text-white' },
          { label: 'Pendentes',   val: stats.pendentes,               color: 'text-amber-400' },
          { label: 'Confirmados', val: stats.confirmados,             color: 'text-green-400' },
          { label: 'Receita',     val: fmt(stats.receita),            color: 'text-green-400' }
        ].map(({ label, val, color }) => (
          <div key={label} className="glass p-5 rounded-xl">
            <p className="text-[9px] text-stone-500 uppercase tracking-widest">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{val}</p>
          </div>
        ))}
      </div>

      {/* AVISO pendentes */}
      {stats.pendentes > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-amber-900/10 border border-amber-800/30 p-4">
          <AlertCircle size={18} className="text-amber-500 flex-shrink-0"/>
          <p className="text-sm text-amber-300">
            <span className="font-bold">{stats.pendentes} solicitação{stats.pendentes > 1 ? 'ões' : ''}</span> aguardando pagamento.
            Envie a cobrança pelo WhatsApp e marque como pago ao receber o comprovante.
          </p>
        </div>
      )}

      {/* FILTROS */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, data, protocolo, telefone..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-white/10 bg-stone-900 text-sm text-white focus:border-amber-500/50 focus:outline-none placeholder:text-stone-600"/>
        </div>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as any)}
          className="px-4 py-2.5 rounded-lg border border-white/10 bg-stone-900 text-sm text-white focus:border-amber-500/50 focus:outline-none">
          <option value="todos">Todos os status</option>
          {Object.values(ReservaStatus).map(s => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>

      {/* LISTA */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-600 border-t-transparent"/>
        </div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-16 text-stone-600">
          <Calendar size={40} className="mx-auto mb-3 opacity-30"/>
          <p className="text-sm">Nenhuma reserva encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(r => {
            const tipoPag = (r as any).tipoPagamentoSolicitado || 'reserva';
            const isExpanded = expanded === r.id;
            const datas: string[] = Array.isArray((r as any).datas) ? (r as any).datas : [r.data];

            return (
              <div key={r.id} className="glass rounded-xl overflow-hidden transition-all">
                {/* Linha principal */}
                <div className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${STATUS_COLORS[r.status]}`}>
                          {STATUS_LABEL[r.status]}
                        </span>
                        {r.protocolo && (
                          <span className="text-[9px] text-stone-500 font-mono">{r.protocolo}</span>
                        )}
                        {(r as any).tipoPagamentoSolicitado && r.status === ReservaStatus.PENDENTE_PAGAMENTO && (
                          <span className="text-[9px] text-amber-600 bg-amber-900/10 px-2 py-0.5 rounded-full border border-amber-800/20">
                            {TIPO_PAG_LABEL[tipoPag]}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-6 gap-y-1">
                        <div>
                          <p className="text-[9px] text-stone-500 uppercase tracking-widest">Data(s)</p>
                          <p className="text-sm font-bold text-white">
                            {datas.length === 1 ? fmtDate(datas[0]) : `${datas.length} datas`}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] text-stone-500 uppercase tracking-widest">Cliente</p>
                          <p className="text-sm font-bold text-white truncate max-w-[180px]">{r.clienteNome || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-stone-500 uppercase tracking-widest">
                            {tipoPag === 'total' ? 'Total' : `Reserva (${r.percentualReserva}%)`}
                          </p>
                          <p className="text-sm font-bold text-amber-500">
                            {fmt(tipoPag === 'total' ? r.valorTotal : r.valorReserva)}
                          </p>
                        </div>
                        {r.valorPago != null && r.valorPago > 0 && (
                          <div>
                            <p className="text-[9px] text-stone-500 uppercase tracking-widest">Pago</p>
                            <p className="text-sm font-bold text-green-400">{fmt(r.valorPago)}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* AÇÕES */}
                    <div className="flex flex-wrap gap-2 items-center">
                      {/* Enviar cobrança WhatsApp */}
                      {r.status === ReservaStatus.PENDENTE_PAGAMENTO && (
                        <button onClick={() => abrirWppCliente(r)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-900/20 border border-green-800/30 text-green-400 hover:bg-green-900/30 text-xs font-bold transition-all">
                          <Send size={13}/>Enviar Cobrança
                        </button>
                      )}

                      {/* Marcar como pago */}
                      {(r.status === ReservaStatus.PENDENTE_PAGAMENTO || r.status === ReservaStatus.RESERVADO) && (
                        <button onClick={() => abrirModalPagamento(r)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600/10 border border-amber-600/30 text-amber-400 hover:bg-amber-600/20 text-xs font-bold transition-all">
                          <DollarSign size={13}/>Marcar Pago
                        </button>
                      )}

                      {/* PDF */}
                      {(r.status === ReservaStatus.CONFIRMADO || r.status === ReservaStatus.RESERVADO) && config && (
                        <button onClick={() => gerarComprovantePDF(r, config)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 text-stone-400 hover:text-white text-xs font-bold transition-all">
                          <FileText size={13}/>PDF
                        </button>
                      )}

                      {/* Copiar link */}
                      <button onClick={() => copiarLink(r.token)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 text-stone-400 hover:text-amber-500 hover:border-amber-600/30 text-xs font-bold transition-all">
                        <Copy size={13}/>{copied === r.token ? '✓' : 'Link'}
                      </button>

                      {/* Cancelar */}
                      {r.status !== ReservaStatus.CANCELADO && r.status !== ReservaStatus.EXPIRADO && (
                        <button onClick={() => handleCancelar(r.id)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-900/10 border border-red-900/30 text-red-500 hover:bg-red-900/20 text-xs font-bold transition-all">
                          <XCircle size={13}/>Cancelar
                        </button>
                      )}

                      {/* Expandir */}
                      <button onClick={() => setExpanded(isExpanded ? null : r.id)}
                        className="p-2 rounded-lg border border-white/10 text-stone-500 hover:text-white text-xs font-bold transition-all">
                        {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Detalhes expandidos */}
                {isExpanded && (
                  <div className="border-t border-white/5 p-5 bg-stone-900/50 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <p className="text-[9px] text-stone-500 uppercase tracking-widest font-bold">Cliente</p>
                      <p className="text-stone-300"><span className="text-stone-600">Nome:</span> {r.clienteNome}</p>
                      <p className="text-stone-300"><span className="text-stone-600">CPF/CNPJ:</span> {r.clienteCpfCnpj}</p>
                      <p className="text-stone-300"><span className="text-stone-600">Telefone:</span> {r.clienteTelefone}</p>
                      <p className="text-stone-300"><span className="text-stone-600">E-mail:</span> {r.clienteEmail}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[9px] text-stone-500 uppercase tracking-widest font-bold">Evento</p>
                      <p className="text-stone-300"><span className="text-stone-600">Tipo:</span> {r.tipoEvento}</p>
                      <p className="text-stone-300"><span className="text-stone-600">Convidados:</span> {r.numConvidados}</p>
                      <p className="text-stone-300"><span className="text-stone-600">Data(s):</span> {datas.map(fmtDate).join(', ')}</p>
                      <p className="text-stone-300"><span className="text-stone-600">Token:</span> <span className="font-mono text-xs">{r.token}</span></p>
                    </div>
                    {r.formaPagamento && (
                      <div className="md:col-span-2 space-y-2 border-t border-white/5 pt-3">
                        <p className="text-[9px] text-stone-500 uppercase tracking-widest font-bold">Pagamento</p>
                        <p className="text-stone-300"><span className="text-stone-600">Forma:</span> {r.formaPagamento}</p>
                        {r.transacaoId && <p className="text-stone-300"><span className="text-stone-600">Transação:</span> {r.transacaoId}</p>}
                        {r.dataPagamento && (
                          <p className="text-stone-300">
                            <span className="text-stone-600">Data pag.:</span>{' '}
                            {r.dataPagamento?.toDate
                              ? r.dataPagamento.toDate().toLocaleDateString('pt-BR')
                              : '—'}
                          </p>
                        )}
                      </div>
                    )}
                    {/* WhatsApp direto */}
                    <div className="md:col-span-2 pt-2">
                      <button onClick={() => abrirWppCliente(r)}
                        className="flex items-center gap-2 text-xs font-bold text-green-500 hover:text-green-400 transition-colors">
                        <MessageCircle size={14}/>Abrir WhatsApp do cliente
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL — MARCAR COMO PAGO */}
      {modalPagamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 w-full max-w-md space-y-5">
            <div>
              <h3 className="font-bold text-white text-lg">Marcar como Pago</h3>
              <p className="text-xs text-stone-500 mt-1">
                Ao confirmar, a data será <span className="text-amber-400 font-bold">bloqueada no calendário</span> automaticamente.
              </p>
            </div>

            {/* Resumo */}
            <div className="bg-stone-900 rounded-lg p-4 space-y-1.5 text-sm">
              <p className="text-stone-300"><span className="text-stone-500">Cliente:</span> {modalPagamento.clienteNome}</p>
              <p className="text-stone-300">
                <span className="text-stone-500">Data(s):</span>{' '}
                {(Array.isArray((modalPagamento as any).datas)
                  ? (modalPagamento as any).datas
                  : [modalPagamento.data]
                ).map(fmtDate).join(', ')}
              </p>
              <p className="text-stone-300"><span className="text-stone-500">Valor total:</span> {fmt(modalPagamento.valorTotal)}</p>
              <p className="text-stone-300">
                <span className="text-stone-500">Tipo solicitado:</span>{' '}
                {TIPO_PAG_LABEL[(modalPagamento as any).tipoPagamentoSolicitado || 'reserva']}
              </p>
            </div>

            <div className="space-y-3">
              {/* Valor */}
              <div>
                <label className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Valor Recebido *</label>
                <input type="number" value={valorPago} onChange={e => setValorPago(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-stone-900 px-4 py-3 text-sm text-white focus:border-amber-500/50 focus:outline-none"
                  placeholder="0,00"/>
                <div className="flex gap-3 mt-1.5">
                  <button onClick={() => setValorPago(String(modalPagamento.valorReserva))}
                    className="text-[10px] text-amber-500 hover:text-amber-400 transition-colors">
                    {fmt(modalPagamento.valorReserva)} (reserva)
                  </button>
                  <span className="text-stone-700">·</span>
                  <button onClick={() => setValorPago(String(modalPagamento.valorTotal))}
                    className="text-[10px] text-amber-500 hover:text-amber-400 transition-colors">
                    {fmt(modalPagamento.valorTotal)} (total)
                  </button>
                </div>
              </div>

              {/* Forma */}
              <div>
                <label className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Forma de Pagamento</label>
                <select value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-stone-900 px-4 py-3 text-sm text-white focus:border-amber-500/50 focus:outline-none">
                  <option>PIX</option>
                  <option>Dinheiro</option>
                  <option>Cartão de Crédito</option>
                  <option>Cartão de Débito</option>
                  <option>Transferência</option>
                  <option>Outro</option>
                </select>
              </div>

              {/* ID transação */}
              <div>
                <label className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">ID / Comprovante (opcional)</label>
                <input type="text" value={transacaoId} onChange={e => setTransacaoId(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-stone-900 px-4 py-3 text-sm text-white focus:border-amber-500/50 focus:outline-none placeholder:text-stone-600"
                  placeholder="Código do comprovante PIX..."/>
              </div>
            </div>

            {msgConfirm && (
              <div className="flex items-center gap-2 rounded-lg bg-green-900/20 p-3 text-sm text-green-400 border border-green-800/30">
                <CheckCircle size={16}/>{msgConfirm}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalPagamento(null)}
                className="flex-1 py-3 rounded-lg border border-white/10 text-stone-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all">
                Cancelar
              </button>
              <button onClick={handleConfirmar} disabled={confirmando || !valorPago}
                className="flex-1 py-3 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {confirmando
                  ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"/>Confirmando...</>
                  : <><CheckCircle size={15}/>Confirmar Pagamento</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL — GERAR LINK MANUAL */}
      {modalLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 w-full max-w-md space-y-5">
            <h3 className="font-bold text-white text-lg">Gerar Link Manual</h3>
            <p className="text-xs text-stone-400">
              Gere um link para enviar ao cliente. Ele preenche os dados e escolhe a forma de pagamento.
            </p>

            <div>
              <label className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Data do Evento *</label>
              <input type="date" value={dataLink} min={new Date().toISOString().split('T')[0]}
                onChange={e => { setDataLink(e.target.value); setLinkGerado(''); }}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-stone-900 px-4 py-3 text-sm text-white focus:border-amber-500/50 focus:outline-none"/>
            </div>

            {dataLink && config && (() => {
              const tipo    = calcularTipoDiaria(dataLink);
              const total   = calcularValor(tipo, config);
              const reserva = Math.ceil(total * config.percentualReserva / 100);
              const label: Record<string, string> = { util:'Dia Útil', sabado:'Sábado', domingo:'Domingo', fimdesemana:'Fim de Semana' };
              return (
                <div className="bg-stone-900 rounded-lg p-4 text-sm space-y-1">
                  <p className="text-stone-300"><span className="text-stone-500">Tipo:</span> {label[tipo]}</p>
                  <p className="text-stone-300"><span className="text-stone-500">Total:</span> <span className="text-amber-500 font-bold">{fmt(total)}</span></p>
                  <p className="text-stone-300"><span className="text-stone-500">Reserva ({config.percentualReserva}%):</span> {fmt(reserva)}</p>
                </div>
              );
            })()}

            {linkGerado ? (
              <div className="bg-stone-900 rounded-lg p-4 border border-amber-600/20">
                <p className="text-[9px] text-stone-500 uppercase tracking-widest mb-2">Link gerado</p>
                <p className="text-xs text-stone-300 break-all mb-3">{linkGerado}</p>
                <button onClick={() => { navigator.clipboard.writeText(linkGerado); setCopied('modal'); setTimeout(()=>setCopied(''),2000); }}
                  className="flex items-center gap-1.5 text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors">
                  <Copy size={13}/>{copied === 'modal' ? 'Copiado!' : 'Copiar link'}
                </button>
              </div>
            ) : (
              <button onClick={handleGerarLink} disabled={gerandoLink || !dataLink}
                className="w-full py-3.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {gerandoLink
                  ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"/>Gerando...</>
                  : <><Link2 size={14}/>Gerar Link</>}
              </button>
            )}

            <button onClick={() => { setModalLink(false); setLinkGerado(''); setDataLink(''); }}
              className="w-full py-3 rounded-lg border border-white/10 text-stone-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all">
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReservasAdminPage;
