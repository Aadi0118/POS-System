/**
 * @file db.js
 * @description Hardened MongoDB connection manager using Mongoose.
 * Attempts connection to configured MONGO_URI; if unavailable, gracefully
 * provisions an in-memory MongoMemoryServer for instant zero-configuration execution.
 */

const mongoose = require('mongoose');

let mongodInstance = null;

const ATLAS_URI = 'mongodb+srv://shree_admin:Imbatman2101@cluster0.d1n1vfm.mongodb.net/restaurant?retryWrites=true&w=majority';

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || ATLAS_URI;

  const options = {
    autoIndex: process.env.NODE_ENV !== 'production',
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 3000, // Quick 3s timeout to test local MongoDB
    socketTimeoutMS: 45000,
  };

  try {
    console.log(`[Database] Attempting connection to MongoDB at: ${mongoUri}`);
    const conn = await mongoose.connect(mongoUri, options);
    console.log(`[Database] Connected Successfully: ${conn.connection.host}/${conn.connection.name}`);
    registerLifecycleHandlers();
    await autoSeed();
    return conn;
  } catch (initialErr) {
    console.warn(`[Database Warning] Could not connect to external MongoDB: ${initialErr.message}`);
    console.log(`[Database] Provisioning zero-config In-Memory MongoDB Server...`);

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create({
        instance: {
          dbName: 'restaurant_pos',
        },
      });

      const inMemoryUri = mongodInstance.getUri();
      console.log(`[Database] In-Memory MongoDB running at: ${inMemoryUri}`);

      const conn = await mongoose.connect(inMemoryUri, {
        autoIndex: true,
      });

      console.log('[Database] Connected to In-Memory MongoDB.');
      registerLifecycleHandlers();

      // Automatically seed data into in-memory database
      await autoSeed();

      return conn;
    } catch (memErr) {
      console.error(`[Database Critical Error] Failed to initialize in-memory database: ${memErr.message}`);
      process.exit(1);
    }
  }
};

const registerLifecycleHandlers = () => {
  mongoose.connection.on('error', (err) => {
    console.error(`[Database Error] MongoDB connection error: ${err.message}`);
  });

  const cleanup = async (signal) => {
    console.log(`[Database] Closing MongoDB connection (${signal})...`);
    await mongoose.connection.close();
    if (mongodInstance) {
      await mongodInstance.stop();
    }
    process.exit(0);
  };

  process.on('SIGINT', () => cleanup('SIGINT'));
  process.on('SIGTERM', () => cleanup('SIGTERM'));
};

const autoSeed = async () => {
  try {
    const User = require('../models/User');
    const Table = require('../models/Table');
    const MenuItem = require('../models/MenuItem');

    const count = await User.countDocuments();
    if (count === 0) {
      console.log('[Database Auto-Seed] Populating initial restaurant state...');

      // Seed staff
      const staffMembers = [
        { name: 'Rajesh Sharma (Admin)', hashedPin: '1111', role: 'Admin', isActive: true },
        { name: 'Amit Verma (Waiter)', hashedPin: '2222', role: 'Waiter', isActive: true },
        { name: 'Chef Sanjeev (Cook)', hashedPin: '3333', role: 'Cook', isActive: true },
        { name: 'Ramesh Lal (Cleaner)', hashedPin: '4444', role: 'Cleaner', isActive: true },
      ];
      for (const s of staffMembers) {
        await User.create(s);
      }

      // Seed tables
      for (let i = 1; i <= 8; i++) {
        await Table.create({
          tableNumber: i,
          capacity: i % 2 === 0 ? 4 : 2,
          status: 'Available',
        });
      }

      // Seed multi-cuisine menu only if collection is empty
      const menuCount = await MenuItem.countDocuments();
      if (menuCount === 0) {
        const menuItems = [
          { name: 'Dal Makhani', category: 'North Indian', price: 240, description: 'Creamy black lentils slow cooked overnight', isAvailable: true },
          { name: 'Paneer Butter Masala', category: 'North Indian', price: 290, description: 'Cottage cheese in rich butter tomato gravy', isAvailable: true },
          { name: 'Kashmiri Rogan Josh', category: 'North Indian', price: 390, description: 'Slow cooked tender lamb with Kashmiri spices', isAvailable: true },
          { name: 'Chilli Paneer Dry', category: 'Indo-Chinese', price: 250, description: 'Crisp paneer with bell peppers and soy glaze', isAvailable: true },
          { name: 'Veg Hakka Noodles', category: 'Indo-Chinese', price: 210, description: 'Wok tossed noodles with garden vegetables', isAvailable: true },
          { name: 'Crispy Masala Dosa', category: 'South Indian', price: 160, description: 'Crepe with potato masala, sambar & coconut chutney', isAvailable: true },
          { name: 'Steamed Idli Sambar (2 pcs)', category: 'South Indian', price: 110, description: 'Soft rice cakes with hot lentil sambar', isAvailable: true },
          { name: 'Mumbai Pav Bhaji', category: 'Street Food', price: 180, description: 'Buttery mashed spiced vegetables with hot pav', isAvailable: true },
          { name: 'Delhi Chaat Papdi', category: 'Street Food', price: 140, description: 'Crisp wafers topped with potato & tamarind chutney', isAvailable: true },
          { name: 'Charcoal Grilled Paneer Skewers', category: 'Grills', price: 280, description: 'Flame grilled cottage cheese skewers (no tandoor)', isAvailable: true },
          { name: 'Herb Grilled Chicken Breast', category: 'Grills', price: 360, description: 'Cast iron seared chicken with garlic herb jus', isAvailable: true },
          { name: 'Hyderabadi Dum Chicken Biryani', category: 'Biryani', price: 350, description: 'Fragrant basmati rice layered with spiced chicken', isAvailable: true },
          { name: 'Steamed Darjeeling Veg Momos', category: 'Momos', price: 160, description: 'Steamed vegetable dumplings with spicy dip', isAvailable: true },
          { name: 'Juicy Chicken Momos (Steamed)', category: 'Momos', price: 210, description: 'Steamed minced chicken dumplings', isAvailable: true },
          { name: 'Alphonso Mango Lassi', category: 'Beverages', price: 120, description: 'Sweet mango and chilled yogurt blend', isAvailable: true },
          { name: 'Kullad Masala Chai', category: 'Beverages', price: 60, description: 'Clay cup cardamom and ginger tea', isAvailable: true },
        ];
        for (const m of menuItems) {
          await MenuItem.create(m);
        }
      }

      console.log('=======================================================');
      console.log('🎉 In-Memory Database Auto-Seeded Successfully!');
      console.log('  - Admin:   PIN 1111');
      console.log('  - Waiter:  PIN 2222');
      console.log('  - Cook:    PIN 3333');
      console.log('  - Cleaner: PIN 4444');
      console.log('=======================================================');
    }
  } catch (seedErr) {
    console.error(`[Auto-Seed Error] ${seedErr.message}`);
  }
};

module.exports = connectDB;
