/**
 * Unified Invoice Template Generator
 * Matches the professional invoice design with:
 * - Company branding (logo, name)
 * - Bill From / Bill To sections
 * - Items table with HSN, GST breakdown
 * - Bank details with QR code
 * - Terms and conditions
 * - Totals with early payment discount
 */

export function generateInvoiceHTML(invoice, settings = {}, options = {}) {
  const {
    brandLogo = '',
    brandName = '',
    companyName = '',
    gstin = '',
    pan = '',
    placeOfSupply = '',
    address = {},
    phone = '',
    email = '',
    website = '',
    bankDetails = {},
    paymentQRCode = '',
    termsAndConditions = [],
    paymentTerms = {},
    additionalNotes = '',
    authorizedSignature = '',
    authorizedSignatoryName = ''
  } = settings

  const customer = invoice.customer || {}
  const items = invoice.items || []
  const isInterstate = invoice.isInterstate || false

  // Formatting helpers
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0).replace('₹', '₹ ')
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
    
    if (num === 0) return 'Zero'
    if (num < 0) return 'Minus ' + numberToWords(-num)
    
    let words = ''
    
    if (Math.floor(num / 10000000) > 0) {
      words += numberToWords(Math.floor(num / 10000000)) + ' Crore '
      num %= 10000000
    }
    if (Math.floor(num / 100000) > 0) {
      words += numberToWords(Math.floor(num / 100000)) + ' Lakh '
      num %= 100000
    }
    if (Math.floor(num / 1000) > 0) {
      words += numberToWords(Math.floor(num / 1000)) + ' Thousand '
      num %= 1000
    }
    if (Math.floor(num / 100) > 0) {
      words += numberToWords(Math.floor(num / 100)) + ' Hundred '
      num %= 100
    }
    if (num > 0) {
      if (num < 20) {
        words += ones[num]
      } else {
        words += tens[Math.floor(num / 10)]
        if (num % 10 > 0) {
          words += ' ' + ones[num % 10]
        }
      }
    }
    return words.trim()
  }

  const amountInWords = (amount) => {
    const rupees = Math.floor(amount)
    const paise = Math.round((amount - rupees) * 100)
    let result = 'Rupees ' + numberToWords(rupees)
    if (paise > 0) {
      result += ' and ' + numberToWords(paise) + ' Paise'
    }
    return result + ' Only'
  }

  // Calculate early payment discount date
  const invoiceDate = new Date(invoice.createdAt || invoice.invoiceDate || Date.now())
  const earlyPayDate = new Date(invoiceDate)
  earlyPayDate.setDate(earlyPayDate.getDate() + (paymentTerms.earlyPaymentDays || 7))
  
  const dueDate = new Date(invoiceDate)
  dueDate.setDate(dueDate.getDate() + (paymentTerms.defaultDueDays || 15))

  const earlyPayDiscount = paymentTerms.earlyPaymentDiscount || 0
  const earlyPayAmount = invoice.grandTotal * (1 - earlyPayDiscount / 100)

  // Build address string
  const companyAddressStr = [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.pincode
  ].filter(Boolean).join(', ')

  const customerAddressStr = [
    customer.address || customer.billingAddress,
    customer.city,
    customer.state,
    customer.pincode
  ].filter(Boolean).join(', ')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoiceNumber || invoice.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif; 
      font-size: 13px;
      line-height: 1.5;
      color: #333;
      background: #f5f5f5;
    }
    .invoice-container {
      max-width: 900px;
      margin: 20px auto;
      background: white;
      padding: 40px;
      box-shadow: 0 2px 20px rgba(0,0,0,0.1);
    }
    
    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
    }
    .invoice-title {
      font-size: 36px;
      font-weight: bold;
      color: #333;
      margin-bottom: 15px;
    }
    .invoice-meta {
      font-size: 13px;
    }
    .invoice-meta p {
      margin: 4px 0;
    }
    .invoice-meta strong {
      display: inline-block;
      width: 100px;
    }
    .company-logo {
      text-align: right;
    }
    .company-logo img {
      max-height: 60px;
      max-width: 200px;
    }
    .company-logo .logo-text {
      font-size: 28px;
      font-weight: bold;
      color: #333;
    }
    
    /* Billing Sections */
    .billing-section {
      display: flex;
      gap: 30px;
      margin-bottom: 30px;
    }
    .billing-box {
      flex: 1;
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
    }
    .billing-box h3 {
      font-size: 12px;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 10px;
      letter-spacing: 0.5px;
    }
    .billing-box .company-name {
      font-size: 16px;
      font-weight: bold;
      color: #333;
      margin-bottom: 8px;
    }
    .billing-box p {
      font-size: 12px;
      color: #555;
      margin: 3px 0;
    }
    .billing-box .label {
      color: #888;
      margin-right: 5px;
    }
    .place-of-supply {
      margin-top: 15px;
      padding-top: 10px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
    }
    
    /* Items Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .items-table th {
      background: #7c3aed;
      color: white;
      padding: 12px 10px;
      text-align: left;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .items-table th.text-right {
      text-align: right;
    }
    .items-table td {
      padding: 12px 10px;
      border-bottom: 1px solid #e8e8e8;
      font-size: 12px;
    }
    .items-table td.text-right {
      text-align: right;
    }
    .items-table tr:hover {
      background: #fafafa;
    }
    .item-number {
      font-weight: bold;
      color: #7c3aed;
    }
    .item-description {
      color: #666;
      font-size: 11px;
    }
    
    /* Bottom Section */
    .bottom-section {
      display: flex;
      gap: 40px;
    }
    .left-section {
      flex: 1;
    }
    .right-section {
      width: 320px;
    }
    
    /* Bank Details */
    .bank-details {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .bank-details h4 {
      font-size: 13px;
      font-weight: 600;
      color: #333;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e0e0e0;
    }
    .bank-details .detail-row {
      display: flex;
      justify-content: space-between;
      margin: 6px 0;
      font-size: 12px;
    }
    .bank-details .label {
      color: #666;
    }
    .bank-details .value {
      font-weight: 500;
      color: #333;
    }
    .qr-section {
      text-align: center;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #e0e0e0;
    }
    .qr-section img {
      width: 100px;
      height: 100px;
    }
    .qr-section p {
      font-size: 11px;
      color: #666;
      margin-top: 5px;
    }
    
    /* Terms */
    .terms-section {
      margin-bottom: 20px;
    }
    .terms-section h4 {
      font-size: 13px;
      font-weight: 600;
      color: #333;
      margin-bottom: 10px;
    }
    .terms-section ol {
      padding-left: 20px;
      font-size: 11px;
      color: #555;
    }
    .terms-section li {
      margin: 5px 0;
    }
    
    /* Additional Notes */
    .notes-section {
      margin-bottom: 20px;
    }
    .notes-section h4 {
      font-size: 13px;
      font-weight: 600;
      color: #333;
      margin-bottom: 8px;
    }
    .notes-section p {
      font-size: 11px;
      color: #666;
      font-style: italic;
    }
    
    /* Totals */
    .totals-section {
      background: #fafafa;
      padding: 20px;
      border-radius: 8px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 13px;
    }
    .total-row.subtotal {
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 12px;
      margin-bottom: 8px;
    }
    .total-row .label {
      color: #666;
    }
    .total-row .value {
      font-weight: 500;
    }
    .total-row.discount .value {
      color: #7c3aed;
    }
    .total-row.grand-total {
      font-size: 18px;
      font-weight: bold;
      border-top: 2px solid #7c3aed;
      margin-top: 12px;
      padding-top: 12px;
    }
    .total-row.grand-total .value {
      color: #7c3aed;
    }
    .amount-in-words {
      font-size: 11px;
      color: #666;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px dashed #e0e0e0;
    }
    
    /* Early Payment */
    .early-payment {
      background: #f0fdf4;
      border: 1px solid #86efac;
      padding: 15px;
      border-radius: 8px;
      margin-top: 15px;
    }
    .early-payment h5 {
      font-size: 12px;
      color: #166534;
      margin-bottom: 8px;
    }
    .early-payment .discount-info {
      font-size: 11px;
      color: #666;
      margin-bottom: 8px;
    }
    .early-payment .early-total {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      font-weight: bold;
      color: #166534;
    }
    
    /* Signature */
    .signature-section {
      margin-top: 30px;
      text-align: right;
    }
    .signature-section img {
      max-height: 50px;
      margin-bottom: 5px;
    }
    .signature-section .name {
      font-size: 12px;
      font-weight: 600;
    }
    .signature-section .title {
      font-size: 11px;
      color: #666;
    }
    
    /* Footer */
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #888;
    }
    
    /* Print Styles */
    @media print {
      body { background: white; }
      .invoice-container { 
        box-shadow: none; 
        margin: 0;
        padding: 20px;
      }
      .no-print { display: none; }
    }
    
    /* Print Button */
    .print-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 24px;
      background: #7c3aed;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
    }
    .print-btn:hover {
      background: #6d28d9;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div>
        <div class="invoice-title">Invoice</div>
        <div class="invoice-meta">
          <p><strong>Invoice#</strong> ${invoice.invoiceNumber || 'INV-' + invoice.id?.substring(0, 8)}</p>
          <p><strong>Invoice Date</strong> ${formatDate(invoice.createdAt || invoice.invoiceDate)}</p>
          <p><strong>Due Date</strong> ${formatDate(invoice.dueDate || dueDate)}</p>
        </div>
      </div>
      <div class="company-logo">
        ${brandLogo ? `<img src="${brandLogo}" alt="${brandName || companyName}" />` : 
          `<div class="logo-text">${brandName || companyName || 'COMPANY'}</div>`}
      </div>
    </div>

    <!-- Billing Section -->
    <div class="billing-section">
      <div class="billing-box">
        <h3>Billed by</h3>
        <div class="company-name">${companyName || brandName || 'Your Company'}</div>
        <p>${companyAddressStr || 'Company Address'}</p>
        ${gstin ? `<p><span class="label">GSTIN:</span> ${gstin}</p>` : ''}
        ${pan ? `<p><span class="label">PAN:</span> ${pan}</p>` : ''}
        <div class="place-of-supply">
          <p><span class="label">Place of Supply:</span> ${placeOfSupply || address.state || 'N/A'}</p>
        </div>
      </div>
      <div class="billing-box">
        <h3>Billed to</h3>
        <div class="company-name">${customer.name || customer.companyName || 'Customer'}</div>
        <p>${customerAddressStr || customer.address || 'Customer Address'}</p>
        ${customer.gstin ? `<p><span class="label">GSTIN:</span> ${customer.gstin}</p>` : ''}
        ${customer.pan ? `<p><span class="label">PAN:</span> ${customer.pan}</p>` : ''}
        <div class="place-of-supply">
          <p><span class="label">Country of Supply:</span> ${customer.country || 'India'}</p>
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 5%">#</th>
          <th style="width: 30%">Item / Description</th>
          <th style="width: 10%">HSN</th>
          <th class="text-right" style="width: 8%">Qty.</th>
          <th class="text-right" style="width: 8%">GST</th>
          <th class="text-right" style="width: 13%">Taxable Amt</th>
          ${!isInterstate ? `
            <th class="text-right" style="width: 10%">SGST</th>
            <th class="text-right" style="width: 10%">CGST</th>
          ` : `
            <th class="text-right" style="width: 12%">IGST</th>
          `}
          <th class="text-right" style="width: 12%">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, index) => {
          const taxableAmount = item.totalPrice || (item.quantity * (item.unitPrice || item.rate || 0)) || 0
          const gstRate = item.gstRate || invoice.cgstRate * 2 || 18
          const gstAmount = taxableAmount * (gstRate / 100)
          const totalAmount = taxableAmount + gstAmount
          const halfGst = gstAmount / 2
          
          return `
            <tr>
              <td><span class="item-number">${index + 1}</span></td>
              <td>
                <strong>${item.name || item.productName || 'Item'}</strong>
                ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
              </td>
              <td>${item.hsnCode || item.hsn || '-'}</td>
              <td class="text-right">${item.quantity || 1} ${item.unit || ''}</td>
              <td class="text-right">${gstRate}%</td>
              <td class="text-right">${formatCurrency(taxableAmount)}</td>
              ${!isInterstate ? `
                <td class="text-right">${formatCurrency(halfGst)}</td>
                <td class="text-right">${formatCurrency(halfGst)}</td>
              ` : `
                <td class="text-right">${formatCurrency(gstAmount)}</td>
              `}
              <td class="text-right"><strong>${formatCurrency(totalAmount)}</strong></td>
            </tr>
          `
        }).join('')}
      </tbody>
    </table>

    <!-- Bottom Section -->
    <div class="bottom-section">
      <div class="left-section">
        <!-- Bank Details -->
        <div class="bank-details">
          <h4>Bank & Payment Details</h4>
          ${bankDetails.accountHolderName ? `
            <div class="detail-row">
              <span class="label">Account Holder Name</span>
              <span class="value">${bankDetails.accountHolderName}</span>
            </div>
          ` : ''}
          ${bankDetails.accountNumber ? `
            <div class="detail-row">
              <span class="label">Account Number</span>
              <span class="value">${bankDetails.accountNumber}</span>
            </div>
          ` : ''}
          ${bankDetails.ifscCode ? `
            <div class="detail-row">
              <span class="label">IFSC</span>
              <span class="value">${bankDetails.ifscCode}</span>
            </div>
          ` : ''}
          ${bankDetails.accountType ? `
            <div class="detail-row">
              <span class="label">Account Type</span>
              <span class="value">${bankDetails.accountType}</span>
            </div>
          ` : ''}
          ${bankDetails.bankName ? `
            <div class="detail-row">
              <span class="label">Bank</span>
              <span class="value">${bankDetails.bankName}</span>
            </div>
          ` : ''}
          ${bankDetails.upiId ? `
            <div class="detail-row">
              <span class="label">UPI</span>
              <span class="value">${bankDetails.upiId}</span>
            </div>
          ` : ''}
          ${paymentQRCode ? `
            <div class="qr-section">
              <img src="${paymentQRCode}" alt="Scan to Pay" />
              <p>Scan to pay via UPI</p>
            </div>
          ` : ''}
        </div>

        <!-- Terms and Conditions -->
        ${termsAndConditions && termsAndConditions.length > 0 ? `
          <div class="terms-section">
            <h4>Terms and Conditions</h4>
            <ol>
              ${termsAndConditions.map(term => `<li>${term}</li>`).join('')}
            </ol>
          </div>
        ` : ''}

        <!-- Additional Notes -->
        ${additionalNotes || invoice.notes ? `
          <div class="notes-section">
            <h4>Additional Notes</h4>
            <p>${invoice.notes || additionalNotes}</p>
          </div>
        ` : ''}
      </div>

      <div class="right-section">
        <!-- Totals -->
        <div class="totals-section">
          <div class="total-row subtotal">
            <span class="label">Sub Total</span>
            <span class="value">${formatCurrency(invoice.subtotal || 0)}</span>
          </div>
          ${invoice.discount ? `
            <div class="total-row discount">
              <span class="label">Discount (${invoice.discountPercent || ''}${invoice.discountPercent ? '%' : ''})</span>
              <span class="value">- ${formatCurrency(invoice.discount)}</span>
            </div>
          ` : ''}
          <div class="total-row">
            <span class="label">Taxable Amount</span>
            <span class="value">${formatCurrency((invoice.subtotal || 0) - (invoice.discount || 0))}</span>
          </div>
          ${!isInterstate ? `
            <div class="total-row">
              <span class="label">CGST @ ${invoice.cgstRate || 9}%</span>
              <span class="value">${formatCurrency(invoice.cgst || 0)}</span>
            </div>
            <div class="total-row">
              <span class="label">SGST @ ${invoice.sgstRate || 9}%</span>
              <span class="value">${formatCurrency(invoice.sgst || 0)}</span>
            </div>
          ` : `
            <div class="total-row">
              <span class="label">IGST @ ${invoice.igstRate || 18}%</span>
              <span class="value">${formatCurrency(invoice.igst || 0)}</span>
            </div>
          `}
          <div class="total-row grand-total">
            <span class="label">Total</span>
            <span class="value">${formatCurrency(invoice.grandTotal || 0)}</span>
          </div>
          <div class="amount-in-words">
            <strong>Invoice Total (in words):</strong><br>
            ${amountInWords(invoice.grandTotal || 0)}
          </div>
        </div>

        <!-- Early Payment Discount -->
        ${earlyPayDiscount > 0 ? `
          <div class="early-payment">
            <h5>🎁 EarlyPay Discount</h5>
            <div class="discount-info">
              Pay by ${formatDate(earlyPayDate)} to avail ${earlyPayDiscount}% discount
            </div>
            <div class="early-total">
              <span>EarlyPay Amount</span>
              <span>${formatCurrency(earlyPayAmount)}</span>
            </div>
          </div>
        ` : ''}

        <!-- Signature -->
        ${authorizedSignature || authorizedSignatoryName ? `
          <div class="signature-section">
            ${authorizedSignature ? `<img src="${authorizedSignature}" alt="Signature" />` : ''}
            <div class="name">${authorizedSignatoryName || ''}</div>
            <div class="title">Authorized Signatory</div>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div>
        ${email ? `📧 ${email}` : ''}
        ${phone ? ` | 📞 ${phone}` : ''}
        ${website ? ` | 🌐 ${website}` : ''}
      </div>
      <div>
        Thank you for your business!
      </div>
    </div>
  </div>

  <button class="print-btn no-print" onclick="window.print()">🖨️ Print Invoice</button>
</body>
</html>
  `
}
