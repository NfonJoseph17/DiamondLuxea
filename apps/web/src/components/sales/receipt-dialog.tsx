'use client';

import { useCallback, useRef } from 'react';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Sale } from '@/types';
import { formatUnitLabel } from '@/lib/utils/units';
import { Printer } from 'lucide-react';

interface ReceiptDialogProps {
  open: boolean;
  sale: Sale | null;
  onClose: () => void;
}

/** Styles for the isolated print document (screen + paper). */
const RECEIPT_PRINT_STYLES = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    padding: 16px;
    max-width: 320px;
    margin: 0 auto;
    color: #000;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  @page {
    size: auto;
    margin: 12mm;
  }
  .receipt-logo-wrap { text-align: center; margin-bottom: 12px; }
  .receipt-logo {
    max-height: 120px;
    width: auto;
    max-width: 100%;
    display: inline-block;
    vertical-align: middle;
    object-fit: contain;
  }
            .receipt-meta { font-size: 0.875rem; color: #444; text-align: center; margin-bottom: 12px; }
            .receipt-pay { font-size: 0.875rem; text-align: center; margin-bottom: 12px; padding: 8px; background: #f5f5f5; border-radius: 6px; }
            .receipt-pay strong { display: block; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  th { text-align: left; padding: 4px 0; border-bottom: 1px solid #ccc; }
  td { padding: 4px 0; }
  td:last-child { text-align: right; }
  .total-row {
    font-weight: bold;
    font-size: 1rem;
    border-top: 2px solid #000;
    padding-top: 8px;
    margin-top: 8px;
    display: flex;
    justify-content: space-between;
  }
  .thanks { text-align: center; margin-top: 16px; font-size: 0.875rem; color: #444; }
`;

function buildPrintDocument(printContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Receipt</title>
    <style>${RECEIPT_PRINT_STYLES}</style>
  </head>
  <body>${printContent}</body>
</html>`;
}

/** Wait for all images in the document to finish loading (or fail). */
function whenImagesReady(doc: Document): Promise<void> {
  const imgs = Array.from(doc.images);
  if (imgs.length === 0) return Promise.resolve();
  return Promise.all(
    imgs.map(
      (img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener('load', () => resolve(), { once: true });
              img.addEventListener('error', () => resolve(), { once: true });
            }),
    ),
  ).then(() => undefined);
}

export function ReceiptDialog({ open, sale, onClose }: ReceiptDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);

  /**
   * Opens the OS / browser print dialog so the cashier can pick any connected printer
   * (USB, network, Bluetooth where supported, PDF, etc.). Uses a hidden iframe so
   * popup blockers do not block the flow.
   */
  const handlePrint = useCallback(() => {
    if (!printRef.current) return;

    const clone = printRef.current.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('img[data-receipt-logo]').forEach((node) => {
      const el = node as HTMLImageElement;
      const path = el.getAttribute('src') || '';
      if (path.startsWith('/')) {
        el.setAttribute('src', `${window.location.origin}${path}`);
      }
    });
    const printContent = clone.innerHTML;
    const html = buildPrintDocument(printContent);

    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', 'Print receipt');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';

    document.body.appendChild(iframe);

    const win = iframe.contentWindow;
    const doc = iframe.contentDocument;
    if (!win || !doc) {
      document.body.removeChild(iframe);
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    const cleanup = () => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    };

    const triggerPrint = () => {
      void whenImagesReady(doc).then(() => {
        requestAnimationFrame(() => {
          win.addEventListener('afterprint', cleanup, { once: true });
          window.setTimeout(cleanup, 60_000);
          win.focus();
          win.print();
        });
      });
    };

    if (doc.readyState === 'complete') {
      triggerPrint();
    } else {
      win.addEventListener('load', triggerPrint, { once: true });
    }
  }, []);

  if (!sale) return null;

  const soldAt = new Date(sale.soldAt);
  const total = parseFloat(sale.totalAmount || '0');
  const payStatus = sale.paymentStatus ?? 'PAID';
  const amountPaid = parseFloat(sale.amountPaid ?? '0');
  const balanceDue = Math.max(0, total - amountPaid);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Receipt</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div ref={printRef} className="receipt-content">
          <div className="receipt-logo-wrap flex justify-center mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- static public asset; print iframe needs <img> */}
            <img
              data-receipt-logo
              src="/branding/beverlys-lounge-logo.png"
              alt="Beverly's Lounge"
              className="receipt-logo max-h-28 w-auto max-w-full object-contain"
            />
          </div>
          <div className="receipt-meta text-center text-sm text-muted-foreground">
            {soldAt.toLocaleString('en-GB', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </div>
          <div className="text-xs text-muted-foreground text-center mb-3">
            Sale #{sale.id.slice(-8).toUpperCase()}
          </div>
          {(payStatus === 'UNPAID' || payStatus === 'PARTIAL') && (
            <div className="receipt-pay text-sm text-center mb-3 rounded-md bg-muted/60 px-2 py-2">
              <strong className="block font-semibold text-foreground">
                {payStatus === 'UNPAID' ? 'Not paid' : 'Partial payment'}
              </strong>
              {payStatus === 'PARTIAL' && (
                <>
                  <span className="text-muted-foreground">Paid: </span>
                  {amountPaid.toLocaleString()} XAF
                  <br />
                  <span className="text-muted-foreground">Balance due: </span>
                  <span className="font-medium text-foreground">{balanceDue.toLocaleString()} XAF</span>
                </>
              )}
              {payStatus === 'UNPAID' && (
                <span className="font-medium text-foreground">
                  Amount owed: {total.toLocaleString()} XAF
                </span>
              )}
            </div>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">Product</th>
                <th className="text-right py-1">Qty</th>
                <th className="text-right py-1">Unit</th>
                <th className="text-right py-1">Unit Price</th>
                <th className="text-right py-1">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items?.map((item) => (
                <tr key={item.id} className="border-b border-dashed">
                  <td className="py-1.5">{item.product?.name ?? item.productId}</td>
                  <td className="text-right py-1.5">{item.quantity}</td>
                  <td className="text-right py-1.5">
                    {formatUnitLabel(item.unitNameSnapshot ?? item.product?.unitType ?? 'UNIT', item.quantity !== 1)}
                  </td>
                  <td className="text-right py-1.5">
                    {parseFloat(item.unitSellingPrice || '0').toLocaleString()} XAF
                  </td>
                  <td className="text-right py-1.5 font-medium">
                    {parseFloat(item.subtotal || '0').toLocaleString()} XAF
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="total-row flex justify-between font-bold text-base mt-3 pt-3 border-t-2">
            <span>Total</span>
            <span>{total.toLocaleString()} XAF</span>
          </div>
          <div className="thanks text-center text-sm text-muted-foreground mt-4">
            Thank you for your purchase!
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={handlePrint}
            className="flex-1"
            aria-label="Print receipt — choose printer in the dialog"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print receipt
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
