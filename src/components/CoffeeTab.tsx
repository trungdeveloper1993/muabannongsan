/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Plus, Minus, Save, Sparkles, HelpCircle, Receipt } from 'lucide-react';
import { CoffeeInput, CalculationDetail, TransactionRecord } from '../types';
import { formatCurrency } from '../utils/exporter';

interface CoffeeTabProps {
  onSaveRecord: (record: Omit<TransactionRecord, 'id' | 'timestamp' | 'dateKey'>) => void;
}

export default function CoffeeTab({ onSaveRecord }: CoffeeTabProps) {
  const [inputs, setInputs] = useState<CoffeeInput>({
    weight: 3000,
    moisture: 14.0,
    blackBroken: 3.5, // % hạt đen vỡ (chuẩn là 2.0%)
    impurity: 1.5,    // % tạp chất (chuẩn là 1.0%)
    basePrice: 120000,
  });

  const [calcSteps, setCalcSteps] = useState<CalculationDetail[]>([]);
  const [finalPrice, setFinalPrice] = useState<number>(0);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [showTips, setShowTips] = useState<boolean>(true);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  useEffect(() => {
    const { weight, moisture, blackBroken, impurity, basePrice } = inputs;

    // 1. Tính ẩm cộng/trừ (Chuẩn 15%)
    let moistureBonus = 0;
    let moistureNote = '';
    let moistureType: 'positive' | 'negative' | 'neutral' = 'neutral';

    if (moisture <= 15) {
      moistureBonus = (15 - moisture) * 0.5;
      if (moistureBonus > 2.0) moistureBonus = 2.0; // Giới hạn tối đa cộng 2%
      moistureNote = `Độ ẩm ${moisture}% tốt hơn chuẩn (15%), được thưởng: +${moistureBonus.toFixed(2)}%`;
      moistureType = moistureBonus > 0 ? 'positive' : 'neutral';
    } else {
      moistureBonus = -(moisture - 15) * 1.0; // phạt nặng hơn khi ẩm cao
      moistureNote = `Độ ẩm ${moisture}% vượt chuẩn (15%), bị phạt trừ: ${moistureBonus.toFixed(2)}%`;
      moistureType = 'negative';
    }

    // 2. Tính phạt đen vỡ (%) (vượt chuẩn 2.0%)
    let blackBrokenPenalty = 0;
    if (blackBroken > 2) {
      blackBrokenPenalty = -(blackBroken - 2) * 0.5;
    }
    const blackBrokenNote = blackBrokenPenalty < 0
      ? `Đen vỡ ${blackBroken}% vượt chuẩn (2%), bị trừ: ${blackBrokenPenalty.toFixed(2)}%`
      : `Đen vỡ ${blackBroken}% đạt chuẩn (<= 2%), không trừ.`;
    const blackBrokenType = blackBrokenPenalty < 0 ? 'negative' : 'neutral';

    // 3. Tính phạt tạp chất (%) (vượt chuẩn 1.0%)
    let impurityPenalty = 0;
    if (impurity > 1) {
      impurityPenalty = -(impurity - 1) * 1.0;
    }
    const impurityNote = impurityPenalty < 0
      ? `Tạp chất ${impurity}% vượt chuẩn (1%), bị trừ: ${impurityPenalty.toFixed(2)}%`
      : `Tạp chất ${impurity}% đạt chuẩn (<= 1%), không trừ.`;
    const impurityType = impurityPenalty < 0 ? 'negative' : 'neutral';

    // 4. Tổng tỷ lệ cộng trừ %
    const totalAdjPercent = moistureBonus + blackBrokenPenalty + impurityPenalty;
    const adjNote = totalAdjPercent >= 0
      ? `Tổng chênh lệch tỉ lệ: +${totalAdjPercent.toFixed(2)}%`
      : `Tổng chênh lệch tỉ lệ: ${totalAdjPercent.toFixed(2)}%`;

    // 5. Đơn giá cuối cùng
    const priceAdjustment = basePrice * (totalAdjPercent / 100);
    const calculatedPrice = basePrice + priceAdjustment;
    const calculatedTotal = weight * calculatedPrice;

    setFinalPrice(calculatedPrice);
    setTotalAmount(calculatedTotal);

    const steps: CalculationDetail[] = [
      {
        title: '1. Giá nhân xô nguyên giá',
        expression: `${formatCurrency(basePrice)} / Kg`,
        result: formatCurrency(basePrice),
        note: 'Giá thỏa thuận cho 1kg cà phê nhân xô chuẩn.',
        type: 'info'
      },
      {
        title: '2. Tỷ lệ điều chỉnh độ ẩm (đối chiếu 15%)',
        expression: moisture <= 15 ? `Min(2%, (15% - ${moisture}%) * 0.5)` : `-( ${moisture}% - 15%) * 1.0`,
        result: `${moistureBonus >= 0 ? '+' : ''}${moistureBonus.toFixed(2)}%`,
        note: moistureNote,
        type: moistureType
      },
      {
        title: '3. Khấu trừ tỷ lệ Đen & Vỡ (chuẩn 2.0%)',
        expression: blackBroken > 2 ? `-(${blackBroken}% - 2%) * 0.5` : '0%',
        result: `${blackBrokenPenalty.toFixed(2)}%`,
        note: blackBrokenNote,
        type: blackBrokenType
      },
      {
        title: '4. Khấu trừ tỷ lệ Tạp chất (chuẩn 1.0%)',
        expression: impurity > 1 ? `-(${impurity}% - 1%) * 1.0` : '0%',
        result: `${impurityPenalty.toFixed(2)}%`,
        note: impurityNote,
        type: impurityType
      },
      {
        title: '5. Tổng chênh lệch chất lượng',
        expression: `Ẩm + Đen/Vỡ + Tạp chất`,
        result: `${totalAdjPercent >= 0 ? '+' : ''}${totalAdjPercent.toFixed(2)}%`,
        note: adjNote,
        type: totalAdjPercent >= 0 ? 'positive' : 'negative'
      },
      {
        title: '6. Đơn giá cuối cùng',
        expression: `Giá gốc + Chênh lệch`,
        result: `${formatCurrency(Math.round(calculatedPrice))} / Kg`,
        note: 'Giá thanh toán thực tế sau khi tính trừ tỷ lệ hao hụt.',
        type: 'info'
      },
      {
        title: '7. Tổng sản lượng',
        expression: `${weight.toLocaleString('vi-VN')} kg`,
        result: `${weight.toLocaleString('vi-VN')} Kg`,
        note: 'Trọng lượng mẻ cà phê giao nhận.',
        type: 'neutral'
      }
    ];

    setCalcSteps(steps);
    setIsSaved(false);
  }, [inputs]);

  const handlePercentStep = (field: keyof CoffeeInput, step: number) => {
    setInputs((prev) => {
      const val = prev[field] + step;
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
    // Tính lại hệ số điều chỉnh để lưu chi tiết
    const mDiff = 15 - inputs.moisture;
    let moistureBonusPercent = 0;
    if (inputs.moisture <= 15) {
      moistureBonusPercent = Math.min(2.0, mDiff * 0.5);
    } else {
      moistureBonusPercent = -mDiff * -1.0;
    }

    const blackBrokenPenalty = inputs.blackBroken > 2 ? -(inputs.blackBroken - 2) * 0.5 : 0;
    const impurityPenalty = inputs.impurity > 1 ? -(inputs.impurity - 1) * 1.0 : 0;

    onSaveRecord({
      productType: 'cà phê',
      productName: 'Cà Phê Robusta',
      weight: inputs.weight,
      moisture: inputs.moisture,
      basePrice: inputs.basePrice,
      finalPrice: finalPrice,
      totalAmount: totalAmount,
      details: {
        blackBroken: inputs.blackBroken,
        impurity: inputs.impurity,
        moistureBonusPercent: parseFloat(moistureBonusPercent.toFixed(2)),
        totalAdjustmentPercent: parseFloat((moistureBonusPercent + blackBrokenPenalty + impurityPenalty).toFixed(2)),
        formulaSteps: calcSteps,
      },
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Group form nhập liệu tiêu chuẩn iOS 16 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-lg text-[#007AFF] flex items-center gap-2">
            <span className="w-2 h-6 bg-[#007AFF] rounded-full"></span>
            Nhập Dữ Liệu Cà Phê
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
            <div className="font-bold flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>Quy chuẩn Cà Phê nhân xô xuất khẩu:</span>
            </div>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Độ ẩm chuẩn:</strong> 15%. Dưới chuẩn được cộng <strong>+0.5%</strong>/độ ẩm khô, tối đa <strong>+2%</strong>. Độ ẩm vượt 15% phạt trừ <strong>-1.0%</strong>/độ ẩm dư.</li>
              <li><strong>Tỷ lệ đen vỡ chuẩn:</strong> 2.0%. Lượng đen vỡ vượt mốc 2.0% sẽ bị giảm trừ <strong>-0.5%</strong> giá trị cho mỗi 1% dư.</li>
              <li><strong>Tạp chất chuẩn:</strong> 1.0%. Lượng tạp chất vượt mốc 1.0% sẽ bị giảm trừ <strong>-1.0%</strong> giá trị cho mỗi 1% dư.</li>
            </ul>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-zinc-150 p-5 space-y-4">
          {/* SỐ KG */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-[#F2F2F7]">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-zinc-800">Khối Lượng Cân (Kg)</span>
              <span className="text-[11px] font-medium text-zinc-400">Trọng lượng hàng thực phẩm</span>
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
                className="w-20 text-center bg-transparent text-sm font-bold text-[#007AFF] outline-hidden placeholder-zinc-300 focus:ring-0 border-none"
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

          {/* ĐỘ ẨM */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-[#F2F2F7]">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-zinc-800">Độ Ẩm (%)</span>
              <span className="text-[11px] font-medium text-zinc-400">Mốc ẩm chuẩn tương giao là 15.0%</span>
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
                onClick={() => handlePercentStep('moisture', 0.5)}
                className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-zinc-700 font-bold active:scale-95 transition-transform shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-[#007AFF]" />
              </button>
            </div>
          </div>

          {/* ĐEN VỠ */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-[#F2F2F7]">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-zinc-800">Đen & Vỡ hạt (%)</span>
              <span className="text-[11px] font-medium text-zinc-400">Chuẩn chỉ &lt;= 2.0% đen vỡ</span>
            </div>
            <div className="flex items-center space-x-2 self-end sm:self-auto bg-[#F2F2F7] p-1.5 rounded-xl">
              <button
                type="button"
                onClick={() => handlePercentStep('blackBroken', -0.1)}
                className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-zinc-700 font-bold active:scale-95 transition-transform shadow-xs"
              >
                <Minus className="w-3.5 h-3.5 text-[#007AFF]" />
              </button>
              <input
                id="input-coffee-blackbroken"
                type="number"
                step="0.1"
                value={inputs.blackBroken || ''}
                onChange={(e) => handleInputChange('blackBroken', e.target.value)}
                className="w-16 text-center bg-transparent text-sm font-bold text-[#007AFF] outline-hidden focus:ring-0 border-none"
                placeholder="2.0"
              />
              <button
                type="button"
                onClick={() => handlePercentStep('blackBroken', 0.1)}
                className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-zinc-700 font-bold active:scale-95 transition-transform shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-[#007AFF]" />
              </button>
            </div>
          </div>

          {/* TẠP CHẤT */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-[#F2F2F7]">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-zinc-800">Tạp Chất (%)</span>
              <span className="text-[11px] font-medium text-zinc-400">Tiêu chuẩn &lt;= 1.0% tạp chất</span>
            </div>
            <div className="flex items-center space-x-2 self-end sm:self-auto bg-[#F2F2F7] p-1.5 rounded-xl">
              <button
                type="button"
                onClick={() => handlePercentStep('impurity', -0.1)}
                className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-zinc-700 font-bold active:scale-95 transition-transform shadow-xs"
              >
                <Minus className="w-3.5 h-3.5 text-[#007AFF]" />
              </button>
              <input
                id="input-coffee-impurity"
                type="number"
                step="0.1"
                value={inputs.impurity || ''}
                onChange={(e) => handleInputChange('impurity', e.target.value)}
                className="w-16 text-center bg-transparent text-sm font-bold text-[#007AFF] outline-hidden focus:ring-0 border-none"
                placeholder="1.0"
              />
              <button
                type="button"
                onClick={() => handlePercentStep('impurity', 0.1)}
                className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-zinc-700 font-bold active:scale-95 transition-transform shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-[#007AFF]" />
              </button>
            </div>
          </div>

          {/* GIÁ THÀNH GỐC */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-zinc-800">Đơn Giá Sàn (Đồng/Kg)</span>
              <span className="text-[11px] font-medium text-zinc-400">Giá nông sản Robusta tiêu chuẩn</span>
            </div>
            <div className="flex items-center space-x-1.5 self-end sm:self-auto bg-[#F2F2F7] px-3.5 py-1.5 rounded-xl">
              <input
                id="input-coffee-price"
                type="text"
                value={inputs.basePrice ? inputs.basePrice.toLocaleString('vi-VN') : ''}
                onChange={(e) => handleBasePriceChange(e.target.value)}
                className="w-28 text-right bg-transparent text-base font-extrabold text-[#007AFF] outline-hidden focus:ring-0 border-none"
                placeholder="110,000"
              />
              <span className="text-xs font-bold text-zinc-500">đ/kg</span>
            </div>
          </div>
        </div>
      </div>

      {/* CHỈ TIÊU KẾT QUẢ ĐỒNG HỒ TÍNH TOÁN */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-150/80 text-center space-y-1">
          <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Giá Chốt Robusta</span>
          <div className="text-lg sm:text-xl font-extrabold text-[#1C1C1E] tracking-tight">
            {formatCurrency(Math.round(finalPrice))}
          </div>
          <span className="text-[10px] text-zinc-400 block h-4 font-medium">Một Kg nhân khô hóa giá</span>
        </div>
        
        <div className="bg-[#E9F2FF] rounded-2xl p-4 shadow-sm border border-blue-105 text-center space-y-1">
          <span className="text-[11px] font-bold text-[#004EB5] uppercase tracking-wider">Doanh Số Chi Trả</span>
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
              <span>Phân bổ hạch toán chất lượng Cà Phê</span>
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

          <div className="pt-2 bg-[#F2F2F7] rounded-xl p-3.5 text-[11px] text-zinc-650 leading-relaxed border border-zinc-200/55">
            <p className="font-bold text-zinc-800 mb-1">📋 Sơ đồ logic tóm tắt:</p>
            Mức trừ hạt đen vỡ <span className="font-bold text-zinc-700">{(inputs.blackBroken > 2 ? -(inputs.blackBroken - 2) * 0.5 : 0).toFixed(2)}%</span> kết hợp tạp chất <span className="font-bold text-zinc-700">{(inputs.impurity > 1 ? -(inputs.impurity - 1) * 1.0 : 0).toFixed(2)}%</span> và tỉ điều chỉnh độ ẩm <span className="font-bold text-zinc-700">{calcSteps[1]?.result ?? '0%'}</span> cho ra tổng sai số khấu hao là <span className="font-bold text-zinc-900 text-xs">{(calcSteps[4]?.result ?? '0%')}</span> điều chỉnh trực tiếp vào đơn giá sàn chuẩn.
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
              <span>Tính Toán & Lưu Giao Dịch</span>
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
  );
}
