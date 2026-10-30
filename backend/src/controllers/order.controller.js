/**
 * @file order.controller.js
 * @description Controller managing the lifecycle of restaurant orders.
 * Implements strict business rules:
 * 1. Waiters create orders -> Table becomes Occupied -> Notifies Kitchen (Cook).
 * 2. Cooks accept/reject/mark ready on KDS.
 * 3. Items CANNOT be modified/deleted once Kitchen accepts an order.
 * 4. Waiters record payment -> Order becomes Completed -> Table becomes Dirty -> Notifies Cleaner.
 * 5. Admins have master override capability to void any order at any stage.
 */

const Order = require('../models/Order');
const Table = require('../models/Table');
const MenuItem = require('../models/MenuItem');

/**
 * Retrieves orders with role-aware filtering.
 */
const getOrders = async (req, res, next) => {
  try {
    const { status, tableId } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (tableId) {
      filter.tableId = tableId;
    }

    const orders = await Order.find(filter)
      .populate('tableId', 'tableNumber status')
      .populate('waiterId', 'name')
      .populate('items.menuItemId', 'name category price')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves active orders for KDS and POS displays (Pending, Accepted, Ready).
 */
const getActiveOrders = async (req, res, next) => {
  try {
    const activeStatuses = ['Pending', 'Accepted', 'Ready'];

    const orders = await Order.find({ status: { $in: activeStatuses } })
      .populate('tableId', 'tableNumber status')
      .populate('waiterId', 'name')
      .sort({ createdAt: 1 }) // Chronological queue for cooks
      .lean();

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Creates a new order.
 * Restricted to: Waiter, Admin
 */
const createOrder = async (req, res, next) => {
  try {
    const { tableId, items } = req.body;
    const waiterId = req.user.id;

    // Check table validity and status
    const table = await Table.findById(tableId);
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found',
      });
    }

    if (table.status === 'Dirty') {
      return res.status(400).json({
        success: false,
        error: `Cannot place order on Table ${table.tableNumber}. It is marked 'Dirty' and must be cleaned first.`,
      });
    }

    // Resolve menu items from DB to prevent client-side price tampering
    const menuItemIds = items.map((i) => i.menuItemId);
    const dbMenuItems = await MenuItem.find({ _id: { $in: menuItemIds } });
    const menuMap = new Map(dbMenuItems.map((item) => [item._id.toString(), item]));

    let calculatedTotal = 0;
    const processedItems = [];

    for (const item of items) {
      const dbItem = menuMap.get(item.menuItemId);

      if (!dbItem) {
        return res.status(400).json({
          success: false,
          error: `Menu item with ID ${item.menuItemId} does not exist.`,
        });
      }

      if (!dbItem.isAvailable) {
        return res.status(400).json({
          success: false,
          error: `'${dbItem.name}' is currently unavailable/out of stock.`,
        });
      }

      const itemTotal = dbItem.price * item.quantity;
      calculatedTotal += itemTotal;

      processedItems.push({
        menuItemId: dbItem._id,
        name: dbItem.name,
        price: dbItem.price, // Immutable price snapshot
        quantity: item.quantity,
        notes: item.notes || '',
      });
    }

    // Create the order
    const order = await Order.create({
      tableId,
      waiterId,
      items: processedItems,
      totalAmount: Math.round(calculatedTotal * 100) / 100,
      status: 'Pending',
      paymentStatus: 'Pending',
    });

    // Mark table as Occupied and assign current order
    table.status = 'Occupied';
    table.currentOrderId = order._id;
    await table.save();

    // Populate order details for socket dispatching
    const populatedOrder = await Order.findById(order._id)
      .populate('tableId', 'tableNumber status')
      .populate('waiterId', 'name')
      .lean();

    // Broadcast to Kitchen (Cooks) and Admins via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('order:created', populatedOrder);
      io.emit('table:status_updated', {
        tableId: table._id,
        tableNumber: table.tableNumber,
        status: 'Occupied',
        currentOrderId: order._id,
      });
    }

    return res.status(201).json({
      success: true,
      data: populatedOrder,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Updates an order's status.
 * Restricted to: Cook, Admin
 * Cook can only change status to 'Accepted', 'Rejected', or 'Ready'.
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    const userRole = req.user.role;

    // Strict validation: Cook cannot mark orders as Completed (only Waiter upon billing)
    if (userRole === 'Cook' && !['Accepted', 'Rejected', 'Ready'].includes(status)) {
      return res.status(403).json({
        success: false,
        error: `Cooks can only set status to 'Accepted', 'Rejected', or 'Ready'. '${status}' is not permitted.`,
      });
    }

    const order = await Order.findById(id).populate('tableId', 'tableNumber status');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    // Disallow transitions on already completed orders
    if (order.status === 'Completed') {
      return res.status(400).json({
        success: false,
        error: 'Order has already been completed and paid. Status cannot be modified.',
      });
    }

    order.status = status;
    if (rejectionReason) {
      order.rejectionReason = rejectionReason;
    }

    // If cook rejects order, free the table if no other items
    if (status === 'Rejected') {
      await Table.findByIdAndUpdate(order.tableId._id, {
        status: 'Available',
        currentOrderId: null,
      });
    }

    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('tableId', 'tableNumber status')
      .populate('waiterId', 'name')
      .lean();

    // Broadcast status change to POS and KDS clients
    const io = req.app.get('io');
    if (io) {
      io.emit('order:status_updated', populatedOrder);

      if (status === 'Rejected') {
        io.emit('table:status_updated', {
          tableId: order.tableId._id,
          tableNumber: order.tableId.tableNumber,
          status: 'Available',
          currentOrderId: null,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Order status updated to '${status}'`,
      data: populatedOrder,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Updates items on an existing order.
 * Restricted to: Waiter, Admin
 * STRICT BUSINESS RULE: Cannot delete or update items after kitchen has Accepted or Ready the order!
 */
const updateOrderItems = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { items } = req.body;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    // STRICT DEFENSE RULE: Check if kitchen has already accepted the order
    if (order.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        error: `Items cannot be modified. The kitchen has already ${order.status.toLowerCase()} this order. Please inform the kitchen or request an Admin override.`,
        currentStatus: order.status,
      });
    }

    // Resolve menu items securely
    const menuItemIds = items.map((i) => i.menuItemId);
    const dbMenuItems = await MenuItem.find({ _id: { $in: menuItemIds } });
    const menuMap = new Map(dbMenuItems.map((item) => [item._id.toString(), item]));

    let calculatedTotal = 0;
    const processedItems = [];

    for (const item of items) {
      const dbItem = menuMap.get(item.menuItemId);
      if (!dbItem) {
        return res.status(400).json({
          success: false,
          error: `Menu item with ID ${item.menuItemId} does not exist.`,
        });
      }

      if (!dbItem.isAvailable) {
        return res.status(400).json({
          success: false,
          error: `'${dbItem.name}' is currently unavailable.`,
        });
      }

      calculatedTotal += dbItem.price * item.quantity;
      processedItems.push({
        menuItemId: dbItem._id,
        name: dbItem.name,
        price: dbItem.price,
        quantity: item.quantity,
        notes: item.notes || '',
      });
    }

    order.items = processedItems;
    order.totalAmount = Math.round(calculatedTotal * 100) / 100;
    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('tableId', 'tableNumber status')
      .populate('waiterId', 'name')
      .lean();

    const io = req.app.get('io');
    if (io) {
      io.emit('order:updated', populatedOrder);
    }

    return res.status(200).json({
      success: true,
      message: 'Order items updated successfully.',
      data: populatedOrder,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Processes bill payment for an order.
 * Restricted to: Waiter, Admin
 * CRITICAL WORKFLOW: Marks order as 'Completed' and table status instantly changes to 'Dirty'!
 */
const processPayment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id).populate('tableId');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    if (order.status === 'Completed' || order.paymentStatus === 'Paid') {
      return res.status(400).json({
        success: false,
        error: 'Order has already been paid and finalized.',
      });
    }

    // Finalize order
    order.status = 'Completed';
    order.paymentStatus = 'Paid';
    await order.save();

    // Instantly transition Table to 'Dirty' for Cleaners
    const table = await Table.findById(order.tableId._id);
    if (table) {
      table.status = 'Dirty';
      table.currentOrderId = null;
      await table.save();
    }

    const populatedOrder = await Order.findById(order._id)
      .populate('tableId', 'tableNumber status')
      .populate('waiterId', 'name')
      .lean();

    // Broadcast completion to POS and alert Cleaners of newly Dirty table
    const io = req.app.get('io');
    if (io) {
      io.emit('order:completed', populatedOrder);
      if (table) {
        io.emit('table:status_updated', {
          tableId: table._id,
          tableNumber: table.tableNumber,
          status: 'Dirty',
          updatedBy: req.user.name,
          timestamp: new Date(),
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Payment received for ${order.orderNumber}. Table ${table ? table.tableNumber : ''} is now marked 'Dirty' for cleaning.`,
      data: populatedOrder,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Void/Override an order at any stage.
 * Restricted to: Admin ONLY (Master Override)
 */
const voidOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    order.status = 'Rejected';
    order.rejectionReason = `ADMIN VOID OVERRIDE: ${reason || 'Voided by Admin'}`;
    await order.save();

    // Reset table if it was linked to this voided order
    const table = await Table.findOne({ currentOrderId: order._id });
    if (table) {
      table.status = 'Available';
      table.currentOrderId = null;
      await table.save();
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('order:voided', { orderId: order._id, reason: order.rejectionReason });
      if (table) {
        io.emit('table:status_updated', {
          tableId: table._id,
          tableNumber: table.tableNumber,
          status: 'Available',
          currentOrderId: null,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Order ${order.orderNumber} successfully voided by Admin override.`,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOrders,
  getActiveOrders,
  createOrder,
  updateOrderStatus,
  updateOrderItems,
  processPayment,
  voidOrder,
};

