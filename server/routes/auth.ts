import { Router, type Request, type Response } from "express";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import {
  sendCodeSchema,
  verifyCodeSchema,
} from "@shared/api.interface";
import type {
  UserProfileResponse,
  LoginResponse,
  ApiError,
} from "@shared/api.interface";

const router = Router();

/**
 * POST /api/auth/send-code
 * 发送短信验证码
 */
router.post("/send-code", async (req: Request, res: Response) => {
  try {
    const parsed = sendCodeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "参数校验失败",
        details: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      } satisfies ApiError);
      return;
    }

    const { phone } = parsed.data;

    // Test verification code (fixed '1234' for demo; swap to real SMS in production)
    const code = "1234";
    const expireAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Upsert user with SMS code
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(users)
        .set({ smsCode: code, smsTokenExpireAt: expireAt })
        .where(eq(users.phone, phone));
    } else {
      await db.insert(users).values({
        phone,
        smsCode: code,
        smsTokenExpireAt: expireAt,
      });
    }

    // In production, send SMS via provider. For demo, code is always '1234'.
    console.log(`[SMS-Demo] Phone: ${phone}, Code: ${code}`);

    res.json({
      success: true,
      data: { message: "验证码已发送（测试验证码：1234）", debug: { code } },
    });
  } catch (err: any) {
    console.error("[auth/send-code] Error:", err);
    res.status(500).json({ error: "发送验证码失败，请稍后重试" } satisfies ApiError);
  }
});

/**
 * POST /api/auth/verify
 * 验证短信验证码并登录
 */
router.post("/verify", async (req: Request, res: Response) => {
  try {
    const parsed = verifyCodeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "参数校验失败",
        details: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      } satisfies ApiError);
      return;
    }

    const { phone, code } = parsed.data;

    const rows = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    if (rows.length === 0) {
      res.status(400).json({ error: "手机号未注册，请先获取验证码" } satisfies ApiError);
      return;
    }

    const user = rows[0];

    // Verify code (accept stored code OR demo code '1234')
    if (user.smsCode !== code && code !== "1234") {
      res.status(400).json({ error: "验证码错误，请重新输入" } satisfies ApiError);
      return;
    }

    // Check expiration (skip for demo code)
    if (code !== "1234" && user.smsTokenExpireAt && new Date(user.smsTokenExpireAt) < new Date()) {
      res.status(400).json({ error: "验证码已过期，请重新获取" } satisfies ApiError);
      return;
    }

    // Clear SMS code after successful verification
    await db
      .update(users)
      .set({ smsCode: null, smsTokenExpireAt: null })
      .where(eq(users.id, user.id));

    // Generate session token (simple approach for prototype)
    const token = Buffer.from(JSON.stringify({
      userId: user.id,
      phone: user.phone,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    })).toString("base64");

    const profile: UserProfileResponse = {
      userId: user.id,
      phone: user.phone,
      name: user.phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2"),
      avatar: "",
    };

    const response: LoginResponse = { token, user: profile };

    res.json({ success: true, data: response });
  } catch (err: any) {
    console.error("[auth/verify] Error:", err);
    res.status(500).json({ error: "验证失败，请稍后重试" } satisfies ApiError);
  }
});

/**
 * GET /api/auth/me
 * 获取当前用户信息
 */
router.get("/me", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "未登录" } satisfies ApiError);
      return;
    }

    const token = authHeader.slice(7);
    let payload: { userId: string; phone: string; exp: number };

    try {
      payload = JSON.parse(Buffer.from(token, "base64").toString());
    } catch {
      res.status(401).json({ error: "无效的登录凭证" } satisfies ApiError);
      return;
    }

    if (payload.exp < Date.now()) {
      res.status(401).json({ error: "登录已过期，请重新登录" } satisfies ApiError);
      return;
    }

    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (rows.length === 0) {
      res.status(401).json({ error: "用户不存在" } satisfies ApiError);
      return;
    }

    const user = rows[0];
    const profile: UserProfileResponse = {
      userId: user.id,
      phone: user.phone,
      name: user.phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2"),
      avatar: "",
    };

    res.json({ success: true, data: profile });
  } catch (err: any) {
    console.error("[auth/me] Error:", err);
    res.status(500).json({ error: "获取用户信息失败" } satisfies ApiError);
  }
});

/**
 * POST /api/auth/logout
 * 登出（客户端清除 token 即可，服务端无需额外操作）
 */
router.post("/logout", (_req: Request, res: Response) => {
  res.json({ success: true, data: { message: "已退出登录" } });
});

export default router;
