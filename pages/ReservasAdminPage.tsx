import React, { useState, useEffect } from 'react';
import { Link2, Copy, CheckCircle, XCircle, Clock, DollarSign,
  FileText, Search, Filter, RefreshCw, Calendar } from 'lucide-react';
import {
  getAllReservas, getReservaConfig, confirmarPagamento,
  cancelarReserva, criarReserva, calcularTipoDiaria, calcularValor
} from '../services/reservas';
import { gerarComprovantePDF } from '../services/pdf';
import { Reserva, ReservaConfig, ReservaStatus, TipoDiaria } from '../types';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const STATUS_COLORS: Record<ReservaStatus, string> = {
  [ReservaStatus.PENDENTE_PAGAMENTO]: 'text-amber-400 bg-amber-900/20 border-amber-800/40',
  [ReservaStatus.RESERVADO]:          'text-blue-400 bg-blue-900/20 border-blue-800/40',
  [ReservaStatus.CONFIRMADO]:         'text-green-400 bg-green-900/20 border-green-800/40',
  [ReservaStatus.CANCELADO]:          'text-red-400 bg-red-900/20 border-red-800/40',
  [ReservaStatus.EXPIRADO]:           'text-stone-500 bg-stone-900 border-stone-700'
};

const STATUS_LABEL: Record<ReservaStatus, string> = {
  [ReservaStatus.PENDENTE_PAGAMENTO]: 'Pendente',
  [ReservaStatus.RESERVADO]:          'Reservado',
  [ReservaStatus.CONFIRMADO]:         'Confirmado',
  [ReservaStatus.CANCELADO]:          'Cancelado',
  [ReservaStatus.EXPIRADO]:           'Expirado'
};

