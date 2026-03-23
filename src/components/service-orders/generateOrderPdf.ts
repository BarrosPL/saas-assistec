import { format } from "date-fns";

const statusLabels: Record<string, string> = {
  open: "Aberta",
  diagnosis: "Diagnóstico",
  waiting_parts: "Aguardando Peça",
  repairing: "Em Reparo",
  completed: "Concluída",
  cancelled: "Cancelada",
};

const checklistLabels: Record<string, string> = {
  screen_ok: "Tela sem trincas/riscos",
  touch_ok: "Touch funcionando",
  buttons_ok: "Botões funcionando",
  camera_ok: "Câmera funcionando",
  speaker_ok: "Alto-falante funcionando",
  mic_ok: "Microfone funcionando",
  charging_ok: "Carregamento funcionando",
  battery_ok: "Bateria em bom estado",
  wifi_ok: "Wi-Fi funcionando",
  bluetooth_ok: "Bluetooth funcionando",
  biometric_ok: "Biometria funcionando",
  has_cover: "Possui capa/película",
};

interface CompanyInfo {
  company_name?: string | null;
  cnpj?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  logo_url?: string | null;
}

export function generateOrderPdf(order: any, company?: CompanyInfo | null) {
  const orderNum = `OS-${String(order.order_number).padStart(3, "0")}`;
  const customerName = order.customers?.name || "Cliente não informado";
  const condition = (order.device_condition || {}) as Record<string, boolean>;

  const checklistHtml = Object.entries(checklistLabels)
    .map(([key, label]) => `<tr><td style="padding:4px 8px;">${label}</td><td style="padding:4px 8px;text-align:center;">${condition[key] ? "✅" : "❌"}</td></tr>`)
    .join("");

  const logoHtml = company?.logo_url
    ? `<img src="${company.logo_url}" alt="Logo" style="max-height:60px;max-width:180px;object-fit:contain;margin-bottom:8px;">`
    : "";

  const companyHtml = company
    ? `<div class="company-header">
        ${logoHtml}
        ${company.company_name ? `<h2 style="margin:0 0 4px;font-size:16px;">${company.company_name}</h2>` : ""}
        <div style="font-size:11px;color:#666;">
          ${company.cnpj ? `<span>CNPJ: ${company.cnpj}</span>` : ""}
          ${company.cnpj && company.phone ? ` | ` : ""}
          ${company.phone ? `<span>Tel: ${company.phone}</span>` : ""}
        </div>
        ${company.address ? `<p style="margin:2px 0 0;font-size:11px;color:#666;">${company.address}</p>` : ""}
      </div>
      <hr style="border:none;border-top:1px solid #ccc;margin:12px 0;">`
    : "";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${orderNum}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 13px; color: #222; margin: 30px; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        h2 { font-size: 15px; margin-top: 20px; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
        .meta { color: #666; font-size: 12px; margin-bottom: 16px; }
        .company-header { text-align: center; margin-bottom: 8px; }
        table { border-collapse: collapse; width: 100%; }
        .info td { padding: 3px 0; }
        .info td:first-child { color: #666; width: 140px; }
        .checklist { margin-top: 8px; }
        .checklist td { border: 1px solid #ddd; }
        .footer { margin-top: 40px; text-align: center; color: #999; font-size: 11px; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; background: #e5e7eb; }
      </style>
    </head>
    <body>
      ${companyHtml}

      <h1>${orderNum} <span class="badge">${statusLabels[order.status] || order.status}</span></h1>
      <p class="meta">Emitido em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>

      <h2>Cliente</h2>
      <table class="info"><tr><td>Nome</td><td>${customerName}</td></tr></table>

      <h2>Aparelho</h2>
      <table class="info">
        <tr><td>Marca</td><td>${order.device_brand}</td></tr>
        <tr><td>Modelo</td><td>${order.device_model}</td></tr>
        ${order.device_imei ? `<tr><td>IMEI</td><td>${order.device_imei}</td></tr>` : ""}
        <tr><td>Aparelho Ligando?</td><td>${order.device_powered_on === true ? "Sim" : order.device_powered_on === false ? "Não" : "Não informado"}</td></tr>
      </table>

      ${Object.keys(condition).length > 0 ? `
      <h2>Checklist do Aparelho</h2>
      <table class="checklist">
        <tr><th style="padding:4px 8px;text-align:left;">Item</th><th style="padding:4px 8px;">Status</th></tr>
        ${checklistHtml}
      </table>` : ""}

      <h2>Serviço</h2>
      <table class="info">
        <tr><td>Defeito Relatado</td><td>${order.reported_issue}</td></tr>
        ${order.technician ? `<tr><td>Técnico</td><td>${order.technician}</td></tr>` : ""}
        <tr><td>Valor</td><td>${order.service_value ? `R$ ${Number(order.service_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</td></tr>
        <tr><td>Prazo</td><td>${order.estimated_deadline ? format(new Date(order.estimated_deadline), "dd/MM/yyyy") : "—"}</td></tr>
        ${order.notes ? `<tr><td>Observações</td><td>${order.notes}</td></tr>` : ""}
      </table>

      <h2>Entrega</h2>
      <table class="info">
        <tr><td>Data de Recebimento</td><td>${order.device_received_at ? format(new Date(order.device_received_at + "T12:00:00"), "dd/MM/yyyy") : "___/___/______"}</td></tr>
      </table>

      <h2>Assinaturas</h2>
      <div style="display:flex;gap:40px;margin-top:12px;">
        <div style="text-align:center;flex:1;">
          <p style="font-size:11px;color:#666;margin-bottom:4px;">Técnico</p>
          ${order.technician_signature
            ? `<img src="${order.technician_signature}" style="max-height:80px;max-width:100%;border:1px solid #ddd;border-radius:4px;">`
            : `<div style="border-bottom:1px solid #222;height:60px;margin-top:20px;"></div>`}
        </div>
        <div style="text-align:center;flex:1;">
          <p style="font-size:11px;color:#666;margin-bottom:4px;">Cliente</p>
          ${order.customer_signature
            ? `<img src="${order.customer_signature}" style="max-height:80px;max-width:100%;border:1px solid #ddd;border-radius:4px;">`
            : `<div style="border-bottom:1px solid #222;height:60px;margin-top:20px;"></div>`}
        </div>
      </div>

      <div class="footer">
        <p>Criada em ${format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm")}</p>
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
