/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  FileText, Trash2, Search, Calendar, ChevronRight, ChevronDown, 
  ChevronUp, Filter, AlertTriangle, Check, Edit3, X, Save, RotateCcw, Plus, Minus, ShieldAlert
} from 'lucide-react';
import { TransactionRecord, TradingStats } from '../types';
import { formatCurrency, formatDateTime, exportToCSV } from '../utils/exporter';
import { getCoffeeMoistureDeduction } from './CoffeeTab';

interface HistoryTabProps {
  records: TransactionRecord[];
  onClearRecords: () => void;
  onDeleteRecord: (id: string) => void;
  onUpdateRecord: (record: TransactionRecord) => void;
}

// Hàm bổ trợ tính bonus độ ẩm hạt tiêu
const getMoistureBonusPepper = (moisture: number) => {
  if (moisture <= 15) {
    const effectiveMoisture = Math.max(12.5, moisture);
    return 15 - effectiveMoisture;
  } else {
    return -(moisture - 15) * 0.5;
  }
};

export default function HistoryTab({ 
  records, 
  onClearRecords, 
  onDeleteRecord, 
  onUpdateRecord 
}: HistoryTabProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState<boolean>(false);
  const [successExport, setSuccessExport] = useState<boolean>(false);

  // States hỗ trợ chỉnh sửa (Edit) tham số của mẻ hàng
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState<number>(0);
  const [editMoisture, setEditMoisture] = useState<number>(0);
  const [editBasePrice, setEditBasePrice] = useState<number>(0);
  const [editRem, setEditRem] = useState<number>(5.0);
  const [editImpurity, setEditImpurity] = useState<number>(1.0);
  const [editGrade, setEditGrade] = useState<'Loại 1' | 'Loại 2' | 'Loại 3'>('Loại 2');

  const startEditing = (rec: TransactionRecord) => {
    setEditingRecordId(rec.id);
    setEditWeight(rec.weight);
    setEditMoisture(rec.moisture);
    setEditBasePrice(rec.basePrice);
    setEditRem(rec.details?.rem ?? 5.0);
    setEditImpurity(rec.details?.impurity ?? 1.0);
    setEditGrade((rec.details?.grade as any) ?? 'Loại 2');
  };

  const cancelEditing = () => {
    setEditingRecordId(null);
  };

  const executeUpdate = (rec: TransactionRecord) => {
    let finalPrice = rec.finalPrice;
    let finalWeight = editWeight;
    let totalAmount = rec.totalAmount;
    let formulaSteps = rec.details.formulaSteps;
    let details = { ...rec.details };

    if (rec.productType === 'tiêu') {
      const moistureBonus = getMoistureBonusPepper(editMoisture);
      const remBonus = (editRem - 5) * 10;
      const totalAdjPercent = remBonus + moistureBonus;
      const priceAdjustment = editBasePrice * (totalAdjPercent / 100);
      finalPrice = editBasePrice + priceAdjustment;
      finalWeight = editWeight;
      totalAmount = finalWeight * finalPrice;

      const fieldMoistureNote = editMoisture <= 15 
        ? (editMoisture < 12.5 
            ? `Ẩm ${editMoisture}% thấp hơn mốc 12.5%, đạt điểm thưởng tối đa: +${moistureBonus.toFixed(2)}%` 
            : `Ẩm ${editMoisture}% thấp hơn chuẩn (15%), được cộng tỉ lệ (giảm 0.5% ẩm được +0.5%): +${moistureBonus.toFixed(2)}%`)
        : `Ẩm ${editMoisture}% lớn hơn chuẩn (15%), bị trừ (0.5% mỗi 1% dư): ${moistureBonus.toFixed(2)}%`;

      const fieldRemNote = remBonus >= 0 
        ? `Rem thực tế (${editRem}) cao hơn mốc 5, hiệu số ${(editRem - 5).toFixed(1)} được cộng: +${remBonus.toFixed(2)}%`
        : `Rem thực tế (${editRem}) thấp hơn mốc 5, hiệu số ${(editRem - 5).toFixed(1)} bị trừ: ${remBonus.toFixed(2)}%`;

      formulaSteps = [
        { title: '1. Giá thành nguyên giá', expression: `${Math.round(editBasePrice).toLocaleString('vi-VN')} đ / Kg`, result: Math.round(editBasePrice).toLocaleString('vi-VN') + ' đ', note: 'Giá gốc nông sản gốc ban đầu.', type: 'info' },
        { title: '2. Tỷ lệ điều chỉnh độ ẩm (Độ)', expression: editMoisture <= 15 ? `Min(2.50%, 15% - Max(12.5%, ${editMoisture}%))` : `-( ${editMoisture}% - 15% ) * 0.5`, result: `${moistureBonus >= 0 ? '+' : ''}${moistureBonus.toFixed(2)}%`, note: fieldMoistureNote, type: moistureBonus >= 0 ? 'positive' : 'negative' },
        { title: '3. Tỷ lệ điều chỉnh chất lượng (Rem)', expression: `(${editRem} - 5) * 10`, result: `${remBonus >= 0 ? '+' : ''}${remBonus.toFixed(2)}%`, note: fieldRemNote, type: remBonus >= 0 ? 'positive' : 'negative' },
        { title: '4. Đơn giá cuối cùng', expression: 'Giá chốt', result: `${Math.round(finalPrice).toLocaleString('vi-VN')} đ / Kg`, type: 'info' },
        { title: '5. Khối lượng cân', expression: `${editWeight.toLocaleString('vi-VN')} kg`, result: `${editWeight.toLocaleString('vi-VN')} Kg`, note: 'Tổng khối lượng cân thực.', type: 'neutral' }
      ];

      details = {
        ...details,
        rem: editRem,
        moistureBonusPercent: parseFloat(moistureBonus.toFixed(2)),
        totalAdjustmentPercent: parseFloat(totalAdjPercent.toFixed(2)),
        formulaSteps
      };
    } else if (rec.productType === 'cà phê') {
      let mqBonusPercent = 0;
      let mqDeductionPercent = 0;
      let mqNote = '';
      let mqType: 'positive' | 'negative' | 'neutral' = 'neutral';

      if (editMoisture <= 15) {
        mqBonusPercent = 0;
        mqNote = `Độ ẩm ${editMoisture}% đạt chuẩn (<= 15%), không tăng giảm đơn giá`;
        mqType = 'neutral';
      } else {
        mqDeductionPercent = getCoffeeMoistureDeduction(editMoisture);
        mqNote = `Độ ẩm ${editMoisture}% vượt chuẩn (> 15%), trừ trọng lượng theo biểu mẫu: -${mqDeductionPercent.toFixed(2)}%`;
        mqType = 'negative';
      }

      let impDeductionPercent = 0;
      if (editImpurity > 1.0) {
        impDeductionPercent = (editImpurity - 1.0) * 1.0;
      }
      const impNote = impDeductionPercent > 0
        ? `Tạp chất ${editImpurity}% vượt chuẩn (1%), khấu trừ trọng lượng mẻ: -${impDeductionPercent.toFixed(2)}%`
        : `Tạp chất ${editImpurity}% trong ngưỡng chuẩn (<= 1%), không trừ trọng lượng`;
      const impType: 'positive' | 'negative' | 'neutral' = impDeductionPercent > 0 ? 'negative' : 'neutral';

      finalPrice = editBasePrice * (1 + mqBonusPercent / 100);
      const totalDeductionPercent = mqDeductionPercent + impDeductionPercent;
      finalWeight = editWeight * (1 - totalDeductionPercent / 100);
      totalAmount = finalPrice * finalWeight;

      formulaSteps = [
        { title: 'Bước 1: Đơn giá sàn đầu vào (Khảo sát)', expression: `${Math.round(editBasePrice).toLocaleString('vi-VN')} đ / Kg`, result: Math.round(editBasePrice).toLocaleString('vi-VN') + ' đ', note: 'Giá gốc nông sản thỏa thuận cơ sở cho Robusta chuẩn.', type: 'info' },
        { title: 'Bước 2: Khối lượng mẻ thu mua gốc', expression: `${editWeight.toLocaleString('vi-VN')} kg`, result: `${editWeight.toLocaleString('vi-VN')} Kg`, note: 'Trọng lượng cân chưa tính toán hao hụt chất lượng.', type: 'neutral' },
        { title: 'Bước 3: Hạch toán chênh lệch độ ẩm (Chuẩn 15%)', expression: editMoisture <= 15 ? `Không tính (0%)` : `Tra bảng trừ trọng lượng mẻ`, result: editMoisture <= 15 ? `0%` : `-${mqDeductionPercent.toFixed(2)}% trọng lượng`, note: mqNote, type: mqType },
        { title: 'Bước 4: Hạch toán khấu trừ tạp chất (Chuẩn 1.0%)', expression: editImpurity > 1 ? `-(${editImpurity}% - 1%) * 1.0` : `Không phạt`, result: editImpurity > 1 ? `-${impDeductionPercent.toFixed(2)}% trọng lượng` : '0%', note: impNote, type: impType },
        { title: 'Bước 5: Thống kê Giá Cuối Cùng (Thanh toán)', expression: `Giá Sàn`, result: `${formatCurrency(Math.round(finalPrice))} / Kg`, note: 'Đơn giá sàn không thay đổi do không áp dụng thưởng ẩm lẻ.', type: 'info' },
        { title: 'Bước 6: Số lượng cuối sau trừ hao hụt', expression: `Sản lượng * (1 - Tổng tỉ lệ khấu trừ)`, result: `${Math.round(finalWeight).toLocaleString('vi-VN')} Kg`, note: totalDeductionPercent > 0 ? `Đã khấu trừ ${totalDeductionPercent.toFixed(2)}% trọng lượng do ẩm vượt hoặc tạp chất bẩn.` : 'Giữ nguyên khối lượng do đạt chuẩn.', type: totalDeductionPercent > 0 ? 'negative' : 'positive' },
        { title: 'Bước 7: Tổng tiền chi trả thực tế', expression: `Giá Cuối * Số Lượng Cuối`, result: formatCurrency(Math.round(totalAmount)), note: 'Doanh thu chung phải thanh toán cuối cùng mẻ giao dịch.', type: 'positive' }
      ];

      details = {
        ...details,
        impurity: editImpurity,
        moistureBonusPercent: 0,
        totalAdjustmentPercent: parseFloat((- (editMoisture > 15 ? getCoffeeMoistureDeduction(editMoisture) : 0) - (editImpurity > 1 ? (editImpurity - 1) : 0)).toFixed(2)),
        formulaSteps
      };
      // Xóa blackBroken thừa thẹo nếu có trong lịch sử cũ
      delete details.blackBroken;
    } else if (rec.productType === 'bắp') {
      let gradeBonusPercent = 0;
      let gradeNote = '';
      let gradeType: 'positive' | 'negative' | 'neutral' = 'neutral';
      if (editGrade === 'Loại 1') {
        gradeBonusPercent = 5.0;
        gradeNote = 'Bắp ngọt, hạt đều loại 1 tuyển chọn (+5% vào giá)';
        gradeType = 'positive';
      } else if (editGrade === 'Loại 2') {
        gradeBonusPercent = 0;
        gradeNote = 'Bắp chuẩn loại 2 trung bình (Không tăng giảm)';
        gradeType = 'neutral';
      } else {
        gradeBonusPercent = -15.0;
        gradeNote = 'Bắp loại 3 ướt sâu, vỡ hạt lớn (-15% vào giá)';
        gradeType = 'negative';
      }

      let moistureBonus = 0;
      let moistureNote = '';
      let moistureType: 'positive' | 'negative' | 'neutral' = 'neutral';
      if (editMoisture <= 14) {
        moistureBonus = (14 - editMoisture) * 0.3;
        if (moistureBonus > 1.5) moistureBonus = 1.5;
        moistureNote = `Độ ẩm ${editMoisture}% khô hơn chuẩn (14%), được cộng: +${moistureBonus.toFixed(2)}%`;
        moistureType = moistureBonus > 0 ? 'positive' : 'neutral';
      } else {
        moistureBonus = -(editMoisture - 14) * 1.2;
        moistureNote = `Độ ẩm ${editMoisture}% vượt chuẩn (14%), bị khấu trừ: ${moistureBonus.toFixed(2)}%`;
        moistureType = 'negative';
      }

      const totalAdjPercent = gradeBonusPercent + moistureBonus;
      const priceAdjustment = editBasePrice * (totalAdjPercent / 100);
      finalPrice = editBasePrice + priceAdjustment;
      finalWeight = editWeight;
      totalAmount = finalWeight * finalPrice;

      formulaSteps = [
        { title: '1. Đơn giá bắp thu mua chuẩn', expression: `${Math.round(editBasePrice).toLocaleString('vi-VN')} đ / Kg`, result: Math.round(editBasePrice).toLocaleString('vi-VN') + ' đ', note: 'Giá thỏa thuận cho bắp khô ráo chuẩn loại 2.', type: 'info' as const },
        { title: '2. Cân đối phân hạng (Grade)', expression: gradeBonusPercent >= 0 ? `+${gradeBonusPercent}%` : `${gradeBonusPercent}%`, result: `${gradeBonusPercent >= 0 ? '+' : ''}${gradeBonusPercent.toFixed(1)}%`, note: gradeNote, type: gradeType },
        { title: '3. Khấu trừ ẩm vượt (Độ ẩm chuẩn 14%)', expression: editMoisture <= 14 ? `Min(1.5%, (14% - ${editMoisture}%) * 0.3)` : `-( ${editMoisture}% - 14%) * 1.2`, result: `${moistureBonus >= 0 ? '+' : ''}${moistureBonus.toFixed(2)}%`, note: moistureNote, type: moistureType },
        { title: '4. Khối lượng cân', expression: `${editWeight.toLocaleString('vi-VN')} kg`, result: `${editWeight.toLocaleString('vi-VN')} Kg`, note: 'Tổng rổ bắp tươi thu gom.', type: 'neutral' as const },
        { title: '5. Đơn giá thực tế thanh toán', expression: `Giá gốc * (1 + Tỷ lệ chênh lệch)`, result: `${Math.round(finalPrice).toLocaleString('vi-VN')} đ / Kg`, note: `Tính bằng: ${editBasePrice.toLocaleString('vi-VN')} đ * (${(1 + totalAdjPercent / 100).toFixed(4)})`, type: 'info' as const }
      ];

      details = {
        ...details,
        grade: editGrade,
        moistureBonusPercent: parseFloat(moistureBonus.toFixed(2)),
        totalAdjustmentPercent: parseFloat(totalAdjPercent.toFixed(2)),
        formulaSteps
      };
    }

    const updatedRecord: TransactionRecord = {
      ...rec,
      weight: editWeight,
      moisture: editMoisture,
      basePrice: editBasePrice,
      finalPrice,
      totalAmount,
      details
    };

    onUpdateRecord(updatedRecord);
    setEditingRecordId(null);
  };

  // Tính toán tóm tắt thông số thống kê
  const calculateStats = (filtered: TransactionRecord[]): TradingStats => {
    if (filtered.length === 0) {
      return { totalWeight: 0, totalAmount: 0, recordCount: 0, avgPrice: 0 };
    }
    const totalWeight = filtered.reduce((sum, r) => sum + r.weight, 0);
    const totalAmount = filtered.reduce((sum, r) => sum + r.totalAmount, 0);
    const recordCount = filtered.length;
    const avgPrice = totalWeight > 0 ? totalAmount / totalWeight : 0;

    return { totalWeight, totalAmount, recordCount, avgPrice };
  };

  // Tìm kiếm và lọc danh sách
  const filteredRecords = records.filter((rec) => {
    const matchesSearch = 
      rec.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.weight.toString().includes(searchTerm) ||
      rec.totalAmount.toString().includes(searchTerm);
    
    const matchesType = selectedType === 'all' || rec.productType === selectedType;

    return matchesSearch && matchesType;
  });

  const stats = calculateStats(filteredRecords);

  const toggleExpand = (id: string) => {
    if (editingRecordId !== id) {
      setExpandedRecordId(expandedRecordId === id ? null : id);
    }
  };

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;
    exportToCSV(filteredRecords);
    setSuccessExport(true);
    setTimeout(() => {
      setSuccessExport(false);
    }, 3500);
  };

  const triggerClearAll = () => {
    onClearRecords();
    setShowConfirmClear(false);
  };

  return (
    <div className="animate-fade-in pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        
        {/* CỘT TRÁI: KIỂM SOÁT & THỐNG KÊ */}
        <div className="lg:col-span-5 space-y-5">
          {/* KHỐI STATS BAO CÁO SẢN LƯỢNG */}
          <div className="space-y-3">
            <h2 className="text-[#3C3C43] text-xs font-bold uppercase tracking-wider px-1">Báo Cáo Sản Lượng Hôm Nay</h2>
            
            <div className="bg-white rounded-2xl p-4 shadow-xs border border-zinc-100">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-0.5 border-r border-zinc-100">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">Tổng Sản Lượng (Kg)</span>
                  <span className="text-xl font-black text-zinc-900 tracking-tight">
                    {stats.totalWeight.toLocaleString('vi-VN')}
                  </span>
                  <span className="text-[10px] text-zinc-400 block">Kg nông sản khô nhập</span>
                </div>

                <div className="space-y-0.5 pl-2">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">Doanh Số Chi Trả</span>
                  <span className="text-xl font-black text-emerald-600 tracking-tight">
                    {formatCurrency(Math.round(stats.totalAmount))}
                  </span>
                  <span className="text-[10px] text-zinc-400 block">{stats.recordCount} mẻ giao dịch</span>
                </div>
              </div>

              <div className="border-t border-zinc-50 mt-3 pt-3 flex justify-between items-center text-xs">
                <span className="font-semibold text-zinc-500">Đơn giá thu mua bình quân:</span>
                <span className="font-bold text-zinc-950 px-2 py-0.5 bg-zinc-100 rounded-sm">
                  {formatCurrency(Math.round(stats.avgPrice))} / kg
                </span>
              </div>
            </div>
          </div>

          {/* CHỨC NĂNG TÌM KIẾM & LỌC */}
          <div className="bg-white rounded-2xl p-3.5 shadow-xs border border-zinc-100 space-y-3">
            <div className="relative flex items-center bg-[#E4E4EC] rounded-xl px-2.5 py-1.5 text-zinc-500">
              <Search className="w-4 h-4 text-zinc-400 mr-2" />
              <input
                id="search-history"
                type="text"
                placeholder="Tìm theo sản phẩm, lượng, số tiền..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent outline-hidden text-sm text-zinc-900 placeholder-zinc-400 focus:ring-0"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-xs bg-zinc-400 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold active:scale-90"
                >
                  ×
                </button>
              )}
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-xs text-zinc-400 font-semibold mr-1 flex items-center shrink-0">
                <Filter className="w-3 h-3 mr-0.5" /> Lọc:
              </span>
              {[
                { tag: 'all', label: 'Tất cả' },
                { tag: 'tiêu', label: 'Hạt Tiêu' },
                { tag: 'cà phê', label: 'Cà Phê' },
                { tag: 'bắp', label: 'Bắp Tươi' },
              ].map((item) => {
                const isSel = selectedType === item.tag;
                return (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => setSelectedType(item.tag)}
                    className={`px-3 py-1 text-xs font-semibold rounded-full transition-transform cursor-pointer shrink-0 ${
                      isSel
                        ? 'bg-[#007AFF] text-white shadow-xs'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: CHI TIẾT NHẬT KÝ CHI TRẢ VỚI BỘ EDIT GIÁ TRỊ SAI LỆCH */}
        <div className="lg:col-span-7 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[#3C3C43] text-xs font-bold uppercase tracking-wider">Danh Sách Giao Dịch ({filteredRecords.length})</h2>
              
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  id="btn-export-csv"
                  onClick={handleExportCSV}
                  disabled={filteredRecords.length === 0}
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg flex items-center space-x-1 border cursor-pointer active:scale-95 transition-transform ${
                    filteredRecords.length > 0 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                      : 'bg-zinc-50 text-zinc-400 border-zinc-200 cursor-not-allowed'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Xuất CSV</span>
                </button>

                <button
                  type="button"
                  id="btn-trigger-clear-all"
                  onClick={() => setShowConfirmClear(true)}
                  disabled={records.length === 0}
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg flex items-center space-x-1 border cursor-pointer active:scale-95 transition-transform ${
                    records.length > 0
                      ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                      : 'bg-zinc-50 text-zinc-400 border-zinc-200 cursor-not-allowed'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa hết</span>
                </button>
              </div>
            </div>

            {successExport && (
              <div className="bg-emerald-600 text-white rounded-xl p-3 text-center text-xs font-bold flex items-center justify-center space-x-2 shadow shadow-emerald-700/20">
                <Check className="w-4 h-4 animate-ping" />
                <span>Đã tạo file CSV thành công! Bạn có thể tải lên Google Drive.</span>
              </div>
            )}

            {/* Render Danh Sách Hoá Đơn */}
            {filteredRecords.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-zinc-100 text-center space-y-2">
                <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center mx-auto text-zinc-300">
                  <Calendar className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-zinc-800">Không tìm thấy dữ liệu giao dịch</p>
                <p className="text-xs text-zinc-400">Vui lòng chọn thẻ nông sản phía trên, tính toán lại và ấn nút Lưu</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xs border border-zinc-100 overflow-hidden divide-y divide-zinc-100">
                {filteredRecords.map((rec) => {
                  const isExpanded = expandedRecordId === rec.id;
                  const isEditing = editingRecordId === rec.id;
                  
                  return (
                    <div key={rec.id} className="p-3.5 hover:bg-zinc-50/50 transition-colors">
                      
                      {/* Tiêu đề tóm tắt dòng */}
                      <div 
                        onClick={() => toggleExpand(rec.id)}
                        className="flex items-center justify-between cursor-pointer select-none"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                            rec.productType === 'tiêu' ? 'bg-orange-100 text-orange-850' :
                            rec.productType === 'cà phê' ? 'bg-amber-900 text-amber-50' : 'bg-yellow-100 text-yellow-850'
                          }`}>
                            {rec.productName.substring(0, 2).toUpperCase()}
                          </div>
                          
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                              {rec.productName}
                              <span className="text-[9px] font-black text-zinc-400 bg-zinc-100 px-1 py-0.5 rounded">
                                {rec.id}
                              </span>
                            </span>
                            <span className="text-[10px] text-zinc-400 flex items-center">
                              <Calendar className="w-3 h-3 mr-0.5" />
                              {formatDateTime(rec.timestamp)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2.5 text-right">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-emerald-600">{formatCurrency(rec.totalAmount)}</span>
                            <span className="text-[11px] text-zinc-500 font-bold">
                              {rec.weight.toLocaleString('vi-VN')} kg @ {formatCurrency(Math.round(rec.finalPrice))}/kg
                            </span>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-zinc-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-zinc-400" />
                          )}
                        </div>
                      </div>

                      {/* CHI TIẾT TÍNH TOÁN HOẶC PANEL CHỈNH SỬA THÔNG SỐ SAI LỆCH */}
                      {isExpanded && (
                        <div className="mt-4 pt-3.5 border-t border-zinc-100 space-y-3 bg-[#F9F9FB] rounded-xl p-3.5 text-xs leading-relaxed animate-fade-in">
                          
                          {isEditing ? (
                            /* PANEL CHỈNH SỬA THAM SỐ GIAO DỊCH (EDITING MODE) */
                            <div className="space-y-4 animate-fade-in">
                              <div className="flex justify-between items-center text-xs font-black text-[#007AFF] border-b border-[#007AFF]/20 pb-2">
                                <span className="flex items-center gap-1">
                                  <Edit3 className="w-4 h-4 text-[#007AFF]" />
                                  Chỉnh sửa thông số mẻ {rec.id}
                                </span>
                                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-50">
                                  {rec.productType}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                
                                {/* 1. NHẬP LẠI SỐ KG (KHỐI LƯỢNG CÂN THÔ CODED) */}
                                <div className="space-y-1 bg-white p-2.5 rounded-lg border border-zinc-200">
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                                    📦 Khối lượng cân (Kg)
                                  </label>
                                  <div className="flex items-center justify-between">
                                    <button
                                      type="button"
                                      onClick={() => setEditWeight(prev => Math.max(1, prev - 100))}
                                      className="p-1 rounded bg-zinc-100 active:scale-90"
                                    >
                                      <Minus className="w-3.5 h-3.5 text-[#007AFF]" />
                                    </button>
                                    <input
                                      type="number"
                                      value={editWeight || ''}
                                      onChange={(e) => setEditWeight(parseFloat(e.target.value) || 0)}
                                      className="w-20 text-center font-bold text-zinc-900 border-none outline-hidden p-0 focus:ring-0 bg-transparent text-sm"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setEditWeight(prev => prev + 100)}
                                      className="p-1 rounded bg-zinc-100 active:scale-90"
                                    >
                                      <Plus className="w-3.5 h-3.5 text-[#007AFF]" />
                                    </button>
                                  </div>
                                </div>

                                {/* 2. NHẬP LẠI GIÁ ĐẦU VÀO / GIÁ SÀN THỎA THUẬN */}
                                <div className="space-y-1 bg-white p-2.5 rounded-lg border border-zinc-200">
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                                    💰 Đơn giá sàn gốc (đ/Kg)
                                  </label>
                                  <div className="flex items-center justify-between">
                                    <button
                                      type="button"
                                      onClick={() => setEditBasePrice(prev => Math.max(0, prev - 500))}
                                      className="p-1 rounded bg-zinc-100 active:scale-90"
                                    >
                                      <Minus className="w-3.5 h-3.5 text-[#007AFF]" />
                                    </button>
                                    <input
                                      type="number"
                                      value={editBasePrice || ''}
                                      onChange={(e) => setEditBasePrice(parseInt(e.target.value) || 0)}
                                      className="w-20 text-center font-bold text-zinc-903 border-none outline-hidden p-0 focus:ring-0 bg-transparent text-sm"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setEditBasePrice(prev => prev + 500)}
                                      className="p-1 rounded bg-zinc-100 active:scale-90"
                                    >
                                      <Plus className="w-3.5 h-3.5 text-[#007AFF]" />
                                    </button>
                                  </div>
                                </div>

                                {/* 3. NHẬP LẠI ĐỘ ẨM (% THƯỢNG PHẠT) */}
                                <div className="space-y-1 bg-white p-2.5 rounded-lg border border-zinc-200">
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                                    💧 Độ Ẩm đo được (%)
                                  </label>
                                  <div className="flex items-center justify-between">
                                    <button
                                      type="button"
                                      onClick={() => setEditMoisture(prev => Math.max(0, parseFloat((prev - 0.1).toFixed(2))))}
                                      className="p-1 rounded bg-zinc-100 active:scale-90"
                                    >
                                      <Minus className="w-3.5 h-3.5 text-[#007AFF]" />
                                    </button>
                                    <input
                                      type="number"
                                      step="0.1"
                                      value={editMoisture || ''}
                                      onChange={(e) => setEditMoisture(parseFloat(e.target.value) || 0)}
                                      className="w-16 text-center font-bold text-zinc-900 border-none outline-hidden p-0 focus:ring-0 bg-transparent text-sm"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setEditMoisture(prev => parseFloat((prev + 0.1).toFixed(2)))}
                                      className="p-1 rounded bg-zinc-100 active:scale-90"
                                    >
                                      <Plus className="w-3.5 h-3.5 text-[#007AFF]" />
                                    </button>
                                  </div>
                                </div>

                                {/* CONDITIONAL 4: CẬN REM CHO TIÊU, TẠP CHẤT CHO CÀ PHÊ HOẶC PHÂN HẠNG CHO BẮP */}
                                {rec.productType === 'tiêu' && (
                                  <div className="space-y-1 bg-white p-2.5 rounded-lg border border-zinc-200">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                                      🌿 Chỉ số chất lượng (Cận Rem)
                                    </label>
                                    <div className="flex items-center justify-between">
                                      <button
                                        type="button"
                                        onClick={() => setEditRem(prev => Math.max(0, parseFloat((prev - 0.1).toFixed(2))))}
                                        className="p-1 rounded bg-zinc-100 active:scale-90"
                                      >
                                        <Minus className="w-3.5 h-3.5 text-[#007AFF]" />
                                      </button>
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={editRem || ''}
                                        onChange={(e) => setEditRem(parseFloat(e.target.value) || 0)}
                                        className="w-16 text-center font-bold text-zinc-900 border-none outline-hidden p-0 focus:ring-0 bg-transparent text-sm"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setEditRem(prev => parseFloat((prev + 0.1).toFixed(2)))}
                                        className="p-1 rounded bg-zinc-100 active:scale-90"
                                      >
                                        <Plus className="w-3.5 h-3.5 text-[#007AFF]" />
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {rec.productType === 'cà phê' && (
                                  <div className="space-y-1 bg-white p-2.5 rounded-lg border border-zinc-200">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                                      🪵 Tỷ lệ tạp chất (%)
                                    </label>
                                    <div className="flex items-center justify-between">
                                      <button
                                        type="button"
                                        onClick={() => setEditImpurity(prev => Math.max(0, parseFloat((prev - 0.1).toFixed(2))))}
                                        className="p-1 rounded bg-zinc-100 active:scale-90"
                                      >
                                        <Minus className="w-3.5 h-3.5 text-[#007AFF]" />
                                      </button>
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={editImpurity || ''}
                                        onChange={(e) => setEditImpurity(parseFloat(e.target.value) || 0)}
                                        className="w-16 text-center font-bold text-zinc-900 border-none outline-hidden p-0 focus:ring-0 bg-transparent text-sm"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setEditImpurity(prev => parseFloat((prev + 0.1).toFixed(2)))}
                                        className="p-1 rounded bg-zinc-100 active:scale-90"
                                      >
                                        <Plus className="w-3.5 h-3.5 text-[#007AFF]" />
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {rec.productType === 'bắp' && (
                                  <div className="space-y-1 bg-white p-2.5 rounded-lg border border-zinc-200">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                                      🌽 Phân hạng chất lượng bắp
                                    </label>
                                    <select
                                      value={editGrade}
                                      onChange={(e: any) => setEditGrade(e.target.value)}
                                      className="w-full bg-[#F2F2F7] border border-zinc-300 rounded px-2 py-1 text-xs font-bold font-sans text-zinc-800 focus:outline-[#007AFF]"
                                    >
                                      <option value="Loại 1">Loại 1 (+5% giá trị)</option>
                                      <option value="Loại 2">Loại 2 (Chuẩn trung bình)</option>
                                      <option value="Loại 3">Loại 3 (-15% giá trị)</option>
                                    </select>
                                  </div>
                                )}

                              </div>

                              {/* HỆ THỐNG CẢNH BÁO CHỈNH SỬA */}
                              <div className="bg-[#FFF2E6] border border-amber-200 p-2.5 rounded-lg flex items-start gap-1 text-[10px] text-amber-900">
                                <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                                <span>Khi xác nhận lưu, hệ thống sẽ chạy lại toàn bộ thuật toán liên quan để hạch toán chính xác kết quả giá cuối, trọng lượng thực thanh toán & tổng thành tiền chi trả.</span>
                              </div>

                              {/* Cụm hành động Edit */}
                              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200/50">
                                <button
                                  type="button"
                                  onClick={cancelEditing}
                                  className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 active:scale-95 transition-all text-zinc-600 font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Hủy bỏ</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => executeUpdate(rec)}
                                  className="px-4 py-1.5 rounded-lg bg-[#34C759] text-white hover:bg-emerald-600 active:scale-95 transition-all font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>Xong & Lưu lại</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* CHI TIẾT HIỂN THỊ THÔNG THƯỜNG TRONG HISTORY */
                            <>
                              <div className="flex justify-between items-center text-[10px] text-zinc-400 uppercase font-extrabold tracking-wider border-b border-zinc-200/60 pb-1.5">
                                <span>Nhật trình hạch toán kiểm soát</span>
                                <span>Mã mẻ: {rec.id}</span>
                              </div>

                              <div className="space-y-2">
                                {/* Biểu mẫu tóm tắt các yếu tố chất lượng đầu vào */}
                                <div className="grid grid-cols-2 gap-2 text-zinc-650 bg-white p-2.5 rounded-lg border border-zinc-150">
                                  <div>• Số lượng cân: <strong className="text-zinc-800 font-mono text-[11px] font-black">{rec.weight.toLocaleString('vi-VN')} Kg</strong></div>
                                  <div>• Độ ẩm đo: <strong className="text-zinc-805 font-mono text-[11px] font-black">{rec.moisture}%</strong></div>
                                  <div>• Giá sàn đầu vào: <strong className="text-zinc-807 font-mono text-[11px] font-black">{formatCurrency(rec.basePrice)}/Kg</strong></div>
                                  {rec.details.rem !== undefined && (
                                    <div>• Khảo sát Rem: <strong className="text-[#007AFF] font-mono text-[11px] font-black">{rec.details.rem}</strong></div>
                                  )}
                                  {rec.details.impurity !== undefined && (
                                    <div>• Tạp chất bẩn: <strong className="text-[#FF3B30] font-mono text-[11px] font-black">{rec.details.impurity}%</strong></div>
                                  )}
                                  {rec.details.grade !== undefined && (
                                    <div>• Phân hạng bắp: <strong className="text-green-700 font-mono text-[11px] font-black">{rec.details.grade}</strong></div>
                                  )}
                                </div>

                                {/* Chi tiết từng bước chuyển đổi của mẻ hàng này */}
                                <div className="space-y-2 border-t border-dashed border-zinc-250 pt-2.5">
                                  <p className="font-bold text-zinc-700 text-[11.5px] flex items-center gap-1">
                                    <span>📋 Chi tiết hạch toán kiểm định mẻ nông sản:</span>
                                  </p>
                                  {rec.details.formulaSteps.map((step, sIdx) => (
                                    <div key={sIdx} className="flex justify-between items-start text-zinc-600 border-b last:border-0 border-zinc-100 pb-1 pt-0.5">
                                      <div className="flex flex-col max-w-[70%]">
                                        <span className="font-black text-zinc-800 text-[11.5px]">{step.title}</span>
                                        <span className="text-[10px] text-zinc-400 leading-tight font-medium">{step.note}</span>
                                      </div>
                                      <span className={`font-black text-xs font-mono shrink-0 px-1 py-0.5 rounded ${
                                        step.type === 'positive' ? 'bg-emerald-50 text-emerald-700' :
                                        step.type === 'negative' ? 'bg-rose-50 text-rose-700' :
                                        step.type === 'info' ? 'bg-blue-50 text-blue-700' : 'bg-zinc-100 text-zinc-700'
                                      }`}>{step.result}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Cụm hành động: CHỈNH SỬA / XÓA BẢN GHI RIÊNG LẺ */}
                              <div className="flex justify-between items-center pt-3 border-t border-zinc-200/65">
                                <button
                                  type="button"
                                  onClick={() => startEditing(rec)}
                                  className="text-[#007AFF] font-bold text-xs flex items-center space-x-1 py-1 px-3 bg-blue-50 hover:bg-blue-100 rounded-lg active:scale-95 transition-transform cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Chỉnh sửa thông số sai</span>
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => onDeleteRecord(rec.id)}
                                  className="text-[#FF3B30] font-bold text-xs flex items-center space-x-1 py-1 px-2.5 bg-rose-50 hover:bg-rose-100 rounded-lg active:scale-95 transition-transform cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Xóa giao dịch này</span>
                                </button>
                              </div>
                            </>
                          )}

                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* CONFIRM ALL DELETION DIALOG MODAL (iOS 16 Styled Alert View) */}
      {showConfirmClear && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50 animate-fade-in backdrop-blur-xs">
          <div className="bg-white/95 rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden text-center divide-y divide-zinc-200 animate-scale-up">
            <div className="p-5 space-y-2.5">
              <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-5 h-5 animate-bounce" />
              </div>
              <h3 className="text-base font-extrabold text-zinc-900 leading-tight">Xóa Toàn Bộ Nhật Ký?</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Tất cả dữ liệu các mẻ nông sản thu mua trong ngày hôm nay sẽ bị xóa vĩnh viễn khỏi bộ nhớ địa phương.
              </p>
            </div>
            
            <div className="grid grid-cols-2 text-sm font-semibold divide-x divide-zinc-200 h-12">
              <button
                type="button"
                onClick={() => setShowConfirmClear(false)}
                className="text-zinc-600 hover:bg-zinc-50 active:bg-zinc-100 h-full flex items-center justify-center cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={triggerClearAll}
                className="text-[#FF3B30] font-extrabold hover:bg-rose-50/55 active:bg-rose-50 h-full flex items-center justify-center cursor-pointer"
              >
                Xóa tất cả
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
