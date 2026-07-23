import { NavLink } from "react-router-dom";
import {
  CalendarDaysIcon,
  CalendarRangeIcon,
  CalendarIcon,
  CalendarCheckIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface IActionCard {
  title: string;
  description: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  gradientFrom: string;
}

const actions: IActionCard[] = [
  {
    title: "每日复盘",
    description: "记录今天的工作，AI 生成亮点与改进建议",
    path: "/daily",
    icon: CalendarDaysIcon,
    iconClass: "bg-primary/10 text-primary",
    gradientFrom: "from-primary/5",
  },
  {
    title: "每周复盘",
    description: "聚合本周 7 天内容，AI 生成周度总结",
    path: "/weekly",
    icon: CalendarRangeIcon,
    iconClass: "bg-success/10 text-success",
    gradientFrom: "from-success/5",
  },
  {
    title: "每月复盘",
    description: "回顾本月工作，AI 分析月度趋势",
    path: "/monthly",
    icon: CalendarIcon,
    iconClass: "bg-warning/10 text-warning",
    gradientFrom: "from-warning/5",
  },
  {
    title: "每年复盘",
    description: "纵览全年记录，AI 生成年度复盘与展望",
    path: "/yearly",
    icon: CalendarCheckIcon,
    iconClass: "bg-destructive/10 text-destructive",
    gradientFrom: "from-destructive/5",
  },
];

function ActionCard({ title, description, path, icon: Icon, iconClass, gradientFrom }: IActionCard) {
  return (
    <NavLink
      to={path}
      className={cn(
        "group relative flex flex-col gap-4 p-6 rounded-[20px]",
        "bg-card border border-border",
        "shadow-sm",
        "hover:shadow-md hover:-translate-y-0.5 hover:border-primary/20",
        "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
      )}
    >
      {/* Subtle gradient top */}
      <div className={cn("absolute inset-x-0 top-0 h-16 rounded-t-[20px] bg-gradient-to-b to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500", gradientFrom)} />
      <div className={cn("relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110", iconClass)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="space-y-1.5 relative">
        <h3 className="text-foreground font-semibold text-base tracking-tight">{title}</h3>
        <p className="text-muted-foreground text-[13px] leading-relaxed">{description}</p>
      </div>
      <div className="absolute bottom-6 right-6 w-7 h-7 rounded-full border border-border flex items-center justify-center opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 bg-card">
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="text-primary">
          <path d="M1 4H7M7 4L4 1M7 4L4 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </NavLink>
  );
}

export function QuickActionsSection() {
  return (
    <section className="w-full space-y-4">
      <h2 className="text-foreground text-[13px] font-semibold uppercase tracking-wider">
        快速入口
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {actions.map((action) => (
          <ActionCard key={action.path} {...action} />
        ))}
      </div>
    </section>
  );
}
