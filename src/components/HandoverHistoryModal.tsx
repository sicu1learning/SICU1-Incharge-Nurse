import React, { useState } from 'react';
import {
  History,
  X,
  Search,
  Calendar,
  User,
  CheckCircle2,
  FileText,
  Clock,
  Archive,
  RefreshCw,
} from 'lucide-react';
import { HandoverHistoryItem } from '../types';

interface HandoverHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyItems: HandoverHistoryItem[];
  onRefresh?: () => Promise<void> | void;
  isLoading?: boolean;
}

export const HandoverHistoryModal: React.FC<HandoverHistoryModalProps> = ({
  isOpen,
  onClose,
  historyItems,
  onRefresh,
  isLoading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!isOpen) return null;

  const safeItems = Array.isArray(historyItems) ? historyItems : [];

  const filteredItems = safeItems.filter((item) => {
    if (!item) return false;
    if (selectedCategory !== 'all' && item.category !== selectedCategory) {
      return false;
    }
    const q = searchTerm.toLowerCase();
    const t = (item.title || '').toLowerCase();
    const d = (item.details || '').toLowerCase();
    const p = (item.patientName || '').toLowerCase();
    const b = (item.bedNumber || '').toLowerCase();
    const sid = (item.source_handover_id || '').toLowerCase();
    const ab = (item.archivedBy || '').toLowerCase();
    return (
      t.includes(q) ||
      d.includes(q) ||
      p.includes(q) ||
      b.includes(q) ||
      sid.includes(q) ||
      ab.includes(q)
    );
  });

  // Extract unique categories
  const categories = Array.from(
    new Set(safeItems.map((i) => i.category).filter(Boolean))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#004d40] text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-teal-200">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base font-['Prompt',sans-serif]">
                  ประวัติเรื่องส่งต่อ (Handover History)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-teal-100">
                  {safeItems.length} รายการ
                </span>
              </div>
              <p className="text-xs text-teal-200/80">
                ข้อมูลที่ถูกจัดเก็บถาวรจากแท็บ Handover_History บน Google Sheets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                title="โหลดข้อมูลล่าสุดจาก Google Sheets"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex flex-col sm:flex-row gap-3 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาเรื่องส่งต่อ, ผู้ป่วย, เตียง, หรือผู้จัดเก็บ..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 placeholder:text-slate-400"
            />
          </div>

          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                  selectedCategory === 'all'
                    ? 'bg-[#00796b] text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                ทั้งหมด
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat as string)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-[#00796b] text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* List of items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <History className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
              <p className="text-sm font-medium text-slate-600">
                {searchTerm || selectedCategory !== 'all'
                  ? 'ไม่พบข้อมูลตามเงื่อนไขการค้นหา'
                  : 'ยังไม่มีรายการเรื่องส่งต่อที่ถูกเก็บเข้าประวัติ'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                เมื่อกดปุ่มเก็บเข้าประวัติ (Archive) จากหน้า Dashboard ข้อมูลจะถูกย้ายมาเก็บถาวรที่นี่
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-teal-300 transition shadow-xs flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.bedNumber && (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-xs">
                        เตียง {item.bedNumber}
                      </span>
                    )}
                    {item.patientName && (
                      <span className="font-semibold text-sm text-slate-800 font-['Prompt',sans-serif]">
                        {item.patientName}
                      </span>
                    )}
                    <span className="font-medium text-sm text-slate-900">
                      {item.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.source_handover_id && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-500 border border-slate-200" title="Source Handover ID">
                        ID: {item.source_handover_id}
                      </span>
                    )}
                    {item.isCompleted ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> ดำเนินการแล้ว
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        ยังไม่แล้วเสร็จ
                      </span>
                    )}
                  </div>
                </div>

                {item.details && (
                  <p className="text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100 whitespace-pre-wrap leading-relaxed">
                    {item.details}
                  </p>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 flex-wrap gap-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    {item.createdBy && (
                      <span>ผู้สร้าง: <strong className="text-slate-600 font-normal">{item.createdBy}</strong></span>
                    )}
                    {item.archivedBy && (
                      <span>ผู้เก็บเข้าประวัติ: <strong className="text-slate-600 font-normal">{item.archivedBy}</strong></span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px]">
                    {item.archivedAt && (
                      <span>
                        จัดเก็บเมื่อ:{' '}
                        {new Date(item.archivedAt).toLocaleString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
          <span>
            แสดง {filteredItems.length} จากทั้งหมด {safeItems.length} รายการ
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
