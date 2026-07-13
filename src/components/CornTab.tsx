/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FocusEvent } from 'react';
import { Plus, Minus, Save, Receipt, TrendingUp, DollarSign, ShieldCheck } from 'lucide-react';
import { CalculationDetail, TransactionRecord } from '../types';
import { formatCurrency } from '../utils/exporter';

interface CornTabProps {
  onSaveRecord: (record: Omit<TransactionRecord, 'id' | 'timestamp' | 'dateKey'>) => void;
}

export default function CornTab({ onSaveRecord }: CornTabProps) {
  const [inputs, setInputs] = useState(() => {
    const savedPrice = localStorage.getItem('corn_base_price');
    return {
      basePrice: savedPrice ? parseInt(savedPrice, 10) : 6500,
    };
  });

  // Hỗ trợ nhập liệu dạng chuỗi để gõ dấu phẩy/chấm thập phân không bị giật/mất số
  // Nạp lại giá trị đã nhập từ lần trước (localStorage) để không mất khi reset/tải lại web
  const [weightStr, setWeightStr] = useState<string>(() => localStorage.getItem('corn_weight') ?? '5000');
  const [moistureStr, setMoistureStr] = useState<string>(() => localStorage.getItem('corn_moisture') ?? '15.0');

  // Trạng thái Ước lượng lời
  const [showProfitCalc, setShowProfitCalc] = useState<boolean>(() => {
    const saved = localStorage.getItem('corn_show_profit_calc');
    return saved !== null ? saved === 'true' : true;
  });
  const [sellDryPrice, setSellDryPrice] = useState<number>(() => {
    const saved = localStorage.getItem('corn_sell_dry_price');
    return saved ? parseInt(saved, 10) : 8500;
  });
  const [targetDriedMoisture, setTargetDriedMoisture] = useState<number>(() => {
    const saved = localStorage.getItem('corn_target_dried_moisture');
    return saved ? parseFloat(saved) : 15.0;
  });
  const [processingCostVnd, setProcessingCostVnd] = useState<number>(() => {
    const saved = localStorage.getItem('corn_processing_cost_vnd');
    return saved ? parseInt(saved, 10) : 400; // Mặc định là 400đ/kg
  });

  // Lưu các cấu hình vào localStorage tự động
  useEffect(() => {
    if (inputs.basePrice > 0) {
      localStorage.setItem('corn_base_price', inputs.basePrice.toString());
    }
  }, [inputs.basePrice]);

  useEffect(() => {
    localStorage.setItem('corn_sell_dry_price', sellDryPrice.toString());
  }, [sellDryPrice]);

  useEffect(() => {
    localStorage.setItem('corn_target_dried_moisture', targetDriedMoisture.toString());
  }, [targetDriedMoisture]);

  useEffect(() => {
    localStorage.setItem('corn_processing_cost_vnd', processingCostVnd.toString());
  }, [processingCostVnd]);

  useEffect(() => {
    localStorage.setItem('corn_show_profit_calc', showProfitCalc.toString());
  }, [showProfitCalc]);

  // Tự động lưu các ô nhập (khối lượng, độ ẩm) để reset web vẫn còn dữ liệu đang nhập
  useEffect(() => {
    localStorage.setItem('corn_weight', weightStr);
    localStorage.setItem('corn_moisture', moistureStr);
  }, [weightStr, moistureStr]);

  const [calcSteps, setCalcSteps] = useState<CalculationDetail[]>([]);
  const [finalPrice, setFinalPrice] = useState<number>(0);
  const [percentagePrice, setPercentagePrice] = useState<number>(0);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  useEffect(() => {
    const weight = parseFloat(weightStr) || 0;
    const moisture = parseFloat(moistureStr) || 0;
    const { basePrice } = inputs;

    // 1. Tính toán giá theo công thức trừ % cũ (percentagePrice)
    let moistureBonusPercent = 0;
    if (moisture > 15) {
      moistureBonusPercent = -(moisture - 15) * 1.2; // Giảm giá khi độ ẩm cao hơn 15%
    }
    const calculatedPercentagePrice = Math.max(0, basePrice + (basePrice * (moistureBonusPercent / 100)));

    // 2. Tính toán giá theo công thức trừ lui tuyến tính mới (linearPrice)
    // Công thức: Giá mua = Giá sàn - ((Độ ẩm - Độ chuẩn) * Hệ số)
    // Trong đó: Độ chuẩn = 15.0%, Hệ số = Đơn giá sàn / 100 (tức 1% của đơn giá sàn cho mỗi 1% ẩm vượt chuẩn)
    const linearFactor = basePrice / 100;
    let calculatedLinearPrice = basePrice;
    if (moisture > 15) {
      calculatedLinearPrice = basePrice - ((moisture - 15) * linearFactor);
    }
    calculatedLinearPrice = Math.max(0, calculatedLinearPrice);

    // Thành thành tiền thực lĩnh tính theo Đơn giá thực trừ lui (linearPrice) làm giá trị chính
    const calculatedTotal = weight * calculatedLinearPrice;

    setPercentagePrice(calculatedPercentagePrice);
    setFinalPrice(calculatedLinearPrice); // finalPrice là đơn giá trừ lui
    setTotalAmount(calculatedTotal);

    const steps: CalculationDetail[] = [
      {
        title: '1. Đơn giá sàn thu mua chuẩn (15% độ ẩm)',
        expression: `${formatCurrency(basePrice)} / Kg`,
        result: formatCurrency(basePrice),
        note: 'Đơn giá sàn đã lưu cho bắp chuẩn 15% ẩm.',
        type: 'info'
      },
      {
        title: '2. Đơn giá thực trừ lui (Tuyến tính)',
        expression: moisture > 15 ? `Giá sàn - (Độ ẩm - 15) * (Giá sàn / 100)` : 'Giá sàn',
        result: `${formatCurrency(Math.round(calculatedLinearPrice))} / Kg`,
        note: moisture > 15 
          ? `Hệ số trừ = ${formatCurrency(linearFactor)}/1% ẩm. Khấu trừ: ${(moisture - 15).toFixed(1)}% ẩm * ${formatCurrency(linearFactor)} = -${formatCurrency((moisture - 15) * linearFactor)} đ`
          : `Độ ẩm ${moisture}% đạt hoặc dưới chuẩn (15.0%), không bị trừ lui tuyến tính.`,
        type: moisture > 15 ? 'negative' : 'neutral'
      },
      {
        title: '3. Đơn giá thực tế theo phần trăm (Tham khảo)',
        expression: moisture > 15 ? `Giá sàn * (1 - (Độ ẩm - 15) * 1.2%)` : 'Giá sàn',
        result: `${formatCurrency(Math.round(calculatedPercentagePrice))} / Kg`,
        note: moisture > 15 
          ? `Khấu trừ ${((moisture - 15) * 1.2).toFixed(2)}% đơn giá sàn.`
          : `Không khấu trừ.`,
        type: 'info'
      },
      {
        title: '4. Khối lượng bắp tươi thu mua',
        expression: `${weight.toLocaleString('vi-VN')} kg`,
        result: `${weight.toLocaleString('vi-VN')} Kg`,
        note: 'Tổng khối lượng bắp tươi thực tế bàn giao.',
        type: 'neutral'
      }
    ];

    setCalcSteps(steps);
    setIsSaved(false);
  }, [weightStr, moistureStr, inputs]);

  const handlePercentStep = (field: 'weight' | 'moisture', step: number) => {
    if (field === 'weight') {
      const current = parseFloat(weightStr) || 0;
      const next = Math.max(0, current + step);
      setWeightStr(next.toString());
    } else {
      const current = parseFloat(moistureStr) || 0;
      const next = Math.max(0, parseFloat((current + step).toFixed(2)));
      setMoistureStr(next.toString());
    }
  };

  const handleInputChange = (field: 'weight' | 'moisture', value: string) => {
    if (field === 'weight') {
      setWeightStr(value);
    } else {
      setMoistureStr(value);
    }
  };

  const handleBasePriceChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const num = cleaned === '' ? 0 : parseInt(cleaned, 10);
    setInputs((prev) => ({
      ...prev,
      basePrice: isNaN(num) ? 0 : num,
    }));
  };

  // Khi bấm vào ô nhập: tạm xoá trống để gõ số mới ngay, số cũ hiện mờ (placeholder).
  // Nếu rời ô mà không nhập gì thì tự khôi phục lại số cũ.
  const clearOnFocus = (setter: (v: string) => void, oldVal: string, fallback: string) => ({
    onFocus: (e: FocusEvent<HTMLInputElement>) => {
      e.currentTarget.dataset.prev = oldVal;
      e.currentTarget.placeholder = oldVal !== '' ? oldVal : fallback;
      setter('');
    },
    onBlur: (e: FocusEvent<HTMLInputElement>) => {
      if (e.currentTarget.value === '') setter(e.currentTarget.dataset.prev ?? '');
      e.currentTarget.placeholder = fallback;
    },
  });

  // Tương tự nhưng cho ô Đơn Giá Sàn (giá trị là số, hiển thị có định dạng).
  const clearPriceOnFocus = (fallback: string) => ({
    onFocus: (e: FocusEvent<HTMLInputElement>) => {
      e.currentTarget.dataset.prev = inputs.basePrice ? inputs.basePrice.toString() : '';
      e.currentTarget.placeholder = inputs.basePrice ? inputs.basePrice.toLocaleString('vi-VN') : fallback;
      handleBasePriceChange('');
    },
    onBlur: (e: FocusEvent<HTMLInputElement>) => {
      if (e.currentTarget.value === '') handleBasePriceChange(e.currentTarget.dataset.prev ?? '');
      e.currentTarget.placeholder = fallback;
    },
  });

  const saveRecord = () => {
    const weight = parseFloat(weightStr) || 0;
    const moisture = parseFloat(moistureStr) || 0;
    let moistureBonusPercent = 0;
    if (moisture > 15) {
      moistureBonusPercent = -(moisture - 15) * 1.2;
    }

    onSaveRecord({
      productType: 'bắp',
      productName: `Bắp Tươi`,
      weight: weight,
      moisture: moisture,
      basePrice: inputs.basePrice,
      finalPrice: finalPrice,
      totalAmount: totalAmount,
      details: {
        moistureBonusPercent: parseFloat(moistureBonusPercent.toFixed(2)),
        totalAdjustmentPercent: parseFloat(moistureBonusPercent.toFixed(2)),
        formulaSteps: calcSteps,
      },
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // Tính toán Ước lượng lời
  const weight = parseFloat(weightStr) || 0;
  const buyCost = weight * finalPrice; // Tiền mua bắp thực tế
  const processingCost = weight * processingCostVnd; // Chi phí sấy (điện nước nhân công) tính theo đ/kg tươi
  const totalCost = buyCost + processingCost; // Tổng vốn bỏ ra

  // Tính tỷ lệ hao hụt sấy khô (%) = Độ ẩm bắp nhập vào - Độ ẩm sấy tới (%)
  const moistureVal = parseFloat(moistureStr) || 0;
  const shrinkagePercent = Math.max(0, moistureVal - targetDriedMoisture);

  // Tính khối lượng bán thực tế (hao hụt giảm bớt khi sấy tới mức ẩm cao hơn)
  const actualSellWeight = weight * (1 - shrinkagePercent / 100);

  const estimatedRevenue = actualSellWeight * sellDryPrice; // Doanh thu dự tính
  const estimatedProfit = estimatedRevenue - totalCost; // Lợi nhuận ước tính

  return (
    <div className="animate-fade-in pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* CỘT TRÁI: FORM NHẬP SỐ LIỆU */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-lg text-[#007AFF] flex items-center gap-2">
              <span className="w-2 h-6 bg-[#007AFF] rounded-full"></span>
              Nhập Dữ Liệu Bắp
            </h3>
            <button 
              type="button"
              onClick={() => setShowProfitCalc(!showProfitCalc)}
              className="text-zinc-700 text-xs font-bold flex items-center space-x-1 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-zinc-250 shadow-xs active:scale-95 transition-transform"
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>{showProfitCalc ? 'Tắt Ước Lượng Lời' : 'Bật Ước Lượng Lời'}</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-zinc-150 p-5 space-y-4">
            {/* KHỐI LƯỢNG */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-[#F2F2F7]">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-zinc-800">Khối Lượng Bắp Tươi (Kg)</span>
                <span className="text-[11px] font-medium text-zinc-400">Trọng lượng bắp tươi thu mua thực tế</span>
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
                  value={weightStr}
                  onChange={(e) => handleInputChange('weight', e.target.value)}
                  {...clearOnFocus(setWeightStr, weightStr, '0')}
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

            {/* ĐỘ ẨM */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-[#F2F2F7]">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-zinc-800">Độ Ẩm Bắp (%)</span>
                <span className="text-[11px] font-medium text-zinc-400">Khấu trừ độ ẩm dựa trên mốc chuẩn 15.0%</span>
                <span className="text-[10px] font-bold text-[#007AFF] mt-1 bg-blue-50/70 px-1.5 py-0.5 rounded-md inline-block w-fit">
                  💡 Cân mẫu 140g, chọn mã 22
                </span>
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
                  value={moistureStr}
                  onChange={(e) => handleInputChange('moisture', e.target.value)}
                  {...clearOnFocus(setMoistureStr, moistureStr, '15.0')}
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

            {/* ĐƠN GIÁ GỐC */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-zinc-800">Đơn Giá Sàn (Đồng/Kg)</span>
                <span className="text-[11px] font-medium text-zinc-400">Giá nông sản loại chuẩn (độ ẩm 15%)</span>
              </div>
              <div className="flex items-center space-x-1.5 self-end sm:self-auto bg-[#F2F2F7] px-3.5 py-1.5 rounded-xl">
                <input
                  id="input-corn-price"
                  type="text"
                  inputMode="numeric"
                  value={inputs.basePrice ? inputs.basePrice.toLocaleString('vi-VN') : ''}
                  onChange={(e) => handleBasePriceChange(e.target.value)}
                  {...clearPriceOnFocus('6,500')}
                  className="w-28 text-right bg-transparent text-base font-extrabold text-[#007AFF] outline-hidden focus:ring-0 border-none"
                  placeholder="6,500"
                />
                <span className="text-xs font-bold text-zinc-500">đ/kg</span>
              </div>
            </div>
          </div>

          {/* CÁCH ĐO ĐỘ ẨM CHUẨN */}
          <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-4 space-y-2.5 text-xs">
            <span className="font-bold text-zinc-800 flex items-center gap-1.5">
              <span className="flex h-2 w-2 rounded-full bg-[#007AFF] animate-pulse"></span>
              Hướng Dẫn Đo Độ Ẩm Bắp Hạt (Máy Kett)
            </span>
            <div className="grid grid-cols-2 gap-2 font-semibold">
              <div className="bg-white p-2.5 rounded-xl border border-zinc-150 flex flex-col justify-between">
                <span className="text-[9px] text-zinc-400 font-bold block mb-1">BƯỚC 1: TRỌNG LƯỢNG MẪU</span>
                <span className="text-xs font-extrabold text-[#007AFF]">Cân đúng 140g</span>
                <span className="text-[9px] text-zinc-450 mt-0.5 font-normal">mẫu bắp hạt nguyên vẹn</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-zinc-150 flex flex-col justify-between">
                <span className="text-[9px] text-zinc-400 font-bold block mb-1">BƯỚC 2: MÃ THIẾT BỊ</span>
                <span className="text-xs font-extrabold text-emerald-600">Ấn chọn mã số 22</span>
                <span className="text-[9px] text-zinc-450 mt-0.5 font-normal">mã phân tích cho bắp</span>
              </div>
            </div>
            <p className="text-[10px] text-zinc-450 leading-relaxed text-center font-medium mt-1">
              Nhấn Measure, đợi máy phân tích xong rồi nhập giá trị % nhận được vào ô "Độ Ẩm Bắp (%)" ở trên.
            </p>
          </div>
        </div>

        {/* CỘT PHẢI: KẾT QUẢ VÀ CHI TIẾT */}
        <div className="lg:col-span-7 space-y-6">
          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-150/80 text-center space-y-1 relative group flex flex-col justify-between">
              <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider block">Đơn Giá Thực Trừ Lui</span>
              <div className="text-xl sm:text-2xl font-black text-rose-600 tracking-tight my-0.5">
                {formatCurrency(Math.round(finalPrice))}
              </div>
              <span className="text-[10px] text-zinc-500 block font-medium">
                Giá % thực tế: <span className="font-bold text-zinc-700">{formatCurrency(Math.round(percentagePrice))}</span>
              </span>
            </div>
            
            <div className="bg-[#E9F2FF] rounded-2xl p-4 shadow-sm border border-blue-100 text-center space-y-1 relative">
              <span className="text-[11px] font-bold text-[#004EB5] uppercase tracking-wider block">Thành Tiền Thực Lĩnh</span>
              <div className="text-lg sm:text-xl font-black text-[#007AFF] tracking-tight">
                {formatCurrency(Math.round(totalAmount))}
              </div>
              <span className="text-[10px] text-blue-500 font-semibold block h-4">
                Trọng lượng: {(parseFloat(weightStr) || 0).toLocaleString('vi-VN')} kg
              </span>

              {/* Nút Ước Lượng Lời (Chỉ icon biểu tượng) */}
              <button
                type="button"
                onClick={() => setShowProfitCalc(!showProfitCalc)}
                title="Ước lượng lời sấy bắp"
                className={`absolute top-2 right-2 p-1.5 rounded-lg transition-all active:scale-95 cursor-pointer ${
                  showProfitCalc 
                    ? 'bg-[#007AFF] text-white shadow-md shadow-blue-100' 
                    : 'bg-blue-50 text-[#007AFF] hover:bg-blue-100'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* PANEL ƯỚC LƯỢNG LỢI NHUẬN SẤY (ƯỚC LƯỢNG LỜI) */}
          {showProfitCalc && (
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 text-white rounded-2xl p-5 shadow-xl border border-zinc-800 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Ước Tính Lợi Nhuận</h4>
                    <span className="text-[10px] text-emerald-400 font-semibold">Công cụ tính sấy nhanh</span>
                  </div>
                </div>
                <div className="flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Ước lượng</span>
                </div>
              </div>

              {/* Hàng Input các thông số của chủ lò sấy */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-zinc-900/50 p-3.5 rounded-xl border border-zinc-800">
                {/* 1. GIÁ BÁN BẮP KHÔ */}
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400">Giá bán bắp khô (đ/kg)</label>
                  <div className="flex items-center bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 rounded-lg">
                    <input
                      type="text"
                      value={sellDryPrice ? sellDryPrice.toLocaleString('vi-VN') : ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setSellDryPrice(val === '' ? 0 : parseInt(val, 10));
                      }}
                      className="w-full bg-transparent border-none p-0 outline-hidden focus:ring-0 text-xs font-extrabold text-emerald-400 text-right"
                    />
                    <span className="text-[9px] text-zinc-500 ml-1 font-bold">đ</span>
                  </div>
                </div>

                {/* 2. ĐỘ ẨM SẤY TỚI */}
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400">Độ ẩm sấy tới (%)</label>
                  <div className="flex items-center bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 rounded-lg">
                    <input
                      type="number"
                      step="0.1"
                      value={targetDriedMoisture}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setTargetDriedMoisture(isNaN(val) ? 0 : val);
                      }}
                      className="w-full bg-transparent border-none p-0 outline-hidden focus:ring-0 text-xs font-extrabold text-amber-400 text-right"
                    />
                    <span className="text-[9px] text-zinc-500 ml-1 font-bold">%</span>
                  </div>
                </div>

                {/* 3. CHI PHÍ VẬN HÀNH SẤY */}
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400">Phí sấy (đ/kg bắp tươi)</label>
                  <div className="flex items-center bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 rounded-lg">
                    <input
                      type="text"
                      value={processingCostVnd ? processingCostVnd.toLocaleString('vi-VN') : ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setProcessingCostVnd(val === '' ? 0 : parseInt(val, 10));
                      }}
                      className="w-full bg-transparent border-none p-0 outline-hidden focus:ring-0 text-xs font-extrabold text-blue-400 text-right"
                    />
                    <span className="text-[9px] text-zinc-500 ml-1 font-bold">đ</span>
                  </div>
                </div>
              </div>

              {/* Khối kết quả phân tích sấy */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center bg-zinc-900/30 py-2 px-3 rounded-lg border border-zinc-800/40">
                  <span className="text-zinc-400 font-medium">Tiền mua bắp tươi (1):</span>
                  <span className="font-semibold text-zinc-200">{formatCurrency(Math.round(buyCost))}</span>
                </div>

                <div className="flex justify-between items-center bg-zinc-900/30 py-2 px-3 rounded-lg border border-zinc-800/40">
                  <span className="text-zinc-400 font-medium">Chi phí sấy (vận hành) (2):</span>
                  <div className="text-right">
                    <span className="font-semibold text-zinc-200 block">{formatCurrency(Math.round(processingCost))}</span>
                    <span className="text-[9px] text-zinc-500 font-medium block">Định mức: {formatCurrency(processingCostVnd)} / Kg bắp tươi</span>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-zinc-900/50 py-2.5 px-3 rounded-lg border border-zinc-800 font-bold">
                  <div>
                    <span className="text-zinc-300 block text-left">Tổng vốn đầu tư sấy:</span>
                    <span className="text-[9.5px] text-zinc-400 font-medium block text-left mt-0.5">Vốn thực tế: {formatCurrency(Math.round(finalPrice))} + {formatCurrency(processingCostVnd)} = <span className="text-amber-400 font-bold">{formatCurrency(Math.round(finalPrice + processingCostVnd))}</span> / kg tươi</span>
                  </div>
                  <span className="text-amber-400 font-extrabold">{formatCurrency(Math.round(totalCost))}</span>
                </div>

                <div className="flex justify-between items-start bg-zinc-900/30 py-2 px-3 rounded-lg border border-zinc-800/40">
                  <span className="text-zinc-400 font-medium mt-0.5">Khối lượng bán được:</span>
                  <div className="text-right">
                    <span className="font-black text-zinc-200 block">
                      {actualSellWeight.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} kg bắp khô
                    </span>
                    <span className="text-[9px] text-zinc-500 block">
                      Hao hụt sấy: {moistureStr}% (ẩm nhập) - {targetDriedMoisture}% (sấy tới) = {shrinkagePercent.toFixed(1)}%
                    </span>
                    {targetDriedMoisture < 15 && (
                      <span className="text-[9.5px] text-rose-400 font-bold block mt-0.5 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                        ⚠ Sấy quá khô: Độ ẩm sấy tới ({targetDriedMoisture}%) dưới mốc chuẩn 15%, làm tăng tỷ lệ hao hụt lên {shrinkagePercent.toFixed(1)}%
                      </span>
                    )}
                    {targetDriedMoisture > 15 && (
                      <span className="text-[9.5px] text-emerald-400 font-bold block mt-0.5 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        🛈 Sấy chưa tới: Độ ẩm sấy tới ({targetDriedMoisture}%) cao hơn mốc chuẩn 15%, giảm bớt hao hụt sấy còn {shrinkagePercent.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center bg-zinc-900/30 py-2 px-3 rounded-lg border border-zinc-800/40">
                  <span className="text-zinc-400 font-medium">Tổng doanh thu dự tính:</span>
                  <span className="font-semibold text-emerald-400">{formatCurrency(Math.round(estimatedRevenue))}</span>
                </div>

                <div className="border-t border-dashed border-zinc-800 my-1 pt-2"></div>

                <div className="flex justify-between items-center bg-emerald-500/10 p-3.5 rounded-xl border border-emerald-500/25">
                  <span className="text-sm font-black text-emerald-400 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" />
                    Lợi Nhuận Dự Tính:
                  </span>
                  <span className={`text-base sm:text-lg font-black tracking-tight ${estimatedProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {estimatedProfit >= 0 ? '+' : ''}{formatCurrency(Math.round(estimatedProfit))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* CHI TIẾT QUÁ TRÌNH PHÂN TÍCH */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-xs font-bold uppercase text-[#8E8E93] tracking-wider">KẾT QUẢ TÍNH CHI TIẾT</h4>
              <span className="text-[10px] font-bold text-emerald-650 bg-emerald-50 px-2 py-0.5 rounded-full">Bắp Tươi Sấy</span>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-zinc-150 p-5 space-y-4">
              <div className="border-b border-[#F2F2F7] pb-3 flex items-center justify-between">
                <span className="text-sm font-bold text-[#1C1C1E] flex items-center space-x-1.5">
                  <Receipt className="w-4 h-4 text-zinc-600" />
                  <span>Hóa đơn thu mua bắp</span>
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
      </div>
    </div>
  );
}
