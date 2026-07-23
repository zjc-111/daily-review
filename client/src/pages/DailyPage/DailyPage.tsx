import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { PenSquareIcon } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import DateSelectorSection from "./components/date-selector-section";
import DailyEntrySection from "./components/daily-entry-section";
import ImportButtonGroup from "./components/import-button-group";
import CalendarImportDialog from "./components/calendar-import-dialog";
import PendingItemsSection, {
  formatPendingItemsAsMarkdown,
  type PendingItem,
} from "./components/pending-items-section";
import type { CalendarEventResponse } from "@shared/api.interface";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export default function DailyPage() {
  const [searchParams] = useSearchParams();
  const selectedDate = searchParams.get("date") || format(new Date(), "yyyy-MM-dd");

  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);

  const [prevDate, setPrevDate] = useState(selectedDate);
  if (selectedDate !== prevDate) {
    setPrevDate(selectedDate);
    setPendingItems([]);
  }

  const handleCalendarImport = useCallback((_date: string) => {
    setCalendarDialogOpen(true);
  }, []);

  const handleCalendarConfirm = useCallback((events: CalendarEventResponse[]) => {
    const newItems: PendingItem[] = events.map((e) => ({
      kind: "calendar" as const,
      data: e,
    }));
    setPendingItems((prev) => [...prev, ...newItems]);
  }, []);

  const handleRemovePending = useCallback((index: number) => {
    setPendingItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddAllToContent = useCallback(() => {
    const markdown = formatPendingItemsAsMarkdown(pendingItems);
    window.dispatchEvent(
      new CustomEvent("append-to-daily-content", { detail: { markdown } })
    );
    setPendingItems([]);
  }, [pendingItems]);

  return (
    <motion.div
      className="w-full space-y-6 md:space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Page Header */}
      <motion.header variants={itemVariants}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <PenSquareIcon className="w-5 h-5 text-primary" />
            </div>
            <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Daily Review
            </span>
          </div>

          <ImportButtonGroup
            selectedDate={selectedDate}
            onCalendarImport={handleCalendarImport}
          />
        </div>
        <h1 className="text-[28px] md:text-[38px] leading-tight font-black tracking-tight text-foreground">
          每日复盘
        </h1>
        <p className="text-[15px] text-muted-foreground mt-2.5 leading-relaxed">
          选择一天，记录工作内容，让 AI 帮你提炼亮点、识别问题、给出改进建议
        </p>
      </motion.header>

      <motion.div variants={itemVariants}>
        <DateSelectorSection />
      </motion.div>

      <motion.div variants={itemVariants}>
        <PendingItemsSection
          items={pendingItems}
          onRemove={handleRemovePending}
          onAddToContent={handleAddAllToContent}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <DailyEntrySection />
      </motion.div>

      <CalendarImportDialog
        date={selectedDate}
        open={calendarDialogOpen}
        onClose={() => setCalendarDialogOpen(false)}
        onConfirm={handleCalendarConfirm}
      />
    </motion.div>
  );
}
