import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  MapPin,
  Trash2,
  Edit2,
  CheckCircle2,
  X,
  Clock,
  User,
} from 'lucide-react';
import { PendingChart, ChartLocation } from '../types';
import { DEFAULT_DOCTORS } from '../data/initialData';

interface PendingChartSectionProps {
  charts: PendingChart[];
  currentDate?: string;
  onAddChart: (chart: Omit<PendingChart, 'id' | 'daysPending'>) => void;
  onEditChart?: (id: string, updated: Partial<PendingChart>) => void;
  onDeleteChart: (id: string) => void;
  onResolveChart?: (id: string) => void;
}

const LOCATIONS: ChartLocation[] = [
  'SICU',
  'ห้องคิดเงิน',
  'ห้องประชุมSx',
  'Wardอื่นๆ',
  'โต๊ะหัวหน้า',
];

export const LOCATION_CONFIG: Record<
  ChartLocation,
  {
    label: string;
    emoji: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    activeFilter: string;
    inactiveFilter: string;
  }
> = {
  SICU: {
    label: 'SICU',
    emoji: '🏥',
    badgeBg: 'bg-blue-50/90',
    badgeBorder: 'border-blue-300',
    badgeText: 'text-blue-900',
    activeFilter: 'bg-blue-600 text-white border-blue-600 shadow-xs ring-1 ring-blue-700',
    inactiveFilter: 'bg-blue-50/70 text-blue-900 border-blue-200 hover:bg-blue-100/80',
  },
  ห้องคิดเงิน: {
    label: 'ห้องคิดเงิน',
    emoji: '💵',
    badgeBg: 'bg-emerald-50/90',
    badgeBorder: 'border-emerald-300',
    badgeText: 'text-emerald-900',
    activeFilter: 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-1 ring-emerald-700',
    inactiveFilter: 'bg-emerald-50/70 text-emerald-900 border-emerald-200 hover:bg-emerald-100/80',
  },
  ห้องประชุมSx: {
    label: 'ห้องประชุมSx',
    emoji: '🏢',
    badgeBg: 'bg-amber-50/90',
    badgeBorder: 'border-amber-300',
    badgeText: 'text-amber-900',
    activeFilter: 'bg-amber-600 text-white border-amber-600 shadow-xs ring-1 ring-amber-700',
    inactiveFilter: 'bg-amber-50/70 text-amber-900 border-amber-200 hover:bg-amber-100/80',
  },
  โต๊ะหัวหน้า: {
    label: 'โต๊ะหัวหน้า',
    emoji: '📋',
    badgeBg: 'bg-purple-50/90',
    badgeBorder: 'border-purple-300',
    badgeText: 'text-purple-900',
    activeFilter: 'bg-purple-600 text-white border-purple-600 shadow-xs ring-1 ring-purple-700',
    inactiveFilter: 'bg-purple-50/70 text-purple-900 border-purple-200 hover:bg-purple-100/80',
  },
  Wardอื่นๆ: {
    label: 'Wardอื่นๆ',
    emoji: '🛏️',
    badgeBg: 'bg-slate-100/90',
    badgeBorder: 'border-slate-300',
    badgeText: 'text-slate-900',
    activeFilter: 'bg-slate-700 text-white border-slate-700 shadow-xs ring-1 ring-slate-800',
    inactiveFilter: 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200/70',
  },
};

