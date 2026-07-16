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
 * Khoá tháng (YYYY-MM) của một timestamp — dùng để nhóm/sao lưu theo tháng
 */
export function getMonthKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Dựng nội dung CSV (kèm cột thông tin khách hàng) từ danh sách giao dịch
 */
function buildCSVContent(records: TransactionRecord[]): string {
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
    'Tên Khách Hàng',
    'Địa Chỉ',
    'CCCD',
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
      rec.customer?.name ?? '',
      rec.customer?.address ?? '',
      rec.customer?.cccd ?? '',
    ];
  });

  return [
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
}

/**
 * Tải một danh sách giao dịch xuống file CSV với tên tuỳ ý
 */
export function downloadCSV(records: TransactionRecord[], fileName: string): void {
  if (records.length === 0) return;
  const csvContent = buildCSVContent(records);

  // Thêm BOM (Byte Order Mark) để Excel đọc hiển thị đúng dấu UTF-8 (tiếng Việt)
  const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
    type: 'text/csv;charset=utf-8;',
  });

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Xuất toàn bộ nhật ký ra file CSV (tên theo ngày hôm nay)
 */
export function exportToCSV(records: TransactionRecord[]): void {
  const today = new Date();
  const dateStr = `${today.getFullYear()}_${String(today.getMonth() + 1).padStart(2, '0')}_${String(
    today.getDate()
  ).padStart(2, '0')}`;
  downloadCSV(records, `Nhat_Ky_Mua_Ban_Nong_San_${dateStr}.csv`);
}

/**
 * Xuất/sao lưu các giao dịch của MỘT tháng (monthKey dạng YYYY-MM) ra file CSV riêng
 */
export function exportMonthlyCSV(records: TransactionRecord[], monthKey: string): void {
  const monthRecords = records.filter((r) => getMonthKey(r.timestamp) === monthKey);
  if (monthRecords.length === 0) return;
  const [y, m] = monthKey.split('-');
  downloadCSV(monthRecords, `Nong_San_Sao_Luu_${y}_${m}.csv`);
}

/**
 * Phân tích một dòng CSV thành mảng các cột
 */
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Phân tích chuỗi ngày giờ vi-VN ("HH:mm:ss DD/MM/YYYY" hoặc ISO) thành timestamp
 */
export function parseDateTimeString(dateStr: string): number {
  try {
    const cleanStr = dateStr.replace(/,/g, '').trim();
    const parts = cleanStr.split(/\s+/);
    if (parts.length === 2) {
      const timePart = parts[0]; // HH:mm:ss
      const datePart = parts[1]; // DD/MM/YYYY
      
      const [hh, mm, ss] = timePart.split(':').map(Number);
      const [day, month, year] = datePart.split('/').map(Number);
      
      const date = new Date(year, month - 1, day, hh || 0, mm || 0, ss || 0);
      if (!isNaN(date.getTime())) {
        return date.getTime();
      }
    }
    
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) return parsed;
  } catch (e) {
    console.error('Lỗi phân tích ngày giờ:', e);
  }
  return Date.now();
}

/**
 * Nhập dữ liệu CSV và phân tích thành danh sách TransactionRecord[]
 */
