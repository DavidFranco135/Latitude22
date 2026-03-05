import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Reserva, ReservaConfig, ReservaStatus } from '../types';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const fmtData = (str: string) => {
  if (!str) return '–';
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const [y, m, d] = str.split('-');
  return `${d} de ${meses[Number(m)-1]} de ${y}`;
};

const statusLabel = (s: ReservaStatus): string =>
  ({
    [ReservaStatus.PENDENTE_PAGAMENTO]: 'Aguardando Pagamento',
    [ReservaStatus.RESERVADO]:          'Reservado (parcial)',
    [ReservaStatus.CONFIRMADO]:         'Confirmado ✓',
    [ReservaStatus.CANCELADO]:          'Cancelado',
    [ReservaStatus.EXPIRADO]:           'Expirado'
  }[s] || s);

const tipoLabel = (t: string): string =>
  ({ util: 'Dia Útil', sabado: 'Sábado', domingo: 'Domingo', fimdesemana: 'Fim de Semana' }[t] || t);

export const gerarComprovantePDF = (reserva: Reserva, config: ReservaConfig): void => {
  const pdf   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W     = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  // Lê datas e detalhes — suporta multi-data e legado single
  const datas: string[]       = Array.isArray((reserva as any).datas)
    ? (reserva as any).datas
    : [reserva.data];
  const diasDetalhes: any[]   = Array.isArray((reserva as any).diasDetalhes)
    ? (reserva as any).diasDetalhes
    : datas.map(d => ({ dateStr: d, tipoDiaria: reserva.tipoDiaria, valor: reserva.valorTotal }));

  // ── CABEÇALHO ──────────────────────────────────────────────────────────────
  pdf.setFillColor(12, 10, 9);
  pdf.rect(0, 0, W, 46, 'F');

  pdf.setTextColor(217, 119, 6);
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text(config.salonNome || 'Latitude22', W / 2, 18, { align: 'center' });

  pdf.setFontSize(8);
  pdf.setTextColor(200, 190, 180);
  pdf.setFont('helvetica', 'normal');
  pdf.text('COMPROVANTE DE AGENDAMENTO', W / 2, 27, { align: 'center' });

  if (config.salonCnpj) {
    pdf.setTextColor(150, 140, 130);
    pdf.text(`CNPJ: ${config.salonCnpj}`, W / 2, 34, { align: 'center' });
  }

  // ── PROTOCOLO ──────────────────────────────────────────────────────────────
  pdf.setFillColor(217, 119, 6);
  pdf.roundedRect(14, 52, W - 28, 14, 3, 3, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Protocolo: ${reserva.protocolo || '–'}`, W / 2, 61, { align: 'center' });

  // Status
  pdf.setFontSize(9);
  pdf.setTextColor(80, 80, 80);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Status: ${statusLabel(reserva.status)}`, W / 2, 74, { align: 'center' });

  // ── DADOS DO CLIENTE ───────────────────────────────────────────────────────
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 30, 30);
  pdf.text('DADOS DO CLIENTE', 14, 86);

  autoTable(pdf, {
    startY: 90,
    margin: { left: 14, right: 14 },
    theme: 'striped',
    headStyles: { fillColor: [44, 40, 36], textColor: [231, 229, 228], fontSize: 8 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
    body: [
      ['Nome',            reserva.clienteNome],
      ['CPF / CNPJ',      reserva.clienteCpfCnpj],
      ['Telefone',        reserva.clienteTelefone],
      ['E-mail',          reserva.clienteEmail],
      ['Tipo de Evento',  reserva.tipoEvento],
      ['Nº de Convidados',String(reserva.numConvidados)]
    ]
  });

  // ── DATAS DO EVENTO ────────────────────────────────────────────────────────
  const y1 = (pdf as any).lastAutoTable.finalY + 10;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(30, 30, 30);
  pdf.text(`DATA${datas.length > 1 ? 'S' : ''} DO EVENTO`, 14, y1);

  autoTable(pdf, {
    startY: y1 + 4,
    margin: { left: 14, right: 14 },
    theme: 'striped',
    headStyles: { fillColor: [44, 40, 36], textColor: [231, 229, 228], fontSize: 8 },
    bodyStyles: { fontSize: 9 },
    head: [['Data', 'Tipo de Diária', 'Valor']],
    body: diasDetalhes.map(dia => [
      fmtData(dia.dateStr),
      tipoLabel(dia.tipoDiaria),
      fmt(dia.valor)
    ]),
    foot: [[
      { content: 'Total', styles: { fontStyle: 'bold' } },
      '',
      { content: fmt(reserva.valorTotal), styles: { fontStyle: 'bold', textColor: [217, 119, 6] } }
    ]],
    footStyles: { fillColor: [30, 27, 24], textColor: [200, 190, 180], fontSize: 9 }
  });

  // ── PAGAMENTO ──────────────────────────────────────────────────────────────
  const y2 = (pdf as any).lastAutoTable.finalY + 10;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(30, 30, 30);
  pdf.text('PAGAMENTO', 14, y2);

  const valorPago     = reserva.valorPago || 0;
  const valorRestante = Math.max(0, reserva.valorTotal - valorPago);

  autoTable(pdf, {
    startY: y2 + 4,
    margin: { left: 14, right: 14 },
    theme: 'striped',
    headStyles: { fillColor: [44, 40, 36], textColor: [231, 229, 228], fontSize: 8 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 65 } },
    body: [
      ['Valor Total',        fmt(reserva.valorTotal)],
      ['Valor Pago',         fmt(valorPago)],
      ['Saldo Restante',     fmt(valorRestante)],
      ['Forma de Pagamento', reserva.formaPagamento || '–'],
      ['Comprovante',        reserva.transacaoId    || '–'],
      ['Data do Pagamento',
        reserva.dataPagamento
          ? (reserva.dataPagamento.toDate
              ? reserva.dataPagamento.toDate().toLocaleDateString('pt-BR')
              : new Date(reserva.dataPagamento as any).toLocaleDateString('pt-BR'))
          : '–'
      ]
    ]
  });

  // ── DADOS DO ESTABELECIMENTO ───────────────────────────────────────────────
  const y3 = (pdf as any).lastAutoTable.finalY + 10;

  // Se não couber na página, nova página
  if (y3 + 50 > pageH - 15) pdf.addPage();
  const yEst = y3 + 50 > pageH - 15 ? 15 : y3;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(30, 30, 30);
  pdf.text('DADOS DO ESTABELECIMENTO', 14, yEst);

  autoTable(pdf, {
    startY: yEst + 4,
    margin: { left: 14, right: 14 },
    theme: 'striped',
    headStyles: { fillColor: [44, 40, 36], textColor: [231, 229, 228], fontSize: 8 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
    body: [
      ['Estabelecimento', config.salonNome    || 'Latitude22'],
      ['CNPJ',            config.salonCnpj   || '–'],
      ['Contato',         config.salonContato || '–'],
      ['Chave PIX',       config.pixChave    || '–']
    ]
  });

  // ── RODAPÉ ─────────────────────────────────────────────────────────────────
  const totalPages = (pdf as any).internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(7);
    pdf.setTextColor(150, 150, 150);
    pdf.setFont('helvetica', 'normal');
    pdf.text(
      `Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} · Latitude22 Manager`,
      W / 2, pageH - 8, { align: 'center' }
    );
  }

  pdf.save(`agendamento-${reserva.protocolo || reserva.token}.pdf`);
};
