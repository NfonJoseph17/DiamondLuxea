import { Injectable } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DefaultLocationService } from '../common/default-location.service';
import { parseDateRange } from '../common/report-date-range';

/** Query param: all | paid | outstanding (UNPAID + PARTIAL) */
export type SalesPaymentReportFilter = 'all' | 'paid' | 'outstanding';

export function parseSalesPaymentFilter(q?: string): SalesPaymentReportFilter {
  if (q === 'paid' || q === 'outstanding') return q;
  return 'all';
}

function salePaymentWhere(filter: SalesPaymentReportFilter): Prisma.SaleWhereInput {
  if (filter === 'paid') return { paymentStatus: PaymentStatus.PAID };
  if (filter === 'outstanding') {
    return { paymentStatus: { in: [PaymentStatus.UNPAID, PaymentStatus.PARTIAL] } };
  }
  return {};
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly defaultLocation: DefaultLocationService,
  ) {}

  async getSummary(from?: string, to?: string, tzOffset?: number, payment?: string) {
    const { from: fromDate, to: toDate } = parseDateRange(from, to, tzOffset);
    const paymentFilter = parseSalesPaymentFilter(payment);
    const [mainStoreId, barId] = await Promise.all([
      this.defaultLocation.getDefaultMainStoreId(),
      this.defaultLocation.getDefaultBarId(),
    ]);
    const locationIds = [mainStoreId, barId];

    const [sales, purchases, products, expenditureAgg] = await Promise.all([
      this.prisma.sale.findMany({
        where: {
          soldAt: { gte: fromDate, lte: toDate },
          locationId: { in: locationIds },
          ...salePaymentWhere(paymentFilter),
        },
        include: { items: { include: { product: true } } },
      }),
      this.prisma.purchase.findMany({
        where: {
          purchasedAt: { gte: fromDate, lte: toDate },
          locationId: { in: locationIds },
        },
        include: { items: true },
      }),
      this.prisma.product.findMany({
        where: { isActive: true },
        include: { inventoryBalance: true, baseUnit: true },
      }),
      this.prisma.expenditure.aggregate({
        where: { spentAt: { gte: fromDate, lte: toDate } },
        _sum: { amount: true },
      }),
    ]);

    const totalExpenditures = Number(expenditureAgg._sum.amount ?? 0);

    const totalSales = sales.reduce(
      (sum: number, s: { totalAmount: unknown }) => sum + Number(s.totalAmount),
      0,
    );
    let totalQtySold = 0;
    let totalCost = 0;
    for (const s of sales) {
      for (const item of s.items) {
        totalQtySold += item.quantity;
        totalCost += item.quantity * Number(item.unitPurchasePriceSnapshot);
      }
    }
    const profit = totalSales - totalCost;

    const stockPurchased = purchases.reduce(
      (sum: number, p: { items: Array<{ quantity: number; unitPurchasePrice: unknown }> }) =>
        sum +
        p.items.reduce(
          (s: number, i: { quantity: number; unitPurchasePrice: unknown }) =>
            s + i.quantity * Number(i.unitPurchasePrice),
          0,
        ),
      0,
    );

    const conversionValue = (u: { conversionValue?: number } | null | undefined) =>
      u?.conversionValue ?? 1;

    const lowStockItems = products.filter(
      (p: {
        inventoryBalance?: Array<{ quantity: number }>;
        lowStockLevel: number;
        baseUnit?: { conversionValue?: number } | null;
      }) => {
        const quantityInStorage =
          p.inventoryBalance?.reduce((s: number, b: { quantity: number }) => s + b.quantity, 0) ?? 0;
        const cv = conversionValue(p.baseUnit);
        return quantityInStorage <= p.lowStockLevel * cv;
      },
    );

    return {
      totalSales,
      totalQtySold,
      profit,
      stockPurchased,
      totalExpenditures,
      lowStockCount: lowStockItems.length,
      lowStockItems: lowStockItems.map(
        (p: {
          id: string;
          name: string;
          inventoryBalance?: Array<{ quantity: number }>;
          lowStockLevel: number;
          unitType: string;
          baseUnit?: { name: string; conversionValue?: number } | null;
        }) => {
          const quantityInStorage =
            p.inventoryBalance?.reduce((s: number, b: { quantity: number }) => s + b.quantity, 0) ?? 0;
          const cv = conversionValue(p.baseUnit);
          const displayQuantity = quantityInStorage / cv;
          return {
            id: p.id,
            name: p.name,
            quantity: displayQuantity,
            quantityInStorage,
            baseUnitConversionValue: cv,
            lowStockLevel: p.lowStockLevel,
            unitType: p.baseUnit?.name ?? p.unitType ?? 'UNIT',
          };
        },
      ),
    };
  }

  async getSalesReport(from?: string, to?: string, tzOffset?: number, payment?: string) {
    const { from: fromDate, to: toDate } = parseDateRange(from, to, tzOffset);
    const paymentFilter = parseSalesPaymentFilter(payment);
    const [mainStoreId, barId] = await Promise.all([
      this.defaultLocation.getDefaultMainStoreId(),
      this.defaultLocation.getDefaultBarId(),
    ]);

    const sales = await this.prisma.sale.findMany({
      where: {
        soldAt: { gte: fromDate, lte: toDate },
        locationId: { in: [mainStoreId, barId] },
        ...salePaymentWhere(paymentFilter),
      },
      include: {
        items: { include: { product: true } },
        createdBy: { select: { fullName: true, role: true } },
      },
      orderBy: { soldAt: 'desc' },
    });

    const rows: Array<{
      date: string;
      saleId: string;
      product: string;
      productId: string;
      quantity: number;
      unitType: string;
      unitPurchasePrice: number;
      unitSellingPrice: number;
      subtotal: number;
      profit: number;
      cashier: string;
      notes: string | null;
      paymentStatus: string;
      amountPaid: number;
      balanceDue: number;
    }> = [];

    for (const sale of sales) {
      const total = Number(sale.totalAmount);
      const paid = Number(sale.amountPaid);
      const balanceDue = Math.max(0, total - paid);
      for (const item of sale.items) {
        const subtotal = Number(item.subtotal);
        const cost = item.quantity * Number(item.unitPurchasePriceSnapshot);
        rows.push({
          date: sale.soldAt.toISOString(),
          saleId: sale.id,
          product: item.product?.name ?? item.productId ?? 'Unknown product',
          productId: item.productId,
          quantity: item.quantity,
          unitType: (item as { unitNameSnapshot?: string }).unitNameSnapshot ?? item.product?.unitType ?? 'UNIT',
          unitPurchasePrice: Number(item.unitPurchasePriceSnapshot),
          unitSellingPrice: Number(item.unitSellingPrice),
          subtotal,
          profit: subtotal - cost,
          cashier: sale.createdBy?.fullName ?? '',
          notes: sale.notes,
          paymentStatus: sale.paymentStatus,
          amountPaid: paid,
          balanceDue,
        });
      }
    }

    return rows;
  }

  async getPurchasesReport(from?: string, to?: string, tzOffset?: number) {
    const { from: fromDate, to: toDate } = parseDateRange(from, to, tzOffset);
    const [mainStoreId, barId] = await Promise.all([
      this.defaultLocation.getDefaultMainStoreId(),
      this.defaultLocation.getDefaultBarId(),
    ]);

    const purchases = await this.prisma.purchase.findMany({
      where: {
        purchasedAt: { gte: fromDate, lte: toDate },
        locationId: { in: [mainStoreId, barId] },
      },
      include: {
        items: { include: { product: true } },
        supplier: true,
        createdBy: { select: { fullName: true } },
      },
      orderBy: { purchasedAt: 'desc' },
    });

    const rows: Array<{
      date: string;
      purchaseId: string;
      product: string;
      productId: string;
      quantity: number;
      unitType: string;
      unitPurchasePrice: number;
      subtotal: number;
      supplier: string | null;
      createdBy: string;
      notes: string | null;
    }> = [];

    for (const p of purchases) {
      for (const item of p.items) {
        rows.push({
          date: p.purchasedAt.toISOString(),
          purchaseId: p.id,
          product: item.product?.name ?? item.productId ?? 'Unknown product',
          productId: item.productId,
          quantity: item.quantity,
          unitType: (item as { unitNameSnapshot?: string }).unitNameSnapshot ?? item.product?.unitType ?? 'UNIT',
          unitPurchasePrice: Number(item.unitPurchasePrice),
          subtotal: Number(item.subtotal),
          supplier: p.supplier?.name ?? null,
          createdBy: p.createdBy?.fullName ?? '',
          notes: p.notes,
        });
      }
    }

    return rows;
  }

  async getStockMovementsReport(from?: string, to?: string) {
    const { from: fromDate, to: toDate } = parseDateRange(from, to);
    const [barId, mainStoreId] = await Promise.all([
      this.defaultLocation.getDefaultLocationId(),
      this.defaultLocation.getDefaultMainStoreId(),
    ]);

    const transactions = await this.prisma.inventoryTransaction.findMany({
      where: {
        locationId: { in: [barId, mainStoreId] },
        transactionDate: { gte: fromDate, lte: toDate },
      },
      include: { product: { include: { baseUnit: true } }, location: true },
      orderBy: { transactionDate: 'desc' },
    });

    return transactions.map(
      (t: {
        transactionDate: Date;
        product?: { name?: string; unitType?: string; baseUnit?: { name: string } | null } | null;
        productId: string;
        transactionType: string;
        quantityChange: number;
        referenceType: string;
        referenceId: string;
      }) => ({
      date: t.transactionDate.toISOString(),
      product: t.product?.name ?? t.productId ?? 'Unknown product',
      productId: t.productId,
      transactionType: t.transactionType,
      quantityChange: t.quantityChange,
      unitType: t.product?.baseUnit?.name ?? t.product?.unitType ?? 'UNIT',
      referenceType: t.referenceType,
      referenceId: t.referenceId,
    }),
    );
  }

  async getExpenditureReport(from?: string, to?: string, tzOffset?: number) {
    const { from: fromDate, to: toDate } = parseDateRange(from, to, tzOffset);
    const rows = await this.prisma.expenditure.findMany({
      where: { spentAt: { gte: fromDate, lte: toDate } },
      include: { createdBy: { select: { fullName: true } } },
      orderBy: { spentAt: 'desc' },
    });
    return rows.map((e) => ({
      id: e.id,
      spentAt: e.spentAt.toISOString(),
      amount: Number(e.amount),
      category: e.category,
      description: e.description,
      notes: e.notes,
      recordedBy: e.createdBy?.fullName ?? '',
    }));
  }

}