export function importFromCSV(csvContent: string): TransactionRecord[] {
  const lines = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length <= 1) return [];

  // Bỏ dòng tiêu đề nếu khớp
  const startIdx = lines[0].includes('Mã Giao Dịch') ? 1 : 0;
  const dataLines = lines.slice(startIdx).filter(line => line.trim().length > 0);
  const records: TransactionRecord[] = [];

  for (const line of dataLines) {
    try {
      const cols = parseCSVLine(line);
      if (cols.length < 12) continue;

      const id = cols[0] || `REC-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
      const timestamp = parseDateTimeString(cols[1]);
      
      const dateObj = new Date(timestamp);
      const dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

      const rawProductName = cols[2];
      let productType: 'tiêu' | 'cà phê' | 'bắp' = 'tiêu';
      let productName = 'Tiêu';

      if (rawProductName.toLowerCase().includes('cà phê') || rawProductName.toLowerCase().includes('cafe')) {
        productType = 'cà phê';
        productName = 'Cà Phê';
      } else if (rawProductName.toLowerCase().includes('bắp') || rawProductName.toLowerCase().includes('ngô')) {
        productType = 'bắp';
        productName = 'Bắp Tươi';
      } else {
        productType = 'tiêu';
        productName = 'Tiêu';
      }

      const weight = parseFloat(cols[3]) || 0;
      const moisture = parseFloat(cols[4]) || 0;
      const classification = cols[5] || '';
      
      const moistureBonusPercent = parseFloat(cols[6]) || 0;
      const remBonusPercent = parseFloat(cols[7]) || 0;
      const totalAdjustmentPercent = parseFloat(cols[8]) || 0;
      const basePrice = parseInt(cols[9]) || 0;
      const finalPrice = parseFloat(cols[10]) || 0;
      const totalAmount = parseFloat(cols[11]) || 0;

      const details: any = {
        moistureBonusPercent,
        remBonusPercent,
        totalAdjustmentPercent,
        formulaSteps: []
      };

      if (productType === 'tiêu') {
        const remMatch = classification.match(/Rem:\s*([\d.]+)/i);
        const rem = remMatch ? parseFloat(remMatch[1]) : 500;
        details.rem = rem;
        
        details.formulaSteps = [
          { title: '1. Đơn giá tiêu thu mua gốc', expression: `${basePrice.toLocaleString('vi-VN')} đ/Kg`, result: `${basePrice.toLocaleString('vi-VN')} đ`, note: `Giá sàn thỏa thuận.`, type: 'info' },
          { title: '2. Thưởng/phạt độ ẩm', expression: `${moistureBonusPercent}%`, result: `${moistureBonusPercent >= 0 ? '+' : ''}${moistureBonusPercent}%`, note: `Độ ẩm đo được: ${moisture}%.`, type: moistureBonusPercent >= 0 ? 'positive' : 'negative' },
          { title: '3. Thưởng/phạt dung trọng Rem', expression: `${remBonusPercent}%`, result: `${remBonusPercent >= 0 ? '+' : ''}${remBonusPercent}%`, note: `Rem đo được: ${rem}.`, type: remBonusPercent >= 0 ? 'positive' : 'negative' },
          { title: '4. Đơn giá thanh toán thực tế', expression: `Giá gốc * (1 + Tổng % chênh lệch)`, result: `${Math.round(finalPrice).toLocaleString('vi-VN')} đ/Kg`, note: `Chênh lệch tổng: ${moistureBonusPercent + remBonusPercent}%.`, type: 'info' },
          { title: '5. Tổng thanh toán thành tiền', expression: `Số lượng * Đơn giá cuối`, result: `${Math.round(totalAmount).toLocaleString('vi-VN')} đ`, note: `Khối lượng: ${weight.toLocaleString('vi-VN')} kg.`, type: 'positive' }
        ];
      } else if (productType === 'cà phê') {
        const impurityMatch = classification.match(/Tạp chất:\s*([\d.]+)/i);
        const blackBrokenMatch = classification.match(/Đen vỡ:\s*([\d.]+)/i);
        const impurity = impurityMatch ? parseFloat(impurityMatch[1]) : 0;
        const blackBroken = blackBrokenMatch ? parseFloat(blackBrokenMatch[1]) : 0;
        
        details.impurity = impurity;
        details.blackBroken = blackBroken;

        details.formulaSteps = [
          { title: '1. Đơn giá cà phê nhân gốc', expression: `${basePrice.toLocaleString('vi-VN')} đ/Kg`, result: `${basePrice.toLocaleString('vi-VN')} đ`, note: 'Giá cà gốc thỏa thuận.', type: 'info' },
          { title: '2. Khấu trừ hao hụt chất lượng', expression: `${totalAdjustmentPercent}%`, result: `${totalAdjustmentPercent}%`, note: `Ẩm đo: ${moisture}%. Tạp chất: ${impurity}%.`, type: 'negative' },
          { title: '3. Đơn giá thực thanh toán', expression: `Giá gốc - Khấu trừ`, result: `${Math.round(finalPrice).toLocaleString('vi-VN')} đ/Kg`, note: `Bù trừ trừ phần trăm hao hụt ẩm chất lượng.`, type: 'info' },
          { title: '4. Tổng thành tiền thanh toán', expression: `Số lượng * Giá cuối`, result: `${Math.round(totalAmount).toLocaleString('vi-VN')} đ`, note: `Tổng rổ cà: ${weight.toLocaleString('vi-VN')} kg.`, type: 'positive' }
        ];
      } else if (productType === 'bắp') {
        let grade = 'Loại 2';
        if (classification.includes('Loại 1')) grade = 'Loại 1';
        else if (classification.includes('Loại 3')) grade = 'Loại 3';
        details.grade = grade;

        details.formulaSteps = [
          { title: '1. Đơn giá bắp thu mua chuẩn', expression: `${basePrice.toLocaleString('vi-VN')} đ/Kg`, result: `${basePrice.toLocaleString('vi-VN')} đ`, note: `Giá thỏa thuận gốc bắp loại 2.`, type: 'info' },
          { title: '2. Phân hạng bắp (Grade)', expression: grade, result: grade, note: `Xếp hạng phân loại: ${grade}.`, type: grade === 'Loại 1' ? 'positive' : grade === 'Loại 3' ? 'negative' : 'neutral' },
          { title: '3. Khấu trừ ẩm vượt (Độ ẩm chuẩn 14%)', expression: `${moistureBonusPercent}%`, result: `${moistureBonusPercent >= 0 ? '+' : ''}${moistureBonusPercent}%`, note: `Độ ẩm đo được: ${moisture}%.`, type: moistureBonusPercent >= 0 ? 'positive' : 'negative' },
          { title: '4. Đơn giá thực tế thanh toán', expression: `Giá gốc * (1 + Chênh lệch)`, result: `${Math.round(finalPrice).toLocaleString('vi-VN')} đ/Kg`, note: `Tổng điều chỉnh: ${totalAdjustmentPercent}%.`, type: 'info' },
          { title: '5. Tổng tiền thanh toán', expression: `Cân bắp * Giá cuối`, result: `${Math.round(totalAmount).toLocaleString('vi-VN')} đ`, note: `Khối lượng: ${weight.toLocaleString('vi-VN')} kg.`, type: 'positive' }
        ];
      }

      // Thông tin khách hàng (nếu file có các cột này)
      const custName = (cols[12] ?? '').trim();
      const custAddress = (cols[13] ?? '').trim();
      const custCccd = (cols[14] ?? '').trim();
      const customer = (custName || custAddress || custCccd)
        ? { name: custName, address: custAddress, cccd: custCccd }
        : undefined;

      records.push({
        id,
        timestamp,
        dateKey,
        productType,
        productName,
        weight,
        moisture,
        basePrice,
        finalPrice,
        totalAmount,
        ...(customer ? { customer } : {}),
        details
      });
    } catch (e) {
      console.error('Lỗi dòng CSV:', e);
    }
  }

  return records;
}
