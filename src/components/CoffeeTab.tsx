/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Plus, Minus, Save, Sparkles, HelpCircle, Receipt, Droplets, Scale, Info, ArrowDown, ArrowUp } from 'lucide-react';
import { CoffeeInput, CalculationDetail, TransactionRecord } from '../types';
import { formatCurrency } from '../utils/exporter';

export const COFFEE_MOISTURE_TABLE: Record<number, number[]> = {
  15: [0.00, 0.10, 0.20, 0.37, 0.47, 0.57, 0.67, 0.77, 0.88, 0.99],
  16: [1.13, 1.24, 1.35, 1.46, 1.57, 1.68, 1.80, 1.92, 2.04, 2.16],
  17: [2.31, 2.44, 2.57, 2.70, 2.83, 2.96, 3.10, 3.24, 3.38, 3.52],
  18: [3.67, 3.81, 3.96, 4.11, 4.26, 4.41, 4.56, 4.71, 4.87, 5.03],
  19: [5.20, 5.37, 5.54, 5.71, 5.83, 6.05, 6.23, 6.41, 6.59, 6.77],
  20: [6.95, 7.13, 7.32, 7.51, 7.71, 7.91, 8.11, 8.31, 8.51, 8.71],
  21: [8.91, 9.12, 9.34, 9.56, 9.73, 10.00, 10.22, 10.44, 10.67, 10.90],
  22: [11.13, 11.36, 11.60, 11.85, 12.10, 12.35, 12.60, 12.85, 13.10, 13.36],
  23: [13.62, 13.88, 14.15, 14.43, 14.71, 14.99, 15.27, 15.55, 15.84, 16.13],
  24: [16.42, 16.70, 17.01, 17.31, 17.61, 17.91, 18.22, 18.53, 18.84, 19.15],
};

export function getCoffeeMoistureDeduction(moisture: number): number {
  if (moisture <= 15.0) return 0;
  
  const rounded = Math.round(moisture * 10) / 10;
  const whole = Math.floor(rounded);
  const decimal = Math.round((rounded - whole) * 10);
  
  if (whole >= 15 && whole <= 24) {
    const row = COFFEE_MOISTURE_TABLE[whole];
    if (row && decimal >= 0 && decimal <= 9) {
      return row[decimal];
    }
  }
  
  if (rounded >= 25.0) {
    const diff = rounded - 25.0;
    return parseFloat((19.47 + diff * 3.0).toFixed(2));
  }
  
  return 0;
}

interface CoffeeTabProps {
  onSaveRecord: (record: Omit<TransactionRecord, 'id' | 'timestamp' | 'dateKey'>) => void;
}

