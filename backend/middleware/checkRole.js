const { AppError } = require('./errorHandler');
const { User } = require('../schemas/User');

/**
 * Middleware to check if user has required role
 */
const checkRole = (...allowedRoles) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.id) {
                return next(new AppError('User not authenticated', 401));
            }

            // Get user with role
            const user = await User.findById(req.user.id).select('role');
            
            if (!user) {
                return next(new AppError('User not found', 404));
            }

            // Check if user role is in allowed roles
            if (!allowedRoles.includes(user.role)) {
                return next(new AppError('You do not have permission to perform this action', 403));
            }

            // Attach role to request for later use
            req.userRole = user.role;
            next();
        } catch (error) {
            return next(new AppError('Error checking user role', 500));
        }
    };
};

/**
 * Middleware to check if user is admin
 */
const isAdmin = checkRole('admin');

/**
 * Middleware to check if user is admin or moderator
 */
const isAdminOrModerator = checkRole('admin', 'moderator');

/**
 * Middleware to check if user is admin, moderator, or author
 */
const isAuthorized = checkRole('admin', 'moderator', 'author');

module.exports = {
    checkRole,
    isAdmin,
    isAdminOrModerator,
    isAuthorized
};
