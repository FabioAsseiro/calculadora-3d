
import Dexie, { type Table } from 'dexie';

export interface Printer {
  id?: number;
  name: string;
  brand: string;
  model: string;
  powerWatts: number;
  purchasePrice: number;
  usefulHours: number;
  active: boolean;
}

export interface Filament {
  id?: number;
  brand: string;
  material: 'PLA' | 'PETG' | 'ABS' | 'TPU' | 'OUTRO';
  color: string;
  pricePerKg: number;
  spoolWeight: number;
  remainingGrams: number;
  minimumStock: number;
  active: boolean;
}

export interface Supply {
  id?: number;
  name: string;
  category: string;
  unit: string;
  unitPrice: number;
  stock: number;
  minimumStock: number;
}

export interface Setting {
  key: string;
  value: number | string | boolean;
}

export interface Product {
  id?: number;
  name: string;
  photo: string | null;
  printerName: string;
  quantity: number;
  printTimeHours: number;
  materials: {
    filamentId: number | null;
    filamentName: string;
    grams: number;
  }[];
  totalMaterialGrams: number;
  unitCost: number;
  batchCost: number;
  consumerPrice: number;
  storePrice: number;
  consumerProfit: number;
  storeProfit: number;
  createdAt: string;
}

export type ProductionStatus =
  | 'Pendente'
  | 'Em produção'
  | 'Concluído'
  | 'Cancelado';

export interface ProductionOrder {
  id?: number;
  orderNumber: string;
  productId: number | null;
  productName: string;
  customerName: string;
  quantity: number;
  printerName: string;
  materials: {
    filamentId: number | null;
    filamentName: string;
    gramsPerUnit: number;
    totalGrams: number;
  }[];
  unitCost: number;
  totalCost: number;
  unitPrice: number;
  totalPrice: number;
  status: ProductionStatus;
  stockConsumed: boolean;
  notes: string;
  createdAt: string;
  completedAt: string | null;
}

export type FinanceType = 'Entrada' | 'Saída';

export type FinanceStatus = 'Pago' | 'Pendente';

export interface FinanceEntry {
  id?: number;
  type: FinanceType;
  status: FinanceStatus;
  description: string;
  category: string;
  amount: number;
  date: string;
  productionId: number | null;
  createdAt: string;
}

class CalculatorDatabase extends Dexie {
  printers!: Table<Printer, number>;
  filaments!: Table<Filament, number>;
  supplies!: Table<Supply, number>;
  settings!: Table<Setting, string>;
  products!: Table<Product, number>;
  productions!: Table<ProductionOrder, number>;
  finance!: Table<FinanceEntry, number>;

  constructor() {
    super('Calculadora3D');

    this.version(1).stores({
      printers: '++id, name, active',
      filaments: '++id, material, color, brand, active',
      supplies: '++id, name, category',
      settings: 'key'
    });

    this.version(2).stores({
      printers: '++id, name, active',
      filaments: '++id, material, color, brand, active',
      supplies: '++id, name, category',
      settings: 'key',
      products: '++id, name, createdAt'
    });

    this.version(3).stores({
      printers: '++id, name, active',
      filaments: '++id, material, color, brand, active',
      supplies: '++id, name, category',
      settings: 'key',
      products: '++id, name, createdAt',
      productions: '++id, orderNumber, productId, status, createdAt',
      finance: '++id, type, status, category, date, productionId'
    });
  }
}

export const db = new CalculatorDatabase();

export async function initializeDatabase() {
  await db.open();

  const defaults: Setting[] = [
    { key: 'energyPrice', value: 0.78 },
    { key: 'defaultPlaPrice', value: 110 },
    { key: 'defaultPetgPrice', value: 110 },
    { key: 'retailStorePercentage', value: 50 },
    { key: 'defaultMultiplier', value: 3 }
  ];

  for (const setting of defaults) {
    const existing = await db.settings.get(setting.key);

    if (!existing) {
      await db.settings.add(setting);
    }
  }
}
