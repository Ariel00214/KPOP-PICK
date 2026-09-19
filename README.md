# KPOP PICK

面向中国大陆 K-pop 用户的移动优先 Web MVP：聚合专辑版本、小卡、特典、渠道和费用，以结构化比价与按需 AI 购买建议帮助用户决定“这次回归怎么买”。产品本身不支付、不收款、不处理订单、物流或售后。

> 商品目录采用“数据库优先、官方来源兜底”。价格保留渠道原币种并显示最近核验时间；税费、运费和最终库存仍须在跳转后的渠道页面复核。

## 已实现

- 游客可直接使用；支持邮箱密码注册、登录、HttpOnly 会话与跨设备收藏
- 兴趣选择与个性化入口
- 新手首页、老手首页、搜索与空结果
- 专辑详情、多渠道方案、预计到手价、未知费用提示、排序和成员筛选
- 小卡列表与类型筛选
- “AI 帮我选”支持自由文本需求理解，自动提取艺人、专辑、成员、预算、随机接受度、渠道和购买优先级，再生成最多 3 个带解释的方案；无 AI 密钥时自动使用 Rules + Database 结果
- 情报文字提取、用户确认、查重后保存流程；AI 不能直接发布
- 游客本地收藏、登录用户数据库收藏、匿名 Analytics、简单管理员认证和 MVP 数据看板
- 内存 TTL Cache、关键词知识检索、AI Provider 接口、Fallback
- Prisma Schema、SQLite Seed、PostgreSQL 迁移说明和 Vitest 测试

## 架构

```text
Next.js App Router
├── UI：React + TypeScript + Tailwind CSS
├── API：Route Handlers + Zod
├── Database：Prisma（开发 SQLite；生产可迁移 PostgreSQL）
├── Cache：进程内 TTL Cache
├── RAG：/knowledge Markdown + 关键词检索
├── AI：AIProvider Interface；默认 RulesProvider fallback
└── Analytics：匿名事件，写入失败不阻塞产品
```

职责严格分开：

| 层 | 负责 | 不负责 |
|---|---|---|
| Database | 专辑、版本、小卡、渠道、价格、状态、投稿等长期事实 | 生成解释 |
| Cache | 热门、搜索、聚合、比价结果的短期加速 | 事实源 |
| RAG | 术语、版本、买专和安全知识 | 价格、库存、截止日期 |
| AI | 非结构化信息理解与复杂推荐 | 普通浏览、搜索、计算 |
| Analytics | 匿名行为与系统运行指标 | 收集姓名、手机、地址等无关隐私 |

请求顺序遵循：Rules → Cache → Database → RAG（必要时）→ LLM（必要时）。

## 本地运行

要求 Node.js 20+。

```bash
cp .env.example .env
npm install
npm run db:push
npm run db:seed
npm run dev
```

打开 `http://localhost:3000`。管理员看板位于 `/admin/analytics`，密码来自 `ADMIN_PASSWORD`。

## 环境变量

| 名称 | 必填 | 用途 |
|---|---:|---|
| `DATABASE_URL` | 是 | 开发默认 `file:./dev.db` |
| `NEXT_PUBLIC_APP_URL` | 是 | Web 根地址，部署时改为正式域名 |
| `ADMIN_PASSWORD` | 是 | 管理看板服务端校验，禁止提交真实密码 |
| `AI_PROVIDER` | 否 | 默认 `mock` / rules fallback |
| `AI_API_KEY` | 否 | 真实 AI Provider 密钥 |
| `AI_BASE_URL` | 否 | 可配置的兼容服务地址 |
| `AI_MODEL` | 否 | 模型名称 |
| `CACHE_ENABLED` | 否 | 是否启用内存缓存 |
| `ANALYTICS_ENABLED` | 否 | 是否启用匿名埋点 |
| `SUPPORT_EMAIL` | 是 | 隐私请求与运营联系邮箱 |

## Database 与 Seed

Schema 位于 `prisma/schema.prisma`。Seed 只幂等写入已核验的官方商品记录，不删除用户、收藏或已有目录数据。

```bash
npm run db:push
npm run db:seed
```

迁移 PostgreSQL 时：

