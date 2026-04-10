import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";

const adminRouter = Router();

adminRouter.get(
  "/dashboard",
  requireAuth,
  requireRole(["ADMIN"]),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Admin dashboard access granted",
      data: {
        user: req.user,
      },
    });
  },
);

export { adminRouter };
