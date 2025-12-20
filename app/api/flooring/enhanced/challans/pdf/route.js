import { NextResponse } from 'next/server'
import { getClientDb } from '@/lib/db/multitenancy'
import { getAuthUser, requireClientAccess, getUserDatabaseName } from '@/lib/utils/auth'
import { errorResponse, optionsResponse } from '@/lib/utils/response'

export async function OPTIONS() {
  return optionsResponse()
}

// GET - Generate Delivery Challan PDF
export async function GET(request) {
  try {
    const user = getAuthUser(request)
    requireClientAccess(user)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponse('Challan ID is required', 400)
    }

    const dbName = getUserDatabaseName(user)
    const db = await getClientDb(dbName)
    const challans = db.collection('flooring_challans')
    const challanItems = db.collection('flooring_challan_items')
    const settingsCollection = db.collection('flooring_settings')

    // Get challan
    const challan = await challans.findOne({ id })
    if (!challan) return errorResponse('Challan not found', 404)

    // Get items
    const items = await challanItems.find({ challanId: id }).toArray()

    // Get company settings
    const companySettings = await settingsCollection.findOne({ type: 'company' })
    const company = companySettings || {
      name: 'Your Company Name',
      address: 'Company Address',
      phone: '',
      email: '',
      gstin: ''
    }

    // Generate PDF HTML
    const hideSender = challan.hideSenderOnPdf
    const pdfHtml = generateChallanPdfHtml(challan, items, company, hideSender)

    // Return HTML (frontend will use window.print or a PDF library)
    return new NextResponse(pdfHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="DC-${challan.dcNo}.html"`
      }
    })
  } catch (error) {
    console.error('Challan PDF Error:', error)
    return errorResponse('Failed to generate challan PDF', 500, error.message)
  }
}

function generateChallanPdfHtml(challan, items, company, hideSender = false) {
  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const itemRows = items.map((item, index) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">
        <strong>${item.productName}</strong>
        ${item.sku ? `<br><small style="color: #666;">SKU: ${item.sku}</small>` : ''}
        ${item.lotNo ? `<br><small style="color: #666;">Lot: ${item.lotNo}</small>` : ''}
      </td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.qtyBoxes || '-'}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.qtyArea?.toFixed(2) || '-'}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.coveragePerBoxSnapshot || '-'}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.notes || '-'}</td>
    </tr>
  `).join('')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Delivery Challan - ${challan.dcNo}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.5; padding: 20px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
    .company-info { flex: 1; }
    .company-name { font-size: 20px; font-weight: bold; color: #333; }
    .dc-info { text-align: right; }
    .dc-number { font-size: 18px; font-weight: bold; color: #2563eb; }
    .dc-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; margin-top: 5px; }
    .dc-badge.draft { background: #fef3c7; color: #92400e; }
    .dc-badge.issued { background: #dbeafe; color: #1e40af; }
    .dc-badge.delivered { background: #dcfce7; color: #166534; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 14px; font-weight: bold; color: #333; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .info-box { background: #f9fafb; padding: 15px; border-radius: 8px; }
    .info-box h4 { font-size: 12px; color: #6b7280; margin-bottom: 8px; text-transform: uppercase; }
    .info-box p { margin: 4px 0; }
    .info-box .name { font-weight: bold; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #f3f4f6; padding: 10px 8px; border: 1px solid #ddd; text-align: left; font-weight: bold; }
    .totals { margin-top: 20px; text-align: right; }
    .totals-row { display: flex; justify-content: flex-end; gap: 20px; padding: 5px 0; }
    .totals-label { font-weight: bold; }
    .transport-info { margin-top: 20px; background: #f9fafb; padding: 15px; border-radius: 8px; }
    .transport-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
    .transport-item label { font-size: 10px; color: #6b7280; text-transform: uppercase; }
    .transport-item p { font-weight: bold; }
    .signature-section { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .signature-box { border-top: 1px solid #333; padding-top: 10px; text-align: center; }
    .notes { margin-top: 20px; padding: 15px; background: #fffbeb; border-radius: 8px; border: 1px solid #fbbf24; }
    .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #6b7280; border-top: 1px solid #ddd; padding-top: 10px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    ${!hideSender ? `
    <div class="company-info">
      <div class="company-name">${company.name}</div>
      <p>${company.address || ''}</p>
      ${company.phone ? `<p>Phone: ${company.phone}</p>` : ''}
      ${company.email ? `<p>Email: ${company.email}</p>` : ''}
      ${company.gstin ? `<p>GSTIN: ${company.gstin}</p>` : ''}
    </div>
    ` : '<div class="company-info"></div>'}
    <div class="dc-info">
      <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">DELIVERY CHALLAN</div>
      <div class="dc-number">${challan.dcNo}</div>
      <p style="margin-top: 8px;"><strong>Date:</strong> ${formatDate(challan.issuedAt || challan.createdAt)}</p>
      <span class="dc-badge ${challan.status.toLowerCase()}">${challan.status}</span>
      ${challan.thirdPartyDelivery ? '<br><small style="color: #7c3aed;">Third Party Delivery</small>' : ''}
    </div>
  </div>

  <div class="section">
    <div class="info-grid">
      <div class="info-box">
        <h4>Bill To</h4>
        <p class="name">${challan.billToNameSnapshot || challan.billToName || '-'}</p>
        <p>${challan.billToAddress || ''}</p>
        ${challan.billToPhone ? `<p>Phone: ${challan.billToPhone}</p>` : ''}
        ${challan.billToGstin ? `<p>GSTIN: ${challan.billToGstin}</p>` : ''}
      </div>
      <div class="info-box">
        <h4>Ship To / Deliver To</h4>
        <p class="name">${challan.shipToName || '-'}</p>
        <p>${challan.shipToAddress || ''}</p>
        ${challan.shipToPhone ? `<p>Phone: ${challan.shipToPhone}</p>` : ''}
        ${challan.receiverName && challan.receiverName !== challan.shipToName ? `
          <p style="margin-top: 8px;"><strong>Receiver:</strong> ${challan.receiverName}</p>
          ${challan.receiverPhone ? `<p>Phone: ${challan.receiverPhone}</p>` : ''}
        ` : ''}
      </div>
    </div>
  </div>

  ${challan.quoteNumber || challan.invoiceNumber ? `
  <div class="section" style="margin-bottom: 15px;">
    <p>
      ${challan.quoteNumber ? `<strong>Quote:</strong> ${challan.quoteNumber} &nbsp;&nbsp;` : ''}
      ${challan.invoiceNumber ? `<strong>Invoice:</strong> ${challan.invoiceNumber}` : ''}
      ${challan.projectNumber ? `&nbsp;&nbsp;<strong>Project:</strong> ${challan.projectNumber}` : ''}
    </p>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">Items</div>
    <table>
      <thead>
        <tr>
          <th style="width: 40px;">#</th>
          <th>Product</th>
          <th style="width: 80px; text-align: center;">Boxes</th>
          <th style="width: 80px; text-align: center;">Area (sqft)</th>
          <th style="width: 80px; text-align: center;">Coverage/Box</th>
          <th style="width: 120px;">Notes</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>
  </div>

  <div class="totals">
    <div class="totals-row">
      <span class="totals-label">Total Items:</span>
      <span>${challan.totalItems || items.length}</span>
    </div>
    <div class="totals-row">
      <span class="totals-label">Total Boxes:</span>
      <span>${challan.totalBoxes || items.reduce((s, i) => s + (i.qtyBoxes || 0), 0)}</span>
    </div>
    <div class="totals-row">
      <span class="totals-label">Total Area:</span>
      <span>${(challan.totalArea || items.reduce((s, i) => s + (i.qtyArea || 0), 0)).toFixed(2)} sqft</span>
    </div>
  </div>

  ${challan.transporterName || challan.vehicleNo || challan.driverName ? `
  <div class="transport-info">
    <div class="section-title" style="margin-bottom: 15px;">Transport Details</div>
    <div class="transport-grid">
      <div class="transport-item">
        <label>Transporter</label>
        <p>${challan.transporterName || '-'}</p>
      </div>
      <div class="transport-item">
        <label>Vehicle No.</label>
        <p>${challan.vehicleNo || '-'}</p>
      </div>
      <div class="transport-item">
        <label>Driver</label>
        <p>${challan.driverName || '-'}</p>
        ${challan.driverPhone ? `<small>${challan.driverPhone}</small>` : ''}
      </div>
      <div class="transport-item">
        <label>LR No.</label>
        <p>${challan.lrNo || '-'}</p>
      </div>
    </div>
  </div>
  ` : ''}

  ${challan.dispatchNotes ? `
  <div class="notes">
    <strong>Notes:</strong> ${challan.dispatchNotes}
  </div>
  ` : ''}

  <div class="signature-section">
    <div class="signature-box">
      <p style="margin-bottom: 40px;"></p>
      <p><strong>Dispatched By</strong></p>
      ${challan.issuedByName ? `<small>${challan.issuedByName}</small>` : ''}
    </div>
    <div class="signature-box">
      <p style="margin-bottom: 40px;"></p>
      <p><strong>Received By</strong></p>
      <small>Name: ____________________</small><br>
      <small>Date: ____________________</small>
    </div>
  </div>

  <div class="footer">
    <p>This is a computer-generated document. Goods once dispatched are subject to our terms and conditions.</p>
    <p>Generated on ${new Date().toLocaleString('en-IN')}</p>
  </div>

  <script>
    // Auto-print on load (optional)
    // window.onload = function() { window.print(); }
  </script>
</body>
</html>
  `
}
