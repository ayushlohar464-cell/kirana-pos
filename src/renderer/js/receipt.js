/**
 * Thermal Receipt Generator for 58mm and 80mm printers
 */

function formatCurrency(paise) {
  return '₹' + (paise / 100).toFixed(2);
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }) + ' ' + d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function generateThermalReceiptHtml(sale, settings, isPrintMode = false) {
  const widthClass = settings.printer_width === '58mm' ? 'width-58mm' : 'width-80mm';
  const containerClass = isPrintMode ? `thermal-receipt-print ${widthClass}` : `thermal-receipt-preview ${widthClass}`;

  const shopName = settings.shop_name || 'KIRANA STORE';
  const tagline = settings.shop_tagline || '';
  const address = settings.shop_address || '';
  const phone = settings.shop_phone || '';
  const gstin = settings.shop_gstin ? `GSTIN: ${settings.shop_gstin}` : '';
  const isMr = typeof window !== 'undefined' && window.i18n && window.i18n.currentLang === 'mr';

  const defaultFooter = isMr ? 'आमच्या दुकानात खरेदी केल्याबद्दल धन्यवाद! पुन्हा या.' : 'Thank you for shopping with us! Visit again.';
  const footerMsg = settings.receipt_footer_msg || defaultFooter;

  let itemsRows = '';
  sale.items.forEach((item, idx) => {
    const qtyFormatted = Number.isInteger(item.quantity) ? item.quantity : item.quantity.toFixed(3);
    itemsRows += `
      <tr>
        <td style="padding-top: 3px;">${item.product_name}</td>
        <td class="center" style="padding-top: 3px;">${qtyFormatted} ${item.unit_code}</td>
        <td class="right" style="padding-top: 3px;">${(item.unit_price / 100).toFixed(2)}</td>
        <td class="right" style="padding-top: 3px; font-weight: bold;">${(item.total_price / 100).toFixed(2)}</td>
      </tr>
    `;
  });

  let paymentModeStr = (sale.payments && sale.payments.length > 0)
    ? sale.payments.map(p => p.payment_mode.toUpperCase()).join(', ')
    : (sale.credit_amount > 0 ? (isMr ? 'उधारी (UDHAR)' : 'CREDIT (UDHAR)') : (isMr ? 'रोख (CASH)' : 'CASH'));

  const lblBill = isMr ? 'पावती क्र. (Bill)' : 'Bill';
  const lblDate = isMr ? 'दिनांक (Date)' : 'Date';
  const lblCashier = isMr ? 'कॅशियर' : 'Cashier';
  const lblCust = isMr ? 'ग्राहक' : 'Cust';
  const lblItem = isMr ? 'वस्तू (Item)' : 'Item';
  const lblQty = isMr ? 'नग (Qty)' : 'Qty';
  const lblRate = isMr ? 'दर' : 'Rate';
  const lblAmt = isMr ? 'रक्कम' : 'Amt';
  const lblSubtotal = isMr ? 'एकूण (Subtotal):' : 'Subtotal:';
  const lblDisc = isMr ? 'सूट (Discount):' : 'Discount:';
  const lblTax = isMr ? 'जीएसटी (GST):' : 'GST Included:';
  const lblGrand = isMr ? 'अंतिम एकूण (TOTAL):' : 'GRAND TOTAL:';
  const lblPaid = isMr ? `जमा (${paymentModeStr}):` : `Paid (${paymentModeStr}):`;
  const lblUdhar = isMr ? 'उधारी बाकी (Balance):' : 'Udhar (Balance):';

  return `
    <div class="${containerClass}">
      <div class="receipt-header">
        <div class="receipt-shop-name">${shopName}</div>
        ${tagline ? `<div class="receipt-tagline">${tagline}</div>` : ''}
        ${address ? `<div class="receipt-address">${address}</div>` : ''}
        ${phone ? `<div class="receipt-phone">Ph: ${phone}</div>` : ''}
        ${gstin ? `<div class="receipt-gstin">${gstin}</div>` : ''}
      </div>

      <div class="receipt-divider"></div>

      <div class="receipt-meta">
        <span>${lblBill}: <strong>${sale.invoice_number}</strong></span>
        <span>${lblDate}: ${formatDate(sale.created_at)}</span>
      </div>
      ${sale.customer_name && sale.customer_name !== 'Walk-in' && sale.customer_name !== 'काउंटर ग्राहक' ? `
        <div class="receipt-meta">
          <span>${lblCust}: <strong>${sale.customer_name}</strong></span>
        </div>
      ` : ''}

      <div class="receipt-divider"></div>

      <table class="receipt-table">
        <thead>
          <tr>
            <th>${lblItem}</th>
            <th class="center">${lblQty}</th>
            <th class="right">${lblRate}</th>
            <th class="right">${lblAmt}</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <div class="receipt-divider"></div>

      <div class="receipt-totals">
        <div class="receipt-totals-row">
          <span>${lblSubtotal}</span>
          <span>${formatCurrency(sale.subtotal)}</span>
        </div>
        ${sale.discount_amount > 0 ? `
          <div class="receipt-totals-row">
            <span>${lblDisc}</span>
            <span>-${formatCurrency(sale.discount_amount)}</span>
          </div>
        ` : ''}
        ${sale.tax_amount > 0 ? `
          <div class="receipt-totals-row">
            <span>${lblTax}</span>
            <span>${formatCurrency(sale.tax_amount)}</span>
          </div>
        ` : ''}
        ${sale.round_off !== 0 ? `
          <div class="receipt-totals-row">
            <span>Round Off:</span>
            <span>${(sale.round_off > 0 ? '+' : '')}${formatCurrency(sale.round_off)}</span>
          </div>
        ` : ''}
        <div class="receipt-totals-row grand">
          <span>${lblGrand}</span>
          <span>${formatCurrency(sale.grand_total)}</span>
        </div>
        <div class="receipt-totals-row">
          <span>${lblPaid}</span>
          <span>${formatCurrency(sale.paid_amount)}</span>
        </div>
        ${sale.credit_amount > 0 ? `
          <div class="receipt-totals-row" style="font-weight: bold; color: red;">
            <span>${lblUdhar}</span>
            <span>${formatCurrency(sale.credit_amount)}</span>
          </div>
        ` : ''}
      </div>

      <div class="receipt-divider"></div>

      <div class="receipt-footer">
        <div>${footerMsg}</div>
        <div class="receipt-barcode">* ${sale.invoice_number} *</div>
      </div>
    </div>
  `;
}

if (typeof window !== 'undefined') {
  window.generateThermalReceiptHtml = generateThermalReceiptHtml;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateThermalReceiptHtml };
}
