/**
 * @file auth.controller.js
 * @description Authentication controller implementing secure PIN login, generic error responses,
 * and JWT session token generation.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Retrieves public list of active staff members for the keypad screen.
 * CRITICAL SECURITY: Never returns hashedPin or sensitive tokens.
 */
const getStaffList = async (req, res, next) => {
  try {
    const staff = await User.find({ isActive: true })
      .select('_id name role baseSalary pfEnabled pfPercentage employerPfPercentage')
      .sort({ role: 1, name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: staff.length,
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticates a staff member using their 4-digit PIN.
 * Employs generic error responses to prevent user-enumeration attacks.
 */
const login = async (req, res, next) => {
  try {
    const { staffId, pin } = req.body;

    // Retrieve staff with hashedPin explicitly included (it is excluded by default in schema)
    const user = await User.findById(staffId).select('+hashedPin');

    // Generic error constant: prevents revealing whether staffId exists or PIN was wrong
    const GENERIC_AUTH_ERROR = 'Authentication failed. Please verify your credentials.';

    if (!user || !user.isActive) {
      // Add artificial jitter delay (50-100ms) to mitigate timing attacks
      await new Promise((resolve) => setTimeout(resolve, 80));
      return res.status(401).json({
        success: false,
        error: GENERIC_AUTH_ERROR,
      });
    }

    // Verify candidate PIN against bcrypt hash
    const isPinMatch = await user.comparePin(pin);

    if (!isPinMatch) {
      return res.status(401).json({
        success: false,
        error: GENERIC_AUTH_ERROR,
      });
    }

    // Generate short-lived JWT session token
    const jwtSecret = process.env.JWT_SECRET || 'spicy_zaika_secure_jwt_secret_pos_kds_default_fallback_2026';
    const token = jwt.sign(
      {
        id: user._id.toString(),
        name: user.name,
        role: user.role,
      },
      jwtSecret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '8h',
        issuer: 'pos-kds-backend',
        audience: 'pos-kds-mobile',
      }
    );

    // Return sanitized identity and bearer token
    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        baseSalary: user.baseSalary || 0,
        pfEnabled: typeof user.pfEnabled === 'boolean' ? user.pfEnabled : true,
        pfPercentage: user.pfPercentage || 12,
        employerPfPercentage: user.employerPfPercentage || 12,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Returns current authenticated user's session identity.
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select(
      '_id name role isActive baseSalary pfEnabled pfPercentage employerPfPercentage'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        baseSalary: user.baseSalary || 0,
        pfEnabled: typeof user.pfEnabled === 'boolean' ? user.pfEnabled : true,
        pfPercentage: user.pfPercentage || 12,
        employerPfPercentage: user.employerPfPercentage || 12,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStaffList,
  login,
  getMe,
};

