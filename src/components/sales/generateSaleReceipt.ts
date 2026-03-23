import { format } from "date-fns";

interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
}

interface CompanyInfo {
  company_name?: string | null;
  cnpj?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
}

interface ReceiptData {
  saleNumber?: number;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  customerName?: string;
  notes?: string;
  createdAt: Date;
  company?: CompanyInfo | null;
}

const paymentLabels: Record<string, string> = {
  cash: "Dinheiro",
  pix: "Pix",
  credit_card: "Cartão de Crédito",
  debit_card: "Cartão de Débito",
};

export function generateSaleReceipt(data: ReceiptData) {
  const itemsHtml = data.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:4px 0;text-align:left;">${item.quantity}x ${item.name}</td>
          <td style="padding:4px 0;text-align:right;white-space:nowrap;">R$ ${(item.price * item.quantity).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
        </tr>`
    )
    .join("");

  const saleLabel = data.saleNumber
    ? `Venda #${String(data.saleNumber).padStart(4, "0")}`
    : "Cupom Não Fiscal";

  const company = data.company;
  const companyHeaderHtml = company
    ? `
      ${company.logo_url ? `<img src="${company.logo_url}" alt="Logo" style="max-width:120px;max-height:60px;margin:0 auto 6px;display:block;" />` : ""}
      ${company.company_name ? `<p style="margin:0;font-size:14px;font-weight:bold;">${company.company_name}</p>` : ""}
      ${company.cnpj ? `<p style="margin:2px 0;font-size:10px;">CNPJ: ${company.cnpj}</p>` : ""}
      ${company.phone ? `<p style="margin:2px 0;font-size:10px;">Tel: ${company.phone}</p>` : ""}
      ${company.email ? `<p style="margin:2px 0;font-size:10px;">${company.email}</p>` : ""}
      <hr class="divider">
    `
    : "";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${saleLabel}</title>
      <style>
        @media print {
          @page { margin: 0; }
          body { margin: 8mm; }
        }
        body {
          font-family: 'Courier New', Courier, monospace;
          font-size: 12px;
          color: #000;
          max-width: 300px;
          margin: 0 auto;
          padding: 10px;
        }
        .center { text-align: center; }
        .divider {
          border: none;
          border-top: 1px dashed #000;
          margin: 8px 0;
        }
        h1 { font-size: 16px; margin: 0 0 4px; }
        h2 { font-size: 13px; margin: 10px 0 4px; }
        table { width: 100%; border-collapse: collapse; }
        .total-row td {
          font-weight: bold;
          font-size: 14px;
          padding-top: 6px;
        }
        .footer { margin-top: 16px; font-size: 10px; color: #555; text-align: center; }
      </style>
    </head>
    <body>
      <div class="center">
        ${companyHeaderHtml}
        <h1>CUPOM NÃO FISCAL</h1>
        <p style="margin:2px 0;font-size:11px;">${saleLabel}</p>
        <p style="margin:2px 0;font-size:11px;">${format(data.createdAt, "dd/MM/yyyy 'às' HH:mm")}</p>
      </div>

      ${data.customerName ? `
      <hr class="divider">
      <p style="margin:0;"><strong>Cliente:</strong> ${data.customerName}</p>
      ` : ""}

      <hr class="divider">
      <h2>ITENS</h2>
      <table>
        ${itemsHtml}
      </table>

      <hr class="divider">
      <table>
        <tr>
          <td>Subtotal</td>
          <td style="text-align:right;">R$ ${data.subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
        </tr>
        ${data.discount > 0 ? `
        <tr>
          <td>Desconto</td>
          <td style="text-align:right;">- R$ ${data.discount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
        </tr>
        ` : ""}
        <tr class="total-row">
          <td>TOTAL</td>
          <td style="text-align:right;">R$ ${data.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
        </tr>
      </table>

      <hr class="divider">
      <p style="margin:0;"><strong>Pagamento:</strong> ${paymentLabels[data.paymentMethod] || data.paymentMethod}</p>

      ${data.notes ? `
      <hr class="divider">
      <p style="margin:0;"><strong>Obs:</strong> ${data.notes}</p>
      ` : ""}

      <div class="footer">
        <hr class="divider">
        <p>DOCUMENTO SEM VALOR FISCAL</p>
        <p>Obrigado pela preferência!</p>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  }
}
