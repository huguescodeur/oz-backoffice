const fmt = (v) => new Intl.NumberFormat('fr-FR').format(v ?? 0) + ' XAF'
const fmtDate = (d) => d
  ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—'

const pmLabel = {
  ESPECES: 'Espèces',
  ORANGE_MONEY: 'Orange Money',
  MTN_MOMO: 'MTN MoMo',
  WAVE: 'Wave',
  CREDIT: 'Crédit',
  AUTRE: 'Autre',
}

export function printDeliverySlip(order) {
  const ref = (order.orderUUID || '').slice(0, 8).toUpperCase()
  const items = order.items || []
  const isDelivery = !!order.delivery_address

  const itemsRows = items.map((it) => `
    <tr>
      <td style="padding:6px 4px;border-bottom:1px solid #eee;">${it.product_name || '—'}</td>
      <td style="padding:6px 4px;border-bottom:1px solid #eee;text-align:center;">${it.quantity}</td>
      <td style="padding:6px 4px;border-bottom:1px solid #eee;text-align:right;">${fmt(it.unit_price)}</td>
      <td style="padding:6px 4px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${fmt(it.unit_price * it.quantity)}</td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Bon de livraison — ${ref}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; background: #fff; padding: 24px; max-width: 600px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px; }
    .shop-name { font-size: 22px; font-weight: 800; letter-spacing: 1px; }
    .doc-title { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-top: 8px; color: #444; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
    .meta-block { background: #f8f8f8; border-radius: 6px; padding: 8px 10px; }
    .meta-label { font-size: 10px; text-transform: uppercase; color: #777; font-weight: 600; margin-bottom: 2px; }
    .meta-value { font-weight: 600; font-size: 13px; }
    .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #777; font-weight: 700; margin-bottom: 8px; border-top: 1px solid #eee; padding-top: 12px; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    thead th { font-size: 11px; text-transform: uppercase; color: #777; font-weight: 700; text-align: left; padding: 6px 4px; border-bottom: 2px solid #111; }
    thead th:not(:first-child) { text-align: right; }
    thead th:nth-child(2) { text-align: center; }
    .total-row { display: flex; justify-content: space-between; align-items: center; background: #111; color: #fff; padding: 10px 12px; border-radius: 6px; margin-top: 8px; }
    .total-label { font-size: 13px; font-weight: 600; }
    .total-amount { font-size: 18px; font-weight: 800; }
    .notes-box { background: #fffbea; border: 1px solid #f0d000; border-radius: 6px; padding: 10px 12px; margin-top: 12px; }
    .notes-label { font-size: 10px; text-transform: uppercase; color: #a07800; font-weight: 700; margin-bottom: 4px; }
    .notes-text { font-size: 13px; color: #555; font-style: italic; }
    .delivery-box { background: #eef6ff; border: 1px solid #b3d4ff; border-radius: 6px; padding: 10px 12px; margin-bottom: 12px; }
    .delivery-label { font-size: 10px; text-transform: uppercase; color: #1a5cb8; font-weight: 700; margin-bottom: 4px; }
    .delivery-addr { font-size: 14px; font-weight: 700; color: #111; }
    .footer { text-align: center; margin-top: 24px; padding-top: 12px; border-top: 1px solid #eee; font-size: 11px; color: #aaa; }
    .ref { font-size: 11px; color: #aaa; margin-top: 4px; }
    @media print {
      body { padding: 0; }
      button { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="shop-name">${order.shop_name || "O'Z"}</div>
    <div class="doc-title">${isDelivery ? 'Bon de livraison' : 'Reçu de vente'}</div>
    <div class="ref">Réf : #${ref} · ${fmtDate(order.created_at)}</div>
  </div>

  <div class="meta">
    <div class="meta-block">
      <div class="meta-label">Client</div>
      <div class="meta-value">${order.customer_name || '—'}</div>
    </div>
    <div class="meta-block">
      <div class="meta-label">Téléphone</div>
      <div class="meta-value">${order.customer_phone || '—'}</div>
    </div>
    <div class="meta-block">
      <div class="meta-label">Paiement</div>
      <div class="meta-value">${pmLabel[order.payment_method] || order.payment_method || '—'}</div>
    </div>
    <div class="meta-block">
      <div class="meta-label">Statut</div>
      <div class="meta-value">${order.status || '—'}</div>
    </div>
  </div>

  ${isDelivery ? `
  <div class="delivery-box">
    <div class="delivery-label">📍 Adresse de livraison</div>
    <div class="delivery-addr">${order.delivery_address}</div>
  </div>
  ` : ''}

  <div class="section-title">Articles commandés</div>
  <table>
    <thead>
      <tr>
        <th>Produit</th>
        <th style="text-align:center;">Qté</th>
        <th style="text-align:right;">Prix unit.</th>
        <th style="text-align:right;">Sous-total</th>
      </tr>
    </thead>
    <tbody>${itemsRows}</tbody>
  </table>

  <div class="total-row">
    <span class="total-label">TOTAL</span>
    <span class="total-amount">${fmt(order.total_amount)}</span>
  </div>

  ${order.notes ? `
  <div class="notes-box">
    <div class="notes-label">Instructions / Remarques</div>
    <div class="notes-text">${order.notes}</div>
  </div>
  ` : ''}

  <div class="footer">
    Merci de votre confiance — ${order.shop_name || "O'Z"}
  </div>

  <script>window.onload = () => window.print()</script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=700,height=900')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}
