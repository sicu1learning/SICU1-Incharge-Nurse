import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Search,
  Clock,
  User,
  Archive,
  Edit2,
  CheckCircle2,
  X,
  History,
} from 'lucide-react';
import { HandoverItem } from '../types';

interface HandoverSectionProps {
  items: HandoverItem[];
  currentIncharge: string;
  onAddItem: (item: Omit<HandoverItem, 'id' | 'createdAt'>) => void;
  onEditItem?: (id: string, updated: Partial<HandoverItem>) => void;
  onDeleteItem: (id: string) => void;
  onToggleComplete?: (id: string) => void;
  onViewHistory?: () => void;
}

export const HandoverSection: React.FC<HandoverSectionProps> = ({
  items,
  currentIncharge,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onToggleComplete,
  onViewHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HandoverItem | null>(null);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');

  const safeItems = Array.isArray(items) ? items : [];

  const filteredItems = safeItems.filter((item) => {
    if (!item) return false;
    const q = searchTerm.toLowerCase();
    const titleStr = (item.title || '').toLowerCase();
    const detailsStr = (item.details || '').toLowerCase();
    const patientStr = (item.patientName || '').toLowerCase();
    return (
      titleStr.includes(q) ||
      detailsStr.includes(q) ||
      patientStr.includes(q)
    );
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setTitle('');
    setDetails('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: HandoverItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setDetails(item.details || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingItem && onEditItem) {
      onEditItem(editingItem.id, {
        title: title.trim(),
        details: details.trim(),
      });
    } else {
      onAddItem({
        title: title.trim(),
        details: details.trim(),
        createdBy: currentIncharge,
        shiftId: 'shift-current',
        isCompleted: false,
      });
    }

    // Reset form
    setTitle('');
    setDetails('');
    setEditingItem(null);
    setIsModalOpen(false);
  };

  return (
    <div id="handover-section" className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 flex-shrink-0 mt-0.5">
              <MessageSquare className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800 font-['Prompt',sans-serif]">
                  เรื่องส่งต่อข้อมูล
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200">
                  {items.length} รายการ
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                บันทึกและส่งมอบข้อมูลสำคัญระหว่างเวร
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {onViewHistory && (
              <button
                type="button"
                onClick={onViewHistory}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer active:scale-95"
                title="ดูประวัติเรื่องส่งต่อที่ถูกเก็บถาวรทั้งหมดใน Google Sheets"
              >
                <History className="w-4 h-4 text-slate-600" />
                <span>ประวัติส่งเวร</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#00796b] hover:bg-[#00695c] text-white text-xs font-medium transition shadow-sm cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>เพิ่มเรื่องส่งต่อ</span>
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="relative mt-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาเรื่องส่งต่อ หรือรายละเอียด..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-slate-400"
          />
        </div>

        {/* Meta summary row */}
        <div className="flex items-center justify-between text-xs text-slate-400 mt-3 mb-2 px-1">
          <span>แสดง {filteredItems.length} รายการ</span>
          <span className="italic">* ข้อมูลจะถูกบันทึกเก็บไว้ในประวัติ</span>
        </div>

        {/* Content list or empty state */}
        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200/90 py-16 px-4 flex flex-col items-center justify-center text-center bg-slate-50/40 my-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6 text-slate-300 stroke-[1.5]" />
            </div>
            <p className="text-xs text-slate-400 font-medium">
              {searchTerm ? 'ไม่พบเรื่องส่งต่อที่ตรงกับการค้นหา' : 'ยังไม่มีข้อมูลเรื่องส่งต่อ'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 my-2 max-h-[420px] overflow-y-auto pr-1">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-teal-300 shadow-xs transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-slate-800">
                      {item.title}
                    </h4>

                    {item.details && (
                      <p className="text-xs text-slate-600 mt-1.5 whitespace-pre-wrap leading-relaxed">
                        {item.details}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {item.createdBy}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(item.createdAt).toLocaleTimeString('th-TH', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition cursor-pointer"
                      title="แก้ไขข้อมูล"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const confirmArchive = window.confirm(
                          `ต้องการเก็บเรื่องส่งต่อ "${item.title}" เข้าสู่ 'ประวัติส่งเวร (Handover History)' หรือไม่?\n\n(ข้อมูลจะถูกย้ายไปจัดเก็บถาวรในแท็บ Handover_History บน Google Sheets ไม่สูญหาย)`
                        );
                        if (confirmArchive) {
                          onDeleteItem(item.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                      title="เก็บเข้าประวัติส่งเวร (Archive to Handover_History)"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Handover Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#00796b] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-5 h-5 text-teal-200 stroke-[2]" />
                <h3 className="font-semibold text-base font-['Prompt',sans-serif]">
                  {editingItem ? 'แก้ไขเรื่องส่งต่อข้อมูล' : 'เพิ่มเรื่องส่งต่อข้อมูล (Shift Handover Note)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  หัวข้อเรื่องส่งต่อ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ระบุข้อมูล..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00796b] placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  รายละเอียด / สิ่งที่ต้องปฏิบัติต่อ
                </label>
                <textarea
                  rows={4}
                  placeholder="ระบุรายละเอียดเพื่อการส่งมอบงานอย่างถูกต้องและชัดเจน..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00796b] placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-medium bg-[#00796b] hover:bg-[#00695c] text-white rounded-xl transition shadow-sm cursor-pointer"
                >
                  {editingItem ? 'บันทึกการแก้ไข' : 'บันทึกเรื่องส่งต่อ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
