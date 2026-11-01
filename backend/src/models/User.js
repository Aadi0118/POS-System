/**
 * @file User.js
 * @description Mongoose model for staff users with bcrypt-hashed 4-digit PINs.
 * Enforces strict PIN hashing and prevents plain-text PIN storage or leakage.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['Admin', 'Waiter', 'Cook', 'Cleaner'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Staff member name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    hashedPin: {
      type: String,
      required: [true, 'Hashed PIN is required'],
      select: false, // Prevents hashed PIN from being included in default queries
    },
    role: {
      type: String,
      required: [true, 'User role is required'],
      enum: {
        values: ROLES,
        message: '{VALUE} is not a valid staff role',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    // Salary & Benefits Configuration (Admin Managed)
    baseSalary: {
      type: Number,
      default: 0,
      min: [0, 'Base monthly salary cannot be negative'],
    },
    pfEnabled: {
      type: Boolean,
      default: false,
    },
    pfPercentage: {
      type: Number,
      default: 12,
      min: [0, 'PF percentage cannot be negative'],
      max: [100, 'PF percentage cannot exceed 100%'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.hashedPin; // Strict safeguard: never expose hashed PIN
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: (doc, ret) => {
        delete ret.hashedPin;
        delete ret.__v;
        return ret;
      },
    },
  }
);

/**
 * Pre-save middleware: Hashes plain-text PIN before persistence.
 * Employs bcrypt with 10 salt rounds for secure key derivation.
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('hashedPin')) return next();

  // If hashedPin is currently a 4-digit plain PIN string, hash it
  if (this.hashedPin && this.hashedPin.length === 4 && /^\d{4}$/.test(this.hashedPin)) {
    const salt = await bcrypt.genSalt(10);
    this.hashedPin = await bcrypt.hash(this.hashedPin, salt);
  }

  next();
});

/**
 * Instance method to verify candidate 4-digit PIN against stored bcrypt hash.
 * @param {string} candidatePin
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePin = async function (candidatePin) {
  return bcrypt.compare(candidatePin, this.hashedPin);
};

userSchema.statics.ROLES = ROLES;

const User = mongoose.model('User', userSchema);
module.exports = User;

