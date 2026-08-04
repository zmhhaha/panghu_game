import { fileURLToPath } from "node:url";
import path from "node:path";
import { createApp } from "./app.js";
import { createGameStateRepository } from "./postgres-repository.js";

const port = Number(process.env.PORT ?? 4173);
const host = process.env.HOST ?? "127.0.0.1";
const staticRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repository = createGameStateRepository();
const app = createApp(repository, staticRoot);
const server = app.listen(port, host, () => {
  console.log(`[GuanLiao] server listening on http://${host}:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(async () => {
      await repository.close();
      process.exit(0);
    });
  });
}
