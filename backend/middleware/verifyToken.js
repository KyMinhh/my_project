const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
	// Thử lấy token từ cookies trước, sau đó từ Authorization header
	let token = req.cookies.token;
	
	// Nếu không có token trong cookies, thử lấy từ Authorization header
	if (!token) {
		const authHeader = req.headers.authorization;
		if (authHeader && authHeader.startsWith('Bearer ')) {
			token = authHeader.substring(7); // Bỏ 'Bearer ' prefix
		}
	}
	
	if (!token) {
        return res.status(401).json({ success: false, message: "Unauthorized - No token provided." });
    }
	
	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		if (!decoded || !decoded.userId) { // Kiểm tra userId trong decoded token
            return res.status(401).json({ success: false, message: "Unauthorized - Invalid token." });
        }

		req.userId = decoded.userId; // Gắn userId vào request để các controller sau có thể sử dụng
		req.user = { id: decoded.userId }; // Thêm req.user để tương thích với một số controllers
		next();
	} catch (error) {
		console.log("Error in verifyToken middleware: ", error.name, error.message);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ success: false, message: "Unauthorized - Malformed token." });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: "Unauthorized - Token expired." });
        }
		return res.status(500).json({ success: false, message: "Server error during token verification." });
	}
};

module.exports = { verifyToken };