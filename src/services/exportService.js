import jsPDF from 'jspdf';

function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportReportCsv(rows, filename = 'dexa-rapor.csv') {
  const headers = ['Kurye', 'Restoran', 'Tarih', 'Çalışma Saati', 'Mola', 'Kazanç', 'Durum'];
  const csvRows = [
    headers.join(';'),
    ...rows.map((row) =>
      [
        row.courierName,
        row.restaurantName,
        row.date,
        row.totalHours,
        row.breakMinutes || 0,
        row.totalAmount,
        row.status,
      ].map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(';'),
    ),
  ];
  downloadBlob(filename, `\uFEFF${csvRows.join('\n')}`, 'text/csv;charset=utf-8');
}

export function exportReportPdf(rows, filename = 'dexa-operasyon-raporu.pdf') {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(18);
  doc.text('Dexa Operasyon Raporu', 14, 18);
  doc.setFontSize(10);
  doc.text(`Olusturma: ${new Date().toLocaleString('tr-TR')}`, 14, 26);
  let y = 38;
  doc.setFontSize(9);
  doc.text('Kurye', 14, y);
  doc.text('Restoran', 62, y);
  doc.text('Tarih', 122, y);
  doc.text('Saat', 154, y);
  doc.text('Mola', 176, y);
  doc.text('Kazanc', 198, y);
  doc.text('Durum', 230, y);
  y += 7;
  rows.forEach((row) => {
    if (y > 190) {
      doc.addPage();
      y = 18;
    }
    doc.text(String(row.courierName || '-').slice(0, 26), 14, y);
    doc.text(String(row.restaurantName || '-').slice(0, 34), 62, y);
    doc.text(String(row.date || '-'), 122, y);
    doc.text(String(row.totalHours || 0), 154, y);
    doc.text(String(row.breakMinutes || 0), 176, y);
    doc.text(String(row.totalAmount || 0), 198, y);
    doc.text(String(row.status || '-'), 230, y);
    y += 7;
  });
  doc.save(filename);
}
