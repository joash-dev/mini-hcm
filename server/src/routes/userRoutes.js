import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { registerUser, getMe } from "../controllers/userController.js";

const router = Router();

/* All user routes require authentication */
router.use(authMiddleware);

router.post("/register", registerUser);
router.get("/me", getMe);

export default router;
