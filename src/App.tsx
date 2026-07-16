/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardList, Egg, Coffee, Star, ShoppingBag, Info, 
  ChevronRight, Compass, ShieldCheck, Warehouse, Upload
} from 'lucide-react';

import StatusBar from './components/StatusBar';
import PepperTab from './components/PepperTab';
import CoffeeTab from './components/CoffeeTab';
import CornTab from './components/CornTab';
import HistoryTab from './components/HistoryTab';
import WarehouseTab from './components/WarehouseTab';
import CustomerForm from './components/CustomerForm';
import { TransactionRecord, ProductType, Customer } from './types';
import { formatCurrency, exportToCSV, importFromCSV } from './utils/exporter';

const EMPTY_CUSTOMER: Customer = { name: '', address: '', cccd: '' };

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('tiêu');
  const [records, setRecords] = useState<TransactionRecord[]>([]);
  const [dateStr, setDateStr] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Thông tin khách hàng đang nhập (dùng chung 3 tab) + danh bạ khách hàng đã lưu
  const [customer, setCustomer] = useState<Customer>(() => {
    try {
      const saved = localStorage.getItem('agro_current_customer');
      return saved ? JSON.parse(saved) : EMPTY_CUSTOMER;
    } catch { return EMPTY_CUSTOMER; }
  });
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem('agro_customers');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Lưu lại thông tin khách đang nhập để reset web vẫn còn
  useEffect(() => {
    localStorage.setItem('agro_current_customer', JSON.stringify(customer));
  }, [customer]);

  // Thêm/cập nhật một khách vào danh bạ (trùng theo CCCD nếu có, nếu không theo tên)
  const upsertCustomer = (c: Customer) => {
    const name = c.name.trim();
    const cccd = c.cccd.trim();
    if (!name && !cccd) return;
    setCustomers((prev) => {
      const idx = prev.findIndex((x) =>
        cccd ? x.cccd.trim() === cccd : x.name.trim().toLowerCase() === name.toLowerCase()
      );
      let next: Customer[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = { name, address: c.address.trim(), cccd };
      } else {
        next = [...prev, { name, address: c.address.trim(), cccd }];
      }
      localStorage.setItem('agro_customers', JSON.stringify(next));
      return next;
    });
  };

  const handleSaveCSV = () => {
    if (records.length === 0) {
      alert('Không có dữ liệu giao dịch nào để lưu!');
      return;
    }
    setIsSaving(true);
    setTimeout(() => {
      exportToCSV(records);
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    }, 400);
  };

  const handleImportCSV = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          alert('Không thể đọc dữ liệu file này!');
          return;
        }

        const imported = importFromCSV(text);
        if (imported.length === 0) {
          alert('Không tìm thấy giao dịch nào hợp lệ từ file CSV đã chọn! Vui lòng kiểm tra lại cấu trúc file.');
          return;
        }

        const mode = window.confirm(
          `Tìm thấy ${imported.length} giao dịch từ file.\n\n` +
          `Ấn "OK" (Đồng ý) để GỘP các giao dịch này vào danh sách hiện tại (giữ nguyên dữ liệu đang có).\n` +
          `Ấn "Hủy" (Cancel) để GHI ĐÈ, thay thế hoàn toàn danh sách hiện tại bằng danh sách từ file.`
        );

        let newRecords: TransactionRecord[] = [];
        if (mode) {
          // Gộp tránh trùng ID
          const existingIds = new Set(records.map(r => r.id));
          const uniqueImported = imported.filter(r => !existingIds.has(r.id));
          newRecords = [...records, ...uniqueImported];
          alert(`Đã gộp thành công ${uniqueImported.length} giao dịch mới vào hệ thống!`);
        } else {
          newRecords = imported;
          alert(`Đã nhập thay thế thành công ${imported.length} giao dịch!`);
        }

        // Sắp xếp thời gian giảm dần
        newRecords.sort((a, b) => b.timestamp - a.timestamp);

        setRecords(newRecords);
        localStorage.setItem('agro_trading_records', JSON.stringify(newRecords));
      } catch (err) {
        console.error(err);
        alert('Gặp lỗi khi xử lý dữ liệu file CSV!');
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = ''; // Reset
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
            finalPrice: 152000, // Độ ẩm 13% được cộng 2.0% ẩm bonus theo quy tắc: 15 - 13 = 2%?
            totalAmount: 228000000,
            details: {
              rem: 5.0,
              moistureBonusPercent: 2.0,
              remBonusPercent: 0,
              totalAdjustmentPercent: 2.0,
              formulaSteps: [
                { title: '1. Giá thành nguyên giá', expression: '150.000 đ', result: '150.000 đ', type: 'info' },
                { title: '2. Tỷ lệ điều chỉnh độ ẩm', expression: '2.0%', result: '+2.00%', type: 'positive', note: 'Ẩm 13.0% < 15.0%, được thưởng' },
                { title: '3. Tỷ lệ chất lượng (Rem)', expression: '5.0', result: '+0.00%', type: 'neutral', note: 'Đạt mốc chuẩn 5' },
                { title: '4. Đơn giá cuối cùng', expression: 'Giá chốt', result: '152.000 đ', type: 'info' }
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
    
    // Chỉ gắn thông tin khách hàng nếu có nhập (tuỳ chọn) — không nhập vẫn lưu bình thường
    const hasCustomer = !!(customer.name.trim() || customer.cccd.trim() || customer.address.trim());

    const recordWithId: TransactionRecord = {
      ...newRec,
      id,
      timestamp: Date.now(),
      dateKey: new Date().toISOString().split('T')[0],
      ...(hasCustomer ? { customer: {
        name: customer.name.trim(),
        address: customer.address.trim(),
        cccd: customer.cccd.trim(),
      } } : {}),
    };

    // Khách mới thì tự lưu vào danh bạ để lần sau gợi ý chọn lại
    if (hasCustomer) {
      upsertCustomer(customer);
    }

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

  const handleUpdateRecord = (updatedRecord: TransactionRecord) => {
    const updated = records.map(r => r.id === updatedRecord.id ? updatedRecord : r);
    saveRecordsToStorage(updated);
  };

  // Tính thống kê tổng hôm nay
  const totalWeight = records.reduce((sum, r) => sum + r.weight, 0);
  const totalAmount = records.reduce((sum, r) => sum + r.totalAmount, 0);
  const transactionCount = records.length;

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-zinc-900 font-sans antialiased flex flex-col">
      
      {/* WEB HEADER CHUẨN ĐẸP VÀ CHUYÊN NGHIỆP */}
      <header className="bg-white border-b border-zinc-200/85 sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20 gap-4">
            
            {/* Logo Brand */}
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#007AFF] flex items-center justify-center text-white text-xl shadow-md shadow-blue-200">
                🌾
              </div>
              <div>
                <span className="text-base sm:text-lg font-black text-zinc-900 tracking-tight block leading-tight">
                  Nông Sản Pro
                </span>
                <span className="text-[10px] font-semibold text-[#8E8E93] tracking-wider uppercase block mt-0.5">
                  Thương Lượng & Giao Dịch
                </span>
              </div>
            </div>

            {/* Desktop Tabs Switcher */}
            <div className="hidden md:flex items-center space-x-1.5 bg-[#F2F2F7] p-1 rounded-xl">
              {(['tiêu', 'cà phê', 'bắp', 'kho', 'nhật ký'] as const).map((tab) => {
                const isActive = activeTab === tab;
                const IconComponent = tab === 'tiêu' ? Compass : tab === 'cà phê' ? Coffee : tab === 'bắp' ? ShoppingBag : tab === 'kho' ? Warehouse : ClipboardList;
                const label = tab === 'tiêu' ? 'Hạt Tiêu' : tab === 'cà phê' ? 'Cà Phê' : tab === 'bắp' ? 'Bắp Tươi' : tab === 'kho' ? 'Sơ Đồ Kho' : 'Nhật Ký Giao Dịch';
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg font-bold text-xs cursor-pointer transition-all duration-150 ${
                      isActive 
                        ? 'bg-white text-[#007AFF] shadow-xs' 
                        : 'text-[#8E8E93] hover:text-zinc-700'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{label}</span>
                    {tab === 'nhật ký' && records.length > 0 && (
                      <span className="bg-[#FF3B30] text-white text-[9px] px-1.5 py-0.5 rounded-full font-black ml-1 animate-pulse">
                        {records.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right details & action button */}
            <div className="flex items-center space-x-2">
              <div className="hidden lg:flex flex-col text-right mr-1">
                <span className="text-xs font-bold text-zinc-800 capitalize leading-none mb-1">{dateStr}</span>
                <span className="text-[10px] font-medium text-zinc-400">Giao diện đa thiết bị</span>
              </div>
              
              <div className="flex flex-col gap-1 w-[105px]">
                {/* Nút Nhập File (Import CSV) */}
                <label 
                  id="btn-import-local-csv"
                  className="w-full px-2 py-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 font-bold text-[9px] uppercase flex items-center justify-center space-x-1 cursor-pointer active:scale-95 transition-all duration-200 shrink-0 shadow-xs"
                >
                  <Upload className="w-3 h-3 text-zinc-500" />
                  <span className="font-sans text-[9.5px] tracking-wider">Nhập File</span>
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={handleImportCSV} 
                    className="hidden" 
                  />
                </label>

                {/* Nút Lưu Máy (Export CSV) */}
                <button 
                  type="button"
                  onClick={handleSaveCSV}
                  id="btn-save-local-csv"
                  className={`w-full px-2 py-1 rounded-lg shadow-xs font-black text-[9px] uppercase flex items-center justify-center space-x-1 border cursor-pointer active:scale-95 transition-all duration-200 shrink-0 ${
                    saveSuccess 
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                      : isSaving 
                        ? 'bg-zinc-100 text-zinc-500 border-zinc-200' 
                        : 'bg-emerald-600 text-white hover:bg-emerald-700 border-transparent'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${saveSuccess ? 'bg-emerald-500 animate-ping' : isSaving ? 'bg-zinc-400 animate-pulse' : 'bg-white animate-pulse'}`}></div>
                  <span className="font-sans text-[9.5px] tracking-wider">
                    {saveSuccess ? 'Đã Lưu!' : isSaving ? 'Đang xuất...' : 'Lưu Máy'}
                  </span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* MOBILE HEADER TAB NAVIGATION ROW (Sticky below Header on smaller screens) */}
      <div className="md:hidden bg-white border-b border-zinc-200 py-2.5 px-4 sticky top-16 z-40 shadow-xs flex items-center justify-between gap-1 overflow-x-auto scrollbar-none">
        {(['tiêu', 'cà phê', 'bắp', 'kho', 'nhật ký'] as const).map((tab) => {
          const isActive = activeTab === tab;
          const IconComponent = tab === 'tiêu' ? Compass : tab === 'cà phê' ? Coffee : tab === 'bắp' ? ShoppingBag : tab === 'kho' ? Warehouse : ClipboardList;
          const label = tab === 'tiêu' ? 'Tiêu' : tab === 'cà phê' ? 'Cà Phê' : tab === 'bắp' ? 'Bắp' : tab === 'kho' ? 'Sơ Đồ' : 'Nhật Ký';
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex items-center justify-center space-x-1 py-2 px-1 rounded-xl text-xs font-bold transition-all shrink-0 relative ${
                isActive 
                  ? 'bg-blue-50 text-[#007AFF]' 
                  : 'text-zinc-500 active:bg-zinc-100'
              }`}
            >
              <IconComponent className="w-3.5 h-3.5" />
              <span>{label}</span>
              {tab === 'nhật ký' && records.length > 0 && (
                <span className="absolute -top-1 right-0 sm:right-1 bg-[#FF3B30] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-black">
                  {records.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* NỘI DUNG CHÍNH WEBSITE */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        
        {/* DASHBOARD SUMMARY ROW */}
        <section id="site-dashboard-stats" className="bg-white rounded-3xl p-5 sm:p-6 border border-zinc-200/80 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-zinc-100">
            <div>
              <h2 className="text-base sm:text-lg font-black text-zinc-900 tracking-tight flex items-center gap-2">
                <span className="w-2.5 h-5 bg-emerald-500 rounded-sm"></span>
                Tổng Hợp Giao Dịch Hôm Nay
              </h2>
              <p className="text-zinc-400 text-[11px] font-semibold mt-0.5">Bản chiết tính cộng dồn từ tất cả các mẻ hàng đã thỏa thuận</p>
            </div>
            <div className="text-xs bg-zinc-100 text-zinc-650 px-3.5 py-1.5 rounded-full font-bold self-start sm:self-auto capitalize font-sans">
              🕒 {dateStr}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 sm:pt-5">
            
            {/* Stat Card 1 */}
            <div className="bg-[#F8F9FA] rounded-2xl p-4 flex items-center space-x-4 border border-zinc-100 transition-all hover:bg-zinc-50 hover:border-zinc-200">
              <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-xl font-bold">
                🚚
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Số Mẻ Đã Thỏa Thuận</span>
                <span className="text-lg sm:text-xl font-black text-zinc-800">{transactionCount} mẻ giao dịch</span>
              </div>
            </div>

            {/* Stat Card 2 */}
            <div className="bg-[#F8F9FA] rounded-2xl p-4 flex items-center space-x-4 border border-zinc-100 transition-all hover:bg-zinc-50 hover:border-zinc-200">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold">
                ⚖️
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Tổng Trọng Lượng Thu</span>
                <span className="text-lg sm:text-xl font-black text-[#007AFF]">
                  {totalWeight.toLocaleString('vi-VN')} <span className="text-xs font-semibold">kg</span>
                </span>
              </div>
            </div>

            {/* Stat Card 3 */}
            <div className="bg-[#EBFDF3] rounded-2xl p-4 flex items-center space-x-4 border border-emerald-100 transition-all hover:bg-white hover:border-emerald-200">
              <div className="w-11 h-11 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-xl font-bold shadow-xs">
                💵
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-emerald-800/70 uppercase tracking-wider">Tổng Doanh Số Dự Chi</span>
                <span className="text-lg sm:text-xl font-black text-emerald-600">
                  {formatCurrency(Math.round(totalAmount))}
                </span>
              </div>
            </div>

          </div>
        </section>

        {/* THÔNG TIN KHÁCH HÀNG (DÙNG CHUNG 3 TAB TÍNH TOÁN) */}
        {(activeTab === 'tiêu' || activeTab === 'cà phê' || activeTab === 'bắp') && (
          <section>
            <CustomerForm customer={customer} onChange={setCustomer} customers={customers} />
          </section>
        )}

        {/* CONTAINER CHỨA NỘI DUNG FORM TÍNH TOÁN */}
        <section className="bg-transparent">
          <AnimatePresence mode="wait">
            {activeTab === 'tiêu' && (
              <motion.div
                key="tiêu"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.18 }}
              >
                <PepperTab onSaveRecord={handleSaveRecord} />
              </motion.div>
            )}

            {activeTab === 'cà phê' && (
              <motion.div
                key="cà phê"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.18 }}
              >
                <CoffeeTab onSaveRecord={handleSaveRecord} />
              </motion.div>
            )}

            {activeTab === 'bắp' && (
              <motion.div
                key="bắp"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.18 }}
              >
                <CornTab onSaveRecord={handleSaveRecord} />
              </motion.div>
            )}

            {activeTab === 'kho' && (
              <motion.div
                key="kho"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.18 }}
              >
                <WarehouseTab />
              </motion.div>
            )}

            {activeTab === 'nhật ký' && (
              <motion.div
                key="nhật ký"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.18 }}
              >
                <HistoryTab 
                  records={records}
                  onClearRecords={handleClearRecords}
                  onDeleteRecord={handleDeleteRecord}
                  onUpdateRecord={handleUpdateRecord}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* WEB FOOTER */}
      <footer className="bg-white border-t border-zinc-200/85 py-6 mt-12 text-center text-xs text-zinc-400 font-medium">
        <p>© 2026 Hỗ Trợ Mua Bán Nông Sản Pro - Hệ thống hạch toán giá trị cho tiêu, cà phê & bắp sạch.</p>
        <p className="mt-1 font-sans text-[11px] text-zinc-350">Thiết kế hoàn hảo, tự động tương thích kích thước màn hình tất cả máy tính & di động.</p>
      </footer>
    </div>
  );
}
