/**
 * @file admin.controller.js
 * @description Master administrative controller providing real-time revenue analytics,
 * staff user CRUD with secure 4-digit PIN management, and system-wide metrics.
 */

const User = require('../models/User');
const Order = require('../models/Order');
const Table = require('../models/Table');
const MenuItem = require('../models/MenuItem');

/**
 * Computes live operational and revenue metrics for the Admin Dashboard.
 */
const getMetrics = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Query today's completed/paid orders for revenue
    const todayOrders = await Order.find({
      createdAt: { $gte: todayStart, $lte: todayEnd },
    });

    const totalRevenueToday = todayOrders
      .filter((o) => o.paymentStatus === 'Paid')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    // Status breakdown
    const orderCounts = {
      total: todayOrders.length,
      pending: todayOrders.filter((o) => o.status === 'Pending').length,
      accepted: todayOrders.filter((o) => o.status === 'Accepted').length,
      ready: todayOrders.filter((o) => o.status === 'Ready').length,
      completed: todayOrders.filter((o) => o.status === 'Completed').length,
      rejected: todayOrders.filter((o) => o.status === 'Rejected').length,
    };

    // Table occupancy metrics
    const totalTables = await Table.countDocuments();
    const occupiedTables = await Table.countDocuments({ status: 'Occupied' });
    const dirtyTables = await Table.countDocuments({ status: 'Dirty' });
    const availableTables = await Table.countDocuments({ status: 'Available' });

    const occupancyRate = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

    // Aggregate category revenue breakdown
    const categoryRevenueMap = {};
    for (const order of todayOrders) {
      if (order.paymentStatus === 'Paid') {
        for (const item of order.items) {
          const menuItem = await MenuItem.findById(item.menuItemId).select('category');
          if (menuItem) {
            categoryRevenueMap[menuItem.category] =
              (categoryRevenueMap[menuItem.category] || 0) + item.price * item.quantity;
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        todayRevenue: Math.round(totalRevenueToday * 100) / 100,
        orders: orderCounts,
        tables: {
          total: totalTables,
          occupied: occupiedTables,
          dirty: dirtyTables,
          available: availableTables,
          occupancyRate,
        },
        categoryBreakdown: categoryRevenueMap,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lists all staff members.
 */
const getStaff = async (req, res, next) => {
  try {
    const staff = await User.find()
      .select('_id name role isActive createdAt updatedAt')
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
 * Creates a new staff member with a hashed 4-digit PIN.
 */
const createStaff = async (req, res, next) => {
  try {
    const { name, pin, role } = req.body;

    const user = new User({
      name,
      hashedPin: pin, // Pre-save hook hashes this with bcrypt
      role,
      isActive: true,
    });

    await user.save();

    return res.status(201).json({
      success: true,
      message: `Staff member '${user.name}' (${user.role}) created successfully.`,
      data: {
        id: user._id,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Updates staff member attributes or resets their 4-digit PIN.
 */
const updateStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, pin, role, isActive } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found',
      });
    }

    if (name) user.name = name;
    if (role) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    if (pin) {
      user.hashedPin = pin; // Pre-save hook will hash
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: `Staff member '${user.name}' updated successfully.`,
      data: {
        id: user._id,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deactivates staff member (revokes access immediately).
 */
const toggleStaffStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found',
      });
    }

    // Guard: Prevent deactivating the last Admin
    if (user.role === 'Admin' && user.isActive) {
      const activeAdminCount = await User.countDocuments({ role: 'Admin', isActive: true });
      if (activeAdminCount <= 1) {
        return res.status(400).json({
          success: false,
          error: 'Cannot deactivate the sole active Admin account.',
        });
      }
    }

    user.isActive = !user.isActive;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Staff member '${user.name}' is now ${user.isActive ? 'Active' : 'Deactivated'}.`,
      data: {
        id: user._id,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMetrics,
  getStaff,
  createStaff,
  updateStaff,
  toggleStaffStatus,
};