export const PendingChartSection: React.FC<PendingChartSectionProps> = ({
  charts,
  currentDate,
  onAddChart,
  onEditChart,
  onDeleteChart,
  onResolveChart,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChart, setEditingChart] = useState<PendingChart | null>(null);

  // Doctors management
  const [doctorList, setDoctorList] = useState<string[]>(() => {
    const saved = localStorage.getItem('sicu_doctor_list');
    return saved ? JSON.parse(saved) : DEFAULT_DOCTORS;
  });
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [isAddingNewDoctor, setIsAddingNewDoctor] = useState(false);
  const [newDoctorInput, setNewDoctorInput] = useState('');

  // Form states
  const [patientName, setPatientName] = useState('');
  const [location, setLocation] = useState<ChartLocation>('SICU');
  const [note, setNote] = useState('');

  const saveDoctors = (docs: string[]) => {
    setDoctorList(docs);
    localStorage.setItem('sicu_doctor_list', JSON.stringify(docs));
  };

  const handleOpenAdd = () => {
    setEditingChart(null);
    setPatientName('');
    setSelectedDoctors([]);
    setLocation('SICU');
    setNote('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (chart: PendingChart) => {
    setEditingChart(chart);
    setPatientName(chart.patientName);
    setSelectedDoctors(chart.doctors || []);
    setLocation(chart.location);
    setNote(chart.note || '');
    setIsModalOpen(true);
  };

  const handleAddNewDoctor = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newDoctorInput.trim()) return;
    const formatted = newDoctorInput.trim().startsWith('นพ./พญ.')
      ? newDoctorInput.trim()
      : `นพ./พญ. ${newDoctorInput.trim()}`;
    if (!doctorList.includes(formatted)) {
      const updated = [...doctorList, formatted];
      saveDoctors(updated);
      setSelectedDoctors((prev) => [...prev, formatted]);
    }
    setNewDoctorInput('');
    setIsAddingNewDoctor(false);
  };

  const handleRemoveDoctorFromSystem = (docName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = doctorList.filter((d) => d !== docName);
    saveDoctors(updated);
    setSelectedDoctors((prev) => prev.filter((d) => d !== docName));
  };

  const toggleDoctorSelect = (docName: string) => {
    setSelectedDoctors((prev) =>
      prev.includes(docName)
        ? prev.filter((d) => d !== docName)
        : [...prev, docName]
    );
  };

  const safeCharts = Array.isArray(charts) ? charts : [];

  const filteredCharts = safeCharts.filter((chart) => {
    if (!chart) return false;
    const matchesLocation =
      selectedLocation === 'all' || chart.location === selectedLocation;
    const q = searchTerm.toLowerCase();
    const patientStr = (chart.patientName || '').toLowerCase();
    const locationStr = (chart.location || '').toLowerCase();
    const noteStr = (chart.note || '').toLowerCase();
    const docMatches =
      Array.isArray(chart.doctors) &&
      chart.doctors.some((d) => (d || '').toLowerCase().includes(q));

    const matchesSearch =
      patientStr.includes(q) ||
      docMatches ||
      locationStr.includes(q) ||
      noteStr.includes(q);

    return matchesLocation && matchesSearch;
  });

  const getLocationCount = (loc: string) => {
    if (loc === 'all') return safeCharts.length;
    return safeCharts.filter((c) => c && c.location === loc).length;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) return;

    if (editingChart && onEditChart) {
      onEditChart(editingChart.id, {
        patientName: patientName.trim(),
        doctors: selectedDoctors.length > 0 ? selectedDoctors : ['ไม่ระบุแพทย์'],
        location,
        note: note.trim() || undefined,
      });
    } else {
      onAddChart({
        patientName: patientName.trim(),
        doctors: selectedDoctors.length > 0 ? selectedDoctors : ['ไม่ระบุแพทย์'],
        location,
        dateAdded: currentDate || '22/08/2569',
        note: note.trim() || undefined,
        shiftId: 'shift-current',
        status: 'pending',
      });
    }

    // Reset form
    setPatientName('');
    setSelectedDoctors([]);
    setLocation('SICU');
    setNote('');
    setEditingChart(null);
    setIsModalOpen(false);
  };

  return (
    <div id="chart-section" className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 flex-shrink-0 mt-0.5">
              <FileText className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800 font-['Prompt',sans-serif]">
                  Chart ค้าง
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200">
                  {charts.length} แฟ้ม
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                นับจำนวนวันค้างอัตโนมัติตั้งแต่วันที่เพิ่มข้อมูล
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#d97706] hover:bg-[#b45309] text-white text-xs font-medium transition shadow-sm cursor-pointer active:scale-95 flex-shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>เพิ่ม Chart ค้าง</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative mt-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาชื่อผู้ป่วย, แพทย์, สถานที่, Note..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent placeholder:text-slate-400"
          />
        </div>

        {/* Location filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap mt-3 mb-2">
          <button
            type="button"
            onClick={() => setSelectedLocation('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
              selectedLocation === 'all'
                ? 'bg-slate-800 text-white border-slate-800 shadow-xs ring-1 ring-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            📋 ทุกสถานที่ ({getLocationCount('all')})
          </button>

          {LOCATIONS.map((loc) => {
            const count = getLocationCount(loc);
            const isSelected = selectedLocation === loc;
            const cfg = LOCATION_CONFIG[loc];
            return (
              <button
                key={loc}
                type="button"
                onClick={() => setSelectedLocation(loc)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center gap-1.5 ${
                  isSelected ? cfg.activeFilter : cfg.inactiveFilter
                }`}
              >
                <span>{cfg.emoji}</span>
                <span>{loc}</span>
                {count > 0 && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                      isSelected
                        ? 'bg-white/25 text-white'
                        : 'bg-black/10 text-slate-800'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content list or empty state */}
        {filteredCharts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200/90 py-16 px-4 flex flex-col items-center justify-center text-center bg-slate-50/40 my-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <FileText className="w-6 h-6 text-slate-300 stroke-[1.5]" />
            </div>
            <p className="text-xs text-slate-400 font-medium">
              {searchTerm || selectedLocation !== 'all'
                ? 'ไม่พบข้อมูล Chart ที่ตรงกับเงื่อนไขการค้นหา'
                : 'ยังไม่มีข้อมูล Chart ค้างสรุป'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 my-2 max-h-[420px] overflow-y-auto pr-1">
            {filteredCharts.map((chart) => {
              const cfg = LOCATION_CONFIG[chart.location] || {
                label: chart.location,
                emoji: '📍',
                badgeBg: 'bg-amber-50',
                badgeBorder: 'border-amber-300',
                badgeText: 'text-amber-900',
              };

              return (
                <div
                  key={chart.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-amber-300 shadow-xs transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className="text-base font-bold text-slate-800 font-['Prompt',sans-serif]">
                          {chart.patientName}
                        </h4>
                        {/* กรอบข้อความสถานที่ */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-bold shadow-2xs ${cfg.badgeBg} ${cfg.badgeBorder} ${cfg.badgeText}`}
                        >
                          <span className="text-sm">{cfg.emoji}</span>
                          <span>{chart.location}</span>
                        </span>
                      </div>

                      {/* Doctors row */}
                      <div className="text-xs text-slate-600 mt-2 flex items-center gap-1.5 flex-wrap">
                        <span className="text-slate-500 font-medium">แพทย์:</span>
                        {chart.doctors && chart.doctors.length > 0 ? (
                          chart.doctors.map((doc, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-medium"
                            >
                              {doc}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </div>

                      {chart.note && (
                        <div className="mt-2.5 p-2.5 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-slate-700 font-medium">
                          {chart.note}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 ml-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(chart)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                        title="แก้ไขรายการ"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteChart(chart.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="ลบรายการ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Pending Chart Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#ea580c] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-amber-100 stroke-[2]" />
                <h3 className="font-semibold text-base font-['Prompt',sans-serif]">
                  {editingChart ? 'แก้ไขรายการ Chart ค้าง' : 'เพิ่มรายการ Chart ค้าง'}
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

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ชื่อผู้ป่วย <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ระบุ..."
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ea580c] placeholder:text-slate-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    แพทย์เจ้าของไข้ (เลือกได้หลายคน) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewDoctor(!isAddingNewDoctor)}
                    className="text-xs text-teal-600 hover:text-teal-700 font-medium cursor-pointer"
                  >
                    + • เพิ่มชื่ออื่น
                  </button>
                </div>

                {/* Inline doctor add input */}
                {isAddingNewDoctor && (
                  <div className="mb-2 p-2 bg-teal-50/70 border border-teal-200 rounded-xl flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="พิมพ์ชื่อแพทย์ เช่น นพ. สมชาย หรือ สมชาย"
                      value={newDoctorInput}
                      onChange={(e) => setNewDoctorInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewDoctor();
                        }
                      }}
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-teal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddNewDoctor}
                      className="px-3 py-1.5 text-xs bg-[#00796b] text-white rounded-lg font-medium hover:bg-[#00695c] cursor-pointer"
                    >
                      เพิ่ม
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingNewDoctor(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Doctor preset chip grid */}
                <div className="p-3 border border-slate-200 rounded-xl min-h-[90px] space-y-2 bg-slate-50/30">
                  <div className="grid grid-cols-2 gap-2">
                    {doctorList.map((doc) => {
                      const isSelected = selectedDoctors.includes(doc);
                      return (
                        <div
                          key={doc}
                          onClick={() => toggleDoctorSelect(doc)}
                          className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition select-none ${
                            isSelected
                              ? 'bg-amber-50 border-amber-400 text-amber-900 font-medium'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="truncate">{doc}</span>
                          <button
                            type="button"
                            onClick={(e) => handleRemoveDoctorFromSystem(doc, e)}
                            className="ml-1 text-slate-400 hover:text-rose-500 p-0.5 rounded cursor-pointer"
                            title="ลบชื่อแพทย์ออกจากระบบ"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Selected summary */}
                <div className="flex items-center justify-between text-[11px] mt-1.5 px-1">
                  <div className="text-slate-600 truncate">
                    <span>เลือกแล้ว: </span>
                    {selectedDoctors.length > 0 ? (
                      <span className="font-semibold text-teal-700">
                        {selectedDoctors.join(', ')}
                      </span>
                    ) : (
                      <span className="text-teal-700 font-medium">ยังไม่ได้เลือก</span>
                    )}
                  </div>
                  <span className="text-slate-400 whitespace-nowrap">
                    (กด ✕ เพื่อลบชื่อแพทย์ออกจากระบบ)
                  </span>
                </div>
              </div>

              {/* สถานที่ (กรอบข้อความตัวเลือก) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  สถานที่จัดเก็บ Chart <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {LOCATIONS.map((loc) => {
                    const cfg = LOCATION_CONFIG[loc];
                    const isSelected = location === loc;
                    return (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setLocation(loc)}
                        className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          isSelected
                            ? `${cfg.badgeBg} ${cfg.badgeBorder} ${cfg.badgeText} ring-2 ring-amber-500 shadow-xs scale-[1.02]`
                            : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/80'
                        }`}
                      >
                        <span className="text-sm">{cfg.emoji}</span>
                        <span>{loc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Note เพิ่มเติม */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Note เพิ่มเติม
                </label>
                <textarea
                  rows={3}
                  placeholder="ระบุ..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ea580c] placeholder:text-slate-400"
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
                  className="flex items-center gap-1 px-5 py-2.5 text-xs font-medium bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-xl transition shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{editingChart ? 'บันทึกการแก้ไข' : 'บันทึก Chart ค้าง'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
