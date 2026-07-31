# TaShuo deployment

TaShuo uses its own `tashuo` Kubernetes namespace and the `tashuo` PostgreSQL schema. The web image proxies `/api` to `http://tashuo-server:3001`; public traffic should enter through an authenticated oauth2-proxy and target `ui.tashuo.svc.cluster.local:80`.

## Required secrets

Create or synchronize these Secrets before deployment. Do not commit their values.

- `tashuo-database`, key `url`: PostgreSQL connection URL.
- `tashuo-agent`, key `COMMENT_CONFIRMATION_SECRET`: random signing secret of at least 32 characters.
- `tashuo-agent`: credentials for the Provider selected in `deploy/k8s/agent-configmap.yaml`.

Provider credential keys are listed in `.env.example`. A configured Provider is mandatory; TaShuo does not switch Provider or generate fallback content after a model error.

## Build and deploy

Run from the TaShuo root:

```bash
chmod +x deploy/*.sh
./deploy/build-images.sh
./deploy/deploy.sh
```

Override the image repository and tag with `REGISTRY` and `IMAGE_TAG`. If a non-`latest` tag is used, update the images in the Kubernetes manifests before applying them.

The deployment script runs every SQL file in `apps/server/migrations` with `ON_ERROR_STOP=1` before rolling out the API and web services. The migrations are idempotent.

## Authentication boundary

Production requests must come from the trusted oauth2-proxy. The server accepts `X-Auth-Request-Sub`, `X-Forwarded-Preferred-Username`, `X-Forwarded-User`, and `X-Forwarded-Email` only when `TRUST_PROXY_AUTH_HEADERS=true`. Do not expose `tashuo-server` or `tashuo-web` directly to the public network.

Check a deployment with:

```bash
kubectl get pods,svc,jobs -n tashuo
kubectl logs job/tashuo-db-migration -n tashuo
kubectl rollout status deployment/tashuo-server -n tashuo
kubectl rollout status deployment/tashuo-web -n tashuo
```