1. 将 `prisma/schema.prisma` 的 datasource provider 改为 `postgresql`。
2. 将生产 `DATABASE_URL` 配置为 PostgreSQL 连接串。
3. 本地生成并审查 migration，再在生产运行 `prisma migrate deploy`。
4. 不要将连接串或密码提交到 GitHub。

## AI Provider

`lib/ai.ts` 定义 `AIProvider`。自由文本推荐支持兼容 OpenAI Chat Completions 协议的大模型；设置 `AI_PROVIDER=llm`、`AI_API_KEY`、`AI_BASE_URL` 与 `AI_MODEL` 后启用。模型只提取用户意图，不生成价格、库存等商品事实；最终推荐始终基于已有结构化数据。未配置、超时或调用失败时自动回退到本地文本理解与 Rules + Database 推荐。截图上传需要同时配置中国大陆可访问的对象存储与视觉模型。

失败策略：LLM → Rules/Database；图像理解 → 手动输入；RAG → 本地知识；外链读取 → 截图/文字。

## Analytics Events

`app_open`、`mode_selected`、`interest_selected`、`search_performed`、`album_viewed`、`offer_viewed`、`offer_filtered`、`photocard_viewed`、`ai_recommendation_started`、`ai_recommendation_completed`、`purchase_link_clicked`、`submission_started`、`submission_completed`、`favorite_added`、`mode_switched`。

事件用 fire-and-forget 方式发送，失败不会阻塞核心操作。默认只保存匿名 ID、会话 ID、事件名和经过过滤的属性。

## 测试与构建

```bash
npm test
npm run build
```

自动化覆盖到手价、未知费用、推荐数量、随机成员过滤、Cache hit/miss/TTL/失效、Analytics 隐私过滤、规则推荐与文字提取 fallback。上线前还应使用 Playwright 在真实 390×844 设备视口完成端到端回归和慢网测试。

## 中国大陆部署

- 前端不依赖 Google Fonts、Google CDN 或必须翻墙的静态资源。
- 当前正式域名配置为 `https://myarea.website`，健康检查为 `/api/health`。
- 仓库包含多阶段 `Dockerfile`，可部署到阿里云、腾讯云等支持 Node.js 22 或 Docker 的服务。
- GitHub Actions 会在每次推送和 Pull Request 中执行测试、类型检查及生产构建。
- 建议使用已备案国内域名和中国大陆节点；正式上线国内服务器通常需要ICP备案。
- 数据库、对象存储、AI Provider 和 API 域名全部通过环境变量配置。
- 将内存投稿/事件演示存储切换到 Prisma 持久化；多实例时再评估 Redis，不作为 MVP 前置。
- 配置 HTTPS、日志脱敏、限流、备份、管理员强密码与安全审计。

服务器至少需要配置以下生产环境变量：

```env
NEXT_PUBLIC_APP_URL=https://myarea.website
DATABASE_URL=<生产数据库连接串>
ADMIN_PASSWORD=<随机强密码>
AI_PROVIDER=mock
ANALYTICS_ENABLED=true
CACHE_ENABLED=true
```

部署后依次验证：`/api/health`、`/onboarding`、`/search`、`/login`、`/album/enhypen-desire-unleash-make` 和 `/admin/analytics`。

### 单机 Docker 部署

服务器安装 Git 与 Docker 后执行：

```bash
git clone https://github.com/Ariel00214/KPOP-PICK.git
cd KPOP-PICK
cp deploy/.env.production.example .env.production
# 编辑 .env.production，将 ADMIN_PASSWORD 改为随机强密码
docker compose -f docker-compose.prod.yml up -d --build
```

Caddy 会在域名 A 记录指向服务器且 80/443 端口开放后自动申请和续期 HTTPS 证书。SQLite 文件保存在 Docker 命名卷 `kpop_data`，重新构建容器不会删除数据。每次启动会幂等更新内置官方商品，不会清空账号、收藏或目录。

## 当前未接入

淘宝/微博/小红书自动抓取、渠道实时库存 API、自动汇率/跨境到手价、邮件找回密码、邮箱验证、真实图片 OCR/视觉模型、支付、订单、物流、微信社区、原生 App、微信小程序。当前真实目录使用官方商品页核验 + 人工维护。
