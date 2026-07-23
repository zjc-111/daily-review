## 应用概览
每日复盘应用（Daily Review）— 一款帮助用户记录每日工作并通过 AI 生成智能复盘的工具应用。支持日/周/月/年四个维度的复盘，数据持久化存储。V3 新增：手机号登录、真实 LLM AI 复盘、原生日历/ICS 导入、移动端+PC 端响应式设计。

## 需求拆解文档

# 每日复盘 - 需求拆解文档

## 产品概述

- **产品类型**: 效率工具 / 个人复盘应用
- **场景类型**: prototype
- **目标用户**: 追求自我提升的职场人、管理者、创业者
- **核心价值**: 通过每日记录 + AI 智能复盘，帮助用户提炼经验、识别问题、持续改进
- **界面语言**: 中文
- **主题偏好**: 浅色
- **页面模式**: 多页
- **导航模式**: 路由导航

---

## 页面结构

### 多页应用（路由导航时）:

| 页面名称 | 路由 | 页面说明 | 页面内区块 |
|---------|------|---------|-----------|
| 首页 | `/` | 应用首页，快速入口 + 今日状态概览 | WelcomeSection, QuickActionsSection, RecentReviewsSection |
| 每日复盘 | `/daily` | 当日记录与 AI 复盘 | DateSelectorSection, DailyEntrySection, DailyReviewResultSection |
| 每周复盘 | `/weekly` | 本周聚合与 AI 周复盘 | WeekSummarySection, WeeklyReviewResultSection |
| 每月复盘 | `/monthly` | 本月聚合与 AI 月复盘 | MonthSummarySection, MonthlyReviewResultSection |
| 每年复盘 | `/yearly` | 本年聚合与 AI 年复盘 | YearSummarySection, YearlyReviewResultSection |

**共享组件**（跨页面复用）：
- `ReviewCard`: 展示 AI 复盘结果的通用卡片组件（亮点/问题/建议），被所有复盘页面使用
- `EntryCard`: 展示用户填写内容的摘要卡片，被周/月/年复盘页面使用

---

## 导航配置

### 路由导航时:
- **导航布局**: Topbar（顶部固定）
- **导航项**:
  | 导航文字 | 路由 |
  |---------|------|
  | 首页 | `/` |
  | 每日 | `/daily` |
  | 每周 | `/weekly` |
  | 每月 | `/monthly` |
  | 每年 | `/yearly` |

---

## 功能列表

- **页面目标**: 用户记录每日工作，获取 AI 智能复盘分析
- **功能点**:
  - **每日记录**: 用户选择日期，填写当天工作内容和思考
  - **AI 日复盘**: 基于用户输入生成当日复盘（亮点提炼 + 问题识别 + 改进建议）
  - **周复盘**: 聚合本周 7 天内容，AI 生成周复盘总结和下周建议
  - **月复盘**: 聚合本月内容，AI 生成月度复盘分析和趋势总结
  - **年复盘**: 聚合本年内容，AI 生成年度复盘和新年展望
  - **数据持久化**: 用户填写内容和 AI 生成的复盘结果持久化存储
  - **历史记录浏览**: 可查看过往任意一天的记录和复盘结果

---

## 设计文档 (Design Guidelines)

# UI 设计指南

> **场景类型**: `prototype`（多页应用设计）

## 1. Design Archetype (设计原型)

### 1.1 参考模板
- **模板名称**: slate-minimal.md（调整为 Notion 暖灰配色）
- **选择理由**: 灰阶渐变 + 强调色 + 大圆角的极简风格完美契合"简洁、高级、克制有质感"的设计诉求，接近 Notion / Linear 的克制美学
- **调整说明**: 采用用户确认的 Notion 暖灰系配色；圆角调整为适中（12-16px）；字体保持 Inter 系列

### 1.2 美学方向
- **Aesthetic Direction**: Notion 暖灰极简 — 暖灰为底、蓝色点睛、大量留白、适中圆角
- **Visual Signature**: 暖灰底 + 白色卡片 + 蓝色交互 + 适中圆角 + 杂志式字重对比
- **Emotional Tone**: 沉稳 + 专注 — 让用户在安静的环境中专注于复盘思考
- **Application Type**: 工具类应用 — 聚焦核心区域，移除干扰

## 2. Design Principles (设计理念)
1. **留白即呼吸**: 充足的间距让用户感到放松，不压迫
2. **层级即叙事**: 字重对比（Black 900 vs Regular 400）建立清晰的信息层级
3. **克制即高级**: 颜色克制在暖灰 + 蓝色双色体系内，避免花哨
4. **圆角即温度**: 适中圆角卡片传递柔和、友好的触感，而非冰冷的方框
5. **内容即设计**: AI 复盘内容本身就是页面的主角，UI 为内容服务

