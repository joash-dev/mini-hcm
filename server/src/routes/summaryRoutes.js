import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { computeSummary, getSummaryHistory } from "../controllers/summaryController.js";

const router = Router();

/* All summary routes require authentication */
router.use(authMiddleware);

router.post("/compute", computeSummary);
router.get("/history", getSummaryHistory);

export default router;
