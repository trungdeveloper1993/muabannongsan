/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Plus, Minus, Save, Sparkles, HelpCircle, Receipt } from 'lucide-react';
import { PepperInput, CalculationDetail, TransactionRecord, ProductType } from '../types';
import { formatCurrency } from '../utils/exporter';

interface PepperTabProps {
  onSaveRecord: (record: Omit<TransactionRecord, 'id' | 'timestamp' | 'dateKey'>) => void;
}

export default function PepperTab({ onSaveRecord }: PepperTabProps) {
  // Trạng thái các input của Tiêu
  const [inputs, setInputs] = useState<PepperInput>({
    weight: 2500, // Số Kg mẫu
    moisture: 12.5, // Độ ẩm mẫu
    rem: 5.4,     // Rem mẫu
    basePrice: 155000, // Giá thành mẫu
  });

  const [calcSteps, setCalcSteps] = useState<CalculationDetail[]>([]);
  const [finalPrice, setFinalPrice] = useState<number>(0);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [showTips, setShowTips] = useState<boolean>(true);
  const [tempBasePriceStr, setTempBasePriceStr] = useState<string>('155000');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Công thức tính toán độ ẩm tiêu mới theo yêu cầu:
  // - 15% là +0%
  // - 12.5% là +2.5% (cứ giảm 0.5% ẩm thì được cộng thêm +0.5% giá trị, không làm tròn)
  // - Tối đa thưởng đạt được là +2.5% tại độ ẩm 12.5%, dưới mốc này không cộng thêm nữa.
  const getMoistureBonus = (moisture: number) => {
    if (moisture <= 15) {
      const effectiveMoisture = Math.max(12.5, moisture);
      const diff = 15 - effectiveMoisture;
      return diff; // Tỷ lệ 1:1, vd: giảm 2.5% độ ẩm (đến 12.5%) được +2.5% bonus. Cứ mất 0.5% ẩm được +0.5% không làm tròn.
    } else {
      const diff = moisture - 15;
      return -diff * 0.5; // Vượt chuẩn 15% bị trừ 0.5% mỗi 1% ẩm dư
    }
  };

  // Đồng bộ hóa chuỗi nhập giá thành với số thực
  useEffect(() => {
    setTempBasePriceStr(inputs.basePrice.toString());
  }, [inputs.basePrice]);

  // Thực hiện tính toán khi giá trị thay đổi
  useEffect(() => {
    const { weight, moisture, rem, basePrice } = inputs;

    // 1. Tính Độ (độ ẩm cộng thêm)
    const moistureBonus = getMoistureBonus(moisture);
    let moistureNote = '';
    let moistureType: 'positive' | 'negative' | 'neutral' = 'neutral';

    if (moisture <= 15) {
      if (moisture < 12.5) {
        moistureNote = `Ẩm ${moisture}% thấp hơn mốc 12.5%, đạt điểm thưởng tối đa: +${moistureBonus.toFixed(2)}%`;
      } else {
        moistureNote = `Ẩm ${moisture}% thấp hơn chuẩn (15%), được cộng tỉ lệ (giảm 0.5% ẩm được +0.5%): +${moistureBonus.toFixed(2)}%`;
      }
      moistureType = moistureBonus > 0 ? 'positive' : 'neutral';
    } else {
      moistureNote = `Ẩm ${moisture}% lớn hơn chuẩn (15%), bị trừ (0.5% mỗi 1% dư): ${moistureBonus.toFixed(2)}%`;
      moistureType = 'negative';
    }

    // 2. Tính tỷ lệ Rem cộng thêm ((Rem - 5) * 10)%
    const remBonus = (rem - 5) * 10;
    const remNote = remBonus >= 0 
      ? `Rem thực tế (${rem}) cao hơn mốc 5, hiệu số ${(rem - 5).toFixed(1)} được tính ra cộng: +${remBonus.toFixed(2)}%`
      : `Rem thực tế (${rem}) thấp hơn mốc 5, hiệu số ${(rem - 5).toFixed(1)} được tính ra trừ: ${remBonus.toFixed(2)}%`;
    const remType = remBonus >= 0 ? 'positive' : 'negative';

    // 3. Tổng tỷ lệ cộng/trừ (%)
    const totalAdjPercent = remBonus + moistureBonus;
    const adjNote = totalAdjPercent >= 0
      ? `Tổng chênh lệch %: +${totalAdjPercent.toFixed(2)}%`
      : `Tổng chênh lệch %: ${totalAdjPercent.toFixed(2)}%`;

    // 4. Giá cuối cùng một kg
    const priceAdjustment = basePrice * (totalAdjPercent / 100);
    const calculatedPrice = basePrice + priceAdjustment;
    const calculatedTotal = weight * calculatedPrice;

    setFinalPrice(calculatedPrice);
    setTotalAmount(calculatedTotal);

    // Xây dựng hướng dẫn chi tiết từng bước
    const steps: CalculationDetail[] = [
      {
        title: '1. Giá thành nguyên giá',
        expression: `${formatCurrency(basePrice)} / Kg`,
        result: formatCurrency(basePrice),
        note: 'Giá gốc nông sản thỏa thuận ban đầu.',
        type: 'info'
      },
      {
        title: '2. Tỷ lệ điều chỉnh độ ẩm (Độ)',
        expression: moisture <= 15 
          ? `Min(2.50%, 15% - Max(12.5%, ${moisture}%))`
          : `-( ${moisture}% - 15% ) * 0.5`,
        result: `${moistureBonus >= 0 ? '+' : ''}${moistureBonus.toFixed(2)}%`,
        note: moistureNote,
        type: moistureType
      },
      {
        title: '3. Tỷ lệ điều chỉnh chất lượng (Rem)',
        expression: `(${rem} - 5) * 10`,
        result: `${remBonus >= 0 ? '+' : ''}${remBonus.toFixed(2)}%`,
        note: remNote,
        type: remType
      },
      {
        title: '4. Tổng phần trăm cộng thưởng / khấu trừ',
        expression: `((Rem - 5) * 10) + Độ`,
        result: `${totalAdjPercent >= 0 ? '+' : ''}${totalAdjPercent.toFixed(2)}%`,
        note: adjNote,
        type: totalAdjPercent >= 0 ? 'positive' : 'negative'
      },
      {
        title: '5. Chênh lệch thành tiền trên mỗi Kg',
        expression: `${formatCurrency(basePrice)} * ${totalAdjPercent.toFixed(2)}%`,
        result: `${priceAdjustment >= 0 ? '+' : ''}${formatCurrency(Math.round(priceAdjustment))}`,
        note: `Tính trực tiếp từ tỷ lệ chênh lệch giá gốc.`,
        type: priceAdjustment >= 0 ? 'positive' : 'negative'
      },
      {
        title: '6. Đơn giá cuối cùng',
        expression: `Giá gốc + Chênh lệch`,
        result: `${formatCurrency(Math.round(calculatedPrice))} / Kg`,
        note: `Thương lái và nông dân giao dịch bằng mức đơn giá chốt này.`,
        type: 'info'
      },
      {
        title: '7. Khối lượng cân',
        expression: `${weight.toLocaleString('vi-VN')} kg`,
        result: `${weight.toLocaleString('vi-VN')} Kg`,
        note: `Tổng trọng lượng thực tế hạt tiêu.`,
        type: 'neutral'
      }
    ];

    setCalcSteps(steps);
    // Reset notification trigger on edit
    setIsSaved(false);
  }, [inputs]);

  // Các hàm điều chỉnh giá trị Input
  const handlePercentStep = (field: keyof PepperInput, step: number) => {
    setInputs((prev) => {
      const val = prev[field] + step;
      // Giới hạn hợp lý
      const clamped = Math.max(0, parseFloat(val.toFixed(2)));
      return { ...prev, [field]: clamped };
    });
  };

  const handleInputChange = (field: keyof PepperInput, value: string) => {
    const parsed = value === '' ? 0 : parseFloat(value);
    setInputs((prev) => ({
      ...prev,
      [field]: isNaN(parsed) ? 0 : parsed,
    }));
  };

  const handleBasePriceChange = (value: string) => {
    setTempBasePriceStr(value);
    const cleaned = value.replace(/\D/g, ''); // chỉ giữ lại số
    const num = cleaned === '' ? 0 : parseInt(cleaned, 10);
    setInputs((prev) => ({
      ...prev,
      basePrice: isNaN(num) ? 0 : num,
    }));
  };

  const saveRecord = () => {
    const moistureBonusPercent = getMoistureBonus(inputs.moisture);

    onSaveRecord({
      productType: 'tiêu',
      productName: 'Hạt Tiêu',
      weight: inputs.weight,
      moisture: inputs.moisture,
      basePrice: inputs.basePrice,
      finalPrice: finalPrice,
      totalAmount: totalAmount,
      details: {
        rem: inputs.rem,
        moistureBonusPercent: parseFloat(moistureBonusPercent.toFixed(2)),
        remBonusPercent: parseFloat(((inputs.rem - 5) * 10).toFixed(2)),
        totalAdjustmentPercent: parseFloat((((inputs.rem - 5) * 10) + moistureBonusPercent).toFixed(2)),
        formulaSteps: calcSteps,
      },
    });

    setIsSaved(true);
    // Auto clear flash message after 3s
    setTimeout(() => {
      setIsSaved(false);
    }, 3000);
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Group form nhập liệu tiêu chuẩn iOS 16 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-lg text-[#007AFF] flex items-center gap-2">
            <span className="w-2 h-6 bg-[#007AFF] rounded-full"></span>
            Nhập Dữ Liệu Tiêu
          </h3>
          <button 
            type="button"
            onClick={() => setShowTips(!showTips)}
            className="text-[#007AFF] text-xs font-semibold flex items-center space-x-1 cursor-pointer bg-white px-2.5 py-1 rounded-full border border-zinc-200/50 shadow-xs active:scale-95 transition-transform"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{showTips ? 'Ẩn hướng dẫn' : 'Hướng dẫn đong đo'}</span>
          </button>
        </div>

        {showTips && (
          <div className="bg-[#E5F1FF] text-[#004085] p-4 rounded-xl border border-blue-100 text-xs leading-relaxed space-y-2 shadow-xs">
            <div className="font-bold flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
              <span>Hướng Dẫn Đong Đo Hạt Tiêu Chuẩn:</span>
            </div>
            <ul className="list-disc pl-4 space-y-2">
              <li><strong>Đo độ ẩm:</strong> Cân đúng 1 lạng tiêu, nhập mẫu rồi ấn chọn trên máy đo mã <strong>65</strong>.</li>
              <li><strong>Đong:</strong> Dùng thiết bị lít đong đổ đầy tiêu, gạt san phẳng bề mặt sau đó đổ toàn bộ phần đong được vào cân để tính chỉ số chất lượng.</li>
            </ul>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-zinc-150 p-5 space-y-4">
          {/* SỐ KG */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-[#F2F2F7]">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-zinc-800">Khối Lượng (Kg)</span>
              <span className="text-[11px] font-medium text-zinc-400">Tổng số lượng cân tiêu</span>
            </div>
            <div className="flex items-center space-x-2 self-end sm:self-auto bg-[#F2F2F7] p-1.5 rounded-xl">
              <button
                type="button"
                onClick={() => handlePercentStep('weight', -50)}
                className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-zinc-700 font-bold active:scale-95 transition-transform shadow-xs"
              >
                <Minus className="w-3.5 h-3.5 text-[#007AFF]" />
              </button>
              <input
                id="input-pepper-weight"
                type="number"
                value={inputs.weight || ''}
                onChange={(e) => handleInputChange('weight', e.target.value)}
                className="w-20 text-center bg-transparent text-sm font-bold text-[#007AFF] outline-hidden placeholder-zinc-300 focus:ring-0 border-none"
                placeholder="0"
              />
              <button
                type="button"
                onClick={() => handlePercentStep('weight', 50)}
                className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-zinc-700 font-bold active:scale-95 transition-transform shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-[#007AFF]" />
              </button>
            </div>
          </div>

          {/* ĐỘ ẨM */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-[#F2F2F7]">
            <div className="flex flex-col">
              <div className="flex items-center space-x-1.5">
                <span className="text-sm font-bold text-zinc-800">Độ Ẩm (%)</span>
                {inputs.moisture <= 15 ? (
                  <span className="px-1.5 py-0.5 bg-emerald-50 text-[10px] font-extrabold text-emerald-600 rounded">Ẩm chuẩn</span>
                ) : (
                  <span className="px-1.5 py-0.5 bg-amber-50 text-[10px] font-extrabold text-amber-600 rounded">Ẩm cao</span>
                )}
              </div>
              <span className="text-[11px] font-medium text-zinc-400">Mốc chuẩn là 15.0% ẩm</span>
            </div>
            <div className="flex items-center space-x-2 self-end sm:self-auto bg-[#F2F2F7] p-1.5 rounded-xl">
              <button
                type="button"
                onClick={() => handlePercentStep('moisture', -0.5)}
                className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-zinc-700 font-bold active:scale-95 transition-transform shadow-xs"
              >
                <Minus className="w-3.5 h-3.5 text-[#007AFF]" />
              </button>
              <input
                id="input-pepper-moisture"
                type="number"
                step="0.1"
                value={inputs.moisture || ''}
                onChange={(e) => handleInputChange('moisture', e.target.value)}
                className="w-16 text-center bg-transparent text-sm font-bold text-[#007AFF] outline-hidden focus:ring-0 border-none"
                placeholder="15.0"
              />
              <button
                type="button"
                onClick={() => handlePercentStep('moisture', 0.5)}
                className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-zinc-700 font-bold active:scale-95 transition-transform shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-[#007AFF]" />
              </button>
            </div>
          </div>

          {/* REM */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-[#F2F2F7]">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-zinc-800">Chỉ số Rem</span>
              <span className="text-[11px] font-medium text-zinc-400">Chuẩn trung bình = 5.0</span>
            </div>
            <div className="flex items-center space-x-2 self-end sm:self-auto bg-[#F2F2F7] p-1.5 rounded-xl">
              <button
                type="button"
                onClick={() => handlePercentStep('rem', -0.1)}
                className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-zinc-700 font-bold active:scale-95 transition-transform shadow-xs"
              >
                <Minus className="w-3.5 h-3.5 text-[#007AFF]" />
              </button>
              <input
                id="input-pepper-rem"
                type="number"
                step="0.1"
                value={inputs.rem || ''}
                onChange={(e) => handleInputChange('rem', e.target.value)}
                className="w-16 text-center bg-transparent text-sm font-bold text-[#007AFF] outline-hidden focus:ring-0 border-none"
                placeholder="5.0"
              />
              <button
                type="button"
                onClick={() => handlePercentStep('rem', 0.1)}
                className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-zinc-700 font-bold active:scale-95 transition-transform shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-[#007AFF]" />
              </button>
            </div>
          </div>

          {/* GIÁ THÀNH GỐC */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-zinc-800">Đơn Giá Gốc (Đồng/Kg)</span>
              <span className="text-[11px] font-medium text-zinc-400">Giá thương lượng gốc thỏa thuận</span>
            </div>
            <div className="flex items-center space-x-1.5 self-end sm:self-auto bg-[#F2F2F7] px-3.5 py-1.5 rounded-xl">
              <input
                id="input-pepper-price"
                type="text"
                value={inputs.basePrice ? inputs.basePrice.toLocaleString('vi-VN') : ''}
                onChange={(e) => handleBasePriceChange(e.target.value)}
                className="w-28 text-right bg-transparent text-base font-extrabold text-[#007AFF] outline-hidden placeholder-zinc-300 focus:ring-0 border-none"
                placeholder="100,000"
              />
              <span className="text-xs font-bold text-zinc-500">đ/kg</span>
            </div>
          </div>
        </div>
      </div>

      {/* CHỈ TIÊU KẾT QUẢ ĐỒNG HỒ TÍNH TOÁN */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-150/80 text-center space-y-1">
          <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Đơn Giá Chốt</span>
          <div className="text-lg sm:text-xl font-extrabold text-[#1C1C1E] tracking-tight">
            {formatCurrency(Math.round(finalPrice))}
          </div>
          <span className="text-[10px] text-zinc-400 block h-4 font-medium">Một Kg tiêu thực phẩm</span>
        </div>
        
        <div className="bg-[#E9F2FF] rounded-2xl p-4 shadow-sm border border-blue-105 text-center space-y-1">
          <span className="text-[11px] font-bold text-[#004EB5] uppercase tracking-wider">Thành Tiền Dự Kiến</span>
          <div className="text-lg sm:text-xl font-black text-[#007AFF] tracking-tight">
            {formatCurrency(Math.round(totalAmount))}
          </div>
          <span className="text-[10px] text-blue-500 font-semibold block h-4">
            Khối lượng: {inputs.weight.toLocaleString('vi-VN')} kg
          </span>
        </div>
      </div>

      {/* CHI TIẾT QUÁ TRÌNH PHÂN TÍCH */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-bold uppercase text-[#8E8E93] tracking-wider">KẾT QUẢ TÍNH CHI TIẾT</h4>
          <span className="text-[10px] font-bold text-[#007AFF] bg-blue-50 px-2 py-0.5 rounded-full">iOS Audit Log</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-zinc-150 p-5 space-y-4">
          <div className="border-b border-[#F2F2F7] pb-3 flex items-center justify-between">
            <span className="text-sm font-bold text-[#1C1C1E] flex items-center space-x-1.5">
              <Receipt className="w-4 h-4 text-zinc-600" />
              <span>Sơ đồ cấu thành đơn giá</span>
            </span>
            <span className="text-xs text-zinc-500 font-medium">Báo cáo tự động</span>
          </div>

          <div className="space-y-3">
            {calcSteps.map((step, idx) => (
              <div key={idx} className="flex flex-col space-y-1 pb-3 border-b last:border-0 border-[#F2F2F7]">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-zinc-800">{step.title}</span>
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
                  <p className="text-[11px] text-[#8E8E93] -mt-0.5 leading-relaxed">
                    {step.note}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* CHỮ KÝ MINH BẠCH GIAO DỊCH */}
          <div className="pt-2 bg-[#F2F2F7] rounded-xl p-3.5 text-[11px] text-zinc-650 leading-relaxed border border-zinc-200/55">
            <p className="font-bold text-zinc-800 mb-1">📋 Sơ đồ logic tóm tắt:</p>
            Do tỷ lệ Rem lệch <span className="font-bold text-zinc-700">{((inputs.rem - 5) * 10) >= 0 ? '+' : ''}{((inputs.rem - 5) * 10).toFixed(2)}%</span> kết hợp độ ẩm <span className="font-bold text-zinc-700">{getMoistureBonus(inputs.moisture) >= 0 ? '+' : ''}{getMoistureBonus(inputs.moisture).toFixed(2)}%</span>, tổng tỉ suất điều chỉnh đạt <span className="font-bold text-zinc-900 text-xs">{(((inputs.rem - 5) * 10) + getMoistureBonus(inputs.moisture)) >= 0 ? '+' : ''}{(((inputs.rem - 5) * 10) + getMoistureBonus(inputs.moisture)).toFixed(2)}%</span>. Đọc kiểm định thông số của mẻ hạt đạt chuẩn giao kèo.
          </div>

          {/* LƯU TRỮ VÀO NHẬT KÝ */}
          <div className="pt-2">
            <button
              type="button"
              id="btn-save-pepper"
              onClick={saveRecord}
              className="w-full bg-[#007AFF] text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-blue-200 mt-2 hover:bg-blue-600 focus:ring-2 focus:ring-[#007AFF] cursor-pointer transition-all active:scale-[0.98] duration-150 flex items-center justify-center space-x-2"
            >
              <Save className="w-5 h-5" />
              <span>Tính Toán & Lưu Giao Dịch</span>
            </button>

            {isSaved && (
              <div className="mt-3.5 bg-[#34C759] text-white rounded-xl p-3 text-center text-xs font-bold animate-pulse shadow-sm">
                ✓ Đã ghi nhận giao dịch Tiêu thành công vào Nhật Ký hôm nay!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
