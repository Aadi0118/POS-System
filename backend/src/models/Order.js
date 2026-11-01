/**
 * @file Order.js
 * @description Mongoose model for dining orders.
 * Manages itemized kitchen orders, workflow statuses (Pending -> Accepted/Rejected -> Ready -> Completed),
 * and links waiters and tables.
 */

const mongoose = require('mongoose');

const ORDER_STATUSES = ['Pending', 'Accepted', 'Rejected', 'Ready', 'Completed'];

const orderItemSchema = new mongoose.Schema(
  {
    menuItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: [true, 'Menu item ID reference is required'],
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Item price cannot be negative'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: [200, 'Notes cannot exceed 200 characters'],
    },
    round: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Ready'],
      default: 'Pending',
    },
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: function () {
        return `ord-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      },
    },
    orderNumber: {
      type: String,
      unique: true,
      index: true,
    },
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
      required: [true, 'Table reference is required'],
      index: true,
    },
    waiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Waiter reference is required'],
      index: true,
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: 'An order must contain at least one item.',
      },
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ORDER_STATUSES,
        message: '{VALUE} is not a valid order status',
      },
      default: 'Pending',
      index: true,
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative'],
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid'],
      default: 'Pending',
      index: true,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to generate readable human-friendly sequential order number
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(100 + Math.random() * 900);
    this.orderNumber = `ORD-${timestamp}-${random}`;
  }
  if (!this.id) {
    this.id = `ord-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  }
  next();
});

orderSchema.statics.ORDER_STATUSES = ORDER_STATUSES;

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;

