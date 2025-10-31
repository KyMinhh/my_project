const {
    PASSWORD_RESET_REQUEST_TEMPLATE,
    PASSWORD_RESET_SUCCESS_TEMPLATE,
    VERIFICATION_EMAIL_TEMPLATE,
    WELCOME_EMAIL_TEMPLATE, // Import WELCOME_EMAIL_TEMPLATE
} = require("./emailTemplates.js"); // Sử dụng require
const { mailtrapClient, sender } = require("./mailtrap.config.js");


const sendVerificationEmail = async (email, verificationToken) => {
	const recipient = [{ email }];

	try {
		const response = await mailtrapClient.send({
			from: sender,
			to: recipient,
			subject: "Verify your email",
			html: VERIFICATION_EMAIL_TEMPLATE.replace("{verificationCode}", verificationToken),
			category: "Email Verification",
		});

		console.log("Email sent successfully", response);
	} catch (error) {
		console.error(`Error sending verification`, error);

		throw new Error(`Error sending verification email: ${error}`);
	}
};

const sendWelcomeEmail = async (email, name) => {
	const recipient = [{ email }];

	try {
		const response = await mailtrapClient.send({
			from: sender,
			to: recipient,
			template_uuid: "e65925d1-a9d1-4a40-ae7c-d92b37d593df",
			template_variables: {
				company_info_name: "Auth Company",
				name: name,
			},
		});

		console.log("Welcome email sent successfully", response);
	} catch (error) {
		console.error(`Error sending welcome email`, error);

		throw new Error(`Error sending welcome email: ${error}`);
	}
};

const sendPasswordResetEmail = async (email, resetURL) => {
	// Development mode: Chỉ log ra console, không gửi email thật
	if (process.env.NODE_ENV === 'development' || !process.env.MAILTRAP_TOKEN) {
		console.log('\n📧 =======================================');
		console.log('📧 PASSWORD RESET EMAIL (DEV MODE)');
		console.log('📧 =======================================');
		console.log('📧 To:', email);
		console.log('📧 Reset URL:', resetURL);
		console.log('📧 Copy link trên và paste vào browser để reset password');
		console.log('📧 =======================================\n');
		return { success: true, messageId: 'dev-mode' };
	}

	// Production mode: Gửi email thật qua Mailtrap
	const recipient = [{ email }];

	try {
		const response = await mailtrapClient.send({
			from: sender,
			to: recipient,
			subject: "Reset your password",
			html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetURL),
			category: "Password Reset",
		});
		
		console.log("✅ Password reset email sent successfully");
		return response;
	} catch (error) {
		console.error(`❌ Error sending password reset email:`, error.message);
		
		// Fallback: Log URL nếu gửi email thất bại
		console.log('\n📧 Email gửi thất bại, đây là reset URL:');
		console.log('📧 Reset URL:', resetURL, '\n');
		
		throw new Error(`Error sending password reset email: ${error.message}`);
	}
};

const sendResetSuccessEmail = async (email) => {
	// Development mode: Chỉ log ra console
	if (process.env.NODE_ENV === 'development' || !process.env.MAILTRAP_TOKEN) {
		console.log('\n✅ Password reset success email (DEV MODE) sent to:', email, '\n');
		return { success: true, messageId: 'dev-mode' };
	}

	// Production mode
	const recipient = [{ email }];

	try {
		const response = await mailtrapClient.send({
			from: sender,
			to: recipient,
			subject: "Password Reset Successful",
			html: PASSWORD_RESET_SUCCESS_TEMPLATE,
			category: "Password Reset",
		});

		console.log("✅ Password reset success email sent successfully", response);
		return response;
	} catch (error) {
		console.error(`❌ Error sending password reset success email:`, error.message);
		// Không throw error để không block reset password flow
		return { success: false, error: error.message };
	}
};

module.exports = {
	sendVerificationEmail,
	sendWelcomeEmail,
	sendPasswordResetEmail,
	sendResetSuccessEmail,
};
