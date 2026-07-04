import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { roleMiddleware } from "../middleware/roleMiddleware.js";
import {
  listEmployees,
  getEmployeeAttendanceLogs,
  modifyAttendance,
  getDailyReport,
  getWeeklyReport,
} from "../controllers/adminController.js";

const router = Router();

/* All admin routes require authentication and admin privileges */
router.use(authMiddleware);
router.use(roleMiddleware);

router.get("/employees", listEmployees);
router.get("/employees/:userId/attendance", getEmployeeAttendanceLogs);
router.post("/attendance", modifyAttendance);
router.get("/reports/daily", getDailyReport);
router.get("/reports/weekly", getWeeklyReport);

export default router;
