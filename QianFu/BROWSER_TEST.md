# 浏览器测试（browser-test）实践 — 以 QianFu 为例

> 本文总结开发 QianFu（潜线）时做浏览器端测试所用的**技术栈与流程**，
> 目的是复用到其他受保护服务的浏览器测试。归档：2026-09-15。
> 相关代码：`panghu_agent/tools/game_play/browser.py`、`.../tools.py`，
> 认证配置：`panghu_agent/docs/game-auth-setup.md`。

---

## 1. 技术栈一览

| 层 | 选型 | 说明 |
|---|---|---|
| 浏览器自动化 | **Playwright（Python，sync API）** | `playwright.sync_api`，Chromium |
| 反自动化检测 | 启动参数 `--disable-blink-features=AutomationControlled` | 避免被站点识别为机器人 |
| 浏览器指纹 | viewport 1440×900、`locale=zh-CN`、Windows Chrome UA | 见 `browser.py` 的 `new_context` |
| 首次登录/导出 | **Playwright 持久化 profile**（`launch_persistent_context(user_data_dir=...)`） | 本地弹出的真实 Chrome 登录一次，导出 `storage_state` |
| 身份认证 | **oauth2-proxy + Casdoor OIDC 会话 cookie** | cookie 名 `_oauth2_proxy`，有效期 30 天 |
| 凭据分发 | K8s **Secret**（Vault → ExternalSecret） | 环境变量 `GAME_AUTH_COOKIE` / `GAME_AUTH_COOKIES_JSON` |
| 决策（可选） | **CrewAI + LLM 试玩员** | LLM 看 `page_scan` 的结构化页面，决定点击/输入 |
| 线程模型 | `GameBrowserSession`（专用 owner 线程） | Playwright sync API 绑定线程，必须固定在一个 worker 上跑 |

## 2. 认证：受保护服务的通用解法（最关键的一步）

线上游戏（`qianfu.panghuer.top`、`tewu.panghuer.top` 等）都在
**oauth2-proxy（Casdoor OIDC）** 后面。自动化浏览器要访问，必须持有**登录后的会话 cookie**
（默认名 `_oauth2_proxy`）——不要试图在脚本里跑登录流程。

**获取 cookie 的两种方式：**

- **方式 A（最快）**：用已登录的 Chrome → F12 → Application → Cookies → 复制 `_oauth2_proxy` 的 Value。
- **方式 B（可脚本化，即本目录 profile 的来源）**：
  ```python
  from playwright.sync_api import sync_playwright
  with sync_playwright() as p:
      ctx = p.chromium.launch_persistent_context(
          user_data_dir=r"C:\path\to\profile",   # ← 这里就是 .qianfu-browser-test 这类目录
          headless=False,                        # 弹出窗口手动登录一次
      )
      ctx.storage_state(path="storage_state.json")   # 导出会话
  ```

**注入给自动化浏览器：**
- 由 API 按请求转发**当前用户**的 `_oauth2_proxy`（多用户场景，优先）；
- 或 CLI/定时任务用 Vault 里的固定 cookie 作 fallback（环境变量注入，不落盘）。

**注意**：oauth2-proxy 会把超大 session 拆成 `_oauth2_proxy_1` 这类带数字后缀的 cookie；
白名单要允许「基名 + 数字后缀」（见 `browser.py` 的 `_COOKIE_CHUNK_RE`）。

## 3. 测试流程（agent 驱动试玩）

```
启动浏览器(GAME_HEADLESS 控制有无窗口)
   └─ 注入认证 cookie（env / 请求转发）
   └─ 打开目标页，detect_login_redirect() 检测是否被踢到登录页
        └─ 是 → 明确报错「未配置登录凭据」（不尝试交互登录）
   └─ page_scan：把当前 DOM 结构化成 LLM 的"眼睛"
        - 可见文本（截断 6000 字符）
        - 带索引的可交互元素列表（上限 60 个）
        - 交互元素判定：button/a/input/select/textarea/summary + ARIA role + contenteditable
        - 忽略 script/style/noscript/template 等
   └─ LLM 决策 → click / type 工具（按索引或选择器）
        └─ 每次操作前 re-scan，避免 DOM 变化后按旧索引错点
   └─ 循环直到结束，收集评价
```

