import { Link } from "react-router-dom";
import { HomeIcon } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      {/* Decorative 404 */}
      <div className="relative mb-8">
        <div className="text-[120px] font-black tracking-[-0.06em] text-muted/20 select-none leading-none">
          404
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-black text-foreground/80">页面丢失了</span>
        </div>
      </div>
      <p className="text-muted-foreground text-[15px] mb-8 text-center max-w-xs leading-relaxed">
        你访问的页面不存在，可能已被移动或删除
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
      >
        <HomeIcon className="w-4 h-4" />
        返回首页
      </Link>
    </div>
  );
}
