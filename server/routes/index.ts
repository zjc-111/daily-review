import type { Router } from "express";
import { registerViewRoute } from "./view";
import reviewsRouter from "./reviews";
import authRouter from "./auth";
import aiRouter from "./ai";
import calendarRouter from "./calendar";

export function registerRoutes(router: Router) {
  // 业务 API 路由
  router.use("/api/reviews", reviewsRouter);
  router.use("/api/auth", authRouter);
  router.use("/api/ai", aiRouter);
  router.use("/api/calendar", calendarRouter);

  // HTML 页面渲染（catch-all，必须放在最后）
  registerViewRoute(router);
}
