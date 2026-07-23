import { motion } from "framer-motion";
import { CalendarCheckIcon } from "lucide-react";
import YearSummarySection from "./components/year-summary-section";

export default function YearlyPage() {
  return (
    <div className="space-y-8">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <CalendarCheckIcon className="w-5 h-5 text-destructive" />
          </div>
          <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            每年复盘
          </span>
        </div>
        <h1 className="text-[28px] md:text-[38px] leading-tight font-black tracking-tight text-foreground">
          每年复盘
        </h1>
        <p className="text-[15px] text-muted-foreground mt-2.5 leading-relaxed">
          聚合本年内容，AI 生成年度复盘和新年展望
        </p>
      </motion.header>

      <YearSummarySection />
    </div>
  );
}
