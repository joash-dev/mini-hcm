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
let serviceAccount;

if (process.env.SERVICE_ACCOUNT_JSON) {
  try {
    serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
  } catch (err) {
    console.error("Error parsing SERVICE_ACCOUNT_JSON environment variable:", err);
    process.exit(1);
  }
} else if (process.env.SERVICE_ACCOUNT_PATH) {
  try {
    const serviceAccountPath = resolve(process.env.SERVICE_ACCOUNT_PATH);
    serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));
  } catch (err) {
    console.error(`Error reading service account file from path ${process.env.SERVICE_ACCOUNT_PATH}:`, err);
    process.exit(1);
  }
} else {
  console.error("Error: Neither SERVICE_ACCOUNT_JSON nor SERVICE_ACCOUNT_PATH environment variables are defined.");
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });

/* ── Express App ── */
const app = express();

const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
app.use(cors({
  origin: clientOrigin
}));
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
