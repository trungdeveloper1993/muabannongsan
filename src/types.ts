/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ProductType = 'tiêu' | 'cà phê' | 'bắp';

export interface BaseInput {
  weight: number;      // Số Kg
  moisture: number;    // Độ ẩm (%)
  basePrice: number;   // Giá thành (Giá gốc VNĐ)
}

export interface PepperInput extends BaseInput {
  rem: number;         // Rem hạt tiêu
}

export interface CoffeeInput extends BaseInput {
  blackBroken?: number; // Đen vỡ (%)
  impurity: number;    // Tạp chất (%)
}

export interface CornInput extends BaseInput {
  grade: 'Loại 1' | 'Loại 2' | 'Loại 3';
}

export interface CalculationDetail {
  title: string;
  expression: string;
  result: string | number;
  note?: string;
  type?: 'positive' | 'negative' | 'neutral' | 'info';
}

export interface TransactionRecord {
  id: string;
  timestamp: number;
  dateKey: string;     // YYYY-MM-DD for grouping
  productType: ProductType;
  productName: string; // "Tiêu", "Cà Phê", "Bắp Tươi"
  weight: number;
  moisture: number;
  basePrice: number;
  finalPrice: number;
  totalAmount: number;
  details: {
    rem?: number;
    blackBroken?: number;
    impurity?: number;
    grade?: string;
    moistureBonusPercent: number;
    remBonusPercent?: number;
    totalAdjustmentPercent: number;
    formulaSteps: CalculationDetail[];
  };
}

export interface TradingStats {
  totalWeight: number;
  totalAmount: number;
  recordCount: number;
  avgPrice: number;
}
