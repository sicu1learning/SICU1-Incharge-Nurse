import React from 'react';
import { FileText, MessageSquare, ArrowRight } from 'lucide-react';

interface QuickSummaryCardsProps {
  pendingChartCount: number;
  handoverCount: number;
  onScrollToCharts?: () => void;
  onScrollToHandovers?: () => void;
}

export const QuickSummaryCards: React.FC<QuickSummaryCardsProps> = ({
  pendingChartCount,
  handoverCount,
  onScrollToCharts,
  onScrollToHandovers,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      {/* Left: CHART ค้าง ทั้งหมด */}
      <div
        onClick={onScrollToCharts}
        className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between transition hover:border-amber-300 hover:shadow-sm cursor-pointer group"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50/80 border border-amber-200/60 flex items-center justify-center text-amber-500 flex-shrink-0">
            <FileText className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800 font-['Prompt',sans-serif]">
              CHART ค้าง
            </div>
            <div className="text-xs text-slate-400 font-normal">ทั้งหมด</div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-bold text-slate-900 font-['Prompt',sans-serif]">
                {pendingChartCount}
              </span>
              <span className="text-xs text-slate-400">ราย</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="flex items-center gap-1 text-xs text-slate-400 group-hover:text-amber-600 transition font-medium"
        >
          <span>ดูรายการ</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right: เรื่องส่งต่อ ข้อมูล */}
      <div
        onClick={onScrollToHandovers}
        className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between transition hover:border-teal-300 hover:shadow-sm cursor-pointer group"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50/80 border border-teal-200/60 flex items-center justify-center text-teal-600 flex-shrink-0">
            <MessageSquare className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800 font-['Prompt',sans-serif]">
              เรื่องส่งต่อ
            </div>
            <div className="text-xs text-slate-400 font-normal">ข้อมูล</div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-bold text-slate-900 font-['Prompt',sans-serif]">
                {handoverCount}
              </span>
              <span className="text-xs text-slate-400">เรื่อง</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="flex items-center gap-1 text-xs text-slate-400 group-hover:text-teal-600 transition font-medium"
        >
          <span>ดูงานส่งต่อ</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
