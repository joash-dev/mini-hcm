import "dotenv/config";
import express from "express";
import cors from "cors";
import { initializeApp, cert } from "firebase-admin/app";
import { readFileSync } from "fs";
import { resolve } from "path";
import userRoutes from "./routes/userRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import summaryRoutes from "./routes/summaryRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

/* ── Firebase Admin SDK Initialization ── */
const serviceAccountPath = resolve(process.env.SERVICE_ACCOUNT_PATH);
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));

initializeApp({ credential: cert(serviceAccount) });

/* ── Express App ── */
const app = express();

app.use(cors());
app.use(express.json());

/* ── Routes ── */
app.use("/api/users", userRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/summary", summaryRoutes);
app.use("/api/admin", adminRoutes);

/* ── Health Check ── */
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/* ── Start Server ── */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
