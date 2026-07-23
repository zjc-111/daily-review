import { useState, useRef, useEffect } from "react";
import {
  CalendarDaysIcon,
  ImportIcon,
  ChevronDownIcon,
  UploadIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface IImportButtonGroup {
  selectedDate: string;
  onCalendarImport: (date: string) => void;
}

export default function ImportButtonGroup({
  selectedDate,
  onCalendarImport,
}: IImportButtonGroup) {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isExpanded) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isExpanded]);

  const handleToggle = () => {
    setIsExpanded((prev) => !prev);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Main button */}
      <button
        onClick={handleToggle}
        className={cn(
          "inline-flex items-center gap-2 px-3 md:px-4 py-2 bg-card border border-border rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all touch-target md:min-h-0 md:min-w-0",
          isExpanded
            ? "text-primary border-primary/30 bg-accent/50"
            : "text-foreground"
        )}
      >
        <ImportIcon className="w-4 h-4" />
        <span className="hidden md:inline">导入素材</span>
        <ChevronDownIcon
          className={cn(
            "w-3.5 h-3.5 transition-transform duration-200",
            isExpanded && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {isExpanded && (
        <div
          className={cn(
            "fixed md:absolute left-4 right-4 md:left-0 md:right-auto md:top-full md:mt-2 z-30",
            "md:min-w-[220px]",
            "bottom-0 md:bottom-auto",
            "animate-slide-up md:animate-fade-in"
          )}
        >
          {/* Mobile backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-foreground/20 backdrop-blur-sm -z-10 animate-fade-in"
            onClick={() => setIsExpanded(false)}
          />

          {/* Panel */}
          <div className="bg-card border border-border rounded-t-2xl md:rounded-xl shadow-xl p-2 space-y-1 md:space-y-0.5">
            {/* Mobile drag handle */}
            <div className="md:hidden flex justify-center py-2 mb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Calendar import */}
            <button
              onClick={() => {
                onCalendarImport(selectedDate);
                setIsExpanded(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-xl md:rounded-lg text-sm text-foreground hover:bg-muted transition-colors text-left active:bg-muted"
            >
              <div className="w-9 h-9 md:w-8 md:h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
                <CalendarDaysIcon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">导入日程</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  上传 .ics 文件或手动添加当日日程
                </div>
              </div>
              <UploadIcon className="w-4 h-4 text-muted-foreground shrink-0 hidden md:block" />
            </button>

            {/* Mobile cancel button */}
            <button
              onClick={() => setIsExpanded(false)}
              className="md:hidden w-full py-3 mt-1 rounded-xl text-sm font-semibold text-muted-foreground bg-muted hover:bg-muted/80 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
