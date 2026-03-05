import React, { useState, useEffect } from 'react';
import {
  Link2, Copy, CheckCircle, XCircle, DollarSign,
  FileText, Search, RefreshCw, Calendar, MessageCircle,
  Send, AlertCircle, ChevronDown, ChevronUp, User
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

const fmtDateLong = (str: string) => {
  if (!str) return '—';
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const [y, m, d] = str.split('-');
  return `${d} ${meses[Number(m)-1]} ${y}`;
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
  [ReservaStatus.RESERVADO]:          'Reservado',
  [ReservaStatus.CONFIRMADO]:         'Confirmado',
  [ReservaStatus.CANCELADO]:          'Cancelado',
  [ReservaStatus.EXPIRADO]:           'Expirado'
};

const ReservasAdminPage: React.FC = () => {
  const [reservas,      setReservas]      = useState<Reserva[]>([]);
  const [config,        setConfig]        = useState<ReservaConfig | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [filtroStatus,  setFiltroStatus]  = useState<ReservaStatus | 'todos'>('todos');
  const [copied,        setCopied]        = useState('');
  const [expanded,      setExpanded]      = useState<string | null>(null);

  // Modal confirmar pagamento
  const [modalPagamento, setModalPagamento] = useState<Reserva | null>(null);
  const [valorPago,      setValorPago]      = useState('');
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [transacaoId,    setTransacaoId]    = useState('');
  const [confirmando,    setConfirmando]    = useState(false);
  const [pdfGerado,      setPdfGerado]      = useState(false);

  // Modal gerar link manual
  const [modalLink,   setModalLink]   = useState(false);
  const [dataLink,    setDataLink]    = useState('');
  const [linkGerado,  setLinkGerado]  = useState('');
  const [gerandoLink, setGerandoLink] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const [r, c] = await Promise.all([getAllReservas(), getReservaConfig()]);
      // Ordena: pendentes primeiro, depois por data
      const order: Record<ReservaStatus, number> = {
        [ReservaStatus.PENDENTE_PAGAMENTO]: 0,
        [ReservaStatus.RESERVADO]:          1,
        [ReservaStatus.CONFIRMADO]:         2,
        [ReservaStatus.CANCELADO]:          3,
        [ReservaStatus.EXPIRADO]:           4
      };
      setReservas(r.sort((a, b) => {
        const d = order[a.status] - order[b.status];
        return d !== 0 ? d : a.data.localeCompare(b.data);
      }));
      setConfig(c);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const getDatas = (r: Reserva): string[] =>
    Array.isArray((r as any).datas) ? (r as any).datas : [r.data];

  const getValorCobrar = (r: Reserva): number => {
    const tipo = (r as any).tipoPagamentoSolicitado || 'reserva';
    return tipo === 'total' ? r.valorTotal : r.valorReserva;
  };

  // Monta msg WhatsApp de cobrança para o CLIENTE
  const montarMsgCobranca = (r: Reserva) => {
    const valor  = getValorCobrar(r);
    const tipo   = (r as any).tipoPagamentoSolicitado || 'reserva';
    const datas  = getDatas(r).map(d => `• ${fmtDateLong(d)}`).join('\n');
    const pixInfo = config?.pixChave ? `\n\n*Chave PIX:* \`${config.pixChave}\`` : '';
    return (
      `Olá, ${r.clienteNome}! 🎉\n\n` +
      `Recebemos sua solicitação no *${config?.salonNome || 'Latitude22'}*.\n\n` +
      `📅 *Data(s) reservada(s):*\n${datas}\n\n` +
      `💰 *Valor a pagar: ${fmt(valor)}*\n` +
      `_(${tipo === 'total' ? 'Pagamento total' : `${r.percentualReserva}% de reserva · saldo: ${fmt(r.valorTotal - valor)}`})_` +
      pixInfo +
      `\n\nApós o pagamento envie o comprovante aqui para confirmarmos. 😊`
    );
  };

  const abrirWppCliente = (r: Reserva) => {
    const tel = r.clienteTelefone.replace(/\D/g, '');
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(montarMsgCobranca(r))}`, '_blank');
  };

  // Abre WhatsApp do ADMIN com o PDF em mãos (para encaminhar ao cliente)
  const compartilharPdfWpp = (r: Reserva) => {
    const tel = r.clienteTelefone.replace(/\D/g, '');
    const msg = encodeURIComponent(
      `Olá, ${r.clienteNome}! Segue o comprovante de agendamento.\nProtocolo: ${r.protocolo}`
    );
    // O PDF já foi baixado automaticamente ao confirmar;
    // abrimos o WhatsApp para o admin enviar o arquivo manualmente
    window.open(`https://wa.me/55${tel}?text=${msg}`, '_blank');
  };

  const copiarLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/#/reserva/${token}`);
    setCopied(token);
    setTimeout(() => setCopied(''), 2500);
  };

  // ── Modal pagamento ───────────────────────────────────────────────────────

  const abrirModalPagamento = (r: Reserva) => {
    setModalPagamento(r);
    setValorPago(String(getValorCobrar(r)));
    setFormaPagamento('PIX');
    setTransacaoId('');
    setPdfGerado(false);
  };

  const handleConfirmar = async () => {
    if (!modalPagamento || !valorPago || !config) return;
    setConfirmando(true);
    try {
      await confirmarPagamento(
        modalPagamento.id,
        Number(valorPago),
        formaPagamento,
        transacaoId || undefined
      );

      // Recarrega a reserva para pegar protocolo atualizado
      await carregar();

      // Busca a reserva atualizada para o PDF
      const reservasAtualizadas = await import('../services/reservas')
        .then(m => m.getReservaById(modalPagamento.id));

      if (reservasAtualizadas) {
        // Gera PDF automaticamente
        gerarComprovantePDF(reservasAtualizadas, config);
        setPdfGerado(true);
      }
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

  // ── Link manual ───────────────────────────────────────────────────────────

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
    } catch (e: any) { alert(e.message); }
    finally { setGerandoLink(false); }
  };

  // ── Filtro ────────────────────────────────────────────────────────────────

  const filtradas = reservas.filter(r => {
    const q = search.toLowerCase();
    const match =
      r.clienteNome.toLowerCase().includes(q) ||
      r.data.includes(q) ||
      (r.protocolo || '').includes(q) ||
      r.token.includes(q) ||
      r.clienteTelefone.replace(/\D/g,'').includes(q.replace(/\D/g,''));
    return match && (filtroStatus === 'todos' || r.status === filtroStatus);
  });

  const stats = {
    total:       reservas.length,
    pendentes:   reservas.filter(r => r.status === ReservaStatus.PENDENTE_PAGAMENTO).length,
    confirmados: reservas.filter(r => r.status === ReservaStatus.CONFIRMADO).length,
    receita:     reservas
      .filter(r => [ReservaStatus.RESERVADO, ReservaStatus.CONFIRMADO].includes(r.status))
      .reduce((s, r) => s + (r.valorPago || 0), 0)
  };

  // ── RENDER ────────────────────────────────────────────────────────────────

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
          { label: 'Total',       val: stats.total,        color: 'text-white' },
          { label: 'Pendentes',   val: stats.pendentes,    color: 'text-amber-400' },
          { label: 'Confirmados', val: stats.confirmados,  color: 'text-green-400' },
          { label: 'Receita',     val: fmt(stats.receita), color: 'text-green-400' }
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
            <span className="font-bold">{stats.pendentes} solicitaç{stats.pendentes > 1 ? 'ões' : 'ão'}</span> aguardando pagamento.
            Clique em <span className="font-bold">"Enviar Cobrança"</span> para mandar o PIX, e após o comprovante clique em <span className="font-bold">"Marcar Pago"</span> — o PDF é gerado automaticamente.
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
            const datas       = getDatas(r);
            const isExpanded  = expanded === r.id;
            const tipoPag     = (r as any).tipoPagamentoSolicitado || 'reserva';
            const valorCobrar = getValorCobrar(r);

            return (
              <div key={r.id} className="glass rounded-xl overflow-hidden border border-white/5 hover:border-white/10 transition-all">

                {/* ── LINHA PRINCIPAL ── */}
                <div className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">

                    {/* Lado esquerdo — info cliente + datas */}
                    <div className="flex-1 min-w-0">
                      {/* Status + badges */}
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${STATUS_COLORS[r.status]}`}>
                          {STATUS_LABEL[r.status]}
                        </span>
                        {r.protocolo && (
                          <span className="text-[9px] text-stone-500 font-mono bg-stone-900 px-2 py-1 rounded">{r.protocolo}</span>
                        )}
                        {r.status === ReservaStatus.PENDENTE_PAGAMENTO && (
                          <span className="text-[9px] text-amber-600 bg-amber-900/10 px-2 py-0.5 rounded-full border border-amber-800/20">
                            {tipoPag === 'total' ? 'Pagamento total' : `Reserva ${r.percentualReserva}%`}
                          </span>
                        )}
                      </div>

                      {/* Nome + evento */}
                      <div className="flex items-center gap-2 mb-2">
                        <User size={14} className="text-stone-500 flex-shrink-0"/>
                        <p className="text-base font-bold text-white">{r.clienteNome || '—'}</p>
                        {r.tipoEvento && (
                          <span className="text-[10px] text-stone-500">· {r.tipoEvento}</span>
                        )}
                      </div>

                      {/* DATAS — destaque visual de todas as datas do cliente */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {datas.map((d, i) => {
                          const dow = new Date(d + 'T12:00:00').getDay();
                          const isWE = dow === 0 || dow === 6;
                          return (
                            <span key={i}
                              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border
                                ${isWE
                                  ? 'bg-amber-600/10 border-amber-600/20 text-amber-400'
                                  : 'bg-stone-900 border-white/10 text-stone-300'}`}>
                              <Calendar size={11} className="opacity-60"/>
                              {fmtDateLong(d)}
                            </span>
                          );
                        })}
                        {datas.length > 1 && (
                          <span className="text-[10px] text-stone-500 self-center">
                            {datas.length} datas · {fmt(r.valorTotal)} total
                          </span>
                        )}
                      </div>

                      {/* Valores */}
                      <div className="flex gap-4 text-sm">
                        <div>
                          <p className="text-[9px] text-stone-500 uppercase tracking-widest">A cobrar</p>
                          <p className="font-bold text-amber-500">{fmt(valorCobrar)}</p>
                        </div>
                        {r.valorTotal !== valorCobrar && (
                          <div>
                            <p className="text-[9px] text-stone-500 uppercase tracking-widest">Total</p>
                            <p className="font-bold text-stone-300">{fmt(r.valorTotal)}</p>
                          </div>
                        )}
                        {r.valorPago != null && r.valorPago > 0 && (
                          <div>
                            <p className="text-[9px] text-stone-500 uppercase tracking-widest">Pago</p>
                            <p className="font-bold text-green-400">{fmt(r.valorPago)}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Lado direito — ações */}
                    <div className="flex flex-wrap gap-2 items-start lg:flex-col lg:items-end">

                      {/* Enviar cobrança WhatsApp */}
                      {r.status === ReservaStatus.PENDENTE_PAGAMENTO && (
                        <button onClick={() => abrirWppCliente(r)}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-green-900/20 border border-green-800/30 text-green-400 hover:bg-green-900/30 text-xs font-bold transition-all whitespace-nowrap">
                          <Send size={13}/>Enviar Cobrança
                        </button>
                      )}

                      {/* Marcar como pago → gera PDF automaticamente */}
                      {(r.status === ReservaStatus.PENDENTE_PAGAMENTO || r.status === ReservaStatus.RESERVADO) && (
                        <button onClick={() => abrirModalPagamento(r)}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all whitespace-nowrap shadow-lg shadow-amber-900/20">
                          <DollarSign size={13}/>Marcar Pago + PDF
                        </button>
                      )}

                      {/* PDF manual */}
                      {(r.status === ReservaStatus.CONFIRMADO || r.status === ReservaStatus.RESERVADO) && config && (
                        <button onClick={() => gerarComprovantePDF(r, config)}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-white/10 text-stone-400 hover:text-white text-xs font-bold transition-all">
                          <FileText size={13}/>PDF
                        </button>
                      )}

                      {/* Enviar PDF para cliente pelo WhatsApp */}
                      {(r.status === ReservaStatus.CONFIRMADO || r.status === ReservaStatus.RESERVADO) && (
                        <button onClick={() => compartilharPdfWpp(r)}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-green-800/30 text-green-500 hover:bg-green-900/10 text-xs font-bold transition-all">
                          <MessageCircle size={13}/>WhatsApp
                        </button>
                      )}

                      {/* Copiar link */}
                      <button onClick={() => copiarLink(r.token)}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-white/10 text-stone-400 hover:text-amber-500 hover:border-amber-600/30 text-xs font-bold transition-all">
                        <Copy size={13}/>{copied === r.token ? '✓ Copiado' : 'Link'}
                      </button>

                      {/* Cancelar */}
                      {r.status !== ReservaStatus.CANCELADO && r.status !== ReservaStatus.EXPIRADO && (
                        <button onClick={() => handleCancelar(r.id)}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-red-900/10 border border-red-900/30 text-red-500 hover:bg-red-900/20 text-xs font-bold transition-all">
                          <XCircle size={13}/>Cancelar
                        </button>
                      )}

                      {/* Expandir detalhes */}
                      <button onClick={() => setExpanded(isExpanded ? null : r.id)}
                        className="flex items-center gap-1 text-[10px] text-stone-500 hover:text-white transition-colors uppercase tracking-widest font-bold">
                        {isExpanded ? <><ChevronUp size={12}/>Menos</> : <><ChevronDown size={12}/>Detalhes</>}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── DETALHES EXPANDIDOS ── */}
                {isExpanded && (
                  <div className="border-t border-white/5 bg-stone-900/50 p-5 grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Dados do cliente */}
                    <div className="space-y-2">
                      <p className="text-[9px] text-amber-600 uppercase tracking-widest font-bold mb-3">Cliente</p>
                      {[
                        { label: 'Nome',        val: r.clienteNome },
                        { label: 'CPF/CNPJ',    val: r.clienteCpfCnpj },
                        { label: 'Telefone',    val: r.clienteTelefone },
                        { label: 'E-mail',      val: r.clienteEmail },
                        { label: 'Evento',      val: r.tipoEvento },
                        { label: 'Convidados',  val: String(r.numConvidados) },
                      ].map(({ label, val }) => (
                        <div key={label} className="flex justify-between text-xs gap-2">
                          <span className="text-stone-500 flex-shrink-0">{label}</span>
                          <span className="text-stone-300 text-right">{val || '—'}</span>
                        </div>
                      ))}
                    </div>

                    {/* Datas detalhadas */}
                    <div className="space-y-2">
                      <p className="text-[9px] text-amber-600 uppercase tracking-widest font-bold mb-3">Datas e Valores</p>
                      {((r as any).diasDetalhes || datas.map((d: string) => ({
                        dateStr: d, tipoDiaria: 'util', valor: r.valorTotal / datas.length
                      }))).map((dia: any, i: number) => {
                        const tipoLabel: Record<string, string> = {
                          util:'Dia Útil', sabado:'Sábado', domingo:'Domingo', fimdesemana:'Fim de Semana'
                        };
                        return (
                          <div key={i} className="flex justify-between text-xs bg-stone-900 rounded-lg px-3 py-2 border border-white/5">
                            <div>
                              <p className="text-white font-bold">{fmtDateLong(dia.dateStr)}</p>
                              <p className="text-stone-500">{tipoLabel[dia.tipoDiaria] || dia.tipoDiaria}</p>
                            </div>
                            <p className="text-amber-500 font-bold self-center">{fmt(dia.valor)}</p>
                          </div>
                        );
                      })}
                      <div className="flex justify-between text-xs pt-1">
                        <span className="text-stone-500">Total</span>
                        <span className="text-white font-bold">{fmt(r.valorTotal)}</span>
                      </div>
                    </div>

                    {/* Pagamento + ações rápidas */}
                    <div className="space-y-2">
                      <p className="text-[9px] text-amber-600 uppercase tracking-widest font-bold mb-3">Pagamento</p>
                      {[
                        { label: 'Tipo solicitado', val: (r as any).tipoPagamentoSolicitado === 'total' ? 'Pagamento total' : `Reserva ${r.percentualReserva}%` },
                        { label: 'Valor a cobrar',  val: fmt(getValorCobrar(r)) },
                        { label: 'Valor pago',      val: r.valorPago ? fmt(r.valorPago) : '—' },
                        { label: 'Forma',           val: r.formaPagamento || '—' },
                        { label: 'Comprovante',     val: r.transacaoId || '—' },
                      ].map(({ label, val }) => (
                        <div key={label} className="flex justify-between text-xs gap-2">
                          <span className="text-stone-500 flex-shrink-0">{label}</span>
                          <span className="text-stone-300 text-right">{val}</span>
                        </div>
                      ))}

                      <div className="pt-3 space-y-2">
                        <button onClick={() => abrirWppCliente(r)}
                          className="flex items-center gap-1.5 text-xs font-bold text-green-500 hover:text-green-400 transition-colors">
                          <MessageCircle size={12}/>Abrir WhatsApp do cliente
                        </button>
                        <p className="text-[9px] text-stone-600 font-mono break-all">token: {r.token}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══ MODAL — MARCAR COMO PAGO ══════════════════════════════════════════ */}
      {modalPagamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 w-full max-w-md space-y-5 max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div>
              <h3 className="font-bold text-white text-lg">Marcar como Pago</h3>
              <p className="text-xs text-stone-500 mt-1">
                Ao confirmar, as datas serão <span className="text-amber-400 font-bold">bloqueadas no calendário</span> e o PDF será <span className="text-amber-400 font-bold">gerado automaticamente</span>.
              </p>
            </div>

            {/* Resumo do cliente */}
            <div className="bg-stone-900 rounded-xl p-4 border border-white/5 space-y-3">
              <div className="flex items-center gap-2">
                <User size={14} className="text-amber-500"/>
                <p className="font-bold text-white text-sm">{modalPagamento.clienteNome}</p>
              </div>

              {/* Todas as datas */}
              <div className="space-y-1.5">
                <p className="text-[9px] text-stone-500 uppercase tracking-widest">Datas agendadas</p>
                {getDatas(modalPagamento).map((d, i) => {
                  const det = ((modalPagamento as any).diasDetalhes || [])[i];
                  const tipoLabel: Record<string, string> = { util:'Dia Útil', sabado:'Sábado', domingo:'Domingo', fimdesemana:'Fim de Semana' };
                  return (
                    <div key={i} className="flex justify-between text-sm bg-stone-800/50 rounded-lg px-3 py-2">
                      <div>
                        <span className="text-white font-bold">{fmtDateLong(d)}</span>
                        {det && <span className="text-stone-500 text-xs ml-2">{tipoLabel[det.tipoDiaria]}</span>}
                      </div>
                      {det && <span className="text-amber-500 font-bold">{fmt(det.valor)}</span>}
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-white/5 pt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Total</span>
                  <span className="text-white font-bold">{fmt(modalPagamento.valorTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">
                    {(modalPagamento as any).tipoPagamentoSolicitado === 'total' ? 'Pagamento total' : `Reserva (${modalPagamento.percentualReserva}%)`}
                  </span>
                  <span className="text-amber-500 font-bold">{fmt(getValorCobrar(modalPagamento))}</span>
                </div>
              </div>
            </div>

            {/* Campos */}
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Valor Recebido *</label>
                <input type="number" value={valorPago} onChange={e => setValorPago(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-stone-900 px-4 py-3 text-sm text-white focus:border-amber-500/50 focus:outline-none"
                  placeholder="0,00"/>
                <div className="flex gap-3 mt-1.5">
                  <button onClick={() => setValorPago(String(modalPagamento.valorReserva))}
                    className="text-[10px] text-amber-500 hover:text-amber-400">
                    {fmt(modalPagamento.valorReserva)} (reserva)
                  </button>
                  <span className="text-stone-700">·</span>
                  <button onClick={() => setValorPago(String(modalPagamento.valorTotal))}
                    className="text-[10px] text-amber-500 hover:text-amber-400">
                    {fmt(modalPagamento.valorTotal)} (total)
                  </button>
                </div>
              </div>

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

              <div>
                <label className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Comprovante / ID (opcional)</label>
                <input type="text" value={transacaoId} onChange={e => setTransacaoId(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-stone-900 px-4 py-3 text-sm text-white focus:border-amber-500/50 focus:outline-none placeholder:text-stone-600"
                  placeholder="Código do comprovante PIX..."/>
              </div>
            </div>

            {/* Confirmação de sucesso + ações pós-confirmação */}
            {pdfGerado && (
              <div className="rounded-xl bg-green-900/20 border border-green-800/30 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle size={18} className="text-green-500 flex-shrink-0"/>
                  <div>
                    <p className="text-green-400 font-bold text-sm">Pagamento confirmado! ✅</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">PDF baixado · Calendário bloqueado · Protocolo gerado</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => compartilharPdfWpp(modalPagamento)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold uppercase tracking-widest transition-all">
                    <MessageCircle size={13}/>Enviar PDF no WhatsApp
                  </button>
                  <button onClick={() => { setModalPagamento(null); setPdfGerado(false); }}
                    className="flex-1 py-2.5 rounded-lg border border-white/10 text-stone-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all">
                    Fechar
                  </button>
                </div>
              </div>
            )}

            {!pdfGerado && (
              <div className="flex gap-3">
                <button onClick={() => setModalPagamento(null)}
                  className="flex-1 py-3 rounded-lg border border-white/10 text-stone-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all">
                  Cancelar
                </button>
                <button onClick={handleConfirmar} disabled={confirmando || !valorPago}
                  className="flex-1 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {confirmando
                    ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"/>Confirmando...</>
                    : <><CheckCircle size={15}/>Confirmar + Gerar PDF</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ MODAL — GERAR LINK MANUAL ═════════════════════════════════════════ */}
      {modalLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 w-full max-w-md space-y-5">
            <h3 className="font-bold text-white text-lg">Gerar Link Manual</h3>
            <p className="text-xs text-stone-400">Gere um link para enviar ao cliente. Ele preenche os dados e escolhe a forma de pagamento.</p>

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
                <div className="bg-stone-900 rounded-lg p-4 text-sm space-y-1.5">
                  <div className="flex justify-between"><span className="text-stone-500">Tipo</span><span className="text-white font-bold">{label[tipo]}</span></div>
                  <div className="flex justify-between"><span className="text-stone-500">Total</span><span className="text-amber-500 font-bold">{fmt(total)}</span></div>
                  <div className="flex justify-between"><span className="text-stone-500">Reserva ({config.percentualReserva}%)</span><span className="text-stone-300">{fmt(reserva)}</span></div>
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
