/**
 * @file rbac.middleware.js
 * @description Role-Based Access Control (RBAC) enforcement middleware.
 * Verifies that the authenticated user's role is authorized for the targeted route.
 */

/**
 * Enforces role authorization on sensitive endpoints.
 *
 * @param {Array<string>} allowedRoles - Permitted roles (e.g. ['Admin'], ['Waiter', 'Admin'])
 * @returns {import('express').RequestHandler}
 */
const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    // Defensive check: ensure authenticateToken ran prior
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: No authenticated identity attached to this request.',
      });
    }

    const { role, name, id } = req.user;

    // Check if the current user's role exists within permitted roles
    if (!allowedRoles.includes(role)) {
      // Audit log the authorization failure for security monitoring
      console.warn(
        `[Security Alert: RBAC Violation] Unauthorized attempt on [${req.method}] ${req.originalUrl} ` +
        `by User ID: ${id} (${name}) with Role: [${role}]. Required: [${allowedRoles.join(', ')}]`
      );

      return res.status(403).json({
        success: false,
        error: `Forbidden: Access denied. Role '${role}' lacks clearance for this resource.`,
        requiredRoles: allowedRoles,
      });
    }

    next();
  };
};

module.exports = requireRole;

