import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// GET - Generate Invoice PDF (HTML for now, can be converted to actual PDF later)
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get('id')

    if (!invoiceId) {
      return new Response('Invoice ID required', { status: 400 })
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const invoicesCollection = db.collection('flooring_invoices')

    const invoice = await invoicesCollection.findOne({ id: invoiceId })

    if (!invoice) {
      return new Response('Invoice not found', { status: 404 })
    }

    // Get client info for header
    const mainDb = await getClientDb('buildcrm')
    const client = await mainDb.collection('clients').findOne({ clientCode: user.clientId })

    // Generate HTML Invoice (printable format)
    const html = generateInvoiceHTML(invoice, client)

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="Invoice-${invoice.invoiceNumber || invoice.id}.html"`,
      },
    })
  } catch (error) {
    console.error('Invoice PDF Error:', error)
    if (error.message === 'Unauthorized') {
      return new Response('Unauthorized', { status: 401 })
    }
    return new Response('Failed to generate invoice', { status: 500 })
  }
}

function generateInvoiceHTML(invoice, client) {
  const companyName = client?.companyName || 'Your Company'
  const companyAddress = client?.address || ''
  const companyGSTIN = client?.gstin || ''
  const companyPhone = client?.phone || ''
  const companyEmail = client?.email || ''

  const customer = invoice.customer || {}
  const items = invoice.items || []
  const isInterstate = invoice.isInterstate || false

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

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
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      padding: 20px; 
      background: #f5f5f5;
      color: #333;
    }
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .company-info h1 {
      color: #2563eb;
      font-size: 28px;
      margin-bottom: 10px;
    }
    .company-info p {
      color: #666;
      font-size: 13px;
      line-height: 1.6;
    }
    .invoice-title {
      text-align: right;
    }
    .invoice-title h2 {
      font-size: 32px;
      color: #2563eb;
      margin-bottom: 10px;
    }
    .invoice-title p {
      font-size: 14px;
      color: #666;
    }
    .invoice-title .invoice-number {
      font-size: 18px;
      font-weight: bold;
      color: #333;
    }
    .billing-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    .billing-to, .invoice-details {
      width: 48%;
    }
    .billing-to h3, .invoice-details h3 {
      color: #2563eb;
      font-size: 14px;
      text-transform: uppercase;
      margin-bottom: 10px;
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 5px;
    }
    .billing-to p, .invoice-details p {
      font-size: 14px;
      line-height: 1.8;
      color: #333;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .items-table th {
      background: #2563eb;
      color: white;
      padding: 12px 10px;
      text-align: left;
      font-size: 13px;
      text-transform: uppercase;
    }
    .items-table th:last-child {
      text-align: right;
    }
    .items-table td {
      padding: 12px 10px;
      border-bottom: 1px solid #e0e0e0;
      font-size: 14px;
    }
    .items-table td:last-child {
      text-align: right;
    }
    .items-table tr:nth-child(even) {
      background: #f9f9f9;
    }
    .totals {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 30px;
    }
    .totals-table {
      width: 300px;
    }
    .totals-table tr td {
      padding: 8px 10px;
      font-size: 14px;
    }
    .totals-table tr td:last-child {
      text-align: right;
    }
    .totals-table tr.total-row {
      background: #2563eb;
      color: white;
      font-weight: bold;
      font-size: 16px;
    }
    .totals-table tr.total-row td {
      padding: 12px 10px;
    }
    .footer {
      border-top: 1px solid #e0e0e0;
      padding-top: 20px;
      text-align: center;
    }
    .footer p {
      color: #666;
      font-size: 12px;
      line-height: 1.8;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .status-paid { background: #dcfce7; color: #166534; }
    .status-sent { background: #dbeafe; color: #1e40af; }
    .status-draft { background: #f3f4f6; color: #374151; }
    .status-pending { background: #fef3c7; color: #92400e; }
    .bank-details {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      margin-top: 20px;
    }
    .bank-details h4 {
      color: #2563eb;
      margin-bottom: 10px;
      font-size: 14px;
    }
    .bank-details p {
      font-size: 13px;
      line-height: 1.8;
    }
    @media print {
      body { background: white; padding: 0; }
      .invoice-container { box-shadow: none; padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="company-info">
        <h1>${companyName}</h1>
        <p>
          ${companyAddress ? companyAddress + '<br>' : ''}
          ${companyPhone ? 'Phone: ' + companyPhone + '<br>' : ''}
          ${companyEmail ? 'Email: ' + companyEmail + '<br>' : ''}
          ${companyGSTIN ? 'GSTIN: ' + companyGSTIN : ''}
        </p>
      </div>
      <div class="invoice-title">
        <h2>TAX INVOICE</h2>
        <p class="invoice-number">${invoice.invoiceNumber || 'INV-' + invoice.id.substring(0, 8)}</p>
        <p>Date: ${formatDate(invoice.createdAt || invoice.invoiceDate)}</p>
        <p>
          <span class="status-badge status-${(invoice.status || 'draft').toLowerCase()}">
            ${(invoice.status || 'Draft').toUpperCase()}
          </span>
        </p>
      </div>
    </div>

    <div class="billing-section">
      <div class="billing-to">
        <h3>Bill To</h3>
        <p>
          <strong>${customer.name || 'Customer'}</strong><br>
          ${customer.address || customer.billingAddress || ''}<br>
          ${customer.phone ? 'Phone: ' + customer.phone + '<br>' : ''}
          ${customer.email ? 'Email: ' + customer.email + '<br>' : ''}
          ${customer.gstin ? 'GSTIN: ' + customer.gstin : ''}
        </p>
      </div>
      <div class="invoice-details">
        <h3>Invoice Details</h3>
        <p>
          ${invoice.projectName ? 'Project: ' + invoice.projectName + '<br>' : ''}
          ${invoice.projectSegment ? 'Segment: ' + invoice.projectSegment.toUpperCase() + '<br>' : ''}
          ${invoice.dueDate ? 'Due Date: ' + formatDate(invoice.dueDate) + '<br>' : ''}
          ${invoice.poNumber ? 'PO Number: ' + invoice.poNumber : ''}
        </p>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 5%">#</th>
          <th style="width: 35%">Description</th>
          <th style="width: 10%">HSN</th>
          <th style="width: 10%">Qty</th>
          <th style="width: 15%">Rate</th>
          <th style="width: 15%">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>
              <strong>${item.name || item.productName || 'Item'}</strong>
              ${item.description ? '<br><small style="color: #666">' + item.description + '</small>' : ''}
            </td>
            <td>${item.hsnCode || item.hsn || '-'}</td>
            <td>${item.quantity || 0} ${item.unit || ''}</td>
            <td>${formatCurrency(item.unitPrice || item.rate || 0)}</td>
            <td>${formatCurrency(item.totalPrice || item.amount || (item.quantity * item.unitPrice) || 0)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals">
      <table class="totals-table">
        <tr>
          <td>Subtotal</td>
          <td>${formatCurrency(invoice.subtotal || 0)}</td>
        </tr>
        ${!isInterstate ? `
          <tr>
            <td>CGST @ ${invoice.cgstRate || 9}%</td>
            <td>${formatCurrency(invoice.cgst || 0)}</td>
          </tr>
          <tr>
            <td>SGST @ ${invoice.sgstRate || 9}%</td>
            <td>${formatCurrency(invoice.sgst || 0)}</td>
          </tr>
        ` : `
          <tr>
            <td>IGST @ ${invoice.igstRate || 18}%</td>
            <td>${formatCurrency(invoice.igst || 0)}</td>
          </tr>
        `}
        ${invoice.discount ? `
          <tr>
            <td>Discount</td>
            <td>-${formatCurrency(invoice.discount)}</td>
          </tr>
        ` : ''}
        <tr class="total-row">
          <td>Grand Total</td>
          <td>${formatCurrency(invoice.grandTotal || 0)}</td>
        </tr>
      </table>
    </div>

    ${invoice.notes ? `
      <div style="margin-bottom: 20px; padding: 15px; background: #fffbeb; border-radius: 8px;">
        <strong>Notes:</strong><br>
        <p style="margin-top: 5px; color: #666;">${invoice.notes}</p>
      </div>
    ` : ''}

    <div class="bank-details">
      <h4>Bank Details for Payment</h4>
      <p>
        ${client?.bankName ? 'Bank: ' + client.bankName + '<br>' : 'Bank: Your Bank Name<br>'}
        ${client?.accountNumber ? 'Account No: ' + client.accountNumber + '<br>' : 'Account No: XXXXXXXXXXXX<br>'}
        ${client?.ifscCode ? 'IFSC: ' + client.ifscCode + '<br>' : 'IFSC: XXXXXX<br>'}
        ${client?.accountName ? 'Account Name: ' + client.accountName : 'Account Name: ' + companyName}
      </p>
    </div>

    <div class="footer">
      <p>
        Thank you for your business!<br>
        This is a computer-generated invoice and does not require a signature.
      </p>
      <button class="no-print" onclick="window.print()" style="margin-top: 20px; padding: 10px 30px; background: #2563eb; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">
        🖨️ Print Invoice
      </button>
    </div>
  </div>
</body>
</html>
  `
}
