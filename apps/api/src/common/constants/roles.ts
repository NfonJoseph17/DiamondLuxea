export enum Role {
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
  SALES = 'SALES',
}

export enum UnitType {
  BOTTLE = 'BOTTLE',
  CRATE = 'CRATE',
  CARTON = 'CARTON',
  CAN = 'CAN',
  UNIT = 'UNIT',
}

export enum LocationType {
  MAIN_STORE = 'MAIN_STORE',
  BAR = 'BAR',
  DEPOT = 'DEPOT',
  DISPLAY = 'DISPLAY',
  OTHER = 'OTHER',
}

export enum AdjustmentType {
  INCREASE = 'INCREASE',
  DECREASE = 'DECREASE',
}

export enum AdjustmentReasonType {
  BREAKAGE = 'BREAKAGE',
  LOSS = 'LOSS',
  COUNT_CORRECTION = 'COUNT_CORRECTION',
  DAMAGE = 'DAMAGE',
  OTHER = 'OTHER',
}

export enum SessionStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export enum TransactionType {
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  ADJUSTMENT_IN = 'ADJUSTMENT_IN',
  ADJUSTMENT_OUT = 'ADJUSTMENT_OUT',
  OPENING_BALANCE = 'OPENING_BALANCE',
}
