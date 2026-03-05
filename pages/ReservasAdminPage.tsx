import React, { useState, useEffect, useRef } from 'react';
import {
  Link2, Copy, CheckCircle, XCircle, DollarSign,
  FileText, Search, RefreshCw, Calendar, MessageCircle,
  Send, AlertCircle, ChevronDown, ChevronUp, User,
  Plus, Trash2, Paperclip, Image, X, ExternalLink, UserCheck, Globe,
  Edit3, Loader2, CloudUpload, Eye
} from 'lucide-react';
import {
  getAllReservas, getReservaConfig, confirmarPagamento,
  cancelarReserva, criarReservaRascunho, calcularTipoDiaria, calcularValor
} from '../services/reservas';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { gerarComprovantePDF } from '../services/pdf';
import { Reserva, ReservaConfig, ReservaStatus, TipoDiaria } from '../types';

const IMGBB_API_KEY = '9f8d8580331d26fcb2e3fae394e63b7f';

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

  // Comprovante de pagamento (upload de arquivo)
  const [comprovanteFile,     setComprovanteFile]     = useState<File | null>(null);
  const [comprovantePreview,  setComprovantePreview]  = useState<string | null>(null);
  const comprovanteInputRef = useRef<HTMLInputElement>(null);

  // Modal gerar link manual
  const [modalLink,   setModalLink]   = useState(false);
  const [linkGerado,  setLinkGerado]  = useState('');
  const [gerandoLink, setGerandoLink] = useState(false);

  // Novo: múltiplas datas no link + destinatário
  const [datasLink,         setDatasLink]         = useState<string[]>(['']);
  const [destinatarioTipo,  setDestinatarioTipo]  = useState<'externo' | 'interno'>('externo');
  const [destinatarioNome,  setDestinatarioNome]  = useState('');
  const [destinatarioTel,   setDestinatarioTel]   = useState('');
  const [linkGeradoWpp,     setLinkGeradoWpp]     = useState(false);

  // Modal editar pagamento (complemento de valor)
  const [modalEditPag,       setModalEditPag]       = useState<Reserva | null>(null);
  const [editValorPago,      setEditValorPago]      = useState('');
  const [editFormaPagamento, setEditFormaPagamento] = useState('PIX');
  const [editTransacaoId,    setEditTransacaoId]    = useState('');
  const [editando,           setEditando]           = useState(false);
  const [comprovanteEditFile,    setComprovanteEditFile]    = useState<File | null>(null);
  const [comprovanteEditPreview, setComprovanteEditPreview] = useState<string | null>(null);
  const comprovanteEditRef = useRef<HTMLInputElement>(null);

  // Estado de upload do comprovante
  const [uploadingComprovante, setUploadingComprovante] = useState(false);
  const [uploadProgress,       setUploadProgress]       = useState('');

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

  const handleConfirmar = async () => {
    if (!modalPagamento || !valorPago || !config) return;
    setConfirmando(true);
    try {
      // Faz upload do comprovante (imagem ou PDF) para ImgBB antes de confirmar
      let comprovanteUrl: string | undefined;
      if (comprovanteFile) {
        comprovanteUrl = await uploadComprovanteImgBB(comprovanteFile);
      }

      await confirmarPagamento(
        modalPagamento.id,
        Number(valorPago),
        formaPagamento,
        transacaoId || undefined
      );

      // Salva URL do comprovante no Firestore se houve upload
      if (comprovanteUrl) {
        await updateDoc(doc(db, 'reservas', modalPagamento.id), { comprovanteUrl });
      }

      // Recarrega e gera PDF
      await carregar();
      const reservaAtualizada = await import('../services/reservas')
        .then(m => m.getReservaById(modalPagamento.id));

      if (reservaAtualizada) {
        gerarComprovantePDF(reservaAtualizada, config);
        setPdfGerado(true);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setConfirmando(false);
    }
  };

  const handleCancelar = async (id: string) => {
    if (!confirm('Cancelar esta reserva? A data voltará a ficar disponível no calendário.')) return;
    await cancelarReserva(id);
    carregar();
  };

  // ── Apagar agendamento permanentemente ────────────────────────────────────

  const handleApagar = async (r: Reserva) => {
    const nome = r.clienteNome !== 'A definir' ? r.clienteNome : 'este agendamento';
    if (!confirm(`Apagar permanentemente ${nome}?\n\nEsta ação não pode ser desfeita. A data voltará a ficar disponível.`)) return;
    try {
      await deleteDoc(doc(db, 'reservas', r.id));
      carregar();
    } catch (e: any) { alert('Erro ao apagar: ' + e.message); }
  };

  // ── Upload comprovante para ImgBB ─────────────────────────────────────────

  const uploadComprovanteImgBB = async (file: File): Promise<string> => {
    setUploadingComprovante(true);
    setUploadProgress('Comprimindo...');
    try {
      // Comprime se for imagem
      let uploadBlob: Blob = file;
      if (file.type.startsWith('image/')) {
        uploadBlob = await new Promise<Blob>((res, rej) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = ev => {
            const img = new window.Image();
            img.src = ev.target?.result as string;
            img.onload = () => {
              const canvas = document.createElement('canvas');
              let w = img.width, h = img.height;
              const max = 1920;
              if (w > max || h > max) { if (w > h) { h = (h/w)*max; w = max; } else { w = (w/h)*max; h = max; } }
              canvas.width = w; canvas.height = h;
              canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
              canvas.toBlob(b => b ? res(b) : rej(new Error('Erro ao comprimir')), 'image/jpeg', 0.85);
            };
          };
        });
      }
      setUploadProgress('Enviando para nuvem...');
      const formData = new FormData();
      formData.append('image', uploadBlob);
      const resp = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
      if (!resp.ok) throw new Error('Falha no upload');
      const data = await resp.json();
      setUploadProgress('');
      return data.data.url as string;
    } finally {
      setUploadingComprovante(false);
      setUploadProgress('');
    }
  };

  // ── Modal confirmar pagamento — com upload real ────────────────────────────

  const abrirModalPagamento = (r: Reserva) => {
    setModalPagamento(r);
    setValorPago(String(getValorCobrar(r)));
    setFormaPagamento('PIX');
    setTransacaoId('');
    setPdfGerado(false);
    setComprovanteFile(null);
    setComprovantePreview(null);
  };

  const handleComprovanteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setComprovanteFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = ev => setComprovantePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setComprovantePreview(null);
    }
  };

  const removerComprovante = () => {
    setComprovanteFile(null);
    setComprovantePreview(null);
    if (comprovanteInputRef.current) comprovanteInputRef.current.value = '';
  };

  // ── Editar pagamento (complemento) ────────────────────────────────────────

  const abrirModalEditPag = (r: Reserva) => {
    setModalEditPag(r);
    setEditValorPago(String(r.valorTotal));   // sugere valor total como padrão
    setEditFormaPagamento(r.formaPagamento || 'PIX');
    setEditTransacaoId('');
    setComprovanteEditFile(null);
    setComprovanteEditPreview(null);
  };

  const handleComprovanteEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setComprovanteEditFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = ev => setComprovanteEditPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setComprovanteEditPreview(null);
    }
  };

  const handleSalvarEdicaoPagamento = async () => {
    if (!modalEditPag || !editValorPago || !config) return;
    setEditando(true);
    try {
      const novoValor = Number(editValorPago);
      const isPago100 = novoValor >= modalEditPag.valorTotal;

      // Faz upload do comprovante se houver
      let comprovanteUrl: string | undefined;
      if (comprovanteEditFile) {
        comprovanteUrl = await uploadComprovanteImgBB(comprovanteEditFile);
      }

      await updateDoc(doc(db, 'reservas', modalEditPag.id), {
        valorPago:      novoValor,
        formaPagamento: editFormaPagamento,
        ...(editTransacaoId ? { transacaoId: editTransacaoId } : {}),
        ...(comprovanteUrl ? { comprovanteUrl } : {}),
        status: isPago100 ? ReservaStatus.CONFIRMADO : ReservaStatus.RESERVADO,
      });

      carregar();
      setModalEditPag(null);
    } catch (e: any) {
      alert('Erro ao atualizar: ' + e.message);
    } finally {
      setEditando(false);
    }
  };

  // ── Link manual (multi-data) ──────────────────────────────────────────────

  const addDataLink = () => setDatasLink(prev => [...prev, '']);
  const removeDataLink = (i: number) => setDatasLink(prev => prev.filter((_, idx) => idx !== i));
  const updateDataLink = (i: number, val: string) => {
    setDatasLink(prev => prev.map((d, idx) => idx === i ? val : d));
    setLinkGerado('');
  };

  const calcDatasLinkInfo = () => {
    if (!config) return null;
    const validas = datasLink.filter(Boolean);
    if (!validas.length) return null;
    return validas.map(d => {
      const tipo  = calcularTipoDiaria(d);
      const valor = calcularValor(tipo, config);
      return { dateStr: d, tipo, valor };
    });
  };

  const handleGerarLink = async () => {
    const validas = datasLink.filter(Boolean);
    if (!validas.length || !config) return;
    setGerandoLink(true);
    try {
      const dias = validas.map(d => ({
        dateStr: d,
        tipoDiaria: calcularTipoDiaria(d),
        valor:      calcularValor(calcularTipoDiaria(d), config)
      }));
      const nomeCliente = destinatarioTipo === 'interno' && destinatarioNome
        ? destinatarioNome
        : 'A definir';
      const r = await criarReservaRascunho(
        dias,
        config,
        { nome: nomeCliente, cpfCnpj: '', telefone: destinatarioTel || '', email: '', tipoEvento: '', numConvidados: 0 }
      );
      const url = `${window.location.origin}/#/reserva/${r.token}`;
      setLinkGerado(url);
      setLinkGeradoWpp(false);
      carregar();
    } catch (e: any) { alert(e.message); }
    finally { setGerandoLink(false); }
  };

  const enviarLinkWpp = () => {
    if (!linkGerado) return;
    const nome  = destinatarioNome || 'cliente';
    const info  = calcDatasLinkInfo();
    const datas = info ? info.map(d => `• ${fmtDateLong(d.dateStr)}`).join('\n') : '';
    const total = info ? info.reduce((s, d) => s + d.valor, 0) : 0;
    const msg =
      `Olá${destinatarioNome ? ', ' + destinatarioNome : ''}! 👋\n\n` +
      `Segue o link do seu orçamento no *${config?.salonNome || 'Latitude22'}*:\n\n` +
      (datas ? `📅 *Data(s) disponível(is):*\n${datas}\n\n` : '') +
      (total ? `💰 *Valor estimado: ${fmt(total)}*\n\n` : '') +
      `🔗 Acesse para confirmar os dados e finalizar sua reserva:\n${linkGerado}`;
    const tel = destinatarioTel.replace(/\D/g, '');
    if (tel) {
      window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
      navigator.clipboard.writeText(msg);
      alert('Telefone não informado — mensagem copiada para a área de transferência!');
    }
    setLinkGeradoWpp(true);
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
          <button onClick={() => { setModalLink(true); setLinkGerado(''); setDatasLink(['']); setDestinatarioNome(''); setDestinatarioTel(''); setDestinatarioTipo('externo'); setLinkGeradoWpp(false); }}
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

                      {/* Editar pagamento — complemento (saldo restante) */}
                      {r.status === ReservaStatus.RESERVADO && (
                        <button onClick={() => abrirModalEditPag(r)}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-blue-900/20 border border-blue-800/30 text-blue-400 hover:bg-blue-900/30 text-xs font-bold transition-all whitespace-nowrap">
                          <Edit3 size={13}/>Editar Pagamento
                        </button>
                      )}

                      {/* Ver comprovante do cliente */}
                      {(r as any).comprovanteUrl && (
                        <a href={(r as any).comprovanteUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-white/10 text-stone-400 hover:text-amber-500 hover:border-amber-600/30 text-xs font-bold transition-all">
                          <Eye size={13}/>Comprovante
                        </a>
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

                      {/* Cancelar — libera data no calendário */}
                      {r.status !== ReservaStatus.CANCELADO && r.status !== ReservaStatus.EXPIRADO && (
                        <button onClick={() => handleCancelar(r.id)}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-red-900/10 border border-red-900/30 text-red-500 hover:bg-red-900/20 text-xs font-bold transition-all">
                          <XCircle size={13}/>Cancelar
                        </button>
                      )}

                      {/* Apagar permanentemente */}
                      <button onClick={() => handleApagar(r)}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-red-950/30 border border-red-900/20 text-red-700 hover:text-red-500 hover:border-red-800/40 text-xs font-bold transition-all">
                        <Trash2 size={13}/>Apagar
                      </button>

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
                        { label: 'Valor total',     val: fmt(r.valorTotal) },
                        { label: 'Valor pago',      val: r.valorPago ? fmt(r.valorPago) : '—' },
                        { label: 'Saldo restante',  val: r.valorPago != null ? fmt(Math.max(0, r.valorTotal - r.valorPago)) : '—' },
                        { label: 'Forma',           val: r.formaPagamento || '—' },
                        { label: 'Cód. comprovante',val: r.transacaoId || '—' },
                      ].map(({ label, val }) => (
                        <div key={label} className="flex justify-between text-xs gap-2">
                          <span className="text-stone-500 flex-shrink-0">{label}</span>
                          <span className="text-stone-300 text-right">{val}</span>
                        </div>
                      ))}

                      {/* Comprovante em nuvem */}
                      {(r as any).comprovanteUrl && (
                        <a href={(r as any).comprovanteUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors pt-1">
                          <Eye size={12}/>Ver comprovante do cliente
                        </a>
                      )}

                      <div className="pt-2 space-y-2">
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

              {/* Upload do comprovante (imagem ou PDF → ImgBB) */}
              <div>
                <label className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">
                  Comprovante do Cliente (foto/PDF → salvo na nuvem)
                </label>
                <input
                  ref={comprovanteInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleComprovanteChange}
                />
                {uploadingComprovante ? (
                  <div className="mt-1.5 w-full rounded-lg border border-amber-600/30 bg-amber-900/10 px-4 py-4 flex items-center gap-3">
                    <Loader2 size={16} className="animate-spin text-amber-500 flex-shrink-0"/>
                    <span className="text-xs text-amber-400 font-bold">{uploadProgress || 'Enviando...'}</span>
                  </div>
                ) : !comprovanteFile ? (
                  <button
                    type="button"
                    onClick={() => comprovanteInputRef.current?.click()}
                    className="mt-1.5 w-full rounded-lg border border-dashed border-white/20 bg-stone-900/50 px-4 py-4 text-sm text-stone-500 hover:border-amber-500/40 hover:text-stone-300 transition-all flex items-center justify-center gap-2"
                  >
                    <CloudUpload size={15}/>
                    Anexar foto ou PDF — será salvo na nuvem
                  </button>
                ) : (
                  <div className="mt-1.5 rounded-lg border border-white/10 bg-stone-900 p-3 flex items-start gap-3">
                    {comprovantePreview ? (
                      <img src={comprovantePreview} alt="comprovante"
                        className="h-16 w-16 rounded-lg object-cover border border-white/10 flex-shrink-0 cursor-pointer"
                        onClick={() => window.open(comprovantePreview!, '_blank')}
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-stone-800 border border-white/10 flex items-center justify-center flex-shrink-0">
                        <FileText size={22} className="text-amber-500"/>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-bold truncate">{comprovanteFile.name}</p>
                      <p className="text-[10px] text-stone-500 mt-0.5">{(comprovanteFile.size / 1024).toFixed(0)} KB · {comprovanteFile.type.startsWith('image/') ? 'Imagem' : 'PDF'}</p>
                      <div className="flex gap-3 mt-2">
                        {comprovantePreview && (
                          <button onClick={() => window.open(comprovantePreview!, '_blank')}
                            className="text-[10px] text-amber-500 hover:text-amber-400 flex items-center gap-1">
                            <Eye size={10}/>Pré-visualizar
                          </button>
                        )}
                        <button onClick={() => comprovanteInputRef.current?.click()}
                          className="text-[10px] text-stone-400 hover:text-white flex items-center gap-1">
                          <Image size={10}/>Trocar
                        </button>
                        <button onClick={removerComprovante}
                          className="text-[10px] text-red-500 hover:text-red-400 flex items-center gap-1">
                          <X size={10}/>Remover
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {comprovanteFile && !uploadingComprovante && (
                  <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                    <CloudUpload size={10}/>Será enviado para a nuvem ao confirmar o pagamento.
                  </p>
                )}
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
                <button onClick={() => setModalPagamento(null)} disabled={confirmando || uploadingComprovante}
                  className="flex-1 py-3 rounded-lg border border-white/10 text-stone-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-40">
                  Cancelar
                </button>
                <button onClick={handleConfirmar} disabled={confirmando || uploadingComprovante || !valorPago}
                  className="flex-1 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {uploadingComprovante
                    ? <><Loader2 size={14} className="animate-spin"/>{uploadProgress || 'Enviando...'}</>
                    : confirmando
                      ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"/>Confirmando...</>
                      : <><CheckCircle size={15}/>Confirmar + Gerar PDF</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ MODAL — GERAR LINK DE ORÇAMENTO ══════════════════════════════════ */}
      {modalLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 w-full max-w-lg space-y-5 max-h-[92vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-white text-lg">Gerar Link de Orçamento</h3>
                <p className="text-xs text-stone-400 mt-1">Adicione uma ou mais datas e defina o destinatário para enviar o orçamento.</p>
              </div>
              <button onClick={() => { setModalLink(false); setLinkGerado(''); setDatasLink(['']); }}
                className="p-1.5 rounded-lg text-stone-500 hover:text-white hover:bg-white/5 transition-all">
                <X size={16}/>
              </button>
            </div>

            {/* Tipo de destinatário */}
            <div>
              <label className="text-[10px] text-stone-400 uppercase tracking-widest font-bold mb-2 block">Destinatário</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { val: 'externo', label: 'Cliente Externo', icon: Globe, desc: 'Pessoa de fora' },
                  { val: 'interno', label: 'Contato Interno', icon: UserCheck, desc: 'Equipe / parceiro' }
                ] as const).map(({ val, label, icon: Icon, desc }) => (
                  <button key={val} onClick={() => setDestinatarioTipo(val)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      destinatarioTipo === val
                        ? 'border-amber-600/50 bg-amber-600/10 text-white'
                        : 'border-white/10 bg-stone-900/50 text-stone-400 hover:border-white/20'
                    }`}>
                    <Icon size={16} className={destinatarioTipo === val ? 'text-amber-500' : 'text-stone-600'}/>
                    <div>
                      <p className="text-xs font-bold">{label}</p>
                      <p className="text-[10px] text-stone-500">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Dados do destinatário */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">
                  {destinatarioTipo === 'interno' ? 'Nome (interno)' : 'Nome do cliente'}
                </label>
                <input
                  type="text"
                  value={destinatarioNome}
                  onChange={e => setDestinatarioNome(e.target.value)}
                  placeholder={destinatarioTipo === 'interno' ? 'Ex: João da equipe' : 'Ex: Maria Silva'}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-white focus:border-amber-500/50 focus:outline-none placeholder:text-stone-600"
                />
              </div>
              <div>
                <label className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">WhatsApp</label>
                <input
                  type="tel"
                  value={destinatarioTel}
                  onChange={e => setDestinatarioTel(e.target.value)}
                  placeholder="(21) 99999-9999"
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-white focus:border-amber-500/50 focus:outline-none placeholder:text-stone-600"
                />
              </div>
            </div>

            {/* Datas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Data(s) do Evento</label>
                <button onClick={addDataLink}
                  className="flex items-center gap-1 text-[10px] text-amber-500 hover:text-amber-400 font-bold uppercase tracking-widest transition-colors">
                  <Plus size={12}/>Adicionar data
                </button>
              </div>
              <div className="space-y-2">
                {datasLink.map((d, i) => {
                  const info = d && config ? (() => {
                    const tipo  = calcularTipoDiaria(d);
                    const valor = calcularValor(tipo, config);
                    const label: Record<string, string> = { util:'Dia Útil', sabado:'Sábado', domingo:'Domingo', fimdesemana:'Fim de Semana' };
                    return { tipo: label[tipo], valor };
                  })() : null;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="date"
                        value={d}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={e => updateDataLink(i, e.target.value)}
                        className="flex-1 rounded-lg border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-white focus:border-amber-500/50 focus:outline-none"
                      />
                      {info && (
                        <div className="text-right flex-shrink-0">
                          <p className="text-[10px] text-stone-500">{info.tipo}</p>
                          <p className="text-xs font-bold text-amber-500">{fmt(info.valor)}</p>
                        </div>
                      )}
                      {datasLink.length > 1 && (
                        <button onClick={() => removeDataLink(i)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-900/20 transition-all flex-shrink-0">
                          <Trash2 size={13}/>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Resumo total */}
              {(() => {
                const infos = calcDatasLinkInfo();
                if (!infos || infos.length < 2) return null;
                const total = infos.reduce((s, d) => s + d.valor, 0);
                return (
                  <div className="mt-3 flex justify-between items-center bg-stone-900 rounded-lg px-4 py-2.5 border border-white/5">
                    <span className="text-xs text-stone-400">{infos.length} data{infos.length > 1 ? 's' : ''} · Total estimado</span>
                    <span className="text-sm font-bold text-amber-500">{fmt(total)}</span>
                  </div>
                );
              })()}
            </div>

            {/* Link gerado */}
            {linkGerado ? (
              <div className="bg-stone-900 rounded-xl p-4 border border-amber-600/20 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle size={15} className="text-green-500 flex-shrink-0"/>
                  <p className="text-xs font-bold text-green-400">Link criado com sucesso!</p>
                </div>
                <p className="text-[11px] text-stone-400 break-all font-mono bg-stone-800 rounded-lg p-2.5 border border-white/5">{linkGerado}</p>
                <div className="flex gap-2">
                  <button onClick={() => { navigator.clipboard.writeText(linkGerado); setCopied('modal'); setTimeout(()=>setCopied(''),2000); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-white/10 text-stone-400 hover:text-amber-500 hover:border-amber-600/30 text-xs font-bold uppercase tracking-widest transition-all">
                    <Copy size={12}/>{copied === 'modal' ? '✓ Copiado!' : 'Copiar link'}
                  </button>
                  <button onClick={enviarLinkWpp}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                      linkGeradoWpp
                        ? 'bg-green-900/20 border border-green-800/30 text-green-400'
                        : 'bg-green-600 hover:bg-green-500 text-white'
                    }`}>
                    <MessageCircle size={12}/>{linkGeradoWpp ? '✓ Enviado!' : (destinatarioTel ? 'Enviar no WhatsApp' : 'Copiar msg')}
                  </button>
                </div>
                <button onClick={() => { setLinkGerado(''); setDatasLink(['']); setDestinatarioNome(''); setDestinatarioTel(''); setLinkGeradoWpp(false); }}
                  className="w-full text-[10px] text-stone-600 hover:text-stone-400 transition-colors text-center uppercase tracking-widest">
                  Gerar outro link
                </button>
              </div>
            ) : (
              <button onClick={handleGerarLink} disabled={gerandoLink || !datasLink.some(Boolean)}
                className="w-full py-3.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {gerandoLink
                  ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"/>Gerando...</>
                  : <><Link2 size={14}/>Gerar Link de Orçamento</>}
              </button>
            )}

            <button onClick={() => { setModalLink(false); setLinkGerado(''); setDatasLink(['']); }}
              className="w-full py-3 rounded-lg border border-white/10 text-stone-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all">
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* ══ MODAL — EDITAR PAGAMENTO (SALDO RESTANTE) ════════════════════════ */}
      {modalEditPag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 w-full max-w-md space-y-5 max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  <Edit3 size={18} className="text-blue-400"/>Editar Pagamento
                </h3>
                <p className="text-xs text-stone-500 mt-1">Registre o complemento ou correção do valor pago.</p>
              </div>
              <button onClick={() => setModalEditPag(null)}
                className="p-1.5 rounded-lg text-stone-500 hover:text-white hover:bg-white/5 transition-all">
                <X size={16}/>
              </button>
            </div>

            {/* Resumo atual */}
            <div className="bg-stone-900 rounded-xl p-4 border border-white/5 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <User size={14} className="text-blue-400"/>
                <p className="font-bold text-white text-sm">{modalEditPag.clienteNome}</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-stone-800/60 rounded-lg p-2.5">
                  <p className="text-[9px] text-stone-500 uppercase tracking-widest">Total</p>
                  <p className="text-sm font-bold text-white mt-1">{fmt(modalEditPag.valorTotal)}</p>
                </div>
                <div className="bg-green-900/20 rounded-lg p-2.5 border border-green-800/20">
                  <p className="text-[9px] text-stone-500 uppercase tracking-widest">Pago</p>
                  <p className="text-sm font-bold text-green-400 mt-1">{fmt(modalEditPag.valorPago || 0)}</p>
                </div>
                <div className="bg-amber-900/20 rounded-lg p-2.5 border border-amber-800/20">
                  <p className="text-[9px] text-stone-500 uppercase tracking-widest">Saldo</p>
                  <p className="text-sm font-bold text-amber-400 mt-1">{fmt(Math.max(0, modalEditPag.valorTotal - (modalEditPag.valorPago || 0)))}</p>
                </div>
              </div>
            </div>

            {/* Campos */}
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Novo Total Pago *</label>
                <input type="number" value={editValorPago} onChange={e => setEditValorPago(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-stone-900 px-4 py-3 text-sm text-white focus:border-blue-500/50 focus:outline-none"
                  placeholder="0,00"/>
                <div className="flex gap-3 mt-1.5">
                  <button onClick={() => setEditValorPago(String(modalEditPag.valorPago || 0))}
                    className="text-[10px] text-stone-500 hover:text-stone-300">
                    Manter {fmt(modalEditPag.valorPago || 0)}
                  </button>
                  <span className="text-stone-700">·</span>
                  <button onClick={() => setEditValorPago(String(modalEditPag.valorTotal))}
                    className="text-[10px] text-amber-500 hover:text-amber-400">
                    Pagar total ({fmt(modalEditPag.valorTotal)})
                  </button>
                </div>
                {editValorPago && Number(editValorPago) >= modalEditPag.valorTotal && (
                  <p className="text-[10px] text-green-500 mt-1 flex items-center gap-1">
                    <CheckCircle size={10}/>Pagamento completo — status mudará para Confirmado ✓
                  </p>
                )}
              </div>

              <div>
                <label className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Forma de Pagamento</label>
                <select value={editFormaPagamento} onChange={e => setEditFormaPagamento(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-stone-900 px-4 py-3 text-sm text-white focus:border-blue-500/50 focus:outline-none">
                  <option>PIX</option>
                  <option>Dinheiro</option>
                  <option>Cartão de Crédito</option>
                  <option>Cartão de Débito</option>
                  <option>Transferência</option>
                  <option>Outro</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Cód. Comprovante (opcional)</label>
                <input type="text" value={editTransacaoId} onChange={e => setEditTransacaoId(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-stone-900 px-4 py-3 text-sm text-white focus:border-blue-500/50 focus:outline-none placeholder:text-stone-600"
                  placeholder="Código do saldo pago..."/>
              </div>

              {/* Upload comprovante complemento */}
              <div>
                <label className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">
                  Comprovante do Saldo (foto/PDF → nuvem)
                </label>
                <input
                  ref={comprovanteEditRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleComprovanteEditChange}
                />
                {uploadingComprovante ? (
                  <div className="mt-1.5 w-full rounded-lg border border-blue-600/30 bg-blue-900/10 px-4 py-4 flex items-center gap-3">
                    <Loader2 size={16} className="animate-spin text-blue-400 flex-shrink-0"/>
                    <span className="text-xs text-blue-400 font-bold">{uploadProgress || 'Enviando...'}</span>
                  </div>
                ) : !comprovanteEditFile ? (
                  <button type="button" onClick={() => comprovanteEditRef.current?.click()}
                    className="mt-1.5 w-full rounded-lg border border-dashed border-white/20 bg-stone-900/50 px-4 py-4 text-sm text-stone-500 hover:border-blue-500/40 hover:text-stone-300 transition-all flex items-center justify-center gap-2">
                    <CloudUpload size={14}/>Anexar comprovante do saldo
                  </button>
                ) : (
                  <div className="mt-1.5 rounded-lg border border-white/10 bg-stone-900 p-3 flex items-start gap-3">
                    {comprovanteEditPreview ? (
                      <img src={comprovanteEditPreview} alt="comprovante"
                        className="h-14 w-14 rounded-lg object-cover border border-white/10 flex-shrink-0 cursor-pointer"
                        onClick={() => window.open(comprovanteEditPreview!, '_blank')}
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-lg bg-stone-800 border border-white/10 flex items-center justify-center flex-shrink-0">
                        <FileText size={20} className="text-blue-400"/>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-bold truncate">{comprovanteEditFile.name}</p>
                      <p className="text-[10px] text-stone-500 mt-0.5">{(comprovanteEditFile.size / 1024).toFixed(0)} KB</p>
                      <div className="flex gap-3 mt-2">
                        <button onClick={() => { setComprovanteEditFile(null); setComprovanteEditPreview(null); if (comprovanteEditRef.current) comprovanteEditRef.current.value = ''; }}
                          className="text-[10px] text-red-500 hover:text-red-400 flex items-center gap-1">
                          <X size={10}/>Remover
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              <button onClick={() => setModalEditPag(null)} disabled={editando || uploadingComprovante}
                className="flex-1 py-3 rounded-lg border border-white/10 text-stone-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-40">
                Cancelar
              </button>
              <button onClick={handleSalvarEdicaoPagamento} disabled={editando || uploadingComprovante || !editValorPago}
                className="flex-1 py-3 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {uploadingComprovante
                  ? <><Loader2 size={14} className="animate-spin"/>{uploadProgress || 'Enviando...'}</>
                  : editando
                    ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"/>Salvando...</>
                    : <><CheckCircle size={14}/>Salvar Pagamento</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReservasAdminPage;