const ReservasAdminPage: React.FC = () => {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [config, setConfig] = useState<ReservaConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<ReservaStatus | 'todos'>('todos');
  const [copied, setCopied] = useState('');

  // Modal confirmar pagamento
  const [modalPagamento, setModalPagamento] = useState<Reserva | null>(null);
  const [valorPago, setValorPago] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [transacaoId, setTransacaoId] = useState('');
  const [confirmando, setConfirmando] = useState(false);

  // Modal gerar link manual
  const [modalLink, setModalLink] = useState(false);
  const [dataLink, setDataLink] = useState('');
  const [linkGerado, setLinkGerado] = useState('');
  const [gerandoLink, setGerandoLink] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const [r, c] = await Promise.all([getAllReservas(), getReservaConfig()]);
      setReservas(r.sort((a, b) => a.data.localeCompare(b.data)));
      setConfig(c);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const copiarLink = (token: string) => {
    const link = `${window.location.origin}/#/reserva/${token}`;
    navigator.clipboard.writeText(link);
    setCopied(token);
    setTimeout(() => setCopied(''), 2500);
  };

  const handleConfirmar = async () => {
    if (!modalPagamento || !valorPago) return;
    setConfirmando(true);
    try {
      await confirmarPagamento(
        modalPagamento.id,
        Number(valorPago),
        formaPagamento,
        transacaoId || undefined
      );
      setModalPagamento(null);
      setValorPago('');
      setTransacaoId('');
      carregar();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setConfirmando(false);
    }
  };

  const handleCancelar = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta reserva?')) return;
    await cancelarReserva(id);
    carregar();
  };

  const handleGerarLink = async () => {
    if (!dataLink || !config) return;
    setGerandoLink(true);
    try {
      const tipo = calcularTipoDiaria(dataLink);
      const reserva = await criarReserva(
        dataLink, tipo, config,
        { nome: 'A definir', cpfCnpj: '', telefone: '', email: '', tipoEvento: '', numConvidados: 0 },
        true
      );
      const link = `${window.location.origin}/#/reserva/${reserva.token}`;
      setLinkGerado(link);
      carregar();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setGerandoLink(false);
    }
  };

  const filtradas = reservas.filter(r => {
    const matchSearch =
      r.clienteNome.toLowerCase().includes(search.toLowerCase()) ||
      r.data.includes(search) ||
      (r.protocolo || '').includes(search) ||
      r.token.includes(search);
    const matchStatus = filtroStatus === 'todos' || r.status === filtroStatus;
    return matchSearch && matchStatus;
  });

  const totalReservado = reservas
    .filter(r => [ReservaStatus.RESERVADO, ReservaStatus.CONFIRMADO].includes(r.status))
    .reduce((s, r) => s + (r.valorPago || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-amber-600 mb-1">
            Gestão
          </p>
          <h2 className="font-serif text-4xl font-bold text-stone-100 tracking-tight">
            Reservas Online
          </h2>
        </div>
        <div className="flex gap-3">
          <button onClick={carregar}
            className="p-2.5 rounded-lg border border-white/10 text-stone-400 hover:text-white hover:border-white/20 transition-all">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => { setModalLink(true); setLinkGerado(''); setDataLink(''); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-600/10 border border-amber-600/20 text-amber-500 text-xs font-bold uppercase tracking-widest hover:bg-amber-600/20 transition-all">
            <Link2 size={14} />Gerar Link Manual
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', val: reservas.length, color: 'text-white' },
          { label: 'Pendentes', val: reservas.filter(r => r.status === ReservaStatus.PENDENTE_PAGAMENTO).length, color: 'text-amber-400' },
          { label: 'Confirmados', val: reservas.filter(r => r.status === ReservaStatus.CONFIRMADO).length, color: 'text-green-400' },
          { label: 'Receita', val: fmt(totalReservado), color: 'text-green-400' }
        ].map(({ label, val, color }) => (
          <div key={label} className="glass p-5 rounded-xl">
            <p className="text-[9px] text-stone-500 uppercase tracking-widest">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{val}</p>
          </div>
        ))}
      </div>

      {/* FILTROS */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, data, protocolo..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-white/10 bg-stone-900 text-sm text-white focus:border-amber-500/50 focus:outline-none placeholder:text-stone-600"
          />
        </div>
        <select
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value as any)}
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
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
        </div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-16 text-stone-600">
          <Calendar size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma reserva encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(r => (
            <div key={r.id} className="glass rounded-xl p-5 hover:border-white/10 transition-all">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${STATUS_COLORS[r.status]}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                    {r.protocolo && (
                      <span className="text-[9px] text-stone-500 font-mono">{r.protocolo}</span>
                    )}
                    {r.criadoPorAdmin && (
                      <span className="text-[9px] text-amber-700 bg-amber-900/20 px-2 py-0.5 rounded-full border border-amber-800/30">
                        Admin
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    <div>
                      <p className="text-[9px] text-stone-500 uppercase tracking-widest">Data</p>
                      <p className="text-sm font-bold text-white">
                        {r.data.split('-').reverse().join('/')}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-stone-500 uppercase tracking-widest">Cliente</p>
                      <p className="text-sm font-bold text-white truncate max-w-[200px]">
                        {r.clienteNome || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-stone-500 uppercase tracking-widest">Valor Total</p>
                      <p className="text-sm font-bold text-amber-500">{fmt(r.valorTotal)}</p>
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
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => copiarLink(r.token)}
                    title="Copiar link"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 text-stone-400 hover:text-amber-500 hover:border-amber-600/30 text-xs font-bold transition-all">
                    <Copy size={13} />
                    {copied === r.token ? 'Copiado!' : 'Link'}
                  </button>

                  {(r.status === ReservaStatus.PENDENTE_PAGAMENTO ||
                    r.status === ReservaStatus.RESERVADO) && (
                    <button
                      onClick={() => {
                        setModalPagamento(r);
                        setValorPago(String(r.valorReserva));
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-900/20 border border-green-800/30 text-green-400 hover:bg-green-900/30 text-xs font-bold transition-all">
                      <DollarSign size={13} />Confirmar Pgto
                    </button>
                  )}

                  {(r.status === ReservaStatus.CONFIRMADO ||
                    r.status === ReservaStatus.RESERVADO) && config && (
                    <button
                      onClick={() => gerarComprovantePDF(r, config)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 text-stone-400 hover:text-white text-xs font-bold transition-all">
                      <FileText size={13} />PDF
                    </button>
                  )}

                  {r.status !== ReservaStatus.CANCELADO &&
                    r.status !== ReservaStatus.EXPIRADO && (
                    <button
                      onClick={() => handleCancelar(r.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-900/10 border border-red-900/30 text-red-500 hover:bg-red-900/20 text-xs font-bold transition-all">
                      <XCircle size={13} />Cancelar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL — CONFIRMAR PAGAMENTO */}
      {modalPagamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 w-full max-w-md space-y-5">
            <h3 className="font-bold text-white text-lg">Confirmar Pagamento</h3>
            <div className="bg-stone-900 rounded-lg p-4 space-y-1 text-sm">
              <p className="text-stone-300"><span className="text-stone-500">Cliente:</span> {modalPagamento.clienteNome}</p>
              <p className="text-stone-300"><span className="text-stone-500">Data:</span> {modalPagamento.data.split('-').reverse().join('/')}</p>
              <p className="text-stone-300"><span className="text-stone-500">Total:</span> {fmt(modalPagamento.valorTotal)}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">
                  Valor Recebido (R$) *
                </label>
                <input type="number" value={valorPago}
                  onChange={e => setValorPago(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-stone-900 px-4 py-3 text-sm text-white focus:border-amber-500/50 focus:outline-none"
                  placeholder="0,00" />
                <div className="flex gap-2 mt-1.5">
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
                <label className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">
                  Forma de Pagamento
                </label>
                <select value={formaPagamento}
                  onChange={e => setFormaPagamento(e.target.value)}
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
                <label className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">
                  ID da Transação (opcional)
                </label>
                <input type="text" value={transacaoId}
                  onChange={e => setTransacaoId(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-stone-900 px-4 py-3 text-sm text-white focus:border-amber-500/50 focus:outline-none placeholder:text-stone-600"
                  placeholder="Código do comprovante PIX..." />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalPagamento(null)}
                className="flex-1 py-3 rounded-lg border border-white/10 text-stone-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all">
                Cancelar
              </button>
              <button onClick={handleConfirmar} disabled={confirmando || !valorPago}
                className="flex-1 py-3 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {confirmando
                  ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"/>Confirmando...</>
                  : <><CheckCircle size={15} />Confirmar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL — GERAR LINK MANUAL */}
      {modalLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 w-full max-w-md space-y-5">
            <h3 className="font-bold text-white text-lg">Gerar Link de Reserva</h3>
            <p className="text-xs text-stone-400">
              Gere um link exclusivo para enviar ao cliente. Os dados do cliente serão preenchidos pelo próprio cliente ao acessar.
            </p>

            <div>
              <label className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">
                Data do Evento *
              </label>
              <input type="date" value={dataLink}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => { setDataLink(e.target.value); setLinkGerado(''); }}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-stone-900 px-4 py-3 text-sm text-white focus:border-amber-500/50 focus:outline-none" />
            </div>

            {dataLink && config && (
              <div className="bg-stone-900 rounded-lg p-4 text-sm space-y-1">
                {(() => {
                  const tipo = calcularTipoDiaria(dataLink);
                  const total = calcularValor(tipo, config);
                  const reserva = Math.ceil(total * config.percentualReserva / 100);
                  const tipoLabel: Record<string, string> = {
                    util: 'Dia Útil', sabado: 'Sábado', domingo: 'Domingo', fimdesemana: 'Fim de Semana'
                  };
                  return <>
                    <p className="text-stone-300"><span className="text-stone-500">Tipo:</span> {tipoLabel[tipo]}</p>
                    <p className="text-stone-300"><span className="text-stone-500">Valor Total:</span> <span className="text-amber-500 font-bold">{fmt(total)}</span></p>
                    <p className="text-stone-300"><span className="text-stone-500">Reserva ({config.percentualReserva}%):</span> {fmt(reserva)}</p>
                  </>;
                })()}
              </div>
            )}

            {linkGerado ? (
              <div className="bg-stone-900 rounded-lg p-4 border border-amber-600/20">
                <p className="text-[9px] text-stone-500 uppercase tracking-widest mb-2">Link gerado</p>
                <p className="text-xs text-stone-300 break-all mb-3">{linkGerado}</p>
                <button
                  onClick={() => { navigator.clipboard.writeText(linkGerado); setCopied('modal'); setTimeout(() => setCopied(''), 2000); }}
                  className="flex items-center gap-1.5 text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors">
                  <Copy size={13} />
                  {copied === 'modal' ? 'Copiado!' : 'Copiar link'}
                </button>
              </div>
            ) : (
              <button onClick={handleGerarLink} disabled={gerandoLink || !dataLink}
                className="w-full py-3.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {gerandoLink
                  ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"/>Gerando...</>
                  : <><Link2 size={14} />Gerar Link</>}
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