## 3. Color System (色彩系统)

### 3.1 Core Colors（Notion 暖灰系，用户确认）
| 角色 | HSL 值 | 用途说明 |
|-----|--------|---------|
| primary | `hsl(209 77% 51%)` | 蓝色主交互色 — 按钮、链接、激活态 |
| primary-foreground | `hsl(0 0% 100%)` | 主色上的白色文字 |
| accent | `hsl(209 77% 95%)` | 浅蓝背景 — 选中态、标签底色 |

### 3.2 Neutral Colors
| 角色 | HSL 值 | 用途说明 |
|-----|--------|---------|
| background | `hsl(48 33% 98%)` | 页面背景 — Notion 暖白 |
| card | `hsl(40 20% 99%)` | 卡片/容器 — 纯白偏暖 |
| foreground | `hsl(37 8% 20%)` | 主文本 — 暖墨色 |
| muted-foreground | `hsl(30 3% 47%)` | 次要文本 — 灰色辅助文字 |
| border | `hsl(40 5% 91%)` | 边框 — 暖灰边框 |
| muted | `hsl(40 14% 94%)` | 禁用/hover 背景 |

### 3.3 Navigation Colors
| 用途 | HSL 值 | 说明 |
|-----|--------|-----|
| 导航背景 | `hsl(40 20% 99%)` | 白色 Topbar |
| 导航文字 | `hsl(30 3% 47%)` | 灰色默认态 |
| 激活态 | `hsl(209 77% 51%)` | 蓝色当前页 |

### 3.4 Semantic Colors
| 用途 | HSL 值 | 说明 |
|-----|--------|-----|
| success | `hsl(152 60% 40%)` | 亮点标记 |
| warning | `hsl(38 92% 50%)` | 问题标记 |
| destructive | `hsl(0 72% 51%)` | 错误/危险 |

## 4. Typography (字体排版)
- **Heading**: Inter (900/700) + -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
- **Body**: Inter (400/500) + Noto Sans SC (中文回退)
- **字体导入**: `@import url('https://miaoda.feishu.cn/fonts/css2?family=Inter:wght@300;400;500;600;700;900&family=Noto+Sans+SC:wght@400;500;700&display=swap');`

| 层级 | 大小 | 字重 | 用途 |
|------|------|------|------|
| 页面标题 | `2.25rem` (36px) | 900 Black | 页面主标题 |
| 区块标题 | `1.5rem` (24px) | 700 Bold | 卡片/模块标题 |
| 子标题 | `1.125rem` (18px) | 600 SemiBold | 次级标题 |
| 正文 | `0.9375rem` (15px) | 400 Regular | 内容文字 |
| 标签 | `0.8125rem` (13px) | 500 Medium | 标签、辅助文字 |
| 微文字 | `0.75rem` (12px) | 500 Medium | 日期、时间等 |

## 5. Global Layout Structure (全局布局结构)

### 5.1 Navigation Strategy
- **Strategy**: 响应式双导航
- **Desktop (≥768px)**: 白色 Topbar，Logo 左侧 + 导航项居中，固定顶部
- **Mobile (<768px)**: 底部 Tab 导航（5个tab：首页/每日/每周/每月/每年），固定底部，图标+文字

### 5.2 Global Spacing Contract
- **Container Padding**: `px-6 md:px-8`
- **Content Max Width**: `48rem` (768px) — 工具类应用聚焦核心区域
- **Content Responsibility**: 页面内容填充容器，禁止设置外边距

### 5.3 页面骨架
- 全局背景: Notion 暖白
- 顶部: 白色 Topbar + 底部 1px 浅边框
- 内容区: 居中 `max-w-3xl` + 上下 padding `py-10`

## 6. Page Patterns (区块模式)

### 6.1 区块布局
| 区块名称 | 布局策略 | 背景处理 |
|---------|---------|---------|
| 日期选择 | 横向日期切换条 | 白色卡片 |
| 内容输入 | 大文本框 + 提交按钮 | 白色卡片 |
| 复盘结果 | 分区卡片（亮点/问题/建议） | 白色卡片 + 蓝色强调 |
| 聚合概览 | 小卡片列表展示已有记录 | 白色卡片列表 |

