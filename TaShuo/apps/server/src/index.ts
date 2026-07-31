import { createApp } from "./app.js";
import { createRequiredAgentProvider } from "./agents/provider.js";
import { gameRepository } from "./game-repository.js";

const port = Number(process.env.PORT ?? 3001);
const provider = createRequiredAgentProvider();
const confirmationSecret = process.env.COMMENT_CONFIRMATION_SECRET
  ?? (process.env.NODE_ENV === "production" ? "" : "tashuo-development-confirmation-secret");
if (!confirmationSecret) throw new Error("COMMENT_CONFIRMATION_SECRET is required in production");

createApp(gameRepository, provider, confirmationSecret).listen(port, () => {
  console.log(`[TaShuo] server listening on http://localhost:${port}; provider=${provider.name}; model=${provider.model}`);
});
