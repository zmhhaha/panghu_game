# 特务 Kubernetes 部署

镜像推送到集群内部仓库 `arm-cluster-master:5000`，Web 通过 `tewu` namespace 暴露为 `ui` Service。

## 构建镜像

```bash
chmod +x deploy/*.sh
REGISTRY=arm-cluster-master:5000 IMAGE_TAG=latest ./deploy/build-images.sh
```

## 部署

```bash
./deploy/deploy.sh
```

查看状态：

```bash
kubectl get pods,svc -n tewu
kubectl logs deployment/tewu-web -n tewu
```

当前版本包含 `tewu-server` 服务端 Agent：执行官模式的候选人和潜伏者模式的审查官均可通过 LLM 生成对话。`agent-configmap.yaml` 保存非敏感 provider 参数；凭据由 `vault/inventory/tewu-agent-externalsecret.yaml` 从独立 Vault 路径 `secret/data/tewu/agent` 注入到 `tewu/tewu-agent` Secret。模型故障时会使用本地确定性回答降级。

OAuth2 Proxy 使用公共模板 `oauth/k8s/game-proxy-configmap.yaml` 和 `oauth/k8s/game-proxy-deployment.yaml`，部署《特务》时执行 `bash oauth/k8s/deploy-game-proxy.sh tewu`。Cloudflare 公网路由由 `cloudflare-tunnel/operator/tunnel-routes.yaml` 独立维护。`TeWu/deploy.sh` 只发布本项目的 Web 资源，不操作这两个公共服务。
