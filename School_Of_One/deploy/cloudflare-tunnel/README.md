# =============================================================
# Cloudflare Tunnel — 为 School Of One 添加域名路由
# =============================================================
#
# 前置条件：
#   1. 已在 Cloudflare Dashboard 创建 Tunnel，拿到 TUNNEL_TOKEN
#   2. 准备一个域名（如 wulin.yourdomain.com）
#
# 部署步骤：
#   1. 创建命名空间 + 注入 Token
#   2. 部署 cloudflared
#   3. 在 Cloudflare DNS 中指向 Tunnel
#
# =============================================================
# 配置方法一（推荐）：TUNNEL_TOKEN
# =============================================================
#
# 在 Cloudflare Zero Trust → Networks → Tunnels 创建 Tunnel，
# 复制 TUNNEL_TOKEN，然后执行：
#
#   kubectl create secret generic tunnel-credentials \
#     -n cloudflare-tunnel \
#     --from-literal=token=你的TUNNEL_TOKEN
#
# 然后部署：
#   kubectl apply -n cloudflare-tunnel -f deploy/k8s/cloudflare-tunnel.yaml
#
# =============================================================
# 配置方法二：config.yml 方式
# =============================================================
#
# 如果不用 TOKEN，改用 config.yml + credentials.json：
#
#   # 1. 登录 cloudflared 获取证书
#   cloudflared tunnel login
#
#   # 2. 创建 tunnel
#   cloudflared tunnel create school-of-one
#
#   # 3. 创建 Secret
#   kubectl create secret generic tunnel-credentials \
#     -n cloudflare-tunnel \
#     --from-file=credentials.json=~/.cloudflared/<tunnel-id>.json
#
#   # 4. 创建 ConfigMap（路由规则）
#   kubectl create configmap tunnel-config \
#     -n cloudflare-tunnel \
#     --from-file=deploy/k8s/tunnel-config.yml
#
#   # 5. 取消 deployment.yaml 中 config.yml 挂载的注释
#
# =============================================================
# 说明
# =============================================================
#
# 前端所有流量走 cloudflared tunnel，无需公网 IP。
# cloudflared 通过长连接连接到 Cloudflare Edge，再由
# Edge 将请求转发到你的域名。
