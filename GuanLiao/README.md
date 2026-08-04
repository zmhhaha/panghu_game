# GuanLiao

GuanLiao 是一个以明清官场为背景的多代理公文模拟游戏。玩家每天处理下级来文，可采用拟稿，也可亲自输入朱批。政令会经过任期内固定的多名官僚；每个人基于自己的能力、忠诚、野心、贪念和避责倾向重新理解、转述与执行。事情落地后，办结回文再由末级逐层向上改写，每一级都可能邀功、避责、遮掩或揣摩上意。

三档信息难度控制玩家能看到什么：

- 引导模式：显示各级官员的真实理解、个人算计、接令回文和办结盘算。
- 官场模式：只显示每一级的接令与办结回文。
- 上意模式：只显示直属下一级官员的接令与办结回文。

## 架构

浏览器只负责确定性规则、权威数值和最终成败；服务端 Agent 只改写官员的理解、盘算、行动口径和回文。模型不可更改 `fidelity`、`holdDays`、数值效果或结果成败。模型不可用、超时、输出越权或格式错误时，游戏自动采用确定性回退文本。

生产链路与 QianFu 一致：

```text
Cloudflare Tunnel -> oauth2-proxy / Casdoor -> GuanLiao Node 服务
                                               |-> Agent Orchestrator -> LLM
                                               `-> PostgreSQL guanliao schema
```

## 本地运行

需要 Node.js 20 或更高版本：

```bash
npm install
npm run dev
```

访问 `http://127.0.0.1:4173`。开发环境使用固定的 `development:dev-user` 身份；没有 `DATABASE_URL` 时服务端存档保存在进程内存，同时浏览器仍保留 localStorage 存档。

复制 `.env.example` 中需要的值到进程环境即可选择 `fallback`、`openai`、`deepseek`、`anthropic` 或 OpenAI 兼容的 `custom` Provider。不要把 `.env` 或密钥提交到仓库。

## 验证

```bash
npm run typecheck
npm test
npm run build
```

生产部署、Vault、Casdoor、PostgreSQL 和 Cloudflare 的完整步骤见 [deploy/README.md](deploy/README.md)。
