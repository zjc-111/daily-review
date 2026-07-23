import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface IPeriodNavigator {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onCurrent: () => void;
  currentLabel: string;
  isCurrent: boolean;
}

export function PeriodNavigator({
  label,
  onPrev,
  onNext,
  onCurrent,
  currentLabel,
  isCurrent,
}: IPeriodNavigator) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-1.5">
        <button
          onClick={onPrev}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="上一个"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-foreground min-w-[120px] text-center">
          {currentLabel}
        </span>
        <button
          onClick={onNext}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="下一个"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
      {!isCurrent && (
        <button
          onClick={onCurrent}
          className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-lg hover:bg-accent"
        >
          {label}
        </button>
      )}
    </div>
  );
}
