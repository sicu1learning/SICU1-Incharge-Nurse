import React, { useState } from 'react';
import {
  ShieldCheck,
  Plus,
  Search,
  User,
  Clock,
  Trash2,
  Edit2,
  CheckCircle2,
  X,
  Package,
  ArrowRightLeft,
  AlertCircle,
} from 'lucide-react';
import { ValuableItem, ValuableItemStatus } from '../types';

interface ValuableItemsSectionProps {
  items: ValuableItem[];
  currentIncharge: string;
  onAddItem: (item: Omit<ValuableItem, 'id' | 'createdAt'>) => Promise<void> | void;
  onEditItem?: (id: string, updated: Partial<ValuableItem>) => Promise<void> | void;
  onDeleteItem?: (id: string) => Promise<void> | void;
  isLoading?: boolean;
}

const STATUS_CONFIG: Record<
  ValuableItemStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  stored: {
    label: 'ฝากรักษาในวอร์ด',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
  },
  returned: {
    label: 'ส่งคืนผู้ป่วย/ญาติแล้ว',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
  },
  transferred: {
    label: 'ส่งต่อไปตึก/ธุรการ',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
  },
  active: {
    label: 'อยู่ระหว่างดำเนินการ',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
  },
};

export const ValuableItemsSection: React.FC<ValuableItemsSectionProps> = ({
  items,
  currentIncharge,
  onAddItem,
  onEditItem,
  onDeleteItem,
  isLoading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ValuableItemStatus>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ValuableItem | null>(null);

  // Form states
  const [patientName, setPatientName] = useState('');
  const [hn, setHn] = useState('');
  const [bedNumber, setBedNumber] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [custodian, setCustodian] = useState('');
  const [receiver, setReceiver] = useState('');
  const [status, setStatus] = useState<ValuableItemStatus>('stored');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const safeItems = Array.isArray(items) ? items : [];

  const filteredItems = safeItems.filter((item) => {
    if (!item) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    const q = searchTerm.toLowerCase();
    const pName = (item.patientName || '').toLowerCase();
    const pDesc = (item.itemDescription || '').toLowerCase();
    const pHn = (item.hn || '').toLowerCase();
    const pBed = (item.bedNumber || '').toLowerCase();
    return pName.includes(q) || pDesc.includes(q) || pHn.includes(q) || pBed.includes(q);
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setPatientName('');
    setHn('');
    setBedNumber('');
    setItemDescription('');
    setCustodian(currentIncharge || '');
    setReceiver('');
    setStatus('stored');
    setNotes('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ValuableItem) => {
    setEditingItem(item);
    setPatientName(item.patientName || '');
    setHn(item.hn || '');
    setBedNumber(item.bedNumber || '');
    setItemDescription(item.itemDescription || '');
    setCustodian(item.custodian || currentIncharge || '');
    setReceiver(item.receiver || '');
    setStatus(item.status || 'stored');
    setNotes(item.notes || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      setFormError('กรุณาระบุชื่อผู้ป่วย');
      return;
    }
    if (!itemDescription.trim()) {
      setFormError('กรุณาระบุรายละเอียดทรัพย์สิน/ของมีค่า');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      if (editingItem && onEditItem) {
        await onEditItem(editingItem.id, {
          patientName: patientName.trim(),
          hn: hn.trim(),
          bedNumber: bedNumber.trim(),
          itemDescription: itemDescription.trim(),
          custodian: custodian.trim() || currentIncharge,
          receiver: receiver.trim(),
          status,
          notes: notes.trim(),
        });
      } else {
        const now = new Date();
        const thaiDate = `${String(now.getDate()).padStart(2, '0')}/${String(
          now.getMonth() + 1
        ).padStart(2, '0')}/${now.getFullYear() + 543}`;

        await onAddItem({
          patientName: patientName.trim(),
          hn: hn.trim(),
          bedNumber: bedNumber.trim(),
          itemDescription: itemDescription.trim(),
          custodian: custodian.trim() || currentIncharge,
          receiver: receiver.trim(),
          status,
          dateAdded: thaiDate,
          notes: notes.trim(),
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message || 'บันทึกข้อมูลล้มเหลว');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="valuable-items-section" className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0 mt-0.5 border border-amber-200/60">
              <ShieldCheck className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800 font-['Prompt',sans-serif]">
                  ของมีค่า / ทรัพย์สินผู้ป่วย
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200">
                  {safeItems.length} รายการ
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                บันทึกการรับฝาก ส่งมอบ และส่งคืนทรัพย์สินมีค่าของผู้ป่วย
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#b45309] hover:bg-[#92400e] text-white text-xs font-medium transition shadow-sm cursor-pointer active:scale-95 flex-shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>บันทึกของมีค่า</span>
          </button>
        </div>

        {/* Filter and Search */}
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อผู้ป่วย, HN, เตียง หรือสิ่งของ..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['all', 'stored', 'returned', 'transferred'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {st === 'all'
                  ? 'ทั้งหมด'
                  : st === 'stored'
                  ? 'ฝากรักษา'
                  : st === 'returned'
                  ? 'คืนแล้ว'
                  : 'ส่งต่อ'}
              </button>
            ))}
          </div>
        </div>

        {/* List of items */}
        <div className="mt-4 space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
              <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs">ไม่มีรายการของมีค่าที่บันทึกไว้</p>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-xs text-amber-600 underline mt-1 cursor-pointer"
                >
                  ล้างคำค้นหา
                </button>
              )}
            </div>
          ) : (
            filteredItems.map((item) => {
              const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.stored;
              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-slate-200/90 hover:border-amber-300 bg-white transition hover:shadow-xs flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.bedNumber && (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-xs">
                          เตียง {item.bedNumber}
                        </span>
                      )}
                      <span className="font-semibold text-sm text-slate-800 font-['Prompt',sans-serif]">
                        {item.patientName}
                      </span>
                      {item.hn && (
                        <span className="text-xs text-slate-400 font-mono">
                          (HN: {item.hn})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                      >
                        {cfg.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        title="แก้ไขข้อมูล"
                        className="p-1 rounded text-slate-400 hover:text-amber-700 hover:bg-amber-50 cursor-pointer transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {onDeleteItem && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`ต้องการลบรายการของมีค่าของ "${item.patientName}" หรือไม่?`)) {
                              onDeleteItem(item.id);
                            }
                          }}
                          title="ลบรายการ"
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="text-xs text-slate-700 bg-amber-50/40 p-2 rounded-lg border border-amber-100/80">
                    <span className="font-medium text-amber-950">รายการ: </span>
                    {item.itemDescription}
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      {item.custodian && (
                        <span>ผู้รับฝาก: <strong className="text-slate-600 font-normal">{item.custodian}</strong></span>
                      )}
                      {item.receiver && (
                        <span>ผู้รับมอบ/ส่งคืน: <strong className="text-slate-600 font-normal">{item.receiver}</strong></span>
                      )}
                    </div>
                    {item.dateAdded && (
                      <span className="text-slate-400 font-mono text-[10px]">
                        วันที่: {item.dateAdded}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-800 font-['Prompt',sans-serif]">
                  {editingItem ? 'แก้ไขบันทึกของมีค่า' : 'บันทึกของมีค่า / ทรัพย์สินผู้ป่วย'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เตียง
                  </label>
                  <input
                    type="text"
                    value={bedNumber}
                    onChange={(e) => setBedNumber(e.target.value)}
                    placeholder="เช่น 1, 2, Iso-1"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    HN
                  </label>
                  <input
                    type="text"
                    value={hn}
                    onChange={(e) => setHn(e.target.value)}
                    placeholder="เช่น 66012345"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อ-สกุล ผู้ป่วย <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="เช่น นายสมชาย ใจดี"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รายการของมีค่า / ทรัพย์สิน <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  placeholder="เช่น สร้อยคอทองคำ 1 เส้น, โทรศัพท์ iPhone 14 1 เครื่อง, เงินสด 3,500 บาท ในกระเป๋าสตางค์สีน้ำตาล"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    สถานะการเก็บรักษา
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ValuableItemStatus)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                  >
                    <option value="stored">ฝากรักษาในวอร์ด (ตู้เซฟ)</option>
                    <option value="returned">ส่งมอบคืนผู้ป่วย/ญาติแล้ว</option>
                    <option value="transferred">ส่งต่อตึก/ธุรการ</option>
                    <option value="active">อยู่ระหว่างดำเนินการ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ผู้รับฝาก / ผู้บันทึก
                  </label>
                  <input
                    type="text"
                    value={custodian}
                    onChange={(e) => setCustodian(e.target.value)}
                    placeholder="ชื่อพยาบาลผู้รับฝาก"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {status === 'returned' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ผู้รับมอบ / ญาติผู้รับคืน
                  </label>
                  <input
                    type="text"
                    value={receiver}
                    onChange={(e) => setReceiver(e.target.value)}
                    placeholder="ชื่อผู้รับคืน หรือระบุความสัมพันธ์"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หมายเหตุเพิ่มเติม / ตำแหน่งที่เก็บ
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="เช่น เก็บในตู้เซฟช่อง A2, ญาติเซ็นรับเอกสารแล้ว"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-medium text-white bg-[#b45309] hover:bg-[#92400e] rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'กำลังบันทึกลง Sheets...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
