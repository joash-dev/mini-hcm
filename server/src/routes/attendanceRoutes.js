import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getPunchStatus, recordPunch } from "../controllers/attendanceController.js";

const router = Router();

/* All attendance routes require authentication */
router.use(authMiddleware);

router.get("/status", getPunchStatus);
router.post("/punch", recordPunch);

export default router;
