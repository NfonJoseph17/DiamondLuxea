import { BadRequestException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';

export function resolveSalePayment(
  totalAmount: number,
  paymentStatus?: PaymentStatus | string,
  amountPaidInput?: number,
): { paymentStatus: PaymentStatus; amountPaid: number } {
  const status = (paymentStatus as PaymentStatus) ?? PaymentStatus.PAID;

  if (status === PaymentStatus.PAID) {
    return { paymentStatus: PaymentStatus.PAID, amountPaid: totalAmount };
  }
  if (status === PaymentStatus.UNPAID) {
    return { paymentStatus: PaymentStatus.UNPAID, amountPaid: 0 };
  }
  if (status !== PaymentStatus.PARTIAL) {
    throw new BadRequestException(`Invalid paymentStatus: ${String(paymentStatus)}`);
  }

  if (amountPaidInput === undefined || amountPaidInput === null || Number.isNaN(Number(amountPaidInput))) {
    throw new BadRequestException('amountPaid is required when paymentStatus is PARTIAL');
  }
  const ap = Number(amountPaidInput);
  if (ap <= 0) {
    throw new BadRequestException('For PARTIAL payment, amount paid must be greater than 0');
  }
  if (ap >= totalAmount) {
    throw new BadRequestException(
      'For PARTIAL payment, amount paid must be less than the sale total. Use PAID if fully collected.',
    );
  }
  return { paymentStatus: PaymentStatus.PARTIAL, amountPaid: ap };
}

/** When line items change but client did not resend payment fields */
export function adaptPaymentToNewTotal(
  totalAmount: number,
  existingStatus: PaymentStatus,
  existingAmountPaid: number,
): { paymentStatus: PaymentStatus; amountPaid: number } {
  if (existingStatus === PaymentStatus.PAID) {
    return { paymentStatus: PaymentStatus.PAID, amountPaid: totalAmount };
  }
  if (existingStatus === PaymentStatus.UNPAID) {
    return { paymentStatus: PaymentStatus.UNPAID, amountPaid: 0 };
  }
  if (existingAmountPaid >= totalAmount) {
    return { paymentStatus: PaymentStatus.PAID, amountPaid: totalAmount };
  }
  return { paymentStatus: PaymentStatus.PARTIAL, amountPaid: existingAmountPaid };
}
