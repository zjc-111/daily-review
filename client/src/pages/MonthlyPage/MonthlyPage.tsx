import { motion } from "framer-motion";
import { CalendarIcon } from "lucide-react";
import { MonthSummarySection } from "./components/month-summary-section";

export default function MonthlyPage() {
  return (
    <div className="space-y-8">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
            <CalendarIcon className="w-5 h-5 text-warning" />
          </div>
          <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            每月复盘
          </span>
        </div>
        <h1 className="text-[28px] md:text-[38px] leading-tight font-black tracking-tight text-foreground">
          每月复盘
        </h1>
        <p className="text-[15px] text-muted-foreground mt-2.5 leading-relaxed">
          聚合本月内容，AI 生成月度复盘分析和趋势总结
        </p>
      </motion.header>

      <MonthSummarySection />
    </div>
  );
}
