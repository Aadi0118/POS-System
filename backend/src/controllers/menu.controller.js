/**
 * @file menu.controller.js
 * @description Controller for multi-cuisine menu catalog.
 * Enforces RBAC permissions: Admin has full CRUD; Cook can toggle stock availability.
 */

const MenuItem = require('../models/MenuItem');

/**
 * Retrieves menu items with optional category and availability filtering.
 * Accessible to all authenticated roles.
 */
const getMenu = async (req, res, next) => {
  try {
    const { category, availableOnly } = req.query;
    const filter = {};

    if (category) {
      filter.category = category;
    }

    if (availableOnly === 'true') {
      filter.isAvailable = true;
    }

    const items = await MenuItem.find(filter).sort({ category: 1, name: 1 }).lean();

    return res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Creates a new menu item.
 * Restricted to: Admin
 */
const createMenuItem = async (req, res, next) => {
  try {
    const { name, category, price, description, isAvailable } = req.body;

    const existing = await MenuItem.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `A menu item named '${name}' already exists.`,
      });
    }

    const menuItem = await MenuItem.create({
      name,
      category,
      price,
      description,
      isAvailable: isAvailable ?? true,
    });

    // Notify connected clients via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('menu:item_created', menuItem);
    }

    return res.status(201).json({
      success: true,
      data: menuItem,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Updates an existing menu item's attributes.
 * Restricted to: Admin
 */
const updateMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    const menuItem = await MenuItem.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found',
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('menu:item_updated', menuItem);
    }

    return res.status(200).json({
      success: true,
      data: menuItem,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggles menu item availability (86-ing an item when kitchen runs out).
 * Restricted to: Cook, Admin
 */
const updateAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isAvailable } = req.body;

    const menuItem = await MenuItem.findByIdAndUpdate(
      id,
      { isAvailable },
      { new: true, runValidators: true }
    );

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found',
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('menu:availability_changed', {
        id: menuItem._id,
        name: menuItem.name,
        isAvailable: menuItem.isAvailable,
        updatedBy: req.user.name,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Menu item '${menuItem.name}' marked as ${isAvailable ? 'Available' : 'Sold Out / Unavailable'}`,
      data: menuItem,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deletes a menu item permanently.
 * Restricted to: Admin
 */
const deleteMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    const menuItem = await MenuItem.findByIdAndDelete(id);

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found',
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('menu:item_deleted', { id });
    }

    return res.status(200).json({
      success: true,
      message: `Menu item '${menuItem.name}' deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMenu,
  createMenuItem,
  updateMenuItem,
  updateAvailability,
  deleteMenuItem,
};