### 6.2 区块间距
- **标准间距**: `space-y-8` (32px)
- **卡片内间距**: `p-8` (32px)
- **卡片间距**: `space-y-6` (24px)

## 7. Components (组件指南)

### Buttons
- **Primary**: 背景 `hsl(209 77% 51%)` / 文字 `hsl(0 0% 100%)` / Hover `hsl(209 77% 45%)` / 圆角 `12px`
- **Secondary**: 背景 `hsl(40 14% 94%)` / 文字 `hsl(37 8% 20%)` / Hover `hsl(40 14% 90%)`
- **Ghost**: 透明 / Hover 背景 `hsl(40 14% 94%)`

### Cards
- 背景: `hsl(40 20% 99%)` / 阴影: `0 1px 2px rgba(0,0,0,0.04)` / 圆角: `16px` / 边框: `1px solid hsl(40 5% 91%)`
- Hover: `shadow-md` 阴影增强

### Form Elements
- 输入框: 背景 `hsl(48 33% 98%)` / 边框 `hsl(40 5% 91%)` / 圆角 `12px` / Focus: `2px solid hsl(209 77% 51%)` 描边
- Placeholder: `hsl(30 3% 47%)` 色
- Textarea: 同输入框，min-height 200px

## 8. Visual Effects & Motion (视觉效果与动效)
- **圆角**: 卡片 `16px` / 按钮 `12px` / 输入框 `12px` / 标签 `8px`
- **阴影**: 卡片 `0 1px 2px rgba(0,0,0,0.04)` / 卡片 Hover `0 4px 12px rgba(0,0,0,0.08)`
- **关键动效**:
  1. 页面进入: `fadeIn + translateY(8px)` 300ms
  2. AI 生成中: 骨架屏脉冲动画
  3. 卡片出现: 依次 stagger 渐入 200ms 间隔
- **缓动函数**: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo)

## 9. Signature & Constraints (设计签名与禁区)

### DO (视觉签名)
1. 超大留白 — 内容区 max-w-3xl，四周充足呼吸空间
2. 杂志式字重对比 — Black(900) 标题 vs Regular(400) 正文
3. 蓝色精准点睛 — 仅用于交互按钮、激活态、关键标签
4. 适中圆角白卡片 — 16px 圆角 + 极浅阴影，柔和高级感
5. AI 复盘内容结构化展示 — 亮点(绿)、问题(橙)、建议(蓝)三色标签

### DON'T (禁止做法)
1. 禁止渐变背景、炫光效果
2. 禁止深色模式（除非用户明确要求）
3. 禁止花哨装饰、复杂图标
4. 禁止过于密集的布局
5. 禁止纯黑 #000 / 纯白 #FFF（使用暖灰代替）

## 数据处理总结

### 数据库表结构
- `users`: 用户（id, phone, sms_code, sms_token_expire_at, created_at）
- `daily_entries`: 每日记录（id, date, content, highlights, problems, suggestions, patterns, review_generated_at, created_at, updated_at）
- `period_reviews`: 周期复盘（id, period_type, period_label, period_start, period_end, entry_count, summary, highlights, problems, suggestions, outlook, generated_at, created_at）
- `ai_reviews`: AI 复盘元数据（id, daily_entry_id, model, prompt_tokens, completion_tokens, created_at）

### API 端点
- `POST /api/auth/send-code`: 发送短信验证码
- `POST /api/auth/verify`: 验证登录
- `GET /api/auth/me`: 获取当前用户
- `POST /api/auth/logout`: 登出
- `GET /api/reviews/recent`: 获取最近记录
- `GET /api/reviews/entry?date=`: 获取单天记录
- `GET /api/reviews/entries?startDate=&endDate=`: 按日期范围查询
- `POST /api/reviews/entry`: 创建或更新每日记录
- `POST /api/reviews/generate`: 生成每日 AI 复盘（真实 LLM + 降级）
- `POST /api/reviews/generate-period`: 生成周期 AI 复盘
- `GET /api/reviews/period?type=&date=`: 查询已有的周期复盘
- `POST /api/calendar/parse-ics`: 解析 ICS 文件

### AI 复盘方法论
- V3 真实 LLM：服务端调用 LLM API，输入复盘原文+导入素材，输出结构化复盘
- 降级策略：LLM 不可用时使用规则引擎（KISS 框架）本地生成
- 日复盘：亮点提炼 + 问题识别 + 改进建议
- 周复盘：聚合日数据，生成周总结和下周建议
- 月复盘：聚合月数据，生成月度分析和趋势
- 年复盘：聚合年数据，生成年度复盘和展望
