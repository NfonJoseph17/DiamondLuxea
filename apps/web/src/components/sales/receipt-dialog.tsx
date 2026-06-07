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

/** Business details printed on every receipt. */
const BUSINESS = {
  name: 'Diamond Luxea',
  taxNo: 'P089617617668730B',
  tel: '6 72 06 06 41 / 651 40 09 38',
  location: 'Krate Opposite Marcson Hotel, Limbe',
};

/** Styles for the isolated print document (screen + paper). */
const RECEIPT_PRINT_STYLES = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    padding: 16px 18px;
    max-width: 320px;
    margin: 0 auto;
    color: #000;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  /* margin:0 suppresses the browser's auto URL/date header & footer on the printout */
  @page {
    size: auto;
    margin: 0;
  }
  .receipt-logo-wrap { text-align: center; margin-bottom: 8px; }
  .receipt-logo {
    max-height: 96px;
    width: auto;
    max-width: 100%;
    display: inline-block;
    vertical-align: middle;
    object-fit: contain;
  }
  .receipt-business {
    text-align: center;
    font-weight: 800;
    font-size: 1.3rem;
    letter-spacing: -0.01em;
    margin: 2px 0 6px;
    color: #000;
  }
  .receipt-info {
    text-align: center;
    font-size: 0.78rem;
    line-height: 1.45;
    color: #111;
    margin: 0 0 10px;
  }
  .receipt-info .lbl { font-weight: 700; }
  .receipt-divider { border: 0; border-top: 1px dashed #aaa; margin: 10px 0; }
  .receipt-meta { font-size: 0.8rem; color: #333; text-align: center; margin-bottom: 2px; }
  .receipt-saleno { font-size: 0.72rem; color: #555; text-align: center; margin-bottom: 10px; letter-spacing: 0.02em; }
  .receipt-pay { font-size: 0.8rem; text-align: center; margin-bottom: 10px; padding: 8px; background: #f4f4f4; border-radius: 6px; }
  .receipt-pay strong { display: block; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
  th { text-align: left; padding: 5px 0; border-bottom: 1px solid #bbb; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.03em; color: #444; }
  td { padding: 5px 0; vertical-align: top; }
  th:last-child, td:last-child { text-align: right; }
  tbody tr { border-bottom: 1px dotted #ddd; }
  .total-row {
    font-weight: 800;
    font-size: 1.05rem;
    border-top: 2px solid #000;
    padding-top: 8px;
    margin-top: 10px;
    display: flex;
    justify-content: space-between;
  }
  .thanks { text-align: center; margin-top: 14px; font-size: 0.8rem; color: #444; }
`;

function buildPrintDocument(printContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title> </title>
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
    // Off-screen but with REAL dimensions: a 0x0 / hidden iframe renders blank
    // for printing on some browsers (notably iOS Safari).
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.style.width = '420px';
    iframe.style.height = '600px';
    iframe.style.border = '0';

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
          <div className="receipt-logo-wrap flex justify-center mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- static public asset; print iframe needs <img> */}
            <img
              data-receipt-logo
              src="/branding/diamond-luxea-logo.png"
              alt=""
              className="receipt-logo max-h-24 w-auto max-w-full object-contain"
            />
          </div>
          <div className="receipt-business text-center font-display text-xl font-extrabold tracking-tight text-foreground mb-1">
            {BUSINESS.name}
          </div>
          <div className="receipt-info text-center text-[0.8rem] leading-snug text-foreground mb-3">
            <div>
              <span className="lbl font-semibold">TAX NO:</span> {BUSINESS.taxNo}
            </div>
            <div>
              <span className="lbl font-semibold">TEL:</span> {BUSINESS.tel}
            </div>
            <div>{BUSINESS.location}</div>
          </div>
          <hr className="receipt-divider border-0 border-t border-dashed border-muted-foreground/40 my-3" />
          <div className="receipt-meta text-center text-sm text-muted-foreground">
            {soldAt.toLocaleString('en-GB', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </div>
          <div className="receipt-saleno text-xs text-muted-foreground text-center mb-3">
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