export default function CoffeeTab({ onSaveRecord }: CoffeeTabProps) {
  // Tải trạng thái và đặc biệt là Giá Sàn từ localStorage
  const [inputs, setInputs] = useState<CoffeeInput>(() => {
    const savedPrice = localStorage.getItem('coffee_base_price');
    const savedWeight = localStorage.getItem('coffee_weight');
    const savedMoisture = localStorage.getItem('coffee_moisture');
    return {
      weight: savedWeight ? parseFloat(savedWeight) : 3000,
      moisture: savedMoisture ? parseFloat(savedMoisture) : 14.0,
      impurity: 1.5,
      basePrice: savedPrice ? parseInt(savedPrice, 10) : 120000,
    };
  });

  const [calcSteps, setCalcSteps] = useState<CalculationDetail[]>([]);
  const [finalPrice, setFinalPrice] = useState<number>(0);
  const [finalWeight, setFinalWeight] = useState<number>(0);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [showTips, setShowTips] = useState<boolean>(true);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [showDeductionTable, setShowDeductionTable] = useState<boolean>(false);
  
  // Khảo sát tạp chất từ mẻ nhỏ (nạp lại từ localStorage nếu đã nhập trước đó)
  const [impuritySampleWeight, setImpuritySampleWeight] = useState<number>(() => {
    const saved = localStorage.getItem('coffee_impurity_sample_weight');
    return saved ? parseFloat(saved) : 200;
  });
  const [impurityGrams, setImpurityGrams] = useState<number>(() => {
    const saved = localStorage.getItem('coffee_impurity_grams');
    return saved ? parseFloat(saved) : 3.0;
  });

  // Lưu Giá Sàn tự động bất cứ khi nào nó thay đổi để không bị mất khi thoát
  useEffect(() => {
    if (inputs.basePrice > 0) {
      localStorage.setItem('coffee_base_price', inputs.basePrice.toString());
    }
  }, [inputs.basePrice]);

  // Tự động lưu khối lượng & độ ẩm để reset web vẫn còn dữ liệu đang nhập
  useEffect(() => {
    localStorage.setItem('coffee_weight', inputs.weight.toString());
    localStorage.setItem('coffee_moisture', inputs.moisture.toString());
  }, [inputs.weight, inputs.moisture]);

  // Tự động lưu mẫu khảo sát tạp chất
  useEffect(() => {
    localStorage.setItem('coffee_impurity_sample_weight', impuritySampleWeight.toString());
    localStorage.setItem('coffee_impurity_grams', impurityGrams.toString());
  }, [impuritySampleWeight, impurityGrams]);

  useEffect(() => {
    const calcImpurity = impuritySampleWeight > 0 ? (impurityGrams / impuritySampleWeight) * 100 : 0;
    const rounded = parseFloat(calcImpurity.toFixed(2));
    setInputs(prev => {
      if (prev.impurity !== rounded) {
        return { ...prev, impurity: rounded };
      }
      return prev;
    });
  }, [impuritySampleWeight, impurityGrams]);

  useEffect(() => {
    const { weight, moisture, impurity, basePrice } = inputs;

    // 1. Tính toán Thưởng Ẩm vào Giá nếu ẩm <= 15% -> Theo nghiệp vụ mới: KHÔNG CÓ THƯỞNG ẨM (Bằng 0)
    let moistureBonusPercent = 0;
    let moistureDeductionPercent = 0;
    let moistureNote = '';
    let moistureType: 'positive' | 'negative' | 'neutral' = 'neutral';

    if (moisture <= 15) {
      moistureBonusPercent = 0;
      moistureNote = `Độ ẩm ${moisture}% đạt chuẩn (<= 15%), không tăng giảm đơn giá`;
      moistureType = 'neutral';
    } else {
      // Ẩm > 15% sẽ bị trừ thẳng vào trọng lượng
      moistureDeductionPercent = getCoffeeMoistureDeduction(moisture);
      moistureNote = `Độ ẩm ${moisture}% vượt chuẩn (> 15%), trừ trọng lượng theo biểu mẫu: -${moistureDeductionPercent.toFixed(2)}%`;
      moistureType = 'negative';
    }

    // 2. Tính phạt tạp chất (%) (vượt chuẩn 1.0%) -> Trừ thẳng trọng lượng
    let impurityDeductionPercent = 0;
    if (impurity > 1.0) {
      impurityDeductionPercent = (impurity - 1.0) * 1.0;
    }
    const impurityNote = impurityDeductionPercent > 0
      ? `Tạp chất ${impurity}% vượt chuẩn (1%), khấu trừ trọng lượng mẻ: -${impurityDeductionPercent.toFixed(2)}%`
      : `Tạp chất ${impurity}% trong ngưỡng chuẩn (<= 1%), không trừ trọng lượng`;
    const impurityType = impurityDeductionPercent > 0 ? 'negative' : 'neutral';

    // 3. Tính toán ra Giá Cuối Cùng (finalPrice)
    const calculatedPrice = basePrice * (1 + moistureBonusPercent / 100);

    // 4. Tính toán ra Khối Lượng Cuối Cùng sau khi trừ độ ẩm & tạp chất (finalWeight)
    const totalDeductionPercent = moistureDeductionPercent + impurityDeductionPercent;
    const calculatedWeight = weight * (1 - totalDeductionPercent / 100);

    // 5. Tính toán ra Tổng Tiền (totalAmount)
    const calculatedTotal = calculatedPrice * calculatedWeight;

    setFinalPrice(calculatedPrice);
    setFinalWeight(calculatedWeight);
    setTotalAmount(calculatedTotal);

    // Xây dựng 7 bước hạch toán rõ ràng theo yêu cầu
    const steps: CalculationDetail[] = [
      {
        title: 'Bước 1: Đơn giá sàn đầu vào (Khảo sát)',
        expression: `${formatCurrency(basePrice)} / Kg`,
        result: formatCurrency(basePrice),
        note: 'Giá gốc nông sản thỏa thuận cơ sở cho Robusta chuẩn.',
        type: 'info'
      },
      {
        title: 'Bước 2: Khối lượng mẻ thu mua gốc',
        expression: `${weight.toLocaleString('vi-VN')} kg`,
        result: `${weight.toLocaleString('vi-VN')} Kg`,
        note: 'Trọng lượng cân chưa tính toán hao hụt chất lượng.',
        type: 'neutral'
      },
      {
        title: 'Bước 3: Hạch toán chênh lệch độ ẩm (Chuẩn 15%)',
        expression: moisture <= 15 ? `Không tính (0%)` : `Tra bảng trừ trọng lượng mẻ`,
        result: moisture <= 15 
          ? `0%` 
          : `-${moistureDeductionPercent.toFixed(2)}% trọng lượng`,
        note: moistureNote,
        type: moistureType
      },
      {
        title: 'Bước 4: Hạch toán khấu trừ tạp chất (Chuẩn 1.0%)',
        expression: impurity > 1 ? `-(${impurity}% - 1%) * 1.0` : `Không phạt`,
        result: impurity > 1 ? `-${impurityDeductionPercent.toFixed(2)}% trọng lượng` : '0%',
        note: impurityNote,
        type: impurityType
      },
      {
        title: 'Bước 5: Thống kê Giá Cuối Cùng (Thanh toán)',
        expression: `Giá Sàn`,
        result: `${formatCurrency(Math.round(calculatedPrice))} / Kg`,
        note: 'Đơn giá sàn không thay đổi do không áp dụng thưởng ẩm lẻ.',
        type: 'info'
      },
      {
        title: 'Bước 6: Số lượng cuối sau trừ hao hụt',
        expression: `Sản lượng * (1 - Tổng tỉ lệ khấu trừ)`,
        result: `${Math.round(calculatedWeight).toLocaleString('vi-VN')} Kg`,
        note: totalDeductionPercent > 0 
          ? `Đã khấu trừ ${totalDeductionPercent.toFixed(2)}% trọng lượng do ẩm vượt hoặc tạp chất bẩn.`
          : 'Giữ nguyên khối lượng do đạt chuẩn.',
        type: totalDeductionPercent > 0 ? 'negative' : 'positive'
      },
      {
        title: 'Bước 7: Tổng tiền chi trả thực tế',
        expression: `Giá Cuối * Số Lượng Cuối`,
        result: formatCurrency(Math.round(calculatedTotal)),
        note: 'Doanh thu chung phải thanh toán cuối cùng mẻ giao dịch.',
        type: 'positive'
      }
    ];

    setCalcSteps(steps);
    setIsSaved(false);
  }, [inputs]);

  const handlePercentStep = (field: keyof CoffeeInput, step: number) => {
    setInputs((prev) => {
      const val = (prev[field] ?? 0) + step;
      const clamped = Math.max(0, parseFloat(val.toFixed(2)));
      return { ...prev, [field]: clamped };
    });
  };

  const handleInputChange = (field: keyof CoffeeInput, value: string) => {
    const parsed = value === '' ? 0 : parseFloat(value);
    setInputs((prev) => ({
      ...prev,
      [field]: isNaN(parsed) ? 0 : parsed,
    }));
  };

  const handleBasePriceChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const num = cleaned === '' ? 0 : parseInt(cleaned, 10);
    setInputs((prev) => ({
      ...prev,
      basePrice: isNaN(num) ? 0 : num,
    }));
  };

  const saveRecord = () => {
    onSaveRecord({
      productType: 'cà phê',
      productName: 'Cà Phê Robusta',
      weight: inputs.weight,
      moisture: inputs.moisture,
      basePrice: inputs.basePrice,
      finalPrice: finalPrice,
      totalAmount: totalAmount,
      details: {
        impurity: inputs.impurity,
        moistureBonusPercent: 0,
        totalAdjustmentPercent: parseFloat((- (inputs.moisture > 15 ? getCoffeeMoistureDeduction(inputs.moisture) : 0) - (inputs.impurity > 1 ? (inputs.impurity - 1) : 0)).toFixed(2)),
        formulaSteps: calcSteps,
      },
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="animate-fade-in pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        
        {/* CỘT TRÁI: NHẬP SỐ LIỆU (CHIA RÕ RÀNG INPUT - CÁC MỤC TÍNH TOÁN) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-lg text-[#007AFF] flex items-center gap-2">
              <span className="w-2 h-6 bg-[#007AFF] rounded-full"></span>
              Thông Số Cà Phê Robusta
            </h3>
            <button 
              type="button"
              onClick={() => setShowTips(!showTips)}
              className="text-[#007AFF] text-xs font-semibold flex items-center space-x-1 cursor-pointer bg-white px-2.5 py-1 rounded-full border border-zinc-200/50 shadow-xs active:scale-95 transition-transform"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showTips ? 'Ẩn quy chế' : 'Hiện quy chế'}</span>
            </button>
          </div>

          {showTips && (
            <div className="bg-[#EBF7EE] text-[#1E4620] p-3.5 rounded-xl border border-emerald-100 text-xs leading-relaxed space-y-1.5 shadow-xs">
              <div className="font-bold flex items-center space-x-1 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span>Quy định thu mua thông số Cà Phê Robusta mới:</span>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-zinc-700">
                <li><strong className="text-emerald-900">Độ ẩm chuẩn:</strong> Hạch toán từ mốc 15.0%. Khi độ ẩm dưới 15% được thưởng đơn giá <strong className="text-emerald-800">+0.5%</strong> / độ khô ráo, tối đa <strong className="text-emerald-800">+2.0%</strong>. Khi vượt 15% sẽ áp biểu đồ khấu trừ mẻ hàng (kg/100kg).</li>
                <li><strong className="text-emerald-900">Tạp chất chuẩn:</strong> Ngưỡng chuẩn &lt;= 1.0%. Tạp chất bẩn (cát, sỏi, đá) dư hơn 1.0% sẽ bị giảm trừ thẳng mộc sản lượng <strong className="text-[#FF3B30]">-1.0% trọng lượng</strong> cho mỗi 1.0% tạp chất vượt chuẩn.</li>
                <li><strong className="text-amber-805">Tối giản tinh gọn:</strong> Đã loại bỏ hoàn toàn các điều mục "Đen & Vỡ" hạt để quy trình gọn lẹ, nhanh chóng tối ưu cho trạm kinh doanh.</li>
              </ul>
            </div>
          )}

          {/* NHÓM INPUT 1: DỮ LIỆU ĐẦU VÀO CƠ BẢN (KHỐI LƯỢNG & GIÁ SÀN) */}
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-150 p-5 space-y-4">
            <div className="text-xs uppercase font-extrabold text-zinc-400 tracking-wider flex items-center justify-between border-b border-[#F2F2F7] pb-2">
              <span>🎯 [INPUT] Dữ liệu đầu vào giao dịch</span>
              <span className="text-[10px] bg-blue-50 text-[#007AFF] px-2 py-0.5 rounded-md font-bold">Bắt buộc</span>
            </div>

            {/* SỐ LƯỢNG / KHỐI LƯỢNG CÂN ĐẦU VÀO */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2">
              <div className="flex flex-col">
                <span className="text-sm font-black text-zinc-800">Số Lượng / Khối Lượng (Kg)</span>
                <span className="text-[11px] font-medium text-zinc-400">Trọng lượng hàng thực phẩm thô ban đầu</span>
              </div>
              <div className="flex items-center space-x-2 self-end sm:self-auto bg-[#F2F2F7] p-1.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => handlePercentStep('weight', -100)}
                  className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-zinc-700 font-bold active:scale-95 transition-transform shadow-xs"
                >
                  <Minus className="w-3.5 h-3.5 text-[#007AFF]" />
                </button>
                <input
                  id="input-coffee-weight"
                  type="number"
                  value={inputs.weight || ''}
                  onChange={(e) => handleInputChange('weight', e.target.value)}
                  className="w-20 text-center bg-transparent text-sm font-black text-[#007AFF] outline-hidden placeholder-zinc-300 focus:ring-0 border-none"
                  placeholder="0"
                />
                <button
                  type="button"
                  onClick={() => handlePercentStep('weight', 100)}
                  className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-zinc-700 font-bold active:scale-95 transition-transform shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-[#007AFF]" />
                </button>
              </div>
            </div>

            {/* GIÁ ĐẦU VÀO / GIÁ SÀN CƠ SỞ (TỰ ĐỘNG LƯU TRẠNG THÁI CUỐI) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-zinc-700 pt-2 border-t border-[#F2F2F7]">
              <div className="flex flex-col">
                <span className="text-sm font-black text-zinc-805">Giá Sàn Đầu Vào (Đồng/Kg)</span>
                <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1 text-emerald-600 font-semibold">
                  <span>✔ Đã lưu trạng thái giá sàn cuối cùng</span>
                </span>
              </div>
              <div className="flex items-center space-x-1.5 self-end sm:self-auto bg-[#F2F2F7] px-3.5 py-1.5 rounded-xl">
                <input
                  id="input-coffee-price"
                  type="text"
                  value={inputs.basePrice ? inputs.basePrice.toLocaleString('vi-VN') : ''}
                  onChange={(e) => handleBasePriceChange(e.target.value)}
                  className="w-28 text-right bg-transparent text-base font-black text-[#007AFF] outline-hidden focus:ring-0 border-none"
                  placeholder="120,000"
                />
                <span className="text-xs font-bold text-zinc-500">đ/kg</span>
              </div>
            </div>
          </div>

          {/* NHÓM TÍNH TOÁN 2: CHỈ SỐ HAO HỤT CHẤT LƯỢNG (ẨM & TẠP CHẤT) */}
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-150 p-5 space-y-4">
            <div className="text-xs uppercase font-extrabold text-[#007AFF] tracking-wider flex items-center justify-between border-b border-[#F2F2F7] pb-2">
              <span>🔧 [TÍNH TOÁN] Khâu phân tách chất lượng nông sản</span>
              <span className="text-[10px] bg-blue-50 text-[#007AFF] px-2 py-0.5 rounded-md font-bold">Bộ quy đổi tự động</span>
            </div>

            {/* ĐỘ ẨM */}
            <div className="flex flex-col space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-zinc-800 flex items-center gap-1">
                    <Droplets className="w-4 h-4 text-[#007AFF]" />
                    Độ Ẩm Hóa Nghiệm (%)
                  </span>
                  <span className="text-[11px] font-medium text-[#8E8E93]">Tiêu chuẩn mốc khô ráo là 15.0%</span>
                </div>
                <div className="flex items-center space-x-2 self-end sm:self-auto bg-[#F2F2F7] p-1.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handlePercentStep('moisture', -0.1)}
                    className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-zinc-700 font-bold active:scale-95 transition-transform shadow-xs"
                  >
                    <Minus className="w-3.5 h-3.5 text-[#007AFF]" />
                  </button>
                  <input
                    id="input-coffee-moisture"
                    type="number"
                    step="0.1"
                    value={inputs.moisture || ''}
                    onChange={(e) => handleInputChange('moisture', e.target.value)}
                    className="w-16 text-center bg-transparent text-sm font-bold text-[#007AFF] outline-hidden focus:ring-0 border-none"
                    placeholder="15.0"
                  />
                  <button
                    type="button"
                    onClick={() => handlePercentStep('moisture', 0.1)}
                    className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-zinc-700 font-bold active:scale-95 transition-transform shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#007AFF]" />
                  </button>
                </div>
              </div>

              {/* Hướng dẫn máy đo */}
              <div className="bg-[#FFF9E6] border border-amber-200 p-3 rounded-xl text-xs text-amber-950 flex items-start gap-2 font-semibold">
                <span className="text-sm">💡</span>
                <div className="space-y-0.5">
                  <p>Mã máy ẩm Cà Phê: <span className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-955 font-extrabold text-[12px] shadow-2xs">ẤN 63</span> và <span className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-955 font-extrabold text-[12px] shadow-2xs">CÂN 1 LẠNG (100g)</span>.</p>
                  <p className="text-[10px] text-amber-800/80 font-normal leading-normal">
                    Độ ẩm &lt;= 15% được thưởng tiền vào giá chốt. Ẩm &gt; 15% trừ thẳng sản lượng ở cột kết quả bên phải.
                  </p>
                </div>
              </div>
            </div>

            {/* MỤC LÀM TẠP / MÁY QUY ĐỔI TẠP CHẤT */}
            <div className="flex flex-col space-y-3 pt-4 border-t border-[#F2F2F7]">
              <div className="flex flex-col">
                <span className="text-sm font-black text-zinc-800 flex items-center gap-1.5 text-[#007AFF]">
                  <Scale className="w-4 h-4 text-[#007AFF]" />
                  Khảo Sát Tạp Chất (Làm Tạp)
                </span>
                <span className="text-[11px] font-medium text-zinc-400">
                  Cân mẫu thử bất kỳ, nhặt riêng tạp chất (sỏi đá vỏ) quy đổi %
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-1">
                {/* Cân Mãn Mẫu (g) */}
                <div className="bg-[#F8F9FA] border border-zinc-200/60 p-3 rounded-xl space-y-1.5 flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-zinc-650">📦 Trọng lượng mẫu (g)</span>
                  <div className="flex items-center space-x-1 justify-between bg-white px-2 py-1.5 rounded-lg border border-zinc-200">
                    <button
                      type="button"
                      onClick={() => setImpuritySampleWeight(prev => Math.max(10, prev - 10))}
                      className="w-5 h-5 rounded-md bg-zinc-100 flex items-center justify-center text-[#007AFF] active:scale-95 font-bold shrink-0"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <div className="flex items-center min-w-0 flex-1 justify-center px-1">
                      <input
                        type="number"
                        value={impuritySampleWeight || ''}
                        onChange={(e) => {
                          const parsed = parseFloat(e.target.value);
                          setImpuritySampleWeight(isNaN(parsed) ? 0 : parsed);
                        }}
                        className="w-full text-center bg-transparent text-xs font-extrabold text-[#007AFF] outline-hidden focus:ring-0 border-none p-0"
                      />
                      <span className="text-[10px] font-bold text-zinc-400 shrink-0 ml-0.5">g</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImpuritySampleWeight(prev => prev + 10)}
                      className="w-5 h-5 rounded-md bg-zinc-100 flex items-center justify-center text-[#007AFF] active:scale-95 font-bold shrink-0"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Sồ gam tạp (g) */}
                <div className="bg-[#F8F9FA] border border-zinc-200/60 p-3 rounded-xl space-y-1.5 flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-zinc-650">🪨 Lượng tạp nhặt ra (g)</span>
                  <div className="flex items-center space-x-1 justify-between bg-white px-2 py-1.5 rounded-lg border border-zinc-200">
                    <button
                      type="button"
                      onClick={() => setImpurityGrams(prev => Math.max(0, parseFloat((prev - 0.1).toFixed(2))))}
                      className="w-5 h-5 rounded-md bg-zinc-100 flex items-center justify-center text-[#007AFF] active:scale-95 font-bold shrink-0"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <div className="flex items-center min-w-0 flex-1 justify-center px-1">
                      <input
                        type="number"
                        step="0.1"
                        value={impurityGrams || ''}
                        onChange={(e) => {
                          const parsed = parseFloat(e.target.value);
                          setImpurityGrams(isNaN(parsed) ? 0 : parsed);
                        }}
                        className="w-full text-center bg-transparent text-xs font-extrabold text-[#007AFF] outline-hidden focus:ring-0 border-none p-0"
                      />
                      <span className="text-[10px] font-bold text-zinc-400 shrink-0 ml-0.5">g</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImpurityGrams(prev => parseFloat((prev + 0.1).toFixed(2)))}
                      className="w-5 h-5 rounded-md bg-zinc-100 flex items-center justify-center text-[#007AFF] active:scale-95 font-bold shrink-0"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Tỷ lệ quy chuyển */}
              <div className="bg-[#E9F2FF] border border-blue-200 p-3 rounded-xl text-xs text-blue-950 flex flex-col space-y-1 font-semibold shadow-2xs">
                <div className="flex justify-between items-center text-zinc-700">
                  <span>Tỷ lệ tạp chất quy đổi:</span>
                  <span className="text-[#007AFF] font-black text-sm bg-white px-2 py-0.5 rounded-md shadow-2xs border border-blue-100">
                    {inputs.impurity || 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-blue-800 font-bold border-t border-blue-100/70 pt-1.5 mt-0.5">
                  <span>Khấu hao thực tế mỗi 1 tạ (100Kg):</span>
                  <span className="text-zinc-850 font-black text-[11px] bg-amber-100 px-1.5 py-0.5 rounded border border-amber-250 shadow-2xs">
                    {inputs.impurity || 0} Kg tạp tạp
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* BẢNG ĐỐI CHIẾU TRÌNH ĐỘ ẨM */}
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-150 p-4 space-y-3">
            <button
              type="button"
              onClick={() => setShowDeductionTable(!showDeductionTable)}
              className="w-full flex items-center justify-between text-xs font-bold text-zinc-700 py-1 hover:text-[#007AFF] transition-colors cursor-pointer outline-none"
            >
              <span className="flex items-center gap-1.5 text-zinc-800 text-sm">
                <Droplets className="w-4 h-4 text-[#007AFF]" />
                Xem Bảng Tra Trừ Trọng Lượng Độ Ẩm Cà Phê
              </span>
              <span className="text-[11px] font-black text-[#007AFF] flex items-center bg-blue-50 px-2.5 py-1 rounded-lg">
                {showDeductionTable ? 'Đóng ▲' : 'Xem ▼'}
              </span>
            </button>

            {showDeductionTable && (
              <div className="space-y-3.5 animate-fade-in text-xs">
                <p className="text-[11px] text-zinc-500 leading-relaxed font-semibold">
                  Tỉ lệ trừ thực hành thị trường Việt Nam (độ vượt ẩm trên 15 độ, đơn vị trừ kg / 100kg hàng thô). Độ ẩm hiện hành: <span className="font-extrabold text-[#007AFF] bg-blue-50 px-1.5 py-0.5 rounded">{inputs.moisture}%</span>.
                </p>
                
                <div className="overflow-x-auto border border-zinc-200 rounded-xl max-h-[220px] overflow-y-auto">
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="bg-zinc-100 border-b border-zinc-200 text-[10px] uppercase font-black text-zinc-500">
                        <th className="p-2 border-r border-zinc-200 bg-zinc-150 sticky left-0 z-25 font-black text-zinc-700">Độ ẩm</th>
                        {Array.from({ length: 10 }).map((_, i) => (
                          <th key={i} className="p-2 border-r border-zinc-205 last:border-r-0">
                            .{i}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 font-mono text-[11px]">
                      {Object.entries(COFFEE_MOISTURE_TABLE).map(([wholeStr, rowVals]) => {
                        const wholeNum = parseInt(wholeStr, 10);
                        const isCurrentWhole = Math.floor(inputs.moisture) === wholeNum && inputs.moisture > 15;
                        
                        return (
                          <tr 
                            key={wholeNum} 
                            className={`hover:bg-zinc-50/75 transition-colors ${
                              isCurrentWhole ? 'bg-blue-50/80 text-blue-900 font-bold' : ''
                            }`}
                          >
                            <td className={`p-1.5 border-r border-zinc-200 text-center font-bold sticky left-0 z-10 ${
                              isCurrentWhole ? 'bg-blue-100 text-blue-900' : 'bg-zinc-50 text-zinc-850'
                            }`}>
                              {wholeNum}
                            </td>
                            {rowVals.map((val, dIdx) => {
                              const isCurrentCell = isCurrentWhole && Math.round((inputs.moisture - wholeNum) * 10) === dIdx;
                              return (
                                <td 
                                  key={dIdx} 
                                  className={`p-1.5 border-r border-zinc-200 last:border-r-0 ${
                                    isCurrentCell 
                                      ? 'bg-amber-100 text-amber-955 font-black ring-2 ring-amber-400 ring-inset scale-[1.03] shadow-xs' 
                                      : ''
                                  }`}
                                  title={`${wholeNum}.${dIdx}% -> Trừ ${val.toFixed(2)} kg/100kg`}
                                >
                                  {val.toFixed(2)}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CỘT PHẢI: KẾT QUẢ VÀ HÀNH TRÌNH TÍNH TOÁN CHI TIẾT */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* SỐ LIỆU ĐẦU RA CHỐT SỐ LIỆU THEO INPUT - CALC - OUTPUT */}
          <div className="text-xs uppercase font-extrabold text-zinc-400 tracking-wider px-1">
            🎯 [OUTPUT] Chỉ số chốt thanh toán (Sản lượng & Giá thành cuối)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* 1. ĐƠN GIÁ CUỐI */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-150/80 text-center space-y-1 relative overflow-hidden">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">1. Giá Cuối Chốt</span>
              <div className="text-lg sm:text-xl font-extrabold text-zinc-900 tracking-tight">
                {formatCurrency(Math.round(finalPrice))}
              </div>
              <span className="text-[10px] text-emerald-600 block h-4 font-bold">
                {inputs.moisture <= 15 ? `Có thưởng ẩm: +${((15 - inputs.moisture)*0.5).toFixed(2)}%` : 'Giữ nguyên giá sàn'}
              </span>
            </div>
            
            {/* 2. SỐ LƯỢNG THỰC SAU TRỪ */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-150/80 text-center space-y-1 relative overflow-hidden">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">2. Số Lượng Sau Trừ</span>
              <div className="text-lg sm:text-xl font-black text-amber-700 tracking-tight">
                {Math.round(finalWeight).toLocaleString('vi-VN')} <span className="text-xs">kg</span>
              </div>
              <span className="text-[10px] text-rose-500 block h-4 font-bold">
                {inputs.weight - Math.round(finalWeight) > 0 
                  ? `Khấu trừ: -${Math.round(inputs.weight - finalWeight).toLocaleString('vi-VN')} Kg` 
                  : 'Hàng tuyển chuẩn'}
              </span>
            </div>

            {/* 3. TỔNG TIỀN DOANH SỐ */}
            <div className="bg-[#E9F2FF] rounded-2xl p-4 shadow-sm border border-blue-105 text-center space-y-1">
              <span className="text-[11px] font-black text-blue-900 uppercase tracking-wider block">3. Tổng Tiền Chi Trả</span>
              <div className="text-xl font-black text-[#007AFF] tracking-tight">
                {formatCurrency(Math.round(totalAmount))}
              </div>
              <span className="text-[10px] text-blue-600 font-bold block h-4">
                Sản lượng chốt: {Math.round(finalWeight).toLocaleString('vi-VN')} Kg
              </span>
            </div>
          </div>

          {/* CHI TIẾT SƠ ĐỒ HẠCH TOÁN */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">HẠCH TOÁN BẢNG CHUYỂN HOÁ CHI TIẾT</h4>
              <span className="text-[10px] font-black text-[#007AFF] bg-blue-50 px-2 py-0.5 rounded-full">DakLak Standard Log</span>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-zinc-150 p-5 space-y-4">
              <div className="border-b border-[#F2F2F7] pb-3 flex items-center justify-between">
                <span className="text-sm font-bold text-zinc-800 flex items-center space-x-1.5">
                  <Receipt className="w-4 h-4 text-zinc-600" />
                  <span>Phân bổ bàn giao chất lượng Cà Phê Robusta</span>
                </span>
                <span className="text-xs text-emerald-600 font-bold">Hệ thống auto-audit</span>
              </div>

              <div className="space-y-3">
                {calcSteps.map((step, idx) => (
                  <div key={idx} className="flex flex-col space-y-1 pb-3 border-b last:border-0 border-[#F2F2F7]">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-zinc-850">{step.title}</span>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono text-zinc-400 scale-90">{step.expression}</span>
                        <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                          step.type === 'positive' ? 'bg-[#EBF7EE] text-[#34C759]' :
                          step.type === 'negative' ? 'bg-rose-50 text-[#FF3B30]' :
                          step.type === 'info' ? 'bg-blue-50 text-[#007AFF]' : 'bg-[#F2F2F7] text-zinc-650'
                        }`}>
                          {step.result}
                        </span>
                      </div>
                    </div>
                    {step.note && (
                      <p className="text-[11px] text-zinc-400 -mt-0.5 leading-relaxed font-medium">
                        {step.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-2 bg-[#F2F2F7]/50 rounded-xl p-3.5 text-[11px] text-zinc-600 leading-relaxed border border-zinc-150 font-medium">
                <p className="font-bold text-zinc-850 mb-1 flex items-center gap-1">
                  <span>📋 Sơ đồ logic tóm tắt:</span>
                </p>
                Tỷ lệ tạp chất quy đổi <span className="font-bold text-zinc-800">{inputs.impurity}%</span> (chuẩn 1.0%) kết hợp độ ẩm <span className="font-bold text-zinc-800">{inputs.moisture}%</span> (chuẩn 15.0%) để tính ra mức trừ hoặc thưởng. Khối lượng đong thô <span className="font-extrabold text-blue-600">{inputs.weight.toLocaleString('vi-VN')} kg</span> sau khi áp trừ còn <span className="font-extrabold text-amber-700">{Math.round(finalWeight).toLocaleString('vi-VN')} Kg</span> nhận nguyên đơn giá đã thưởng thành tổng cộng tiền chi trả là <span className="font-extrabold text-emerald-600 text-[12px]">{formatCurrency(Math.round(totalAmount))}</span>.
              </div>

              {/* LƯU TRỮ VÀO NHẬT KÝ */}
              <div className="pt-2">
                <button
                  type="button"
                  id="btn-save-coffee"
                  onClick={saveRecord}
                  className="w-full bg-[#007AFF] text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-blue-200 mt-2 hover:bg-blue-600 focus:ring-2 focus:ring-[#007AFF] cursor-pointer transition-all active:scale-[0.98] duration-150 flex items-center justify-center space-x-2"
                >
                  <Save className="w-5 h-5" />
                  <span>Tinh Toán & Ghi Nhận Giao Dịch</span>
                </button>

                {isSaved && (
                  <div className="mt-3.5 bg-[#34C759] text-white rounded-xl p-3 text-center text-xs font-bold animate-pulse shadow-sm">
                    ✓ Đã ghi nhận giao dịch Cà Phê thành công vào Nhật Ký hôm nay!
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
