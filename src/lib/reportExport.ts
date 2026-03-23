import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface ExportOptions {
  title: string;
  companyName?: string;
  period: string;
  columns: string[];
  rows: (string | number)[][];
  fileName: string;
}

export function exportToPDF(options: ExportOptions) {
  const { title, companyName, period, columns, rows, fileName } = options;

  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(companyName || "Minha Empresa", 14, 20);

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text(title, 14, 30);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Período: ${period}`, 14, 38);
  doc.text(
    `Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`,
    14,
    44
  );
  doc.setTextColor(0);

  // Table
  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 52,
    theme: "grid",
    headStyles: {
      fillColor: [41, 98, 255],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "left",
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.width - 14,
      doc.internal.pageSize.height - 10,
      { align: "right" }
    );
  }

  doc.save(`${fileName}.pdf`);
}

export function exportToExcel(options: ExportOptions) {
  const { title, columns, rows, fileName, period } = options;

  const wsData = [
    [title],
    [`Período: ${period}`],
    [],
    columns,
    ...rows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws["!cols"] = columns.map(() => ({ wch: 20 }));

  // Merge title row
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: columns.length - 1 } },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31));
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR");
}
