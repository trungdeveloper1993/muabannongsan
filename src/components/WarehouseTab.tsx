/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Warehouse, LayoutGrid, Plus, Trash2, Edit3, HelpCircle, 
  RotateCcw, Info, Check, X, FileText, ArrowUpDown, ChevronRight, PenTool, Layers
} from 'lucide-react';

interface WarehouseBlock {
  id: string;
  startCol: number;
  startRow: number;
  numCols: number; // số bao ngang
  numRows: number; // số bao dọc
  totalBags: number; // tổng số bao
  note: string; // ghi chú lô hàng
  color: string; // mã màu nền block
  detailedNote?: string; // Ghi chú chi tiết thêm
}

interface WarehouseLayout {
  id: string;
  name: string;
  cols: number; // số cột (ngang)
  rows: number; // số dòng (dọc)
  blocks: WarehouseBlock[];
}

const ACCENT_COLORS = [
  { name: 'Xanh dương', bg: 'bg-blue-100/90 border-blue-400 text-blue-900', rawBg: '#dbeafe', borderClass: 'border-blue-400', badge: 'bg-blue-500' },
  { name: 'Xanh lục', bg: 'bg-emerald-100/90 border-emerald-400 text-emerald-900', rawBg: '#e2f9ec', borderClass: 'border-emerald-400', badge: 'bg-emerald-500' },
  { name: 'Hổ phách', bg: 'bg-amber-100/90 border-amber-400 text-amber-900', rawBg: '#fef3c7', borderClass: 'border-amber-400', badge: 'bg-amber-500' },
  { name: 'Tía mận', bg: 'bg-purple-100/90 border-purple-400 text-purple-900', rawBg: '#f3e8ff', borderClass: 'border-purple-400', badge: 'bg-purple-500' },
  { name: 'Cam đất', bg: 'bg-orange-100/90 border-orange-400 text-orange-900', rawBg: '#ffedd5', borderClass: 'border-orange-400', badge: 'bg-orange-500' },
  { name: 'Đỏ son', bg: 'bg-rose-100/90 border-rose-400 text-rose-900', rawBg: '#ffe4e6', borderClass: 'border-rose-400', badge: 'bg-rose-500' },
];

