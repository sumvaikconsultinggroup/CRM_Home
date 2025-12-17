'use client'

import { forwardRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'

/**
 * Professional Invoice Template
 * Used across all modules (Flooring, D&W, Build Finance)
 * 
 * @param {Object} props
 * @param {Object} props.invoice - Invoice data
 * @param {Object} props.company - Company/business details (billed by)
 * @param {Object} props.customer - Customer details (billed to)
 * @param {Array} props.items - Line items
 * @param {Object} props.bankDetails - Bank payment details
 * @param {Object} props.totals - Subtotal, discount, taxes, total
 * @param {Object} props.settings - Additional settings (terms, notes, etc.)
 */
const InvoiceTemplate = forwardRef(({ 
  invoice = {},
  company = {},
  customer = {},
  items = [],
  bankDetails = {},
  totals = {},
  settings = {},
  className = ''
}, ref) => {
  
  // Format currency
  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0
    return `₹ ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  
  // Format date
  const formatDate = (date) => {
    if (!date) return '-'
    const d = new Date(date)
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
  }
  
  // Convert number to words (Indian format)
  const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
    
    if (num === 0) return 'Zero'
    
    const convertLessThanThousand = (n) => {
      if (n === 0) return ''
      if (n < 20) return ones[n]
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' And ' + convertLessThanThousand(n % 100) : '')
    }
    
    const n = Math.floor(num)
    if (n < 1000) return convertLessThanThousand(n)
    if (n < 100000) return convertLessThanThousand(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convertLessThanThousand(n % 1000) : '')
    if (n < 10000000) return convertLessThanThousand(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numberToWords(n % 100000) : '')
    return convertLessThanThousand(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + numberToWords(n % 10000000) : '')
  }
  
  // Calculate GST components
  const cgstRate = totals.cgstRate || 9
  const sgstRate = totals.sgstRate || 9
  const igstRate = totals.igstRate || 0
  const isInterState = totals.isInterState || false
  
  // Generate UPI payment string
  const upiPaymentString = bankDetails.upi ? 
    `upi://pay?pa=${bankDetails.upi}&pn=${encodeURIComponent(company.name || 'Business')}&am=${totals.total || 0}&cu=INR` : ''

  return (
    <div 
      ref={ref}
      className={`bg-white p-8 max-w-4xl mx-auto font-sans text-sm ${className}`}
      style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-800 mb-4">Invoice</h1>
          <div className="space-y-1 text-slate-600">
            <p><span className="font-semibold text-slate-800">Invoice#</span> {invoice.number || invoice.id || '-'}</p>
            <p><span className="font-semibold text-slate-800">Invoice Date</span> {formatDate(invoice.date)}</p>
            <p><span className="font-semibold text-slate-800">Due Date</span> {formatDate(invoice.dueDate)}</p>
          </div>
        </div>
        <div className="text-right">
          {company.logo ? (
            <img src={company.logo} alt={company.name} className="h-16 object-contain mb-2" />
          ) : (
            <div className="flex items-center gap-2 justify-end">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">{(company.name || 'B')[0]}</span>
              </div>
              <span className="text-xl font-bold text-slate-800">{company.name || 'Business'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Billed By / Billed To */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Billed By */}
        <div className="bg-slate-50 p-4 rounded-lg">
          <h3 className="font-bold text-slate-800 mb-2">Billed by</h3>
          <p className="font-semibold text-slate-800">{company.name || '-'}</p>
          <p className="text-slate-600 text-sm whitespace-pre-line">{company.address || '-'}</p>
          {company.gstin && <p className="mt-2"><span className="font-semibold text-slate-800">GSTIN</span> {company.gstin}</p>}
          {company.pan && <p><span className="font-semibold text-slate-800">PAN</span> {company.pan}</p>}
          {invoice.placeOfSupply && (
            <p className="mt-2 text-slate-500 text-xs">Place of Supply: {invoice.placeOfSupply}</p>
          )}
        </div>

        {/* Billed To */}
        <div className="bg-slate-50 p-4 rounded-lg">
          <h3 className="font-bold text-slate-800 mb-2">Billed to</h3>
          <p className="font-semibold text-slate-800">{customer.name || '-'}</p>
          <p className="text-slate-600 text-sm whitespace-pre-line">{customer.address || '-'}</p>
          {customer.gstin && <p className="mt-2"><span className="font-semibold text-slate-800">GSTIN</span> {customer.gstin}</p>}
          {customer.pan && <p><span className="font-semibold text-slate-800">PAN</span> {customer.pan}</p>}
          {customer.phone && <p className="mt-2 text-slate-500 text-xs">Phone: {customer.phone}</p>}
          {customer.email && <p className="text-slate-500 text-xs">Email: {customer.email}</p>}
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8 overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full">
          <thead>
            <tr className="bg-purple-600 text-white text-xs">
              <th className="py-3 px-3 text-left font-semibold">#</th>
              <th className="py-3 px-3 text-left font-semibold">Item Description</th>
              <th className="py-3 px-2 text-center font-semibold">HSN</th>
              <th className="py-3 px-2 text-center font-semibold">Qty</th>
              <th className="py-3 px-2 text-center font-semibold">Rate</th>
              <th className="py-3 px-2 text-right font-semibold">Taxable Amt</th>
              {isInterState ? (
                <th className="py-3 px-2 text-right font-semibold">IGST ({igstRate}%)</th>
              ) : (
                <>
                  <th className="py-3 px-2 text-right font-semibold">CGST ({cgstRate}%)</th>
                  <th className="py-3 px-2 text-right font-semibold">SGST ({sgstRate}%)</th>
                </>
              )}
              <th className="py-3 px-3 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const taxableAmount = (item.quantity || 1) * (item.rate || item.price || 0)
              const cgst = taxableAmount * (cgstRate / 100)
              const sgst = taxableAmount * (sgstRate / 100)
              const igst = taxableAmount * (igstRate / 100)
              const totalAmount = isInterState ? taxableAmount + igst : taxableAmount + cgst + sgst
              
              return (
                <tr key={item.id || index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="py-3 px-3 text-slate-600">{index + 1}</td>
                  <td className="py-3 px-3">
                    <p className="font-medium text-slate-800">{item.name || item.description}</p>
                    {item.details && <p className="text-xs text-slate-500">{item.details}</p>}
                  </td>
                  <td className="py-3 px-2 text-center text-slate-600">{item.hsn || '-'}</td>
                  <td className="py-3 px-2 text-center text-slate-600">{item.quantity || 1} {item.unit || ''}</td>
                  <td className="py-3 px-2 text-center text-slate-600">{formatCurrency(item.rate || item.price || 0)}</td>
                  <td className="py-3 px-2 text-right text-slate-800">{formatCurrency(taxableAmount)}</td>
                  {isInterState ? (
                    <td className="py-3 px-2 text-right text-slate-600">{formatCurrency(igst)}</td>
                  ) : (
                    <>
                      <td className="py-3 px-2 text-right text-slate-600">{formatCurrency(cgst)}</td>
                      <td className="py-3 px-2 text-right text-slate-600">{formatCurrency(sgst)}</td>
                    </>
                  )}
                  <td className="py-3 px-3 text-right font-semibold text-slate-800">{formatCurrency(totalAmount)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Bank Details & Totals */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Bank Details */}
        <div className="bg-slate-50 p-4 rounded-lg">
          <h3 className="font-bold text-slate-800 mb-3">Bank & Payment Details</h3>
          <div className="flex gap-4">
            <div className="flex-1 space-y-1 text-sm">
              {bankDetails.accountName && (
                <p><span className="text-slate-500">Account Holder:</span> <span className="font-medium">{bankDetails.accountName}</span></p>
              )}
              {bankDetails.accountNumber && (
                <p><span className="text-slate-500">Account Number:</span> <span className="font-medium">{bankDetails.accountNumber}</span></p>
              )}
              {bankDetails.ifsc && (
                <p><span className="text-slate-500">IFSC:</span> <span className="font-medium">{bankDetails.ifsc}</span></p>
              )}
              {bankDetails.accountType && (
                <p><span className="text-slate-500">Account Type:</span> <span className="font-medium">{bankDetails.accountType}</span></p>
              )}
              {bankDetails.bankName && (
                <p><span className="text-slate-500">Bank:</span> <span className="font-medium">{bankDetails.bankName}</span></p>
              )}
              {bankDetails.upi && (
                <p><span className="text-slate-500">UPI:</span> <span className="font-medium">{bankDetails.upi}</span></p>
              )}
            </div>
            {bankDetails.upi && (
              <div className="text-center">
                <QRCodeSVG 
                  value={upiPaymentString}
                  size={80}
                  level="M"
                  className="border p-1 bg-white rounded"
                />
                <p className="text-xs text-slate-500 mt-1">Scan to Pay</p>
              </div>
            )}
          </div>
        </div>

        {/* Totals */}
        <div className="space-y-2">
          <div className="flex justify-between py-1">
            <span className="text-slate-600">Sub Total</span>
            <span className="font-medium text-slate-800">{formatCurrency(totals.subtotal)}</span>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between py-1">
              <span className="text-slate-600">Discount {totals.discountPercent ? `(${totals.discountPercent}%)` : ''}</span>
              <span className="font-medium text-green-600">- {formatCurrency(totals.discount)}</span>
            </div>
          )}
          <div className="flex justify-between py-1">
            <span className="text-slate-600">Taxable Amount</span>
            <span className="font-medium text-slate-800">{formatCurrency(totals.taxableAmount || (totals.subtotal - (totals.discount || 0)))}</span>
          </div>
          {isInterState ? (
            <div className="flex justify-between py-1">
              <span className="text-slate-600">IGST ({igstRate}%)</span>
              <span className="font-medium text-slate-800">{formatCurrency(totals.igst)}</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">CGST ({cgstRate}%)</span>
                <span className="font-medium text-slate-800">{formatCurrency(totals.cgst)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">SGST ({sgstRate}%)</span>
                <span className="font-medium text-slate-800">{formatCurrency(totals.sgst)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between py-2 border-t border-slate-200 mt-2">
            <span className="text-lg font-bold text-slate-800">Total</span>
            <span className="text-lg font-bold text-slate-800">{formatCurrency(totals.total)}</span>
          </div>
          <p className="text-xs text-slate-500 text-right">
            {numberToWords(Math.round(totals.total || 0))} Rupees Only
          </p>
          
          {/* Early Pay Discount */}
          {settings.earlyPayDiscount && (
            <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex justify-between items-center">
                <span className="text-purple-700 font-semibold">EarlyPay Discount</span>
                <span className="text-purple-600 font-medium">{formatCurrency(settings.earlyPayDiscount)}</span>
              </div>
              {settings.earlyPayDeadline && (
                <p className="text-xs text-slate-500 mt-1">if paid before {formatDate(settings.earlyPayDeadline)}</p>
              )}
              <div className="flex justify-between items-center mt-2">
                <span className="font-bold text-slate-800">EarlyPay Amount</span>
                <span className="text-lg font-bold text-purple-600">{formatCurrency((totals.total || 0) - (settings.earlyPayDiscount || 0))}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Terms & Conditions */}
      {settings.terms && settings.terms.length > 0 && (
        <div className="mb-6">
          <h3 className="font-bold text-slate-800 mb-2">Terms and Conditions</h3>
          <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1">
            {settings.terms.map((term, index) => (
              <li key={index}>{term}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Additional Notes */}
      {settings.notes && (
        <div className="mb-6">
          <h3 className="font-bold text-slate-800 mb-2">Additional Notes</h3>
          <p className="text-xs text-slate-600 whitespace-pre-line">{settings.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
        {company.email && <span>For enquiries: {company.email}</span>}
        {company.phone && <span className="ml-4">Phone: {company.phone}</span>}
        {company.website && <span className="ml-4">{company.website}</span>}
      </div>
    </div>
  )
})

InvoiceTemplate.displayName = 'InvoiceTemplate'

// Helper component for printing
export function PrintableInvoice({ children, onPrint }) {
  return (
    <div className="print:block">
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          @page { margin: 0.5in; }
        }
      `}</style>
      <div className="print-area">
        {children}
      </div>
    </div>
  )
}

// Default export
export default InvoiceTemplate

// Named exports for specific uses
export { InvoiceTemplate }
