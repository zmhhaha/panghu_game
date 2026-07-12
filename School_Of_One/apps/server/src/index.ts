import express from "express";

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", game: "School of One" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