export default function WarehouseTab() {
  const [warehouses, setWarehouses] = useState<WarehouseLayout[]>([]);
  const [activeWarehouseId, setActiveWarehouseId] = useState<string>('');
  
  // States để tạo kho mới
  const [newWhName, setNewWhName] = useState<string>('');
  const [newWhCols, setNewWhCols] = useState<number>(10);
  const [newWhRows, setNewWhRows] = useState<number>(10);
  const [isCreatingWarehouse, setIsCreatingWarehouse] = useState<boolean>(false);

  // States để sửa kho hiện hữu
  const [isEditingWarehouse, setIsEditingWarehouse] = useState<boolean>(false);
  const [editWhName, setEditWhName] = useState<string>('');
  const [editWhCols, setEditWhCols] = useState<number>(10);
  const [editWhRows, setEditWhRows] = useState<number>(10);

  // States để sửa lô hàng (blocks) inside inspection panel
  const [isEditingBlock, setIsEditingBlock] = useState<boolean>(false);
  const [editBlockNote, setEditBlockNote] = useState<string>('');
  const [editBlockNumCols, setEditBlockNumCols] = useState<number>(1);
  const [editBlockNumRows, setEditBlockNumRows] = useState<number>(1);
  const [editBlockTotalBags, setEditBlockTotalBags] = useState<number>(1);
  const [editBlockColor, setEditBlockColor] = useState<string>('');

  // States để ghi chú chi tiết thêm cho lô hàng (Add Note)
  const [isEditingDetailedNote, setIsEditingDetailedNote] = useState<boolean>(false);
  const [editDetailedNoteText, setEditDetailedNoteText] = useState<string>('');

  // Chế độ thao tác trên sơ đồ kho
  // 'view': Chỉ xem / chọn lô để hiệu chỉnh
  // 'draw': Đang cầm bút vẽ bôi đen
  const [editorMode, setEditorMode] = useState<'view' | 'draw'>('view');
  
  // Trạng thái bôi đen giữ chuột vẽ lô mới
  const [isDrawingMouse, setIsDrawingMouse] = useState<boolean>(false);
  const [drawStart, setDrawStart] = useState<{ r: number; c: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ r: number; c: number } | null>(null);

  // Ô tạm thời được bôi đen (Bounding box từ drawStart -> drawCurrent)
  const [selectedRange, setSelectedRange] = useState<{
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  } | null>(null);

  // Form cấu hình lô hàng vừa vẽ
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [bagNumCols, setBagNumCols] = useState<number>(1);
  const [bagNumRows, setBagNumRows] = useState<number>(1);
  const [totalBags, setTotalBags] = useState<number>(10);
  const [bagHeightMultiplier, setBagHeightMultiplier] = useState<number>(5); // số tầng chiều cao ước tính
  const [bagNote, setBagNote] = useState<string>('');
  const [bagColor, setBagColor] = useState<string>('bg-blue-100/90 border-blue-400 text-blue-900');

  // Lô đang được chọn xem chi tiết / chỉnh sửa
  const [activeBlockId, setActiveBlockId] = useState<string>('');
  
  // Phóng to thu nhỏ kích thước ô bàn cờ (px)
  const [cellSize, setCellSize] = useState<number>(44);

  // Tải danh sách kho chứa từ localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('agro_warehouses');
      if (stored) {
        const parsed = JSON.parse(stored) as WarehouseLayout[];
        setWarehouses(parsed);
        if (parsed.length > 0) {
          setActiveWarehouseId(parsed[0].id);
        }
      } else {
        // Tạo sẵn một kho mẫu tuyệt đẹp ban đầu
        const sampleWarehouse: WarehouseLayout = {
          id: 'WH-SAMPLE',
          name: 'Kho Tổng Đại Lý Đông Nam Bộ',
          cols: 12,
          rows: 12,
          blocks: [
            {
              id: 'B-1',
              startCol: 1,
              startRow: 1,
              numCols: 4,
              numRows: 3,
              totalBags: 60,
              note: 'Tiêu Đen Thượng Hạng Lô A1',
              color: 'bg-emerald-100/90 border-emerald-400 text-emerald-900'
            },
            {
              id: 'B-2',
              startCol: 7,
              startRow: 2,
              numCols: 3,
              numRows: 4,
              totalBags: 120,
              note: 'Tiêu Sấy Lò Tiêu Chuẩn',
              color: 'bg-amber-100/90 border-amber-400 text-amber-900'
            },
            {
              id: 'B-3',
              startCol: 2,
              startRow: 7,
              numCols: 5,
              numRows: 4,
              totalBags: 200,
              note: 'Tiêu Đạt Lớp Cám Lô C3',
              color: 'bg-blue-100/90 border-blue-400 text-blue-900'
            }
          ]
        };
        const defaultList = [sampleWarehouse];
        localStorage.setItem('agro_warehouses', JSON.stringify(defaultList));
        setWarehouses(defaultList);
        setActiveWarehouseId(sampleWarehouse.id);
      }
    } catch (e) {
      console.error('Lỗi tải dữ liệu kho', e);
    }
  }, []);

  // Lưu danh sách kho vào localStorage
  const saveWarehouses = (updatedList: WarehouseLayout[]) => {
    setWarehouses(updatedList);
    try {
      localStorage.setItem('agro_warehouses', JSON.stringify(updatedList));
    } catch (e) {
      console.error('Lỗi lưu trữ sơ đồ kho', e);
    }
  };

  const activeWarehouse = warehouses.find(w => w.id === activeWarehouseId);

  // Tạo kho mới
  const handleCreateWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWhName.trim()) return;

    const newWh: WarehouseLayout = {
      id: `WH-${Math.floor(1000 + Math.random() * 9000)}`,
      name: newWhName.trim(),
      cols: Math.min(30, Math.max(4, newWhCols)),
      rows: Math.min(30, Math.max(4, newWhRows)),
      blocks: []
    };

    const updated = [...warehouses, newWh];
    saveWarehouses(updated);
    setActiveWarehouseId(newWh.id);
    setNewWhName('');
    setIsCreatingWarehouse(false);
  };

  // Xóa kho hiện tại
  const handleDeleteWarehouse = () => {
    if (!activeWarehouse) return;
    if (window.confirm(`Bạn có chắc chắn muốn xóa sơ đồ kho "${activeWarehouse.name}" không? Toàn bộ các lô xếp bao bên trong sẽ biến mất.`)) {
      const filtered = warehouses.filter(w => w.id !== activeWarehouse.id);
      saveWarehouses(filtered);
      if (filtered.length > 0) {
        setActiveWarehouseId(filtered[0].id);
      } else {
        setActiveWarehouseId('');
      }
      setActiveBlockId('');
      setSelectedRange(null);
    }
  };

  // Sửa đổi kho hiện có
  const handleSaveWarehouseEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWarehouse) return;
    const newCols = Math.min(30, Math.max(4, editWhCols));
    const newRows = Math.min(30, Math.max(4, editWhRows));

    // Điều chỉnh tọa độ tất cả lô hàng để đảm bảo khớp vừa khít kích thước mới của kho
    const adjustedBlocks = activeWarehouse.blocks.map(b => {
      let startCol = b.startCol;
      let startRow = b.startRow;
      let numCols = b.numCols;
      let numRows = b.numRows;

      if (startCol >= newCols) {
        startCol = Math.max(0, newCols - 1);
        numCols = 1;
      }
      if (startRow >= newRows) {
        startRow = Math.max(0, newRows - 1);
        numRows = 1;
      }

      if (startCol + numCols > newCols) {
        numCols = newCols - startCol;
      }
      if (startRow + numRows > newRows) {
        numRows = newRows - startRow;
      }

      return {
        ...b,
        startCol,
        startRow,
        numCols,
        numRows
      };
    }).filter(b => b.numCols >= 1 && b.numRows >= 1);

    const updated = warehouses.map(w => {
      if (w.id === activeWarehouse.id) {
        return {
          ...w,
          name: editWhName.trim() || w.name,
          cols: newCols,
          rows: newRows,
          blocks: adjustedBlocks
        };
      }
      return w;
    });

    saveWarehouses(updated);
    setIsEditingWarehouse(false);
  };

  // Khởi động giao diện sửa lô hàng
  const handleStartEditBlock = (block: WarehouseBlock) => {
    setEditBlockNote(block.note);
    setEditBlockNumCols(block.numCols);
    setEditBlockNumRows(block.numRows);
    setEditBlockTotalBags(block.totalBags);
    setEditBlockColor(block.color);
    setIsEditingBlock(true);
  };

  // Lưu thông tin lô hàng sau khi sửa đổi
  const handleSaveBlockEdit = (e: React.FormEvent, blockId: string) => {
    e.preventDefault();
    if (!activeWarehouse) return;

    const originalBlock = activeWarehouse.blocks.find(b => b.id === blockId);
    if (!originalBlock) return;

    let startCol = originalBlock.startCol;
    let startRow = originalBlock.startRow;
    let numCols = editBlockNumCols;
    let numRows = editBlockNumRows;

    if (startCol + numCols > activeWarehouse.cols) {
      startCol = Math.max(0, activeWarehouse.cols - numCols);
    }
    if (startRow + numRows > activeWarehouse.rows) {
      startRow = Math.max(0, activeWarehouse.rows - numRows);
    }

    const updatedBlocks = activeWarehouse.blocks.map(b => {
      if (b.id === blockId) {
        return {
          ...b,
          note: editBlockNote.trim() || 'Lô hàng nông sản',
          numCols,
          numRows,
          startCol,
          startRow,
          totalBags: editBlockTotalBags,
          color: editBlockColor
        };
      }
      return b;
    });

    const updatedWhs = warehouses.map(w => {
      if (w.id === activeWarehouse.id) {
        return { ...w, blocks: updatedBlocks };
      }
      return w;
    });

    saveWarehouses(updatedWhs);
    setIsEditingBlock(false);
  };

  // Tăng / giảm nhanh số bao trong bãi xếp
  const handleQuickAdjustBags = (blockId: string, amount: number) => {
    if (!activeWarehouse) return;
    const updatedBlocks = activeWarehouse.blocks.map(b => {
      if (b.id === blockId) {
        const newTotal = Math.max(1, b.totalBags + amount);
        return { ...b, totalBags: newTotal };
      }
      return b;
    });
    const updatedWhs = warehouses.map(w => {
      if (w.id === activeWarehouse.id) {
        return { ...w, blocks: updatedBlocks };
      }
      return w;
    });
    saveWarehouses(updatedWhs);
  };

  // Lưu thông tin ghi chú chi tiết thêm của lô hàng (Add Note)
  const handleSaveDetailedNote = (blockId: string) => {
    if (!activeWarehouse) return;
    const updatedBlocks = activeWarehouse.blocks.map(b => {
      if (b.id === blockId) {
        return { ...b, detailedNote: editDetailedNoteText.trim() };
      }
      return b;
    });
    const updatedWhs = warehouses.map(w => {
      if (w.id === activeWarehouse.id) {
        return { ...w, blocks: updatedBlocks };
      }
      return w;
    });
    saveWarehouses(updatedWhs);
    setIsEditingDetailedNote(false);
  };

  // Khôi phục text ghi chú khi chọn lô mới
  useEffect(() => {
    if (activeWarehouse && activeBlockId) {
      const block = activeWarehouse.blocks.find(b => b.id === activeBlockId);
      if (block) {
        setEditDetailedNoteText(block.detailedNote || '');
        setIsEditingDetailedNote(false);
      }
    }
  }, [activeBlockId, activeWarehouseId]);

  // Chức năng thao tác kéo chuột bôi đen
  const handleCellMouseDown = (r: number, c: number) => {
    if (editorMode !== 'draw') return;
    setIsDrawingMouse(true);
    setDrawStart({ r, c });
    setDrawCurrent({ r, c });
    setSelectedRange({
      startRow: r,
      startCol: c,
      endRow: r,
      endCol: c
    });
  };

  const handleCellMouseEnter = (r: number, c: number) => {
    if (!isDrawingMouse || !drawStart) return;
    setDrawCurrent({ r, c });
    
    // Tạo bounding box giữa ô bắt đầu và ô hiện tại
    setSelectedRange({
      startRow: Math.min(drawStart.r, r),
      startCol: Math.min(drawStart.c, c),
      endRow: Math.max(drawStart.r, r),
      endCol: Math.max(drawStart.c, c)
    });
  };

  const handleCellMouseUp = () => {
    if (!isDrawingMouse || !selectedRange) return;
    setIsDrawingMouse(false);
    
    // Thiết lập giá trị mặc định cho form dựa trên diện tích bôi đen
    const colsSelected = selectedRange.endCol - selectedRange.startCol + 1;
    const rowsSelected = selectedRange.endRow - selectedRange.startRow + 1;
    
    setBagNumCols(colsSelected);
    setBagNumRows(rowsSelected);
    setTotalBags(colsSelected * rowsSelected * bagHeightMultiplier); // Tải mẫu gấp 5 lần diện tích sàn
    setBagNote('');
    
    // Bật form nhập dữ liệu chốt xếp lô bao tiêu
    setShowConfigModal(true);
  };

  // Hủy vùng chọn bôi đen đang dở dang
  const handleCancelSelection = () => {
    setSelectedRange(null);
    setDrawStart(null);
    setDrawCurrent(null);
    setShowConfigModal(false);
  };

  // Tính lại tổng số bao tự động theo tích số vị trí x chiều cao ước tính khi thay đổi số lô
  useEffect(() => {
    if (showConfigModal) {
      setTotalBags(bagNumCols * bagNumRows * bagHeightMultiplier);
    }
  }, [bagNumCols, bagNumRows, bagHeightMultiplier, showConfigModal]);

  // Lưu lô hàng xếp bao mới
  const handleSaveActiveBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWarehouse || !selectedRange) return;

    // "Hệ thống tự điều chỉnh":
    // Lấy góc trên bên trái vùng bôi đen làm gốc chuẩn
    const baseCol = selectedRange.startCol;
    const baseRow = selectedRange.startRow;

    // Chiều kích người dùng mong muốn nhập (bagNumCols x bagNumRows)
    // Tự động kiểm tra nếu lấn ra ngoài rìa kho thì dịch chuyển lùi lại để khớp vừa trong kho
    let adjustedCol = baseCol;
    let adjustedRow = baseRow;

    if (baseCol + bagNumCols > activeWarehouse.cols) {
      adjustedCol = Math.max(0, activeWarehouse.cols - bagNumCols);
    }
    if (baseRow + bagNumRows > activeWarehouse.rows) {
      adjustedRow = Math.max(0, activeWarehouse.rows - bagNumRows);
    }

    // Tạo block hoặc cập nhật lô hàng
    const newBlock: WarehouseBlock = {
      id: `BLK-${Math.floor(1000 + Math.random() * 9000)}`,
      startCol: adjustedCol,
      startRow: adjustedRow,
      numCols: bagNumCols,
      numRows: bagNumRows,
      totalBags: totalBags,
      note: bagNote.trim() || 'Lô hàng tiêu chưa đặt tên',
      color: bagColor
    };

    // Kiểm tra đè lấn giữa các block hiện tại nếu cần? (Hệ thống cho phép chồng xếp trực quan hoặc gom vị trí)
    const updatedBlocks = [...activeWarehouse.blocks, newBlock];
    const updatedWhs = warehouses.map(w => {
      if (w.id === activeWarehouse.id) {
        return { ...w, blocks: updatedBlocks };
      }
      return w;
    });

    saveWarehouses(updatedWhs);
    
    // Dọn dẹp trạng thái hoàn tất vẽ
    setSelectedRange(null);
    setDrawStart(null);
    setDrawCurrent(null);
    setShowConfigModal(false);
    setActiveBlockId(newBlock.id); // Tự động chọn xem lô mới tinh vừa xếp
    setEditorMode('view'); // Trả về chế độ xem thông thường
  };

  // Xóa một lô hàng xếp bao tiêu ra khỏi kho
  const handleDeleteBlock = (blockId: string) => {
    if (!activeWarehouse) return;
    const filteredBlocks = activeWarehouse.blocks.filter(b => b.id !== blockId);
    
    const updatedWhs = warehouses.map(w => {
      if (w.id === activeWarehouse.id) {
        return { ...w, blocks: filteredBlocks };
      }
      return w;
    });

    saveWarehouses(updatedWhs);
    setActiveBlockId('');
  };

  // Kiểm tra một ô (r, c) có thuộc block nào đang có không, trả về block đó
  const findBlockAtCell = (r: number, c: number) => {
    if (!activeWarehouse) return null;
    return activeWarehouse.blocks.find(b => 
      r >= b.startRow && r < b.startRow + b.numRows &&
      c >= b.startCol && c < b.startCol + b.numCols
    );
  };

  // Đếm tổng số bao hiện tại trong kho active
  const calculateTotalBagsInWh = () => {
    if (!activeWarehouse) return 0;
    return activeWarehouse.blocks.reduce((sum, b) => sum + b.totalBags, 0);
  };

  // Render ra hình những bao tiêu xếp lớp chồng lên nhau siêu thực
  const renderBagsInCell = (block: WarehouseBlock, r: number, c: number) => {
    const cellsInBlock = block.numCols * block.numRows;
    const averageHeight = Math.ceil(block.totalBags / cellsInBlock);
    
    // Quyết định số lượng bao vẽ chồng lên nhau (Tối đa hiển thị 3 bao 3D offset sắc nét)
    const displayCount = Math.min(3, averageHeight);
    
    return (
      <div className="relative w-full h-full flex items-center justify-center p-0.5">
        {Array.from({ length: displayCount }).map((_, idx) => {
          // Các bao chồng xịch lệch nhẹ tạo hiệu ứng xếp đống 3D chân thực
          const offsetX = idx * 2.5; 
          const offsetY = idx * -2.5;
          const isTopBag = idx === displayCount - 1;

          return (
            <div 
              key={idx}
              className="absolute transition-transform duration-150"
              style={{
                transform: `translate(${offsetX}px, ${offsetY}px)`,
                zIndex: idx + 2,
                width: '80%',
                height: '80%'
              }}
            >
              {/* Vẽ bao tiêu đẹp từ Jute Canvas */}
              <svg viewBox="0 0 40 40" className="w-full h-full drop-shadow-sm filter">
                {/* Sack Body */}
                <path 
                  d="M 12,8 C 15,6 25,6 28,8 C 31,10 33,16 33,24 C 33,31 29,34 20,34 C 11,34 7,31 7,24 C 7,16 9,10 12,8 Z" 
                  fill={isTopBag ? "#D6B48C" : "#B8966E"} 
                  stroke="#7A4C2E" 
                  strokeWidth="1.5" 
                />
                
                {/* Burlap sack horizontal threads */}
                <path d="M 13,13 Q 20,15 27,13 M 11,19 Q 20,21 29,19 M 11,25 Q 20,27 29,25" stroke="#9E7852" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
                
                {/* Tied cord at the top bag */}
                <ellipse cx="20" cy="7.5" rx="3.5" ry="1.2" fill="#5C3F2B" />
                
                {/* Sack wrinkles */}
                <path d="M 11,9 C 14,11 14,13 13,15 M 29,9 C 26,11 26,13 27,15" stroke="#7A4C2E" strokeWidth="1" />
                
                {/* Mini Pepper grains count notation on top bag */}
                {isTopBag && idx === 0 && (
                  <text x="20" y="24" fontSize="7" fontWeight="bold" fill="#422512" textAnchor="middle" className="font-mono">
                    PEP
                  </text>
                )}
                {isTopBag && averageHeight > 1 && (
                  <text x="20" y="24" fontSize="8" fontWeight="black" fill="#3D1A04" textAnchor="middle" className="font-mono">
                    H-{averageHeight}
                  </text>
                )}
              </svg>
            </div>
          );
        })}
        
        {/* Số bao hiển thị bổ sung nếu xếp quá cao */}
        {averageHeight > 4 && (
          <span className="absolute bottom-0.5 right-0.5 bg-black/75 text-white font-mono text-[9px] font-black px-1 rounded-sm z-[10] border border-white/20">
            x{averageHeight}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      
      {/* 1. KHỐI TIÊU ĐỀ CHÍNH VÀ CHỌN KHO */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-zinc-150/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-50 rounded-xl text-amber-600 block">
              <Warehouse className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-black text-zinc-950 tracking-tight">Sơ Đồ & Simulation Kho Tiêu</h2>
          </div>
          <p className="text-[#8E8E93] text-[11px] font-bold uppercase tracking-wider">Cơ chế giả lập bố cục xếp bao nông sản trực quan khoa học</p>
        </div>

        {/* Cụm chọn kho và tạo kho */}
        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto">
          {warehouses.length > 0 && (
            <select
              value={activeWarehouseId}
              onChange={(e) => {
                setActiveWarehouseId(e.target.value);
                setActiveBlockId('');
                setSelectedRange(null);
              }}
              className="bg-[#F2F2F7] hover:bg-zinc-200 text-zinc-900 px-4 py-2.5 rounded-xl font-bold text-xs border-0 cursor-pointer focus:ring-2 focus:ring-[#007AFF] outline-none"
            >
              <option value="" disabled>-- Chọn Kho Chứa --</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>🏢 {w.name} ({w.cols}x{w.rows})</option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => setIsCreatingWarehouse(!isCreatingWarehouse)}
            className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 p-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 text-[#007AFF]" />
            <span className="hidden leading-none sm:inline">Khởi Tạo Kho Mới</span>
          </button>
        </div>
      </div>

      {/* BANNER ĐĂNG KÝ/KHỞI TẠO KHO CON SÔ LƯỢNG */}
      {isCreatingWarehouse && (
        <form onSubmit={handleCreateWarehouse} className="bg-white rounded-3xl p-5 border-2 border-dashed border-zinc-200 shadow-inner grid grid-cols-1 md:grid-cols-4 gap-4 items-end animate-fade-in">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider block px-1">Tên Gọi Kho (Ví dụ: Kho Trung Tâm, Vựa 2...)</label>
            <input
              type="text"
              required
              placeholder="Nhập tên gọi kho tiêu chứa..."
              value={newWhName}
              onChange={(e) => setNewWhName(e.target.value)}
              className="w-full bg-[#F2F2F7] rounded-xl px-4 py-3 font-bold text-xs border border-transparent focus:bg-white focus:border-[#007AFF] outline-none transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider block px-1">Chiều Ngang (Số ô: 4-30)</label>
            <input
              type="number"
              min="4"
              max="30"
              required
              value={newWhCols}
              onChange={(e) => setNewWhCols(parseInt(e.target.value) || 10)}
              className="w-full bg-[#F2F2F7] rounded-xl px-4 py-3 font-bold text-xs border border-transparent focus:bg-white focus:border-[#007AFF] outline-none transition-all"
            />
          </div>
          <div className="space-y-1.5 flex gap-2 items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider block px-1">Chiều Dọc (Số ô: 4-30)</label>
              <input
                type="number"
                min="4"
                max="30"
                required
                value={newWhRows}
                onChange={(e) => setNewWhRows(parseInt(e.target.value) || 10)}
                className="w-full bg-[#F2F2F7] rounded-xl px-4 py-3 font-bold text-xs border border-transparent focus:bg-white focus:border-[#007AFF] outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              className="bg-[#007AFF] text-white p-3 rounded-xl hover:bg-blue-600 font-bold text-xs cursor-pointer text-center whitespace-nowrap active:scale-95 transition-all"
            >
              Hành Động Tạo
            </button>
          </div>
        </form>
      )}

      {activeWarehouse ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          
          {/* CỘT TRÁI: ĐIỀU KHIỂN & BÁO CÁO THÔNG SỐ */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* THÔNG SỐ TOÀN DIỆN KHO */}
            <div className="bg-white rounded-3xl p-5 border border-zinc-150/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                {isEditingWarehouse ? (
                  <span className="font-bold text-xs text-zinc-800 uppercase tracking-wider flex items-center gap-1">
                    📝 Hiệu Chỉnh Thiết Kế Kho
                  </span>
                ) : (
                  <>
                    <span className="font-bold text-sm text-zinc-850 flex items-center gap-1">
                      🏫 {activeWarehouse.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditWhName(activeWarehouse.name);
                        setEditWhCols(activeWarehouse.cols);
                        setEditWhRows(activeWarehouse.rows);
                        setIsEditingWarehouse(true);
                      }}
                      className="text-zinc-400 hover:text-[#007AFF] hover:bg-zinc-100 p-1.5 rounded-lg transition-all"
                      title="Sửa kích thước và tên kho"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              
              {isEditingWarehouse ? (
                <form onSubmit={handleSaveWarehouseEdit} className="space-y-3.5 bg-zinc-50/50 p-4 rounded-2xl border border-zinc-200/60 text-xs animate-fade-in">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block px-1">Tên mặt bằng kho mới</label>
                    <input
                      type="text"
                      required
                      value={editWhName}
                      onChange={(e) => setEditWhName(e.target.value)}
                      className="w-full bg-white rounded-xl px-3 py-2 font-bold text-xs border border-zinc-200 focus:border-[#007AFF] outline-none"
                      placeholder="Tên kho của bạn..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block px-1">Số Ngang (Cột: 4-30)</label>
                      <input
                        type="number"
                        min="4"
                        max="30"
                        required
                        value={editWhCols}
                        onChange={(e) => setEditWhCols(Math.min(30, Math.max(4, parseInt(e.target.value) || 4)))}
                        className="w-full bg-white rounded-xl px-3 py-2 font-bold text-xs border border-zinc-200 focus:border-[#007AFF] outline-none text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block px-1">Số Dọc (Dòng: 4-30)</label>
                      <input
                        type="number"
                        min="4"
                        max="30"
                        required
                        value={editWhRows}
                        onChange={(e) => setEditWhRows(Math.min(30, Math.max(4, parseInt(e.target.value) || 4)))}
                        className="w-full bg-white rounded-xl px-0 py-2 font-bold text-xs border border-zinc-200 focus:border-[#007AFF] outline-none text-center"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1 border-t border-zinc-200/55">
                    <button
                      type="button"
                      onClick={() => setIsEditingWarehouse(false)}
                      className="flex-1 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-850 font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Bỏ Qua
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all cursor-pointer shadow-sm shadow-emerald-100"
                    >
                      Cập Nhật 💾
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-amber-50/50 p-3 rounded-2xl text-center space-y-1 border border-amber-100/30">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Tổng Bao Đã Xếp</span>
                    <span className="text-lg font-black text-amber-700 block">
                      {calculateTotalBagsInWh().toLocaleString('vi-VN')} <span className="text-[10px] font-medium">bao</span>
                    </span>
                  </div>
                  <div className="bg-blue-50/50 p-3 rounded-2xl text-center space-y-1 border border-blue-100/30">
                    <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">Kích Thước Kho</span>
                    <span className="text-lg font-black text-[#007AFF] block">
                      {activeWarehouse.cols}x{activeWarehouse.rows} <span className="text-[10px] font-medium">ô lưới</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Hướng dẫn bôi đen */}
              <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 space-y-3">
                <h4 className="text-xs font-bold text-zinc-700 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-[#007AFF]" />
                  Hướng Dẫn Vẽ & Giả Lập Bao Tiêu:
                </h4>
                <ul className="text-[11px] text-zinc-500 space-y-1.5 list-none pl-0 leading-relaxed">
                  <li className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#007AFF] mt-1 shrink-0"></span>
                    <span>Bước 1: Bật nút <strong className="text-zinc-800">"Bút vẽ Xếp Bao ✍️"</strong> ở bên phải sơ đồ kho.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#007AFF] mt-1 shrink-0"></span>
                    <span>Bước 2: <strong className="text-zinc-800">Nhấn giữ chuột & kéo bôi đen</strong> một khoảng ô nền vuông tùy ý. Có thể dùng thao tác click ô đầu và ô cuối dễ dàng trên điện thoại.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#007AFF] mt-1 shrink-0"></span>
                    <span>Bước 3: Nhả chuột, bảng cấu hình chi tiết xuất hiện. Nhập <strong className="text-zinc-800">Số bao thực tế (Ngang x Dọc)</strong> và Ghi Chú.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#007AFF] mt-1 shrink-0"></span>
                    <span>Bước 4: <strong className="text-emerald-600">Ấn Hoàn Tất</strong>. Hệ thống tự động căn chỉnh bo lùi gọn khớp tỉ lệ thực tế, vẽ các bao nông sản 3D sinh động nhất!</span>
                  </li>
                </ul>
              </div>

              {/* Nút hủy bỏ kho */}
              <button
                type="button"
                onClick={handleDeleteWarehouse}
                className="w-full py-2.5 rounded-2xl border border-red-200 text-red-500 hover:bg-red-50 active:scale-[98%] transition-all font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Giải Thể / Xóa Bỏ Sơ Đồ Kho</span>
              </button>
            </div>

            {/* CHI TIẾT LÔ HÀNG ĐANG CHỌN (NẾU CÓ) */}
            <div className="bg-white rounded-3xl p-5 border border-zinc-150/80 shadow-xs space-y-4">
              <h3 className="font-bold text-xs text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 border-b pb-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                Thông Tin Lô Hàng Đang Khảo Sát
              </h3>

              {activeBlockId && activeWarehouse.blocks.find(b => b.id === activeBlockId) ? (
                (() => {
                  const currentBlock = activeWarehouse.blocks.find(b => b.id === activeBlockId)!;
                  const totalPositions = currentBlock.numCols * currentBlock.numRows;
                  const currentHeight = Math.ceil(currentBlock.totalBags / totalPositions);

                  return (
                    <div className="space-y-4 animate-fade-in">
                      {isEditingBlock ? (
                        <form onSubmit={(e) => handleSaveBlockEdit(e, currentBlock.id)} className="space-y-3.5 bg-zinc-50/50 p-4 rounded-2xl border border-zinc-200/60 text-xs animate-fade-in font-semibold">
                          <div className="text-xs font-black text-zinc-700 uppercase tracking-wider border-b pb-1">
                            ✏️ Sửa Lô: {currentBlock.id}
                          </div>
                          
                          {/* Note / Tên lô hàng */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block px-1">Tên Hãng / Ghi Chú</label>
                            <input
                              type="text"
                              required
                              value={editBlockNote}
                              onChange={(e) => setEditBlockNote(e.target.value)}
                              className="w-full bg-white rounded-xl px-3 py-2 font-bold text-xs border border-zinc-200 focus:border-[#007AFF] outline-none"
                              placeholder="Ký hiệu lô, vựa thu mua..."
                            />
                          </div>

                          {/* Ngang & Dọc */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block px-1">Chiều Ngang (Bao)</label>
                              <input
                                type="number"
                                min="1"
                                max="30"
                                required
                                value={editBlockNumCols}
                                onChange={(e) => setEditBlockNumCols(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full bg-white rounded-xl px-3 py-2 font-bold text-xs border border-zinc-200 focus:border-[#007AFF] outline-none text-center"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block px-1">Chiều Dọc (Bao)</label>
                              <input
                                type="number"
                                min="1"
                                max="30"
                                required
                                value={editBlockNumRows}
                                onChange={(e) => setEditBlockNumRows(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full bg-white rounded-xl px-3 py-2 font-bold text-xs border border-zinc-200 focus:border-[#007AFF] outline-none text-center"
                              />
                            </div>
                          </div>

                          {/* Tổng số bao */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block px-1">Tổng số bao tiêu thực tế</label>
                            <input
                              type="number"
                              min="1"
                              required
                              value={editBlockTotalBags}
                              onChange={(e) => setEditBlockTotalBags(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-full bg-white rounded-xl px-3 py-2 font-black text-xs border border-zinc-200 focus:border-[#007AFF] outline-none text-[#007AFF] text-right font-mono"
                            />
                          </div>

                          {/* Chọn màu phân biệt */}
                          <div className="space-y-1 text-center">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Màu Sắc Lô Hàng</label>
                            <div className="flex items-center justify-center gap-1.5 pt-1">
                              {ACCENT_COLORS.map(c => {
                                const isActive = editBlockColor === c.bg;
                                return (
                                  <button
                                    key={c.name}
                                    type="button"
                                    onClick={() => setEditBlockColor(c.bg)}
                                    title={c.name}
                                    className={`w-6 h-6 rounded-full transition-all focus:outline-none flex items-center justify-center border ${
                                      isActive 
                                        ? 'scale-110 ring-2 ring-[#007AFF] border-white' 
                                        : 'border-zinc-300 hover:scale-105'
                                    }`}
                                    style={{ backgroundColor: c.rawBg }}
                                  >
                                    {isActive && <Check className="w-3 h-3 text-zinc-800" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2 border-t border-zinc-200/50">
                            <button
                              type="button"
                              onClick={() => setIsEditingBlock(false)}
                              className="flex-1 py-2 bg-zinc-200 hover:bg-zinc-350 text-zinc-855 font-bold rounded-xl transition-all"
                            >
                              Hủy Sửa
                            </button>
                            <button
                              type="submit"
                              className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-sm shadow-emerald-100"
                            >
                              Ghi Nhận 💾
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-1.5">
                            <div>
                              <span className="text-base font-black text-zinc-900 block leading-snug">{currentBlock.note}</span>
                              <span className="text-[10px] font-bold text-zinc-400">Mã Lô: <span className="font-mono">{currentBlock.id}</span></span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="flex items-center bg-zinc-50 p-1 rounded-lg border border-zinc-100">
                                <span className={`w-3 h-3 rounded-full ${ACCENT_COLORS.find(c => c.bg.split(' ')[0] === currentBlock.color.split(' ')[0])?.badge || 'bg-blue-500'}`}></span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleStartEditBlock(currentBlock)}
                                className="bg-zinc-100 hover:bg-[#007AFF]/10 hover:text-[#007AFF] text-zinc-700 px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                                title="Chỉnh sửa chi tiết tên, note hoặc tỷ lệ lưới"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Sửa</span>
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-zinc-50 p-2.5 rounded-xl">
                              <span className="text-[#8E8E93] block text-[10px] font-black uppercase tracking-wider">Tọa độ gốc</span>
                              <span className="font-bold text-[#007AFF]">Cột {currentBlock.startCol + 1} - Dòng {currentBlock.startRow + 1}</span>
                            </div>
                            <div className="bg-zinc-50 p-2.5 rounded-xl">
                              <span className="text-[#8E8E93] block text-[10px] font-black uppercase tracking-wider">Tỷ lệ lưới</span>
                              <span className="font-bold text-zinc-800">{currentBlock.numCols} ngang x {currentBlock.numRows} dọc ({totalPositions} ô)</span>
                            </div>
                            <div className="bg-zinc-50 p-2.5 rounded-xl col-span-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-[#8E8E93] block text-[10px] font-black uppercase tracking-wider">Tổng số bao xếp</span>
                                  <span className="font-mono font-black text-emerald-600 text-sm">{currentBlock.totalBags.toLocaleString('vi-VN')} bao tiêu</span>
                                </div>
                                <span className="text-[10px] font-bold text-amber-700 flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/50">
                                  <Layers className="w-3.5 h-3.5" />
                                  {currentHeight} lớp bao
                                </span>
                              </div>

                              {/* Tăng / giảm bao nhanh */}
                              <div className="mt-3 pt-2.5 border-t border-zinc-200/50 flex items-center justify-between gap-1.5">
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Tăng / Giảm số bao:</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAdjustBags(currentBlock.id, -50)}
                                    className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-650 rounded-lg text-[10px] font-bold font-mono transition-all active:scale-95 cursor-pointer"
                                    title="Bớt 50 bao tiêu"
                                  >
                                    -50
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAdjustBags(currentBlock.id, -10)}
                                    className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-650 rounded-lg text-[10px] font-bold font-mono transition-all active:scale-95 cursor-pointer"
                                    title="Bớt 10 bao tiêu"
                                  >
                                    -10
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAdjustBags(currentBlock.id, 10)}
                                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold font-mono transition-all active:scale-95 cursor-pointer"
                                    title="Thêm 10 bao tiêu"
                                  >
                                    +10
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAdjustBags(currentBlock.id, 50)}
                                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold font-mono transition-all active:scale-95 cursor-pointer"
                                    title="Thêm 50 bao tiêu"
                                  >
                                    +50
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* KHU VỰC GHI CHÚ CHI TIẾT (ADD NOTE) */}
                          <div className="bg-zinc-50/55 p-3 rounded-2xl border border-zinc-150/80 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                                📝 Ghi Chú Lô Hàng
                              </span>
                              {!isEditingDetailedNote && currentBlock.detailedNote && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditDetailedNoteText(currentBlock.detailedNote || '');
                                    setIsEditingDetailedNote(true);
                                  }}
                                  className="text-[11px] font-black text-[#007AFF] hover:underline flex items-center gap-0.5"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Sửa note</span>
                                </button>
                              )}
                            </div>

                            {isEditingDetailedNote ? (
                              <div className="space-y-2 animate-fade-in">
                                <textarea
                                  value={editDetailedNoteText}
                                  onChange={(e) => setEditDetailedNoteText(e.target.value)}
                                  placeholder="Nhập ghi chú chi tiết (ví dụ: Độ ẩm 12.5%, xe vựa cô Năm, hàng sấy máy ngày 25/5...)"
                                  className="w-full min-h-[70px] bg-white border border-zinc-200 rounded-xl p-2.5 text-xs font-semibold text-zinc-850 outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]/20 transition-all resize-none"
                                />
                                <div className="flex justify-end gap-1.5 text-[10px] font-bold">
                                  <button
                                    type="button"
                                    onClick={() => setIsEditingDetailedNote(false)}
                                    className="px-2.5 py-1.5 bg-zinc-250 rounded-lg hover:bg-zinc-300 text-zinc-700 transition-all cursor-pointer"
                                  >
                                    Hủy
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveDetailedNote(currentBlock.id)}
                                    className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all cursor-pointer shadow-sm shadow-emerald-100"
                                  >
                                    Lưu Lại 💾
                                  </button>
                                </div>
                              </div>
                            ) : currentBlock.detailedNote ? (
                              <div className="bg-[#FFF9E6]/80 border border-amber-200/50 rounded-xl p-3 text-xs text-amber-950 font-medium leading-relaxed italic relative">
                                &ldquo;{currentBlock.detailedNote}&rdquo;
                              </div>
                            ) : (
                              <div className="border border-dashed border-zinc-200 p-2.5 rounded-xl flex items-center justify-between gap-2 bg-white">
                                <span className="text-[10px] text-zinc-400 font-bold">Chưa có ghi chú cụ thể.</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditDetailedNoteText('');
                                    setIsEditingDetailedNote(true);
                                  }}
                                  className="px-2.5 py-1.5 bg-zinc-100 hover:bg-[#007AFF] hover:text-white text-zinc-750 text-[10px] font-black rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1 shrink-0"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Add Note</span>
                                </button>
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteBlock(currentBlock.id)}
                            className="w-full bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer border border-transparent hover:border-red-200"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hủy Xếp Lô Này Xuống Nền Kho</span>
                          </button>
                        </>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-6 text-zinc-400 space-y-2">
                  <p className="text-xs">Chưa chọn lô hàng kiểm tra chi tiết.</p>
                  <p className="text-[10px] text-zinc-350">Nhấp vào một lô hàng màu sắc bất kì trên bàn cờ sơ đồ để phân tích và kiểm tra.</p>
                </div>
              )}
            </div>

          </div>

          {/* CỘT PHẢI: BÀN CỜ ĐỒ HỌA MÔ PHỎNG GIẢ LẬP CHỮA BAO */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-5 border border-zinc-150/80 shadow-xs space-y-4">
            
            {/* Thanh tác vụ trên Workspace sờ đồ */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-xs font-black text-zinc-900">Workspace Mặt Bằng Kho Chứa</span>
              </div>

              {/* Chuyển chế độ xem / vẽ và zoom */}
              <div className="flex items-center gap-2">
                
                {/* Mode switch */}
                <div className="bg-[#F2F2F7] p-1 rounded-xl flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditorMode('view');
                      setSelectedRange(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                      editorMode === 'view'
                        ? 'bg-white text-[#007AFF] shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    🔍 Xem Lô
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditorMode('draw');
                      setDrawStart(null);
                      setDrawCurrent(null);
                      setSelectedRange(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
                      editorMode === 'draw'
                        ? 'bg-[#007AFF] text-white shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    <PenTool className="w-3 h-3" />
                    <span>Xếp Bao (Bút vẽ ✍️)</span>
                  </button>
                </div>

                {/* Phóng to thu nhỏ */}
                <div className="hidden sm:flex items-center bg-[#F2F2F7] rounded-xl p-1 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setCellSize(Math.max(32, cellSize - 6))}
                    className="p-1 px-2 text-zinc-650 cursor-pointer hover:bg-zinc-200 rounded-md"
                  >
                    -
                  </button>
                  <span className="px-1 text-zinc-500 font-mono text-[9px]">{cellSize}px</span>
                  <button
                    type="button"
                    onClick={() => setCellSize(Math.min(64, cellSize + 6))}
                    className="p-1 px-2 text-zinc-650 cursor-pointer hover:bg-zinc-200 rounded-md"
                  >
                    +
                  </button>
                </div>

              </div>
            </div>

            {/* Hint hướng dẫn trạng thái */}
            {editorMode === 'draw' && (
              <div className="bg-blue-50/75 border border-blue-150 text-blue-900 p-3 rounded-2xl text-[11px] font-semibold flex items-center gap-1.5 animate-pulse">
                <PenTool className="w-4 h-4 text-[#007AFF]" />
                <span>
                  Đang bật bút vẽ! Hãy bấm giữ và di kéo bôi đen vùng ô bàn cờ bên dưới, hoặc click ô đầu và ô cuối để chốt vị trí xếp bao.
                </span>
                <button
                  type="button"
                  onClick={handleCancelSelection}
                  className="ml-auto text-xs font-bold text-red-600 hover:underline shrink-0"
                >
                  Hủy vẽ
                </button>
              </div>
            )}

            {/* KHÔNG GIAN BÀN CỜ QUY MÔ SƠ ĐỒ KHO TIÊU CHUẨN */}
            <div className="w-full overflow-auto max-h-[500px] border border-zinc-200 rounded-2xl bg-zinc-50/50 p-4 scrollbar-thin">
              <div 
                className="grid gap-[1px] bg-zinc-200 mx-auto select-none"
                style={{
                  gridTemplateColumns: `repeat(${activeWarehouse.cols}, minmax(${cellSize}px, ${cellSize}px))`,
                  width: 'max-content'
                }}
              >
                {/* Render tất cả các ô trong grid của kho chứa */}
                {Array.from({ length: activeWarehouse.rows }).map((_, rIdx) => {
                  return Array.from({ length: activeWarehouse.cols }).map((_, cIdx) => {
                    const block = findBlockAtCell(rIdx, cIdx);
                    
                    // Kiểm tra xem ô này có nằm trong vùng bôi đen tạm thời không
                    const isSelected = selectedRange && 
                      rIdx >= selectedRange.startRow && rIdx <= selectedRange.endRow &&
                      cIdx >= selectedRange.startCol && cIdx <= selectedRange.endCol;

                    const isBlockActive = block && block.id === activeBlockId;
                    
                    return (
                      <div
                        key={`${rIdx}-${cIdx}`}
                        onMouseDown={() => handleCellMouseDown(rIdx, cIdx)}
                        onMouseEnter={() => handleCellMouseEnter(rIdx, cIdx)}
                        onMouseUp={handleCellMouseUp}
                        onClick={() => {
                          if (editorMode === 'view' && block) {
                            setActiveBlockId(block.id);
                          } else if (editorMode === 'draw') {
                            // Chế độ vẽ click đơn giản trên ipad/mobile phục vụ thay việc nhấn giữ
                            if (!drawStart) {
                              setDrawStart({ r: rIdx, c: cIdx });
                              setDrawCurrent({ r: rIdx, c: cIdx });
                              setSelectedRange({
                                startRow: rIdx,
                                startCol: cIdx,
                                endRow: rIdx,
                                endCol: cIdx
                              });
                            } else {
                              // Click lần 2 -> Khóa vùng bôi đen và mở popup cài đặt
                              const startR = Math.min(drawStart.r, rIdx);
                              const startC = Math.min(drawStart.c, cIdx);
                              const endR = Math.max(drawStart.r, rIdx);
                              const endC = Math.max(drawStart.c, cIdx);
                              
                              setSelectedRange({
                                startRow: startR,
                                startCol: startC,
                                endRow: endR,
                                endCol: endC
                              });

                              setBagNumCols(endC - startC + 1);
                              setBagNumRows(endR - startR + 1);
                              setTotalBags((endC - startC + 1) * (endR - startR + 1) * bagHeightMultiplier);
                              setBagNote('');
                              setShowConfigModal(true);
                              setDrawStart(null);
                            }
                          }
                        }}
                        style={{
                          width: `${cellSize}px`,
                          height: `${cellSize}px`
                        }}
                        className={`relative cursor-pointer transition-all duration-100 flex items-center justify-center text-[9px] font-mono select-none ${
                          block 
                            ? isBlockActive 
                              ? `${block.color} ring-2 ring-emerald-500 z-10 scale-[98%] shadow-xs`
                              : `${block.color} opacity-95 hover:opacity-100`
                            : isSelected
                              ? 'bg-blue-400/80 border border-blue-500 text-white z-10 animate-pulse'
                              : 'bg-white hover:bg-zinc-100 text-zinc-350'
                        }`}
                      >
                        {/* Hiển thị tọa độ nếu là ô trống và ô nhỏ vừa hoặc lướt qua */}
                        {!block && !isSelected && (
                          <span className="text-[7.5px] opacity-40">
                            {String.fromCharCode(65 + cIdx)}{rIdx + 1}
                          </span>
                        )}

                        {/* Nếu ô thuộc block, render ra đống bao tiêu */}
                        {block && renderBagsInCell(block, rIdx, cIdx)}
                        
                        {/* Nếu ô là góc trên bên trái của block, có thể ghi chú tiêu hiệu hoặc tổng */}
                        {block && block.startRow === rIdx && block.startCol === cIdx && (
                          <div className="absolute top-0.5 left-0.5 pointer-events-none z-[8] bg-black/60 text-white px-1 py-0.2 rounded-sm text-[6.5px] whitespace-nowrap overflow-hidden max-w-[200%] font-sans font-bold uppercase tracking-wide">
                            {block.note.substring(0, 10)}
                          </div>
                        )}
                      </div>
                    );
                  });
                })}
              </div>
            </div>

            {/* Chi tiết phụ chú chân grid */}
            <div className="flex flex-wrap items-center justify-between text-[11px] text-zinc-400 font-bold bg-zinc-50 p-3 rounded-2xl border border-zinc-100">
              <span className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-blue-500" />
                Ký hiệu cột: A - Z, Dòng: 1 - 30.
              </span>
              <span className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 bg-white border border-zinc-200"></span> Nền Kho Khả Dụng
                <span className="inline-block w-3 h-3 bg-blue-100 border border-blue-400"></span> Đang Bôi Đen Chọn
              </span>
            </div>

          </div>

        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 border border-zinc-150/80 shadow-xs text-center space-y-6 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-500 flex items-center justify-center text-3xl mx-auto shadow-md">
            🌾
          </div>
          <div className="space-y-2">
            <h3 className="font-extrabold text-lg text-zinc-900">Sơ Đồ Kho Đang Trống Rỗng</h3>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Bạn chưa có mô phỏng kho nông sản nào được thiết lập. Hãy bấm nút khởi tạo kho phía trên, đặt kích thước sàn (mặt bằng) để bắt đầu xếp bao tiêu giả lập thực tế ngay lập tức.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreatingWarehouse(true)}
            className="bg-[#007AFF] text-white px-6 py-3 rounded-2xl font-bold text-xs inline-flex items-center gap-2 shadow-md shadow-blue-100 cursor-pointer active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            Tạo Kho Thử Nghiệm Ngay
          </button>
        </div>
      )}

      {/* POPUP CONTAINER: POPUP NHẬP SỐ BAU NGANG / DỌC & GHI CHÚ CHỐT XẾP BAO */}
      {showConfigModal && selectedRange && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-zinc-200 animate-scale-up">
            
            {/* Header popup */}
            <div className="bg-[#007AFF] px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm flex items-center gap-1.5 text-white">
                  📦 Lập Quyết Định Xếp Lô Bao Tiêu
                </h3>
                <p className="text-blue-100 text-[10px] uppercase font-bold tracking-wider mt-0.5">
                  Vị trí gốc: dòng {selectedRange.startRow + 1}, cột {selectedRange.startCol + 1}
                </p>
              </div>
              <button 
                type="button"
                onClick={handleCancelSelection}
                className="text-white hover:bg-white/20 p-1.5 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form cài đặt */}
            <form onSubmit={handleSaveActiveBlock} className="p-6 space-y-4">
              
              <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-100 gap-1 flex items-center justify-between text-xs">
                <span className="text-zinc-500">Kích cỡ vùng bôi đen nguyên gốc:</span>
                <span className="font-extrabold text-zinc-800">
                  {selectedRange.endCol - selectedRange.startCol + 1} dọc x {selectedRange.endRow - selectedRange.startRow + 1} ngang
                </span>
              </div>

              {/* Ngang & Dọc */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block px-1">Số bao ngang (Số cột)</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={bagNumCols}
                    onChange={(e) => setBagNumCols(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-[#F2F2F7] rounded-xl px-4 py-3 font-bold text-xs border border-transparent focus:bg-white focus:border-[#007AFF] outline-none transition-all text-center"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block px-1">Số bao dọc (Số dòng)</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={bagNumRows}
                    onChange={(e) => setBagNumRows(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-[#F2F2F7] rounded-xl px-4 py-3 font-bold text-xs border border-transparent focus:bg-white focus:border-[#007AFF] outline-none transition-all text-center"
                  />
                </div>
              </div>

              {/* Multiplier / Ước lượng chiều cao chồng bao */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#8E8E93] uppercase tracking-wider block px-1">Độ cao bãi xếp (Số bao chồng lên nhau: 1 - 15)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="15"
                    value={bagHeightMultiplier}
                    onChange={(e) => setBagHeightMultiplier(parseInt(e.target.value) || 5)}
                    className="flex-1 accent-[#007AFF]"
                  />
                  <span className="font-mono font-bold text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg border border-amber-200">
                    {bagHeightMultiplier} lớp
                  </span>
                </div>
              </div>

              {/* Tổng số bao tiêu */}
              <div className="space-y-1.5 bg-yellow-50/50 p-3 rounded-2xl border border-yellow-250 flex items-center justify-between">
                <div>
                  <label className="text-[10px] font-black text-amber-800 uppercase tracking-wider block">Tổng số bao xếp thực tính</label>
                  <span className="text-[10px] text-zinc-400">(Tự tính = Rộng {bagNumCols} x Dài {bagNumRows} x Cao {bagHeightMultiplier})</span>
                </div>
                <input
                  type="number"
                  min="1"
                  required
                  value={totalBags}
                  onChange={(e) => setTotalBags(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-32 bg-white rounded-xl px-3 py-2 font-black text-sm border border-zinc-200/50 text-right text-[#007AFF] font-mono shadow-inner outline-none focus:border-[#007AFF]"
                />
              </div>

              {/* Ghi chú */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block px-1">Hãng Sản Xuất / Ký Hiệu Phụ Chú</label>
                <input
                  type="text"
                  placeholder="Ghi chú (Ví dụ: Tiêu đen thô Tây Nguyên, Tiêu vựa Chị Năm)..."
                  value={bagNote}
                  onChange={(e) => setBagNote(e.target.value)}
                  className="w-full bg-[#F2F2F7] rounded-xl px-4 py-3 font-bold text-xs border border-transparent focus:bg-white focus:border-[#007AFF] outline-none transition-all placeholder:text-zinc-350"
                />
              </div>

              {/* Chọn mã màu phân biệt */}
              <div className="space-y-1.5 text-center">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block px-1">Mã Màu Phân Biệt Sơ Đồ</label>
                <div className="flex items-center justify-center gap-2 pt-1">
                  {ACCENT_COLORS.map(c => {
                    const isActive = bagColor === c.bg;
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setBagColor(c.bg)}
                        title={c.name}
                        className={`w-6 h-6 rounded-full transition-all focus:outline-none flex items-center justify-center border ${
                          isActive 
                            ? 'scale-110 ring-2 ring-[#007AFF] border-white' 
                            : 'border-zinc-300 hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.rawBg }}
                      >
                        {isActive && <Check className="w-3 h-3 text-zinc-800" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hệ thống thông tin căn chỉnh */}
              <div className="text-[10px] text-zinc-400 font-medium italic text-center text-zinc-400 leading-relaxed border-t pt-3">
                ⚠️ Hệ thống sẽ tự động dời chuyển lùi vị trí nếu kích thước bạn nhập lấn tràn khỏi bờ tường ngoài của kho chứa.
              </div>

              {/* Nút hành động */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancelSelection}
                  className="w-full py-3 bg-[#F2F2F7] hover:bg-zinc-200 text-zinc-800 font-bold text-xs rounded-2xl transition-all cursor-pointer active:scale-95"
                >
                  Bỏ Chọn Vẽ
                </button>
                <button
                  type="submit"
                  className="w-full py-3 bg-[#007AFF] text-white hover:bg-blue-600 font-black text-xs rounded-2xl transition-all shadow-md shadow-blue-100 cursor-pointer active:scale-95"
                >
                  Xác Nhận & Thiết Định 🏗️
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