设计要点（可复用到任何 Web 应用）：
- **"眼睛"和"手"分离**：`page_scan` 只读结构，操作工具只做动作，LLM 只做决策。
- **索引会失效**：DOM 一变，旧索引就错，所以操作前必须重采。
- **登录态显式检测**：把"被重定向到登录页"当成一等错误上报，而不是让 LLM 在登录页瞎点。

## 4. `.qianfu-browser-test/` 是什么

它就是上面**方式 B** 生成的 **Playwright/Chrome 持久化 profile 目录**（仓库根目录，约 4.1 GB）。

- 创建于约 2026-07-27，最后使用约 2026-07-31，用于访问 `qianfu.panghuer.top`（24 次）、
  `tewu.panghuer.top`（11 次）、`auth.panghuer.top`（8 次）。
- **体积构成**：4.1 GB 里 **4072 MB 是 `OptGuideOnDeviceModel/`（Chrome 内置端侧 AI 模型）**，
  真正的 profile 数据（`Default/`）只有约 20 MB。→ 四舍五入，这个目录基本是浏览器缓存垃圾。
- **敏感内容**：`Login Data` **0 条密码**；`Cookies` 7 条（`auth.panghuer.top`、`.panghuer.top` 的
  会话 cookie，已过期）。
- **结论**：**可再生、可删除**；它是测试副产品，不是项目依赖。

> ⚠️ 它目前**未被 Git 跟踪，但也未被忽略**。仓库是公开仓库，`git add .` 会把 4 GB 缓存
> 和会话 cookie 一起提交。**务必加入 `.gitignore`**：`.qianfu-browser-test/`。
> 安全红线也明确要求：不要把整个 profile 目录复制进容器（见 `game-auth-setup.md`）。

## 5. 复用到其他服务：操作步骤

1. **确认目标站在什么认证后面**：是 oauth2-proxy/Casdoor（→ 需要 `_oauth2_proxy` cookie），
   还是应用自身的登录（→ 需要该应用的 session cookie）。
2. **建一个 profile 并登录一次**（方式 B）：用 `launch_persistent_context` 指向一个
   **仓库之外或已 gitignore** 的目录，headful 登录，`storage_state()` 导出。
   - 目录命名建议带服务名，如 `.qianfu-browser-test`，并**立即加 .gitignore**。
3. **在自动化代码里注入 cookie**（`GAME_AUTH_COOKIE` / `GAME_AUTH_COOKIES_JSON`），
   复用 `browser.py` 的 `_parse_cookies` / `_merge_cookies`。
4. **复用 `page_scan` 的"眼睛"模式**：DOM → 结构化文本 + 索引化交互元素。
5. **始终检测登录重定向**（`detect_login_redirect`），别让流程在登录页空转。
6. **cookie 轮换**：有效期约 30 天；建议 ~25 天设提醒，到期重新导出并更新 Secret。

## 6. 安全红线（来自 `game-auth-setup.md`）

- ❌ 不要把整个浏览器 profile 目录复制进容器或提交到仓库
- ❌ 不要用环境变量注入 OAuth 账号/密码让 agent 走交互登录
- ✅ 只注入**登录后的 cookie**，经 K8s Secret 挂载，不落盘、不进日志
- ✅ 多用户场景优先用**当前请求用户的 SSO cookie**，避免共享固定账号
- ✅ 认证 cookie 按 `.panghuer.top` 域注入，避免转发到无关站点

## 7. 常见坑

| 现象 | 原因 / 处理 |
|---|---|
| 页面总是跳到登录页 | cookie 缺失/过期；检查 `_oauth2_proxy` 与数字后缀分片 |
| 按索引点击点错元素 | DOM 变化导致索引失效；操作前必须 re-scan |
| Playwright 报跨线程错误 | sync API 绑定创建它的线程；用 `GameBrowserSession` 固定在 owner 线程 |
| 被站点识别为机器人 | 加 `--disable-blink-features=AutomationControlled`，用真实 UA/locale |
| profile 目录膨胀到数 GB | Chrome 会下载端侧 AI 模型等组件；定期清理或放仓库外并 gitignore |
