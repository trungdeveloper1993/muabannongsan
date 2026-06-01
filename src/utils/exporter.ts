/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TransactionRecord } from '../types';

/**
 * Kiểu định dạng tiền tệ VNĐ
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

/**
 * Định dạng ngày giờ cụ thể
 */
export function formatDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(timestamp));
}

/**
 * Xuất dữ liệu nhật ký giao dịch nông sản ra file CSV
 */
export function exportToCSV(records: TransactionRecord[]): void {
  if (records.length === 0) return;

  const headers = [
    'Mã Giao Dịch',
    'Thời Gian',
    'Nông Sản',
    'Số Lượng (Kg)',
    'Độ Ẩm (%)',
    'Rem/Phân Loại',
    'Độ Ẩm Cộng (%)',
    'Tỷ Lệ Rem Cộng (%)',
    'Tổng Cộng Trừ (%)',
    'Giá Gốc (Đồng/Kg)',
    'Giá Cuối (Đồng/Kg)',
    'Thành Tiền (Đồng)',
  ];

  const rows = records.map((rec) => {
    // Tìm các thuộc tính bổ sung
    let classification = '-';
    if (rec.productType === 'tiêu') {
      classification = `Rem: ${rec.details.rem ?? 0}`;
    } else if (rec.productType === 'cà phê') {
      classification = `Tạp chất: ${rec.details.impurity ?? 0}%, Đen vỡ: ${rec.details.blackBroken ?? 0}%`;
    } else if (rec.productType === 'bắp') {
      classification = `Bắp ${rec.details.grade ?? ''}`;
    }

    return [
      rec.id,
      formatDateTime(rec.timestamp),
      rec.productName,
      rec.weight,
      rec.moisture,
      classification,
      rec.details.moistureBonusPercent,
      rec.details.remBonusPercent ?? 0,
      rec.details.totalAdjustmentPercent,
      rec.basePrice,
      Math.round(rec.finalPrice),
      Math.round(rec.totalAmount),
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((val) => {
          // Bao quanh chuỗi có dấu phẩy bằng dấu ngoặc kép và escape dấu ngoặc kép
          const cellStr = typeof val === 'string' ? val : String(val);
          return `"${cellStr.replace(/"/g, '""')}"`;
        })
        .join(',')
    ),
  ].join('\n');

  // Thêm BOM (Byte Order Mark) để Excel đọc hiển thị đúng dấu UTF-8 (tiếng Việt)
  const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
    type: 'text/csv;charset=utf-8;',
  });

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  // Tạo tên file định dạng: Nhat_Ky_Mua_Ban_Nong_San_YYYY_MM_DD.csv
  const today = new Date();
  const dateStr = `${today.getFullYear()}_${String(today.getMonth() + 1).padStart(2, '0')}_${String(
    today.getDate()
  ).padStart(2, '0')}`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', `Nhat_Ky_Mua_Ban_Nong_San_${dateStr}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
