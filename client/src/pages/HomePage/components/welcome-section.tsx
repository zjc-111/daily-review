import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PenLineIcon, SparklesIcon } from "lucide-react";
import { motion } from "framer-motion";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "夜深了";
  if (hour < 9) return "早上好";
  if (hour < 12) return "上午好";
  if (hour < 14) return "中午好";
  if (hour < 18) return "下午好";
  if (hour < 22) return "晚上好";
  return "夜深了";
}

function getFormattedDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekDays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${year} 年 ${month} 月 ${day} 日 ${weekDays[now.getDay()]}`;
}

export default function WelcomeSection() {
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState(getGreeting);
  const [dateStr] = useState(getFormattedDate);

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  return (
    <section className="w-full">
      {/* Gradient welcome card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-[24px] welcome-gradient border border-border/60 p-6 md:p-8"
      >
        {/* Decorative gradient orbs */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-primary/[0.06] blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-warning/[0.05] blur-3xl translate-y-1/4 -translate-x-1/4" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-success" />
            <p className="text-muted-foreground text-[13px] font-medium tracking-wide">
              {dateStr}
            </p>
          </div>
          <h1 className="text-[34px] md:text-[40px] font-black tracking-tight text-foreground leading-[1.15]">
            {greeting}
          </h1>
          <p className="text-muted-foreground text-[15px] mt-2.5 leading-relaxed max-w-md">
            记录今天的工作，让 AI 帮你复盘总结
          </p>

          <div className="flex items-center gap-3 mt-6 flex-wrap">
            <button
              onClick={() => navigate("/daily")}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground px-5 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] shadow-sm hover:shadow-md"
            >
              <PenLineIcon className="w-4 h-4" />
              开始今日复盘
            </button>
            <button
              onClick={() => navigate("/weekly")}
              className="inline-flex items-center gap-2 bg-card border border-border px-5 py-3 rounded-xl text-sm font-medium text-foreground transition-all active:scale-[0.98] shadow-sm hover:shadow-md hover:border-primary/30"
            >
              <SparklesIcon className="w-4 h-4 text-primary" />
              查看周报
            </button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
