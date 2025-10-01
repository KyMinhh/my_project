const jwt = require("jsonwebtoken");

const generateTokenAndSetCookie = (res, userId) => {
	const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
		expiresIn: "7d", // Thời gian hết hạn token
	});

	res.cookie("token", token, {
		httpOnly: true, // Quan trọng: cookie không thể truy cập bằng JavaScript phía client
		secure: process.env.NODE_ENV === "production", // Chỉ gửi cookie qua HTTPS ở môi trường production
		sameSite: "strict", // Ngăn chặn tấn công CSRF
		maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày (tính bằng mili giây)
	});

	return token; // Trả về token để có thể gửi về client
};

module.exports = { generateTokenAndSetCookie };