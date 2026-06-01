/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Plus, Minus, Save, Sparkles, HelpCircle, Receipt } from 'lucide-react';
import { CornInput, CalculationDetail, TransactionRecord } from '../types';
import { formatCurrency } from '../utils/exporter';

interface CornTabProps {
  onSaveRecord: (record: Omit<TransactionRecord, 'id' | 'timestamp' | 'dateKey'>) => void;
}

export default function CornTab({ onSaveRecord }: CornTabProps) {
  const [inputs, setInputs] = useState<CornInput>({
    weight: 5000,
    moisture: 14.0,
    grade: 'Loại 1',
    basePrice: 6500,
  });

  const [calcSteps, setCalcSteps] = useState<CalculationDetail[]>([]);
  const [finalPrice, setFinalPrice] = useState<number>(0);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [showTips, setShowTips] = useState<boolean>(true);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  useEffect(() => {
    const { weight, moisture, grade, basePrice } = inputs;

    // 1. Phân loại bắp (Grade bonus/penalty)
    let gradeBonusPercent = 0;
    let gradeNote = '';
    let gradeType: 'positive' | 'negative' | 'neutral' = 'neutral';

    if (grade === 'Loại 1') {
      gradeBonusPercent = 5.0;
      gradeNote = 'Bắp ngọt, hạt đều loại 1 tuyển chọn (+5% vào giá)';
      gradeType = 'positive';
    } else if (grade === 'Loại 2') {
      gradeBonusPercent = 0;
      gradeNote = 'Bắp chuẩn loại 2 trung bình (Không tăng giảm)';
      gradeType = 'neutral';
    } else {
      gradeBonusPercent = -15.0;
      gradeNote = 'Bắp loại 3 ướt sâu, vỡ hạt lớn (-15% vào giá)';
      gradeType = 'negative';
    }

    // 2. Chênh lệch độ ẩm (Chuẩn 14%)
    let moistureBonus = 0;
    let moistureNote = '';
    let moistureType: 'positive' | 'negative' | 'neutral' = 'neutral';

    if (moisture <= 14) {
      moistureBonus = (14 - moisture) * 0.3;
      if (moistureBonus > 1.5) moistureBonus = 1.5; // Giới hạn cộng tối đa 1.5%
      moistureNote = `Độ ẩm ${moisture}% khô hơn chuẩn (14%), được cộng: +${moistureBonus.toFixed(2)}%`;
      moistureType = moistureBonus > 0 ? 'positive' : 'neutral';
    } else {
      moistureBonus = -(moisture - 14) * 1.2; // Phạt nặng khi độ ẩm cao do bắp tươi dễ mốc
      moistureNote = `Độ ẩm ${moisture}% vượt chuẩn (14%), bị khấu trừ: ${moistureBonus.toFixed(2)}%`;
      moistureType = 'negative';
    }

    // 3. Tổng chênh lệch chất lượng
    const totalAdjPercent = gradeBonusPercent + moistureBonus;
    const adjNote = totalAdjPercent >= 0
      ? `Tổng chênh lệch tỉ lệ: +${totalAdjPercent.toFixed(2)}%`
      : `Tổng chênh lệch tỉ lệ: ${totalAdjPercent.toFixed(2)}%`;

    // 4. Giá cuối cùng
    const priceAdjustment = basePrice * (totalAdjPercent / 100);
    const calculatedPrice = basePrice + priceAdjustment;
    const calculatedTotal = weight * calculatedPrice;

    setFinalPrice(calculatedPrice);
    setTotalAmount(calculatedTotal);

    const steps: CalculationDetail[] = [
      {
        title: '1. Đơn giá bắp thu mua chuẩn',
        expression: `${formatCurrency(basePrice)} / Kg`,
        result: formatCurrency(basePrice),
        note: 'Giá thỏa thuận cho bắp khô ráo chuẩn loại 2.',
        type: 'info'
      },
      {
        title: '2. Cân đối phân hạng (Grade)',
        expression: gradeBonusPercent >= 0 ? `+${gradeBonusPercent}%` : `${gradeBonusPercent}%`,
        result: `${gradeBonusPercent >= 0 ? '+' : ''}${gradeBonusPercent.toFixed(1)}%`,
        note: gradeNote,
        type: gradeType
      },
      {
        title: '3. Khấu trừ ẩm vượt (Độ ẩm chuẩn 14%)',
        expression: moisture <= 14 ? `Min(1.5%, (14% - ${moisture}%) * 0.3)` : `-( ${moisture}% - 14%) * 1.2`,
        result: `${moistureBonus >= 0 ? '+' : ''}${moistureBonus.toFixed(2)}%`,
        note: moistureNote,
        type: moistureType
      },
      {
        title: '4. Khối lượng cân',
        expression: `${weight.toLocaleString('vi-VN')} kg`,
        result: `${weight.toLocaleString('vi-VN')} Kg`,
        note: 'Tổng rổ bắp tươi thu gom.',
        type: 'neutral'
      },
      {
        title: '5. Đơn giá thực tế thanh toán',
        expression: `Giá gốc * (1 + Tỷ lệ chênh lệch)`,
        result: `${formatCurrency(Math.round(calculatedPrice))} / Kg`,
        note: `Tính bằng: ${basePrice.toLocaleString('vi-VN')} đ * (${(1 + totalAdjPercent / 100).toFixed(4)})`,
        type: 'info'
      }
    ];

    setCalcSteps(steps);
    setIsSaved(false);
  }, [inputs]);

  const handlePercentStep = (field: 'weight' | 'moisture' | 'basePrice', step: number) => {
    setInputs((prev) => {
      const val = prev[field] + step;
      const clamped = Math.max(0, parseFloat(val.toFixed(2)));
      return { ...prev, [field]: clamped };
    });
  };

  const handleInputChange = (field: 'weight' | 'moisture', value: string) => {
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
    const mDiff = 14 - inputs.moisture;
    let moistureBonusPercent = 0;
    if (inputs.moisture <= 14) {
      moistureBonusPercent = Math.min(1.5, mDiff * 0.3);
    } else {
      moistureBonusPercent = -mDiff * -1.2;
    }

    const gradeBonusPercent = inputs.grade === 'Loại 1' ? 5.0 : inputs.grade === 'Loại 2' ? 0.0 : -15.0;

    onSaveRecord({
      productType: 'bắp',
      productName: `Bắp Tươi (${inputs.grade})`,
      weight: inputs.weight,
      moisture: inputs.moisture,
      basePrice: inputs.basePrice,
      finalPrice: finalPrice,
      totalAmount: totalAmount,
      details: {
        grade: inputs.grade,
        moistureBonusPercent: parseFloat(moistureBonusPercent.toFixed(2)),
        remBonusPercent: parseFloat(gradeBonusPercent.toFixed(2)),
        totalAdjustmentPercent: parseFloat((moistureBonusPercent + gradeBonusPercent).toFixed(2)),
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
            Nhập Dữ Liệu Bắp
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
          <div className="bg-[#FFF9E6] text-[#664D03] p-3.5 rounded-xl border border-amber-100 text-xs leading-relaxed space-y-1.5 shadow-xs">
            <div className="font-bold flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span>Quy chuẩn Bắp Tươi thu hoạch:</span>
            </div>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Phân cấp (Grade):</strong>
                <ul className="list-circle pl-2 mt-0.5 space-y-0.5">
                  <li><strong>Loại 1:</strong> Bắp ngọt quả to đều <strong>(+5.0% tiền)</strong></li>
                  <li><strong>Loại 2:</strong> Bắp trung bình tiêu chuẩn <strong>(Giá sàn)</strong></li>
                  <li><strong>Loại 3:</strong> Bắp hạt thưa, lép, hỏng sâu <strong>(-15.0% tiền)</strong></li>
                </ul>
              </li>
              <li><strong>Độ ẩm chuẩn bắp tươi:</strong> 14.0%. Khô hơn chuẩn được cộng <strong>+0.3%</strong> mỗi độ giảm, tối đa cộng +1.5%. Độ ẩm vượt 14.0% bị phạt giảm giá rất nhanh <strong>-1.2%</strong> cho mỗi 1% dư do bắp tươi dễ sinh nhiệt mốc ẩm.</li>
            </ul>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-zinc-150 p-5 space-y-4">
          {/* KHỐI LƯỢNG */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-[#F2F2F7]">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-zinc-800">Khối Lượng Bắp (Kg)</span>
              <span className="text-[11px] font-medium text-zinc-400">Trọng lượng hàng thực phẩm bắp</span>
            </div>
            <div className="flex items-center space-x-2 self-end sm:self-auto bg-[#F2F2F7] p-1.5 rounded-xl">
              <button
                type="button"
                onClick={() => handlePercentStep('weight', -200)}
                className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-zinc-700 font-bold active:scale-95 transition-transform shadow-xs"
              >
                <Minus className="w-3.5 h-3.5 text-[#007AFF]" />
              </button>
              <input
                id="input-corn-weight"
                type="number"
                value={inputs.weight || ''}
                onChange={(e) => handleInputChange('weight', e.target.value)}
                className="w-20 text-center bg-transparent text-sm font-bold text-[#007AFF] outline-hidden placeholder-zinc-300 focus:ring-0 border-none"
                placeholder="0"
              />
              <button
                type="button"
                onClick={() => handlePercentStep('weight', 200)}
                className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-zinc-700 font-bold active:scale-95 transition-transform shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-[#007AFF]" />
              </button>
            </div>
          </div>

          {/* PHÂN CẤP */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-[#F2F2F7]">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-zinc-800">Phân Loại Phẩm Cấp</span>
              <span className="text-[11px] font-medium text-zinc-400 font-sans">Chọn phẩm cấp bắp thực tế</span>
            </div>
            <div className="flex items-center space-x-1.5 p-1 bg-[#F2F2F7] rounded-xl self-end sm:self-auto">
              {(['Loại 1', 'Loại 2', 'Loại 3'] as const).map((gradeOpt) => {
                const isSel = inputs.grade === gradeOpt;
                return (
                  <button
                    key={gradeOpt}
                    type="button"
                    onClick={() => setInputs((prev) => ({ ...prev, grade: gradeOpt }))}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      isSel ? 'bg-white text-zinc-950 shadow-xs' : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    {gradeOpt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ĐỘ ẨM */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-[#F2F2F7]">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-zinc-800">Độ Ẩm Bắp (%)</span>
              <span className="text-[11px] font-medium text-zinc-400">Chuẩn thu gom bắp khô là 14.0%</span>
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
                id="input-corn-moisture"
                type="number"
                step="0.1"
                value={inputs.moisture || ''}
                onChange={(e) => handleInputChange('moisture', e.target.value)}
                className="w-16 text-center bg-transparent text-sm font-bold text-[#007AFF] outline-hidden focus:ring-0 border-none"
                placeholder="14.0"
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

          {/* ĐƠN GIÁ GỐC */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-zinc-800">Đơn Giá Sàn (Đồng/Kg)</span>
              <span className="text-[11px] font-medium text-zinc-400">Giá nông sản loại chuẩn</span>
            </div>
            <div className="flex items-center space-x-1.5 self-end sm:self-auto bg-[#F2F2F7] px-3.5 py-1.5 rounded-xl">
              <input
                id="input-corn-price"
                type="text"
                value={inputs.basePrice ? inputs.basePrice.toLocaleString('vi-VN') : ''}
                onChange={(e) => handleBasePriceChange(e.target.value)}
                className="w-28 text-right bg-transparent text-base font-extrabold text-[#007AFF] outline-hidden focus:ring-0 border-none"
                placeholder="6,500"
              />
              <span className="text-xs font-bold text-zinc-500">đ/kg</span>
            </div>
          </div>
        </div>
      </div>

      {/* CHỈ TIÊU KẾT QUẢ ĐỒNG HỒ TÍNH TOÁN */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-150/80 text-center space-y-1">
          <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Đơn Giá Thực Tế</span>
          <div className="text-lg sm:text-xl font-extrabold text-[#1C1C1E] tracking-tight">
            {formatCurrency(Math.round(finalPrice))}
          </div>
          <span className="text-[10px] text-zinc-400 block h-4 font-medium">Bắp đã qua quy chuẩn</span>
        </div>
        
        <div className="bg-[#E9F2FF] rounded-2xl p-4 shadow-sm border border-blue-105 text-center space-y-1">
          <span className="text-[11px] font-bold text-[#004EB5] uppercase tracking-wider">Thành Tiền Thực Lĩnh</span>
          <div className="text-lg sm:text-xl font-black text-[#007AFF] tracking-tight">
            {formatCurrency(Math.round(totalAmount))}
          </div>
          <span className="text-[10px] text-blue-500 font-semibold block h-4">
            Trọng lượng: {inputs.weight.toLocaleString('vi-VN')} kg
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
              <span>Chốt hóa đơn Bắp thực lĩnh</span>
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

          {/* LƯU TRỮ VÀO NHẬT KÝ */}
          <div className="pt-2">
            <button
              type="button"
              id="btn-save-corn"
              onClick={saveRecord}
              className="w-full bg-[#007AFF] text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-blue-200 mt-2 hover:bg-blue-600 focus:ring-2 focus:ring-[#007AFF] cursor-pointer transition-all active:scale-[0.98] duration-150 flex items-center justify-center space-x-2"
            >
              <Save className="w-5 h-5" />
              <span>Tính Toán & Lưu Giao Dịch</span>
            </button>

            {isSaved && (
              <div className="mt-3.5 bg-[#34C759] text-white rounded-xl p-3 text-center text-xs font-bold animate-pulse shadow-sm">
                ✓ Đã ghi nhận giao dịch Bắp thành công vào Nhật Ký hôm nay!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
