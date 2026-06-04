import { forwardRef } from 'react'
import type { Store } from '@/types'

interface ReceiptItem {
  product_name: string
  quantity: number
  unit_price: number
  discount: number
  tax_amount: number
  gst_rate: number
  subtotal: number
}

interface PrintableReceiptProps {
  receiptNumber: string
  items: ReceiptItem[]
  subtotal: number
  taxAmount: number
  discountAmount: number
  total: number
  paymentMethod: string
  store: Store | null
  date: string
}

export const PrintableReceipt = forwardRef<HTMLDivElement, PrintableReceiptProps>(
  ({ receiptNumber, items, subtotal, taxAmount, discountAmount, total, paymentMethod, store, date }, ref) => {
    const storeName = store?.name || 'Store'
    const storeAddress = store?.address || ''
    const cityLine = [store?.city, store?.state, store?.zip_code].filter(Boolean).join(', ')
    const gstEnabled = store?.gst_enabled ?? false
    const gstin = store?.gstin || ''
    const receiptHeader = store?.receipt_header || ''
    const receiptFooter = store?.receipt_footer || ''
    const currSymbol = store?.currency === 'INR' ? '₹' : store?.currency === 'USD' ? '$' : store?.currency === 'EUR' ? '€' : store?.currency === 'GBP' ? '£' : store?.currency || '₹'

    const fmt = (n: number) => `${currSymbol}${n.toFixed(2)}`

    return (
      <div ref={ref} className="receipt-print-area" style={{ width: '300px', fontFamily: "'Courier New', Courier, monospace", fontSize: '12px', color: '#000', background: '#fff', padding: '16px', lineHeight: 1.5 }}>
        {/* Store Header */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '2px' }}>{storeName.toUpperCase()}</div>
          {storeAddress && <div style={{ fontSize: '11px' }}>{storeAddress}</div>}
          {cityLine && <div style={{ fontSize: '11px' }}>{cityLine}</div>}
          {store?.phone && <div style={{ fontSize: '11px' }}>Tel: {store.phone}</div>}
          {gstin && <div style={{ fontSize: '11px', marginTop: '4px' }}>GSTIN: {gstin}</div>}
        </div>

        <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

        {receiptHeader && (
          <>
            <div style={{ textAlign: 'center', fontSize: '11px', color: '#555' }}>{receiptHeader}</div>
            <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />
          </>
        )}

        {/* Receipt Info */}
        <div style={{ fontSize: '11px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Receipt: {receiptNumber}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Date: {new Date(date).toLocaleDateString()}</span>
            <span>{new Date(date).toLocaleTimeString()}</span>
          </div>
          <div>Payment: {paymentMethod.toUpperCase()}</div>
        </div>

        <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

        {/* Items */}
        <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #ccc' }}>
              <th style={{ textAlign: 'left', paddingBottom: '4px', fontWeight: 'bold' }}>Item</th>
              <th style={{ textAlign: 'center', paddingBottom: '4px', fontWeight: 'bold', width: '30px' }}>Qty</th>
              <th style={{ textAlign: 'right', paddingBottom: '4px', fontWeight: 'bold', width: '60px' }}>Rate</th>
              <th style={{ textAlign: 'right', paddingBottom: '4px', fontWeight: 'bold', width: '65px' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td style={{ paddingTop: '3px', paddingBottom: '3px' }}>
                  {item.product_name}
                  {gstEnabled && item.gst_rate > 0 && (
                    <span style={{ fontSize: '9px', color: '#777' }}> ({item.gst_rate}%)</span>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right' }}>{fmt(item.unit_price)}</td>
                <td style={{ textAlign: 'right' }}>{fmt(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

        {/* Totals */}
        <div style={{ fontSize: '11px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal</span>
            <span>{fmt(subtotal)}</span>
          </div>

          {gstEnabled && taxAmount > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>CGST</span>
                <span>{fmt(taxAmount / 2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>SGST</span>
                <span>{fmt(taxAmount / 2)}</span>
              </div>
            </>
          )}

          {!gstEnabled && taxAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Tax</span>
              <span>{fmt(taxAmount)}</span>
            </div>
          )}

          {discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Discount</span>
              <span>-{fmt(discountAmount)}</span>
            </div>
          )}

          <div style={{ borderTop: '1px solid #000', marginTop: '6px', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px' }}>
            <span>TOTAL</span>
            <span>{fmt(total)}</span>
          </div>
        </div>

        <div style={{ borderTop: '1px dashed #000', margin: '10px 0' }} />

        {receiptFooter && (
          <div style={{ textAlign: 'center', fontSize: '11px', color: '#555', marginBottom: '8px' }}>{receiptFooter}</div>
        )}

        <div style={{ textAlign: 'center', fontSize: '10px', color: '#999', marginTop: '4px' }}>
          Powered by SwiftBill
        </div>
      </div>
    )
  }
)

PrintableReceipt.displayName = 'PrintableReceipt'
