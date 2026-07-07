import PDFDocument from 'pdfkit';
import type { Invoice } from './db';

export function generateInvoicePdf(invoice: Invoice): Buffer {
  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.fontSize(22).font('Helvetica-Bold').text('Gummi Gúrú', 50, 50);
  doc.fontSize(10).font('Helvetica').fillColor('#666666')
    .text('Gummi Eyberg', 50, 80)
    .text('Reykjavík, Ísland', 50, 93)
    .text('+354 867 8326', 50, 106)
    .text('gummi@gummiguru.is', 50, 119);

  // Invoice title right-aligned
  doc.fontSize(28).font('Helvetica-Bold').fillColor('#111111')
    .text('REIKNINGUR', 0, 50, { align: 'right' });
  doc.fontSize(11).font('Helvetica').fillColor('#444444')
    .text(`Nr: ${invoice.invoiceNumber}`, 0, 85, { align: 'right' })
    .text(`Dagsetning: ${new Date(invoice.issueDate).toLocaleDateString('is-IS')}`, 0, 100, { align: 'right' })
    .text(`Gjalddagi: ${new Date(invoice.dueDate).toLocaleDateString('is-IS')}`, 0, 115, { align: 'right' });

  // ── Divider ─────────────────────────────────────────────────────────────────
  doc.moveTo(50, 150).lineTo(545, 150).strokeColor('#dddddd').stroke();

  // ── Bill To ─────────────────────────────────────────────────────────────────
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#888888')
    .text('TIL', 50, 165);
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#111111')
    .text(invoice.clientName, 50, 180);
  if (invoice.clientAddress) {
    doc.fontSize(10).font('Helvetica').fillColor('#555555')
      .text(invoice.clientAddress, 50, 196);
  }
  if (invoice.clientKennitala) {
    doc.fontSize(10).font('Helvetica').fillColor('#555555')
      .text(`Kennitala: ${invoice.clientKennitala}`, 50, invoice.clientAddress ? 210 : 196);
  }
  if (invoice.clientEmail) {
    const emailY = 196 + (invoice.clientAddress ? 14 : 0) + (invoice.clientKennitala ? 14 : 0);
    doc.fontSize(10).font('Helvetica').fillColor('#555555')
      .text(invoice.clientEmail, 50, emailY);
  }

  // ── Line items table ─────────────────────────────────────────────────────────
  const tableTop = 270;
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#888888')
    .text('LÝSING', 50, tableTop)
    .text('UPPHÆÐ', 0, tableTop, { align: 'right' });
  doc.moveTo(50, tableTop + 16).lineTo(545, tableTop + 16).strokeColor('#dddddd').stroke();

  const lineItems: { description: string; amount: number }[] = Array.isArray(invoice.lineItems)
    ? invoice.lineItems as { description: string; amount: number }[]
    : [];

  let y = tableTop + 26;
  for (const item of lineItems) {
    doc.fontSize(11).font('Helvetica').fillColor('#111111')
      .text(item.description, 50, y, { width: 380 });
    doc.fontSize(11).font('Helvetica').fillColor('#111111')
      .text(`${item.amount.toLocaleString('is-IS')} ISK`, 0, y, { align: 'right' });
    y += 24;
  }

  // ── Total ───────────────────────────────────────────────────────────────────
  doc.moveTo(50, y + 8).lineTo(545, y + 8).strokeColor('#dddddd').stroke();
  doc.fontSize(13).font('Helvetica-Bold').fillColor('#111111')
    .text('Samtals:', 50, y + 20)
    .text(`${invoice.totalAmount.toLocaleString('is-IS')} ISK`, 0, y + 20, { align: 'right' });

  // ── VSK note ────────────────────────────────────────────────────────────────
  doc.fontSize(9).font('Helvetica').fillColor('#888888')
    .text('VSK: Ekki VSK-skyldur (velta undir 2 millj. ISK)', 50, y + 50);

  // ── Notes ───────────────────────────────────────────────────────────────────
  if (invoice.notes) {
    doc.fontSize(10).font('Helvetica').fillColor('#555555')
      .text(`Athugasemdir: ${invoice.notes}`, 50, y + 70);
  }

  // ── Payment info ─────────────────────────────────────────────────────────────
  const payY = y + (invoice.notes ? 100 : 80);
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#888888')
    .text('GREIÐSLUUPPLÝSINGAR', 50, payY);
  doc.fontSize(10).font('Helvetica').fillColor('#333333')
    .text('Banki: Íslandsbanki', 50, payY + 14)
    .text('Kennitala: [þín kennitala]', 50, payY + 28)
    .text('Reikningsnúmer: [þitt reikningsnúmer]', 50, payY + 42);

  // ── Footer ──────────────────────────────────────────────────────────────────
  doc.fontSize(8).fillColor('#aaaaaa')
    .text('Gummi Gúrú  ·  gummi@gummiguru.is  ·  +354 867 8326  ·  gummiguru.is', 50, 780, { align: 'center' });

  doc.end();

  return Buffer.concat(chunks);
}
