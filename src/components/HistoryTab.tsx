/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  FileText, Trash2, Search, Calendar, ChevronRight, ChevronDown, 
  ChevronUp, Grid, Filter, AlertTriangle, CloudRain, Check 
} from 'lucide-react';
import { TransactionRecord, TradingStats } from '../types';
import { formatCurrency, formatDateTime, exportToCSV } from '../utils/exporter';

interface HistoryTabProps {
  records: TransactionRecord[];
  onClearRecords: () => void;
  onDeleteRecord: (id: string) => void;
}

export default function HistoryTab({ records, onClearRecords, onDeleteRecord }: HistoryTabProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState<boolean>(false);
  const [successExport, setSuccessExport] = useState<boolean>(false);

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
    setExpandedRecordId(expandedRecordId === id ? null : id);
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
    <div className="space-y-6 pb-20 animate-fade-in">
      
      {/* 1. KHỐI SUMMARY STATS THỐNG KÊ GIAO DỊCH */}
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

      {/* 2. CHỨC NĂNG TÌM KIẾM & LỌC */}
      <div className="bg-white rounded-2xl p-3.5 shadow-xs border border-zinc-100 space-y-3">
        {/* iOS style Search Box */}
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
              onClick={() => setSearchTerm('')}
              className="text-xs bg-zinc-400 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold active:scale-90"
            >
              ×
            </button>
          )}
        </div>

        {/* Filter pills */}
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

      {/* 3. DANH SÁCH CHI TIẾT NHẬT KÝ */}
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
            <span>Đã tạo file CSV thành công! Bạn có thể mang tải lên Google Drive.</span>
          </div>
        )}

        {/* List render */}
        {filteredRecords.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-zinc-100 text-center space-y-2">
            <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center mx-auto text-zinc-300">
              <Calendar className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-zinc-800">Không tìm thấy dữ liệu giao dịch</p>
            <p className="text-xs text-zinc-400">Vui lòng chọn thẻ nông sản phía trên, tính giá và nhấn nút lưu lại</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xs border border-zinc-100 overflow-hidden divide-y divide-zinc-100">
            {filteredRecords.map((rec) => {
              const isExpanded = expandedRecordId === rec.id;
              return (
                <div key={rec.id} className="p-3.5 hover:bg-zinc-50/50 transition-colors">
                  {/* Tóm tắt dòng */}
                  <div 
                    onClick={() => toggleExpand(rec.id)}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                        rec.productType === 'tiêu' ? 'bg-amber-100 text-amber-800' :
                        rec.productType === 'cà phê' ? 'bg-amber-900 text-amber-100' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {rec.productName.substring(0, 2).toUpperCase()}
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-zinc-900">{rec.productName}</span>
                        <span className="text-[10px] text-zinc-400 flex items-center">
                          <Calendar className="w-3 h-3 mr-0.5" />
                          {formatDateTime(rec.timestamp)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2.5 text-right">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-emerald-600">{formatCurrency(rec.totalAmount)}</span>
                        <span className="text-[11px] text-zinc-500 font-semibold">
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

                  {/* Chi tiết quá trình tính toán mở rộng */}
                  {isExpanded && (
                    <div className="mt-4 pt-3.5 border-t border-zinc-100 space-y-3 bg-[#F9F9FB] rounded-xl p-3 text-xs leading-relaxed animate-fade-in">
                      <div className="flex justify-between items-center text-[10px] text-zinc-400 uppercase font-extrabold tracking-wider border-b border-zinc-200/60 pb-1.5">
                        <span>Nhật trình hạch toán</span>
                        <span>Mã: {rec.id}</span>
                      </div>

                      <div className="space-y-2">
                        {/* Biểu mẫu các yếu tố ảnh hưởng */}
                        <div className="grid grid-cols-2 gap-2 text-zinc-650 bg-white p-2 rounded-lg border border-zinc-150">
                          <div>• Khối lượng: <strong className="text-zinc-800 font-mono">{rec.weight.toLocaleString('vi-VN')} Kg</strong></div>
                          <div>• Độ ẩm đo: <strong className="text-zinc-805 font-mono">{rec.moisture}%</strong></div>
                          <div>• Sàn nguyên giá: <strong className="text-zinc-807 font-mono">{formatCurrency(rec.basePrice)}/Kg</strong></div>
                          {rec.details.rem !== undefined && (
                            <div>• Cận Rem: <strong className="text-zinc-810 font-mono">{rec.details.rem}</strong></div>
                          )}
                          {rec.details.impurity !== undefined && (
                            <div>• Tạp chất: <strong className="text-zinc-810 font-mono">{rec.details.impurity}%</strong></div>
                          )}
                          {rec.details.blackBroken !== undefined && (
                            <div>• Đen vỡ: <strong className="text-zinc-810 font-mono">{rec.details.blackBroken}%</strong></div>
                          )}
                        </div>

                        {/* Chi tiết từng bước của mẻ này */}
                        <div className="space-y-2 border-t border-dashed border-zinc-200 pt-2.5">
                          <p className="font-bold text-zinc-700 text-[11px]">📋 Chi tiết kiểm định chất lượng nông sản:</p>
                          {rec.details.formulaSteps.map((step, sIdx) => (
                            <div key={sIdx} className="flex justify-between items-start text-zinc-600 border-b last:border-0 border-zinc-100/50 pb-1">
                              <div className="flex flex-col max-w-[70%]">
                                <span className="font-medium text-zinc-850 text-[11px]">{step.title}</span>
                                <span className="text-[10px] text-zinc-450 leading-tight">{step.note}</span>
                              </div>
                              <span className="font-bold text-zinc-800 font-mono shrink-0">{step.result}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Nút xóa bản ghi riêng lẻ */}
                      <div className="flex justify-end pt-2 border-t border-zinc-200/60">
                        <button
                          type="button"
                          onClick={() => onDeleteRecord(rec.id)}
                          className="text-[#FF3B30] font-bold text-xs flex items-center space-x-1 py-1 px-2.5 bg-red-50 hover:bg-red-100 rounded-lg active:scale-95 transition-transform cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa mẻ giao dịch này</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
                Tất cả dữ lữu các mẻ nông sản thu mua trong ngày hôm nay sẽ bị xóa vĩnh viễn khỏi bộ nhớ trình duyệt địa phương.
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
                className="text-[#FF3B30] font-extrabold hover:bg-rose-50/50 active:bg-rose-50 h-full flex items-center justify-center cursor-pointer"
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
