const express = require("express");
const {
	login,
	logout,
	signup,
	verifyEmail,
	forgotPassword,
	resetPassword,
	checkAuth,
} = require("../controllers/authController.js"); // Sử dụng require
const { verifyToken } = require("../middleware/verifyToken.js"); // Sử dụng require

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", verifyToken, logout); // Thêm verifyToken cho logout nếu cần xác định user
router.post("/verify-email", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.get("/check-auth", verifyToken, checkAuth); // verifyToken sẽ chạy trước checkAuth

module.exports = router; // Sử dụng module.exports