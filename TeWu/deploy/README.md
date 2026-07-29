# 特务 Kubernetes 部署

部署约定沿用 `panghu_game/QianFu/deploy`：镜像推送到集群内部仓库 `arm-cluster-master:5000`，Web 通过 `tewu` namespace 暴露为 `ui` Service。

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

当前版本是纯静态 Web，NPC 与审查官使用浏览器内的本地确定性角色程序。`agent-configmap.yaml` 预留了与 QianFu 相同的 provider 参数；它不会让当前静态版本自动调用模型，也不包含任何密钥。后续增加服务端 agent 时，应将 API 密钥放入 Kubernetes Secret 或 Vault/ESO。

OAuth2 Proxy 清单由仓库根目录 `oauth/k8s/tewu-proxy.yaml` 独立维护；Cloudflare 公网路由由 `cloudflare-tunnel/operator/tunnel-routes.yaml` 独立维护。`TeWu/deploy.sh` 只发布本项目的 Web 资源，不操作这两个公共服务。
