/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { User, MapPin, IdCard, ChevronDown, ChevronUp, X, UserCheck, UserPlus } from 'lucide-react';
import { Customer } from '../types';

interface CustomerFormProps {
  customer: Customer;
  onChange: (c: Customer) => void;
  customers: Customer[];
}

/**
 * Form nhập thông tin khách hàng (tuỳ chọn) dùng chung cho cả 3 tab tiêu/cà phê/bắp.
 * - Gõ tên hoặc CCCD sẽ gợi ý khách cũ; chọn trúng khách cũ sẽ tự điền đủ 3 ô.
 * - Khách mới (có tên nhưng chưa có trong danh bạ) sẽ được tự lưu khi ấn Lưu giao dịch.
 */
export default function CustomerForm({ customer, onChange, customers }: CustomerFormProps) {
  const [open, setOpen] = useState<boolean>(() => {
    // Mở sẵn nếu đã có thông tin khách nhập dở
    return !!(customer.name || customer.cccd || customer.address);
  });

  const hasInfo = !!(customer.name.trim() || customer.cccd.trim() || customer.address.trim());

  // Tìm khách trùng (theo CCCD nếu có, nếu không theo tên) để hiện trạng thái cũ/mới
  const matched = customers.find((c) => {
    if (customer.cccd.trim()) return c.cccd.trim() === customer.cccd.trim();
    if (customer.name.trim()) return c.name.trim().toLowerCase() === customer.name.trim().toLowerCase();
    return false;
  });

  // Khi gõ tên: nếu trùng chính xác 1 khách cũ thì tự điền địa chỉ + CCCD
  const handleNameChange = (value: string) => {
    const found = customers.find((c) => c.name.trim().toLowerCase() === value.trim().toLowerCase());
    if (found) {
      onChange({ ...found });
    } else {
      onChange({ ...customer, name: value });
    }
  };

  // Khi gõ/chọn CCCD: nếu trùng khách cũ thì tự điền tên + địa chỉ
  const handleCccdChange = (value: string) => {
    const found = customers.find((c) => c.cccd.trim() === value.trim() && value.trim() !== '');
    if (found) {
      onChange({ ...found });
    } else {
      onChange({ ...customer, cccd: value });
    }
  };

  const handleClear = () => onChange({ name: '', address: '', cccd: '' });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-150 overflow-hidden">
      {/* Header bấm để mở/đóng */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-zinc-50/60 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-zinc-800">
          <span className="w-7 h-7 rounded-lg bg-blue-50 text-[#007AFF] flex items-center justify-center">
            <User className="w-4 h-4" />
          </span>
          Thông Tin Khách Hàng
          <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">Tuỳ chọn</span>
        </span>
        <span className="flex items-center gap-2">
          {hasInfo && (
            matched ? (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <UserCheck className="w-3 h-3" /> Khách cũ
              </span>
            ) : (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <UserPlus className="w-3 h-3" /> Khách mới
              </span>
            )
          )}
          {open ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
        </span>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 space-y-3 animate-fade-in">
          {/* Danh sách gợi ý dùng chung cho input */}
          <datalist id="customer-name-list">
            {customers.map((c, i) => (
              <option key={`n-${i}`} value={c.name} />
            ))}
          </datalist>
          <datalist id="customer-cccd-list">
            {customers.filter((c) => c.cccd.trim()).map((c, i) => (
              <option key={`c-${i}`} value={c.cccd}>{c.name}</option>
            ))}
          </datalist>

          {/* Tên khách hàng */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-500 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-zinc-400" /> Tên khách hàng
            </label>
            <input
              id="input-customer-name"
              type="text"
              list="customer-name-list"
              value={customer.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Nhập hoặc chọn tên khách..."
              className="w-full bg-[#F2F2F7] rounded-xl px-3.5 py-2.5 text-sm font-semibold text-zinc-900 outline-hidden focus:ring-2 focus:ring-[#007AFF] border-none placeholder-zinc-400"
            />
          </div>

          {/* CCCD */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-500 flex items-center gap-1">
              <IdCard className="w-3.5 h-3.5 text-zinc-400" /> Số căn cước công dân
            </label>
            <input
              id="input-customer-cccd"
              type="text"
              inputMode="numeric"
              list="customer-cccd-list"
              value={customer.cccd}
              onChange={(e) => handleCccdChange(e.target.value)}
              placeholder="Nhập hoặc chọn số CCCD..."
              className="w-full bg-[#F2F2F7] rounded-xl px-3.5 py-2.5 text-sm font-semibold text-zinc-900 outline-hidden focus:ring-2 focus:ring-[#007AFF] border-none placeholder-zinc-400"
            />
          </div>

          {/* Địa chỉ */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-500 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-zinc-400" /> Địa chỉ
            </label>
            <input
              id="input-customer-address"
              type="text"
              value={customer.address}
              onChange={(e) => onChange({ ...customer, address: e.target.value })}
              placeholder="Nhập địa chỉ khách..."
              className="w-full bg-[#F2F2F7] rounded-xl px-3.5 py-2.5 text-sm font-semibold text-zinc-900 outline-hidden focus:ring-2 focus:ring-[#007AFF] border-none placeholder-zinc-400"
            />
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <p className="text-[10px] text-zinc-400 leading-relaxed max-w-[75%]">
              Để trống nếu không cần. Có nhập thì thông tin sẽ được lưu kèm giao dịch; khách mới tự động lưu vào danh bạ.
            </p>
            {hasInfo && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] font-bold text-zinc-500 hover:text-rose-600 flex items-center gap-1 bg-zinc-100 hover:bg-rose-50 px-2.5 py-1 rounded-lg active:scale-95 transition-all shrink-0"
              >
                <X className="w-3 h-3" /> Xoá
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
