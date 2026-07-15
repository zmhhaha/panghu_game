export function errorHandler(err: Error, _req: any, res: any, _next: any) {
  console.error("[Error]", err.message);
  res.status(500).json({
    error: err.message || "Internal server error",
  });
}
