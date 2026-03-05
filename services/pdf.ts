import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Reserva, ReservaConfig, ReservaStatus } from '../types';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const fmtData = (str: string) => {
  if (!str) return '–';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
};

const statusLabel = (s: ReservaStatus): string =>
  ({
    [ReservaStatus.PENDENTE_PAGAMENTO]: 'Pendente de Pagamento',
    [ReservaStatus.RESERVADO]: 'Reservado (30% pago)',
    [ReservaStatus.CONFIRMADO]: 'Confirmado (100% pago)',
    [ReservaStatus.CANCELADO]: 'Cancelado',
    [ReservaStatus.EXPIRADO]: 'Expirado'
  }[s] || s);

const tipoLabel = (t: string): string =>
  ({ util: 'Dia Útil', sabado: 'Sábado', domingo: 'Domingo', fimdesemana: 'Fim de Semana' }[t] || t);

export const gerarComprovantePDF = (reserva: Reserva, config: ReservaConfig): void => {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  // ── CABEÇALHO ──────────────────────────────────────────────────────────────
  pdf.setFillColor(12, 10, 9);
  pdf.rect(0, 0, W, 42, 'F');

  pdf.setTextColor(217, 119, 6);
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text(config.salonNome || 'Salão Latitude22', W / 2, 18, { align: 'center' });

  pdf.setFontSize(8);
  pdf.setTextColor(180, 170, 160);
  pdf.setFont('helvetica', 'normal');
  pdf.text('COMPROVANTE DE RESERVA', W / 2, 27, { align: 'center' });

  if (config.salonCnpj) {
    pdf.text(`CNPJ: ${config.salonCnpj}`, W / 2, 34, { align: 'center' });
  }

  // ── PROTOCOLO ──────────────────────────────────────────────────────────────
  pdf.setFillColor(217, 119, 6);
  pdf.roundedRect(14, 48, W - 28, 14, 3, 3, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Protocolo: ${reserva.protocolo || '–'}`, W / 2, 57, { align: 'center' });

  // ── STATUS ─────────────────────────────────────────────────────────────────
  pdf.setFontSize(9);
  pdf.setTextColor(80, 80, 80);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Status: ${statusLabel(reserva.status)}`, W / 2, 70, { align: 'center' });

  // ── DADOS DO CLIENTE ───────────────────────────────────────────────────────
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 30, 30);
  pdf.text('DADOS DO CLIENTE', 14, 82);

  autoTable(pdf, {
    startY: 86,
    margin: { left: 14, right: 14 },
    theme: 'striped',
    headStyles: { fillColor: [44, 40, 36], textColor: [231, 229, 228], fontSize: 8 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
    body: [
      ['Nome', reserva.clienteNome],
      ['CPF / CNPJ', reserva.clienteCpfCnpj],
      ['Telefone', reserva.clienteTelefone],
      ['E-mail', reserva.clienteEmail],
      ['Tipo de Evento', reserva.tipoEvento],
      ['Nº de Convidados', String(reserva.numConvidados)]
    ]
  });

  // ── DADOS DO EVENTO ────────────────────────────────────────────────────────
  const y1 = (pdf as any).lastAutoTable.finalY + 10;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(30, 30, 30);
  pdf.text('DADOS DO EVENTO E PAGAMENTO', 14, y1);

  autoTable(pdf, {
    startY: y1 + 4,
    margin: { left: 14, right: 14 },
    theme: 'striped',
    headStyles: { fillColor: [44, 40, 36], textColor: [231, 229, 228], fontSize: 8 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
    body: [
      ['Data do Evento', fmtData(reserva.data)],
      ['Tipo de Diária', tipoLabel(reserva.tipoDiaria)],
      ['Valor Total', fmt(reserva.valorTotal)],
      ['Valor Pago', fmt(reserva.valorPago || 0)],
      ['Valor Restante', fmt(Math.max(0, reserva.valorTotal - (reserva.valorPago || 0)))],
      ['Forma de Pagamento', reserva.formaPagamento || '–'],
      [
        'Data do Pagamento',
        reserva.dataPagamento
          ? (reserva.dataPagamento.toDate
              ? reserva.dataPagamento.toDate().toLocaleDateString('pt-BR')
              : new Date(reserva.dataPagamento).toLocaleDateString('pt-BR'))
          : '–'
      ],
      ['Nº da Transação', reserva.transacaoId || '–']
    ]
  });

  // ── DADOS DO ESTABELECIMENTO ───────────────────────────────────────────────
  const y2 = (pdf as any).lastAutoTable.finalY + 10;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(30, 30, 30);
  pdf.text('DADOS DO ESTABELECIMENTO', 14, y2);

  autoTable(pdf, {
    startY: y2 + 4,
    margin: { left: 14, right: 14 },
    theme: 'striped',
    headStyles: { fillColor: [44, 40, 36], textColor: [231, 229, 228], fontSize: 8 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
    body: [
      ['Estabelecimento', config.salonNome || 'Salão Latitude22'],
      ['CNPJ', config.salonCnpj || '–'],
      ['Contato', config.salonContato || '–'],
      ['Chave PIX', config.pixChave || '–']
    ]
  });

  // ── RODAPÉ ─────────────────────────────────────────────────────────────────
  pdf.setFontSize(7);
  pdf.setTextColor(150, 150, 150);
  pdf.setFont('helvetica', 'normal');
  pdf.text(
    `Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} · Latitude22 Manager`,
    W / 2,
    pageH - 8,
    { align: 'center' }
  );

  pdf.save(`comprovante-${reserva.protocolo || reserva.token}.pdf`);
};
