const bcryptjs = require("bcryptjs");
const crypto = require("crypto");

const { generateTokenAndSetCookie } = require("../utils/generateTokenAndSetCookie.js");
// const {
// 	sendPasswordResetEmail,
// 	sendResetSuccessEmail,
// 	sendVerificationEmail,
// 	 sendWelcomeEmail, // Bỏ qua nếu chưa có trong emailService.js
// } = require("../mailtrap/emails.js"); // Sửa lại đường dẫn nếu cần
const { User } = require("../schemas/User.js"); // Sửa lại User.model.js nếu tên file là vậy

exports.signup = async (req, res) => {
	const { email, password, name } = req.body;

	try {
		if (!email || !password || !name) {
			throw new Error("All fields (name, email, password) are required");
		}

		const userAlreadyExists = await User.findOne({ email });

		if (userAlreadyExists) {
			return res.status(400).json({ success: false, message: "User already exists" });
		}

		const hashedPassword = await bcryptjs.hash(password, 10);
		const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();

		const user = new User({
			email,
			password: hashedPassword,
			name,
			verificationToken,
			verificationTokenExpiresAt: Date.now() + 15 * 60 * 1000, // 15 phút
			isVerified: true,
		});

		await user.save();

		// Tạo token và set cookie
		generateTokenAndSetCookie(res, user._id);

		res.status(201).json({
			success: true,
			message: "User created successfully. Please check your email to verify your account.",
			user: {
				_id: user._id,
				email: user.email,
				name: user.name,
				isVerified: user.isVerified,
			}
		});
	} catch (error) {
		console.error("Error in signup: ", error);
		res.status(400).json({ success: false, message: error.message });
	}
};

exports.verifyEmail = async (req, res) => {
	const { code } = req.body;
	try {
		if (!code) {
			return res.status(400).json({ success: false, message: "Verification code is required." });
		}

		const user = await User.findOne({
			verificationToken: code,
			verificationTokenExpiresAt: { $gt: Date.now() },
		});

		if (!user) {
			return res.status(400).json({ success: false, message: "Invalid or expired verification code" });
		}

		user.isVerified = true;
		user.verificationToken = undefined;
		user.verificationTokenExpiresAt = undefined;
		await user.save();

		generateTokenAndSetCookie(res, user._id);

		res.status(200).json({
			success: true,
			message: "Email verified successfully. You are now logged in.",
			user: {
				_id: user._id,
				email: user.email,
				name: user.name,
				isVerified: user.isVerified,
				lastLogin: user.lastLogin,
			},
		});
	} catch (error) {
		console.error("Error in verifyEmail: ", error);
		res.status(500).json({ success: false, message: "Server error during email verification." });
	}
};

exports.login = async (req, res) => {
	const { email, password } = req.body;
	try {
		const user = await User.findOne({ email });
		if (!user) {
			return res.status(400).json({ success: false, message: "Invalid credentials" });
		}

		// if (!user.isVerified) {
		// 	return res.status(401).json({
		//         success: false,
		//         message: "Account not verified. Please check your email for the verification code.",
		//     });
		// }

		const isPasswordValid = await bcryptjs.compare(password, user.password);
		if (!isPasswordValid) {
			return res.status(400).json({ success: false, message: "Invalid credentials" });
		}

		const token = generateTokenAndSetCookie(res, user._id);

		user.lastLogin = new Date();
		await user.save();

		res.status(200).json({
			success: true,
			message: "Logged in successfully",
			token,
			user: {
				_id: user._id,
				email: user.email,
				name: user.name,
				isVerified: user.isVerified,
				lastLogin: user.lastLogin,
			}
		});

	} catch (error) {
		console.log("Error in login: ", error);
		res.status(400).json({ success: false, message: error.message });
	}
};

exports.logout = async (req, res) => {
	try {
		res.clearCookie("token", {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
		});
		res.status(200).json({ success: true, message: "Logged out successfully" });
	} catch (error) {
		console.error("Error in logout: ", error);
		res.status(500).json({ success: false, message: "Server error during logout." });
	}
};

exports.forgotPassword = async (req, res) => {
	const { email } = req.body;
	try {
		if (!email) {
			return res.status(400).json({ success: false, message: "Email is required." });
		}
		const user = await User.findOne({ email });

		if (!user) {
			return res.status(200).json({ success: true, message: "If an account with that email exists, a password reset link has been sent." });
		}

		const resetToken = crypto.randomBytes(32).toString("hex");
		const resetTokenHashed = crypto.createHash('sha256').update(resetToken).digest('hex');

		user.resetPasswordToken = resetTokenHashed;
		user.resetPasswordExpiresAt = Date.now() + 10 * 60 * 1000; // 10 phút

		await user.save();

		const resetURL = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
		//await sendPasswordResetEmail(user.email, resetURL);

		res.status(200).json({ success: true, message: "If an account with that email exists, a password reset link has been sent." });
	} catch (error) {
		console.error("Error in forgotPassword: ", error);
		res.status(500).json({ success: false, message: "Server error during password reset request." });
	}
};

exports.resetPassword = async (req, res) => {
	try {
		const { token } = req.params;
		const { password } = req.body;

		if (!password || password.length < 6) {
			return res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });
		}

		const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

		const user = await User.findOne({
			resetPasswordToken: hashedToken,
			resetPasswordExpiresAt: { $gt: Date.now() },
		});

		if (!user) {
			return res.status(400).json({ success: false, message: "Invalid or expired reset token. Please try again." });
		}

		const hashedPassword = await bcryptjs.hash(password, 10);

		user.password = hashedPassword;
		user.resetPasswordToken = undefined;
		user.resetPasswordExpiresAt = undefined;
		user.isVerified = true;
		await user.save();

		//await sendResetSuccessEmail(user.email);

		res.status(200).json({ success: true, message: "Password reset successful. Please log in with your new password." });

	} catch (error) {
		console.error("Error in resetPassword: ", error);
		res.status(500).json({ success: false, message: "Server error during password reset." });
	}
};

exports.checkAuth = async (req, res) => {
	try {
		const user = await User.findById(req.userId).select("-password -verificationToken -verificationTokenExpiresAt -resetPasswordToken -resetPasswordExpiresAt");
		if (!user) {
			res.clearCookie("token");
			return res.status(401).json({ success: false, message: "User not found, session terminated." });
		}

		if (!user.isVerified) {
			return res.status(401).json({ success: false, message: "User not verified.", needsVerification: true });
		}

		res.status(200).json({ success: true, user });
	} catch (error) {
		console.error("Error in checkAuth: ", error);
		res.status(500).json({ success: false, message: "Server error during authentication check." });
	}
};