/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardList, Egg, Coffee, Star, ShoppingBag, Info, 
  ChevronRight, Compass, ShieldCheck 
} from 'lucide-react';

import StatusBar from './components/StatusBar';
import PepperTab from './components/PepperTab';
import CoffeeTab from './components/CoffeeTab';
import CornTab from './components/CornTab';
import HistoryTab from './components/HistoryTab';
import { TransactionRecord, ProductType } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('tiêu');
  const [records, setRecords] = useState<TransactionRecord[]>([]);
  const [dateStr, setDateStr] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string>('');

  const handleTriggerSync = () => {
    setIsSyncing(true);
    setSyncMessage('Đang đồng bộ...');
    setTimeout(() => {
      setSyncMessage('Đã xong iCloud');
      setTimeout(() => {
        setIsSyncing(false);
        setSyncMessage('');
      }, 1500);
    }, 1000);
  };

  // 1. Tự động tải nhật ký giao dịch từ localStorage khi khởi chạy
  useEffect(() => {
    const today = new Date();
    const formattedDate = new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(today);
    setDateStr(formattedDate);

    try {
      const stored = localStorage.getItem('agro_trading_records');
      if (stored) {
        setRecords(JSON.parse(stored));
      } else {
        // Tạo sẵn một số dữ liệu mẫu ban đầu để giao diện lịch sử không bị trống và thể hiện rõ logic
        const sampleRecords: TransactionRecord[] = [
          {
            id: 'PEP-9812',
            timestamp: Date.now() - 3600000 * 2.5, // 2.5 tiếng trước
            dateKey: new Date().toISOString().split('T')[0],
            productType: 'tiêu',
            productName: 'Hạt Tiêu',
            weight: 1500,
            moisture: 13.0,
            basePrice: 150000,
            finalPrice: 151500, // +1.5% - (Rem=5.0 chuẩn, độ ẩm 13% được cộng 1.0%? Đợi nha: (15-13)*0.5 = +1% độ ẩm. Rem 5.0 -> +0%. Tổng +1.0% = 151500)
            totalAmount: 227250000,
            details: {
              rem: 5.0,
              moistureBonusPercent: 1.0,
              remBonusPercent: 0,
              totalAdjustmentPercent: 1.0,
              formulaSteps: [
                { title: '1. Giá thành nguyên giá', expression: '150.000 đ', result: '150.000 đ', type: 'info' },
                { title: '2. Tỷ lệ điều chỉnh độ ẩm', expression: '1.0%', result: '+1.00%', type: 'positive', note: 'Ẩm 13.0% < 15.0%, được thưởng' },
                { title: '3. Tỷ lệ chất lượng (Rem)', expression: '5.0', result: '+0.00%', type: 'neutral', note: 'Đạt mốc chuẩn 5' },
                { title: '4. Đơn giá cuối cùng', expression: 'Giá chốt', result: '151.500 đ', type: 'info' }
              ]
            }
          },
          {
            id: 'COF-1421',
            timestamp: Date.now() - 3600000 * 1.2, // 1.2 tiếng trước
            dateKey: new Date().toISOString().split('T')[0],
            productType: 'cà phê',
            productName: 'Cà Phê Robusta',
            weight: 2000,
            moisture: 15.0,
            basePrice: 120000,
            finalPrice: 120000,
            totalAmount: 240000000,
            details: {
              blackBroken: 2.0,
              impurity: 1.0,
              moistureBonusPercent: 0,
              totalAdjustmentPercent: 0,
              formulaSteps: [
                { title: '1. Giá sàn', expression: '120.000 đ', result: '120.000 đ', type: 'info' },
                { title: '2. Độ ẩm (15%)', expression: '0%', result: '0%', type: 'neutral' }
              ]
            }
          }
        ];
        localStorage.setItem('agro_trading_records', JSON.stringify(sampleRecords));
        setRecords(sampleRecords);
      }
    } catch (e) {
      console.error("Lỗi lấy dữ liệu từ localStorage", e);
    }
  }, []);

  // 2. Tự động lưu trữ nhật ký giao dịch mỗi khi danh sách cập nhật
  const saveRecordsToStorage = (updated: TransactionRecord[]) => {
    setRecords(updated);
    try {
      localStorage.setItem('agro_trading_records', JSON.stringify(updated));
    } catch (e) {
      console.error("Lỗi lưu trữ dữ liệu", e);
    }
  };

  // 3. Hàm thêm giao dịch mới
  const handleSaveRecord = (newRec: Omit<TransactionRecord, 'id' | 'timestamp' | 'dateKey'>) => {
    const prefix = newRec.productType === 'tiêu' ? 'PEP' : newRec.productType === 'cà phê' ? 'COF' : 'CRN';
    const randId = Math.floor(1000 + Math.random() * 9000);
    const id = `${prefix}-${randId}`;
    
    const recordWithId: TransactionRecord = {
      ...newRec,
      id,
      timestamp: Date.now(),
      dateKey: new Date().toISOString().split('T')[0],
    };

    saveRecordsToStorage([recordWithId, ...records]);
  };

  // 4. Các hàm thao tác trên lịch sử
  const handleClearRecords = () => {
    saveRecordsToStorage([]);
  };

  const handleDeleteRecord = (id: string) => {
    const filtered = records.filter(r => r.id !== id);
    saveRecordsToStorage(filtered);
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col items-center justify-start text-zinc-900 overflow-x-hidden font-sans">
      
      {/* KHUNG SIMULATOR ĐIỆN THOẠI TRÊN MÁY TÍNH & FULL MÀN HÌNH TRÊN ĐIỆN THOẠI */}
      <div className="w-full max-w-lg bg-[#F2F2F7] md:my-6 md:rounded-[40px] md:shadow-2xl md:border-8 md:border-zinc-900 border-black overflow-hidden flex flex-col relative shrink-0 min-h-screen md:min-h-[850px]">
        
        {/* iOS Native Status Bar */}
        <div className="bg-[#F2F2F7]/95 backdrop-blur-md sticky top-0 z-50">
          <StatusBar />
        </div>

        {/* THẺ TIÊU ĐỀ NATIVE HEADER */}
        <div className="px-6 pt-4 pb-2.5 flex flex-col justify-start select-none bg-[#F2F2F7]">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[#1C1C1E]">Nông Sản Pro</h1>
              <p className="text-[#8E8E93] text-xs font-semibold tracking-wide capitalize mt-0.5">{dateStr}</p>
            </div>
            <div className="flex items-center space-x-1.5">
              <button 
                type="button"
                onClick={handleTriggerSync}
                id="btn-icloud-sync"
                className={`px-3.5 py-1.5 rounded-full shadow-xs font-bold text-[11px] uppercase tracking-wider flex items-center space-x-1.5 border border-zinc-200/50 cursor-pointer active:scale-95 transition-all duration-200 ${
                  isSyncing 
                    ? 'bg-blue-50 text-blue-600 border-blue-200' 
                    : 'bg-white text-[#007AFF] hover:bg-zinc-50'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-blue-500 animate-ping' : 'bg-green-500 animate-pulse'}`}></div>
                <span className="italic">{isSyncing ? syncMessage : 'iCloud Sync'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* CONTAINER CHỨA NỘI DUNG FORM TÍNH TOÁN */}
        <main className="flex-1 px-5 overflow-y-auto scrollbar-thin">
          <AnimatePresence mode="wait">
            {activeTab === 'tiêu' && (
              <motion.div
                key="tiêu"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.18 }}
              >
                <PepperTab onSaveRecord={handleSaveRecord} />
              </motion.div>
            )}

            {activeTab === 'cà phê' && (
              <motion.div
                key="cà phê"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.18 }}
              >
                <CoffeeTab onSaveRecord={handleSaveRecord} />
              </motion.div>
            )}

            {activeTab === 'bắp' && (
              <motion.div
                key="bắp"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.18 }}
              >
                <CornTab onSaveRecord={handleSaveRecord} />
              </motion.div>
            )}

            {activeTab === 'nhật ký' && (
              <motion.div
                key="nhật ký"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.18 }}
              >
                <HistoryTab 
                  records={records}
                  onClearRecords={handleClearRecords}
                  onDeleteRecord={handleDeleteRecord}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* BẢN TIN BÁO NÚT BOTTOM TAB BAR CHUẨN IOS 16 */}
        <nav id="ios-bottom-tab-bar" className="sticky bottom-0 w-full bg-[#F9F9FB]/95 backdrop-blur-xl border-t border-zinc-200 py-2.5 px-4 flex justify-around items-center select-none z-40">
          {/* TAB TIÊU */}
          <button
            type="button"
            onClick={() => setActiveTab('tiêu')}
            className={`flex flex-col items-center space-y-1 cursor-pointer transition-colors ${
              activeTab === 'tiêu' ? 'text-[#007AFF]' : 'text-[#8E8E93]'
            }`}
          >
            <Compass className="w-5.5 h-5.5" strokeWidth={activeTab === 'tiêu' ? 2.5 : 2} />
            <span className="text-[10px] font-bold">Hạt Tiêu</span>
          </button>

          {/* TAB CÀ PHÊ */}
          <button
            type="button"
            onClick={() => setActiveTab('cà phê')}
            className={`flex flex-col items-center space-y-1 cursor-pointer transition-colors ${
              activeTab === 'cà phê' ? 'text-[#007AFF]' : 'text-[#8E8E93]'
            }`}
          >
            <Coffee className="w-5.5 h-5.5" strokeWidth={activeTab === 'cà phê' ? 2.5 : 2} />
            <span className="text-[10px] font-bold">Cà Phê</span>
          </button>

          {/* TAB BẮP TƯƠI */}
          <button
            type="button"
            onClick={() => setActiveTab('bắp')}
            className={`flex flex-col items-center space-y-1 cursor-pointer transition-colors ${
              activeTab === 'bắp' ? 'text-[#007AFF]' : 'text-[#8E8E93]'
            }`}
          >
            <ShoppingBag className="w-5.5 h-5.5" strokeWidth={activeTab === 'bắp' ? 2.5 : 2} />
            <span className="text-[10px] font-bold">Bắp Tươi</span>
          </button>

          {/* TAB NHẬT KÝ */}
          <button
            type="button"
            onClick={() => setActiveTab('nhật ký')}
            className={`flex flex-col items-center space-y-1 cursor-pointer transition-colors relative ${
              activeTab === 'nhật ký' ? 'text-[#007AFF]' : 'text-[#8E8E93]'
            }`}
          >
            <ClipboardList className="w-5.5 h-5.5" strokeWidth={activeTab === 'nhật ký' ? 2.5 : 2} />
            <span className="text-[10px] font-bold">Nhật Ký</span>
            
            {/* Huy hiệu số lượng mẻ ngày hôm nay */}
            {records.length > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-[#FF3B30] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white animate-scale-up">
                {records.length}
              </span>
            )}
          </button>
        </nav>

      </div>
    </div>
  );
}
