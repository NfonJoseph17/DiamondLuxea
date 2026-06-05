import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/** Precomputed bcrypt (cost 10) for Beverlys manager — rotate after first login in production. */
const MANAGER_SEED_PASSWORD_HASH =
  '$2b$10$H6ejys7R9FoYIauNZe55ROkbP8QjnEqxZwdcPnqAE2RqhPuO33nTy';

const MANAGER_EMAIL = 'admin@beverlys.com';
const LEGACY_MANAGER_EMAIL = 'manager@example.com';

async function main() {
  console.log('Seeding database...');

  const cashierPasswordHash = await bcrypt.hash('password123', 10);

  // ─── Users ────────────────────────────────────────────────────────
  // Migrate old seed email → new manager login without duplicating MANAGER users.
  const legacyManager = await prisma.user.findUnique({
    where: { email: LEGACY_MANAGER_EMAIL },
  });
  const managerAtNewEmail = await prisma.user.findUnique({
    where: { email: MANAGER_EMAIL },
  });
  if (legacyManager && !managerAtNewEmail) {
    await prisma.user.update({
      where: { id: legacyManager.id },
      data: {
        email: MANAGER_EMAIL,
        passwordHash: MANAGER_SEED_PASSWORD_HASH,
        fullName: 'Manager User',
      },
    });
    console.log(`Migrated manager: ${LEGACY_MANAGER_EMAIL} → ${MANAGER_EMAIL}`);
  }

  const manager = await prisma.user.upsert({
    where: { email: MANAGER_EMAIL },
    update: {
      passwordHash: MANAGER_SEED_PASSWORD_HASH,
      fullName: 'Manager User',
    },
    create: {
      fullName: 'Manager User',
      email: MANAGER_EMAIL,
      passwordHash: MANAGER_SEED_PASSWORD_HASH,
      role: 'MANAGER',
    },
  });

  const cashier = await prisma.user.upsert({
    where: { email: 'cashier@example.com' },
    update: {},
    create: {
      fullName: 'Cashier User',
      email: 'cashier@example.com',
      passwordHash: cashierPasswordHash,
      role: 'CASHIER',
    },
  });

  const salesRep = await prisma.user.upsert({
    where: { email: 'sales@example.com' },
    update: { role: 'SALES' },
    create: {
      fullName: 'Sales User',
      email: 'sales@example.com',
      passwordHash: cashierPasswordHash,
      role: 'SALES',
    },
  });

  console.log('Users:', { manager: manager.id, cashier: cashier.id, sales: salesRep.id });

  // ─── Locations ────────────────────────────────────────────────────

  let mainStore = await prisma.inventoryLocation.findFirst({ where: { name: 'Magasin Principal' } });
  if (!mainStore) {
    mainStore = await prisma.inventoryLocation.create({
      data: { name: 'Magasin Principal', type: 'MAIN_STORE' },
    });
  }

  let bar = await prisma.inventoryLocation.findFirst({ where: { name: 'Bar Comptoir' } });
  if (!bar) {
    bar = await prisma.inventoryLocation.create({
      data: { name: 'Bar Comptoir', type: 'BAR' },
    });
  }

  console.log('Locations:', { mainStore: mainStore.id, bar: bar.id });

  // ─── Supplier ─────────────────────────────────────────────────────

  let supplier = await prisma.supplier.findFirst({ where: { name: 'Guinness Cameroun S.A.' } });
  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: {
        name: 'Guinness Cameroun S.A.',
        phone: '+237 233 42 21 00',
        address: 'Douala, Cameroun',
      },
    });
  }

  console.log('Supplier:', supplier.id);

  // ─── Units ────────────────────────────────────────────────────────

  let bottle = await prisma.unit.findFirst({ where: { name: 'bottle' } });
  if (!bottle) {
    bottle = await prisma.unit.create({
      data: { name: 'bottle', conversionValue: 1 },
    });
  }

  let crate = await prisma.unit.findFirst({ where: { name: 'crate' } });
  if (!crate) {
    crate = await prisma.unit.create({
      data: { name: 'crate', conversionValue: 12 },
    });
  }

  let carton = await prisma.unit.findFirst({ where: { name: 'carton' } });
  if (!carton) {
    carton = await prisma.unit.create({
      data: { name: 'carton', conversionValue: 24 },
    });
  }

  let pallet = await prisma.unit.findFirst({ where: { name: 'pallet' } });
  if (!pallet) {
    pallet = await prisma.unit.create({
      data: { name: 'pallet', conversionValue: 6 },
    });
  }

  let canPallet = await prisma.unit.findFirst({ where: { name: 'can pallet' } });
  if (!canPallet) {
    canPallet = await prisma.unit.create({
      data: { name: 'can pallet', conversionValue: 24 },
    });
  }

  console.log('Units:', { bottle: bottle.id, crate: crate.id, carton: carton.id, pallet: pallet.id, canPallet: canPallet.id });

  // ─── Products & Price History ─────────────────────────────────────

  const products = [
    { name: 'Guinness Small (33cl)', sku: 'GNS-SM-33', category: 'Beer', unitType: 'BOTTLE' as const, lowStockLevel: 24, prices: { purchasePrice: 350, wholesalePrice: 400, retailPrice: 600 } },
    { name: 'Guinness Big (65cl)', sku: 'GNS-BG-65', category: 'Beer', unitType: 'BOTTLE' as const, lowStockLevel: 12, prices: { purchasePrice: 550, wholesalePrice: 650, retailPrice: 900 } },
    { name: 'Malta Guinness (33cl)', sku: 'MLT-GNS-33', category: 'Soft Drink', unitType: 'BOTTLE' as const, lowStockLevel: 24, prices: { purchasePrice: 300, wholesalePrice: 350, retailPrice: 500 } },
    { name: 'Harp (33cl)', sku: 'HRP-33', category: 'Beer', unitType: 'BOTTLE' as const, lowStockLevel: 24, prices: { purchasePrice: 300, wholesalePrice: 350, retailPrice: 500 } },
    { name: 'Origin (33cl)', sku: 'ORG-33', category: 'Beer', unitType: 'BOTTLE' as const, lowStockLevel: 24, prices: { purchasePrice: 300, wholesalePrice: 350, retailPrice: 500 } },
    { name: '33 Export (65cl)', sku: '33-EXP-65', category: 'Beer', unitType: 'BOTTLE' as const, lowStockLevel: 12, prices: { purchasePrice: 500, wholesalePrice: 600, retailPrice: 800 } },
    { name: 'Coca-Cola (35cl)', sku: 'COCA-35', category: 'Soft Drink', unitType: 'BOTTLE' as const, lowStockLevel: 24, prices: { purchasePrice: 200, wholesalePrice: 250, retailPrice: 400 } },
    { name: 'Eau Minerale Supermont (1.5L)', sku: 'SPM-150', category: 'Water', unitType: 'BOTTLE' as const, lowStockLevel: 12, prices: { purchasePrice: 200, wholesalePrice: 250, retailPrice: 500 } },
  ];

  for (const p of products) {
    const { prices, ...productData } = p;
    const existing = await prisma.product.findFirst({ where: { sku: productData.sku } });
    if (existing) {
      if (!existing.baseUnitId) {
        await prisma.product.update({
          where: { id: existing.id },
          data: { baseUnitId: bottle.id },
        });
        console.log(`Updated baseUnitId: ${existing.name}`);
      } else {
        console.log(`Skipped (exists): ${existing.name}`);
      }
      continue;
    }

    const product = await prisma.product.create({
      data: {
        ...productData,
        baseUnitId: bottle.id,
      },
    });

    await prisma.productPriceHistory.create({
      data: {
        productId: product.id,
        purchasePrice: prices.purchasePrice,
        retailPrice: prices.retailPrice,
        wholesalePrice: prices.wholesalePrice,
      },
    });

    await prisma.inventoryBalance.create({
      data: { productId: product.id, locationId: mainStore.id, quantity: 48 },
    });

    console.log(`Product created: ${product.name}`);
  }

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
