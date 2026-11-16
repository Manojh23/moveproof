import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import { fileURLToPath } from "node:url";
import { database, ensureIndexes, mongoClient } from "./db/connection.js";
import authRoutes, { auth } from "./routes/auth.js";
import inspections from "./routes/inspections.js";

const app = express();
const production = process.env.NODE_ENV === "production";
const frontend = fileURLToPath(new URL("../frontend/dist/", import.meta.url));
let sessions;

app.disable("x-powered-by");
if (production) app.set("trust proxy", 1);

app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  const origin = req.get("origin");
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    (req.get("sec-fetch-site") === "cross-site" ||
      (origin && origin !== req.protocol + "://" + req.get("host")))
  ) {
    return res
      .status(403)
      .json({ error: "This request must come from MoveProof." });
  }
  next();
});
app.get("/api/health", async (req, res) => {
  await (await database()).command({ ping: 1 });
  res.json({ ok: true });
});
app.use("/api", express.json({ limit: "120kb" }));
app.use("/api", async (req, res, next) => {
  if (
    req.method === "GET" &&
    req.path === "/auth/session" &&
    !/(?:^|;\s*)moveproof\.sid=/.test(req.headers.cookie || "")
  ) {
    return res.json({ user: null });
  }
  req.db = await database();
  await ensureIndexes(req.db);
  if (!sessions) {
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 32)
      throw new Error("Set SESSION_SECRET to at least 32 characters.");
    sessions = session({
      name: "moveproof.sid",
      secret,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        clientPromise: mongoClient(),
        dbName: req.db.databaseName,
        autoRemove: "disabled",
      }),
      cookie: {
        httpOnly: true,
        secure: production,
        sameSite: "lax",
        maxAge: 8 * 60 * 60 * 1000,
      },
    });
  }
  sessions(req, res, next);
});
app.use("/api", auth.initialize(), auth.session());
app.use("/api/auth", authRoutes);
app.use("/api/inspections", inspections);
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "Endpoint not found." }),
);

app.use(express.static(frontend));
app.get("/{*path}", (_req, res, next) =>
  res.sendFile("index.html", { root: frontend }, next),
);

app.use((error, _req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === "entity.parse.failed")
    return res.status(400).json({ error: "Invalid JSON request." });
  if (error.type === "entity.too.large")
    return res.status(413).json({ error: "This request is too large." });
  if (error.status === 404)
    return res.status(404).json({ error: "Page not found." });
  console.error("MoveProof request failed:", error.name, error.code ?? "");
  res.status(503).json({
    error: "MoveProof could not complete the request. Try again shortly.",
  });
});

export default app;
