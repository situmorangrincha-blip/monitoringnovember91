import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const rp = (n) => (n == null ? '' : Math.round(n).toLocaleString('id-ID'));
const clean = (s) => String(s ?? '').replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '');
const pc = (r) => (r == null ? '' : Math.round(r * 100) + '%');

// satu halaman A4 portrait per toko. output: 'save' | 'blob'
export function makeContractPdf(list, { depot = 'kebayoran', team = '', periode = '', output = 'save' } = {}) {
  if (!list.length) throw new Error('Tidak ada toko untuk dicetak');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const acc = depot === 'kapuk' ? [79, 148, 166] : [201, 104, 59];
  list.forEach((c, i) => {
    if (i) doc.addPage();
    doc.setFillColor(...acc); doc.rect(0, 0, W, 22, 'F');
    doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
    doc.text(clean(`PACKAGE DEVELOPMENT PROGRAM${periode ? ' - ' + periode.toUpperCase() : ''}`), W / 2, 10, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(clean(team ? `Tim ${team}` : ''), W / 2, 17, { align: 'center' });
    doc.setTextColor(30, 40, 50); doc.setFontSize(9.5);
    const s = c.st;
    const info = [['JKS', s.hk || '-'], ['Nama Pelanggan', s.name], ['Id Pelanggan', s.id], ['Nama Salesman', s.sales], ['Channel / Kelas', `${s.cc1 && s.cc1 !== '-' ? s.cc1 : ''} ${s.cc5 && s.cc5 !== '-' ? s.cc5 : ''}`.trim()]];
    let y = 30;
    for (const [k, v] of info) { doc.setFont('helvetica', 'bold'); doc.text(k, 12, y); doc.setFont('helvetica', 'normal'); doc.text(': ' + clean(v), 46, y); y += 5.2; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.text('Program OFF Faktur', W / 2, y + 4, { align: 'center' });
    autoTable(doc, {
      startY: y + 6, margin: { left: 10, right: 10 }, styles: { fontSize: 8, cellPadding: 1.6, lineColor: [200, 205, 215], lineWidth: 0.2, overflow: 'linebreak' }, headStyles: { fillColor: acc, textColor: 255, halign: 'center' },
      head: [['Nama Program', 'Target', 'Actual', '%', 'Gap', 'Benefit', 'Estimasi Reward']],
      body: c.off.length ? c.off.map((x) => [clean(x.nama), rp(x.target), rp(x.actual), pc(x.pct), x.gap == null ? '' : rp(x.gap), clean(x.benefit), x.reward ? rp(x.reward) : '']) : [['(tidak ada program OFF faktur yang berlaku)', '', '', '', '', '', '']],
      foot: [['Total Benefit OFF Faktur', '', '', '', '', '', rp(c.totOff)]], footStyles: { fillColor: [244, 238, 228], textColor: 30, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 62 }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 6: { halign: 'right' } },
    });
    let y2 = doc.lastAutoTable.finalY + 6;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.text('Program ON Faktur', W / 2, y2, { align: 'center' });
    autoTable(doc, {
      startY: y2 + 2, margin: { left: 10, right: 10 }, styles: { fontSize: 8, cellPadding: 1.6, lineColor: [200, 205, 215], lineWidth: 0.2, overflow: 'linebreak', minCellHeight: 6 }, headStyles: { fillColor: acc, textColor: 255, halign: 'center' },
      head: [['Nama Program', 'Minimal Order', 'Satuan', 'Diskon', 'Potongan ON Faktur']],
      body: c.on.length ? c.on.map((x) => [clean(x.nama), clean(String(x.min)), clean(x.satuan), clean(x.diskon), x.potongan ? rp(x.potongan) : '']) : [['(tidak ada program ON faktur yang berlaku)', '', '', '', '']],
      foot: [['Total Benefit ON Faktur', '', '', '', rp(c.totOn)]], footStyles: { fillColor: [244, 238, 228], textColor: 30, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 76 }, 4: { halign: 'right' } },
    });
    let y3 = doc.lastAutoTable.finalY + 7;
    doc.setFillColor(...acc); doc.rect(10, y3 - 4.5, W - 20, 7, 'F'); doc.setTextColor(255); doc.setFontSize(10);
    doc.text('Estimasi Total Benefit Program', 13, y3); doc.text(rp(c.total), W - 13, y3, { align: 'right' });
    doc.setTextColor(30, 40, 50); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    if (c.wajib.length) { y3 += 9; doc.text('*Wajib order item unggulan: ' + clean(c.wajib.join(', ')), 12, y3); }
    const by = Math.max(y3 + 18, H - 55);
    const labels = ['Disiapkan oleh,', 'Divalidasi oleh,', 'Diketahui oleh,', 'Disepakati oleh,'];
    const names = ['Salesman', 'SAC', 'Branch Head', clean(s.name)];
    const bw = (W - 20) / 4;
    labels.forEach((l, k) => {
      const x = 10 + k * bw;
      doc.setFontSize(8.5); doc.text(l, x + bw / 2, by, { align: 'center' });
      doc.setDrawColor(190); doc.line(x + 6, by + 26, x + bw - 6, by + 26);
      doc.setFontSize(8); doc.text(names[k], x + bw / 2, by + 30, { align: 'center' });
    });
    doc.setFontSize(7); doc.setTextColor(130); doc.text(`Halaman ${i + 1}/${list.length}`, W - 10, H - 6, { align: 'right' });
  });
  if (output === 'blob') return doc.output('blob');
  doc.save(`Kontrak-${depot}-${team}-${list.length}-toko.pdf`);
  return null;
}
