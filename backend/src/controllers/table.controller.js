/**
 * @file table.controller.js
 * @description Controller for table status transitions and dining area floor management.
 * Key role interactions: Cleaners mark Dirty tables as Available; Waiters occupy tables.
 */

const Table = require('../models/Table');

/**
 * Retrieves all tables populated with active order summary.
 * Accessible to all authenticated staff roles.
 */
const getTables = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    const tables = await Table.find(filter)
      .populate({
        path: 'currentOrderId',
        select: 'orderNumber status totalAmount waiterId createdAt items',
        populate: {
          path: 'waiterId',
          select: 'name',
        },
      })
      .sort({ tableNumber: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: tables.length,
      data: tables,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Marks a dirty table as clean and available.
 * CRITICAL WORKFLOW: Restricted to Cleaner (and Admin override).
 * Emits real-time socket event so Waiters immediately see the table turn green.
 */
const cleanTable = async (req, res, next) => {
  try {
    const { id } = req.params;

    const table = await Table.findById(id);

    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found',
      });
    }

    if (table.status !== 'Dirty') {
      return res.status(400).json({
        success: false,
        error: `Table ${table.tableNumber} is currently '${table.status}'. Only 'Dirty' tables can be cleaned.`,
      });
    }

    table.status = 'Available';
    table.currentOrderId = null;
    await table.save();

    // Broadcast table status update to all connected roles (Waiters, Cleaners, Admins)
    const io = req.app.get('io');
    if (io) {
      io.emit('table:status_updated', {
        tableId: table._id,
        tableNumber: table.tableNumber,
        status: 'Available',
        cleanedBy: req.user.name,
        timestamp: new Date(),
      });
    }

    return res.status(200).json({
      success: true,
      message: `Table ${table.tableNumber} has been cleaned and marked Available.`,
      data: table,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Creates a new dining table.
 * Restricted to: Admin
 */
const createTable = async (req, res, next) => {
  try {
    const { tableNumber, capacity } = req.body;

    const existing = await Table.findOne({ tableNumber });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `Table number ${tableNumber} already exists.`,
      });
    }

    const table = await Table.create({
      tableNumber,
      capacity: capacity || 4,
      status: 'Available',
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('table:created', table);
    }

    return res.status(201).json({
      success: true,
      data: table,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deletes a table.
 * Restricted to: Admin
 */
const deleteTable = async (req, res, next) => {
  try {
    const { id } = req.params;

    const table = await Table.findById(id);

    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found',
      });
    }

    if (table.status === 'Occupied') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete an occupied table with an active dining session.',
      });
    }

    await Table.findByIdAndDelete(id);

    const io = req.app.get('io');
    if (io) {
      io.emit('table:deleted', { id });
    }

    return res.status(200).json({
      success: true,
      message: `Table ${table.tableNumber} deleted.`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTables,
  cleanTable,
  createTable,
  deleteTable,
};

