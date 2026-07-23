import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  CheckCircle2Icon,
  AlertTriangleIcon,
  LightbulbIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  CopyIcon,
  CheckIcon,
} from "lucide-react";

interface IReviewCard {
  highlights?: string[];
  problems?: string[];
  suggestions?: string[];
  summary?: string;
  nextAction?: string;
  isDemo?: boolean;
  className?: string;
}

export function ReviewCard({
  highlights = [],
  problems = [],
  suggestions = [],
  summary,
  nextAction,
  isDemo,
  className,
}: IReviewCard) {
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasContent = highlights.length > 0 || problems.length > 0 || suggestions.length > 0;

  if (!hasContent && !summary) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText("VOLCANO_ENGINE_API_KEY");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div
      className={cn(
        "bg-card rounded-[20px] border border-border shadow-sm overflow-hidden",
        className
      )}
    >
      {/* Summary -- one-line insight */}
      {summary && (
        <div className="p-6 md:p-8 pb-5 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <p className="text-foreground text-[15px] leading-relaxed font-semibold">
              {summary}
            </p>
            {isDemo && (
              <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-md bg-warning/10 border border-warning/20 text-[11px] font-medium text-warning leading-none">
                演示 AI
              </span>
            )}
          </div>
        </div>
      )}

      <div className="p-6 md:p-8 space-y-0">
        {/* Keep -- highlights */}
        {highlights.length > 0 && (
          <div className="py-5 first:pt-0 border-b border-border last:border-b-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                <CheckCircle2Icon className="w-5 h-5 text-success" />
              </div>
              <div>
                <h3 className="text-foreground font-bold text-base leading-tight">保持</h3>
                <span className="text-xs text-muted-foreground font-medium">Keep</span>
              </div>
            </div>
            <div className="ml-[52px] space-y-3">
              {highlights.map((item, idx) => (
                <div key={idx} className="flex gap-3 p-3.5 rounded-xl bg-success/[0.04] border border-success/10">
                  <span className="text-success font-bold mt-0.5 shrink-0 leading-relaxed">+</span>
                  <span className="text-foreground text-[15px] leading-[1.7]">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stop -- problems */}
        {problems.length > 0 && (
          <div className="py-5 first:pt-0 border-b border-border last:border-b-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                <AlertTriangleIcon className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h3 className="text-foreground font-bold text-base leading-tight">停止</h3>
                <span className="text-xs text-muted-foreground font-medium">Stop</span>
              </div>
            </div>
            <div className="ml-[52px] space-y-3">
              {problems.map((item, idx) => (
                <div key={idx} className="flex gap-3 p-3.5 rounded-xl bg-warning/[0.04] border border-warning/10">
                  <span className="text-warning font-bold mt-0.5 shrink-0 leading-relaxed">-</span>
                  <span className="text-foreground text-[15px] leading-[1.7]">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Improve + Start -- suggestions */}
        {suggestions.length > 0 && (
          <div className="py-5 first:pt-0 border-b border-border last:border-b-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <LightbulbIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-foreground font-bold text-base leading-tight">改进</h3>
                <span className="text-xs text-muted-foreground font-medium">Improve + Start</span>
              </div>
            </div>
            <div className="ml-[52px] space-y-3">
              {suggestions.map((item, idx) => (
                <div key={idx} className="flex gap-3 p-3.5 rounded-xl bg-primary/[0.04] border border-primary/10">
                  <span className="text-primary font-bold mt-0.5 shrink-0 leading-relaxed">&gt;</span>
                  <span className="text-foreground text-[15px] leading-[1.7]">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Next Action */}
      {nextAction && (
        <div className="px-6 md:px-8 pb-6 md:pb-8 pt-2">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-accent/60 to-accent/30 border border-primary/10">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0 mt-0.5">
              <ArrowRightIcon className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-xs font-semibold text-primary mb-1">明日第一行动</p>
              <p className="text-[15px] text-foreground leading-relaxed font-medium">
                {nextAction}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Enable Real AI Guide (demo mode only) */}
      {isDemo && (
        <div className="px-6 md:px-8 pb-6 md:pb-8 pt-0">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors w-full font-medium"
          >
            <ChevronDownIcon
              className={cn("w-3.5 h-3.5 transition-transform", showGuide && "rotate-180")}
            />
            <span>如何开启真实 AI 复盘</span>
          </button>
          {showGuide && (
            <div className="mt-3 p-4 rounded-xl bg-muted/50 border border-border space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                当前使用智能分析引擎生成复盘。配置真实 AI 后，复盘内容会更精准、更有洞察力。
              </p>
              <ol className="space-y-2 text-xs text-foreground">
                <li className="flex gap-2">
                  <span className="text-primary font-medium shrink-0">1.</span>
                  <span>
                    打开{" "}
                    <a
                      href="https://www.volcengine.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2"
                    >
                      火山引擎控制台
                    </a>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-medium shrink-0">2.</span>
                  <span>开通方舟平台，创建 API Key</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-medium shrink-0">3.</span>
                  <span className="flex items-center gap-1.5 flex-wrap">
                    在 .env 文件里配置
                    <code className="px-1.5 py-0.5 rounded bg-card border border-border text-[11px] font-mono">
                      VOLCANO_ENGINE_API_KEY
                    </code>
                    <button
                      onClick={handleCopy}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-muted-foreground hover:text-primary hover:bg-background transition-colors"
                    >
                      {copied ? (
                        <>
                          <CheckIcon className="w-3 h-3" />
                          已复制
                        </>
                      ) : (
                        <>
                          <CopyIcon className="w-3 h-3" />
                          复制
                        </>
                      )}
                    </button>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-medium shrink-0">4.</span>
                  <span>重启应用，AI 复盘自动升级为真实 LLM 输出</span>
                </li>
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
