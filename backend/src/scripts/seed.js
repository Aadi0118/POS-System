/**
 * @file seed.js
 * @description Database seeder script.
 * Populates initial staff members (with bcrypt-hashed 4-digit PINs),
 * dining tables, and a rich multi-cuisine menu (strictly excluding tandoor items).
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Table = require('../models/Table');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/restaurant_pos';
    console.log(`[Seed Script] Connecting to MongoDB: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    console.log('[Seed Script] Purging old records...');
    await Promise.all([
      User.deleteMany({}),
      Table.deleteMany({}),
      MenuItem.deleteMany({}),
      Order.deleteMany({}),
    ]);

    // 1. Seed Staff Members (All 4 Distinct Roles)
    console.log('[Seed Script] Seeding staff accounts with bcrypt-hashed PINs...');
    const staffMembers = [
      {
        name: 'Rajesh Sharma (Admin)',
        hashedPin: '1111', // Will be hashed by User pre-save hook
        role: 'Admin',
        isActive: true,
      },
      {
        name: 'Amit Verma (Waiter)',
        hashedPin: '2222',
        role: 'Waiter',
        isActive: true,
      },
      {
        name: 'Chef Sanjeev (Cook)',
        hashedPin: '3333',
        role: 'Cook',
        isActive: true,
      },
      {
        name: 'Ramesh Lal (Cleaner)',
        hashedPin: '4444',
        role: 'Cleaner',
        isActive: true,
      },
    ];

    for (const staff of staffMembers) {
      await User.create(staff);
    }
    console.log(`  ✔ Created ${staffMembers.length} staff accounts.`);

    // 2. Seed Dining Tables
    console.log('[Seed Script] Seeding dining tables...');
    const tables = [
      { tableNumber: 1, capacity: 2, status: 'Available' },
      { tableNumber: 2, capacity: 4, status: 'Available' },
      { tableNumber: 3, capacity: 4, status: 'Available' },
      { tableNumber: 4, capacity: 6, status: 'Available' },
      { tableNumber: 5, capacity: 6, status: 'Available' },
      { tableNumber: 6, capacity: 4, status: 'Available' },
      { tableNumber: 7, capacity: 8, status: 'Available' },
      { tableNumber: 8, capacity: 2, status: 'Available' },
    ];

    for (const t of tables) {
      await Table.create(t);
    }
    console.log(`  ✔ Created ${tables.length} dining tables.`);

    // 3. Seed Multi-Cuisine Menu (Excluding Tandoor)
    console.log('[Seed Script] Seeding multi-cuisine menu...');
    const menuItems = [
      // North Indian
      {
        name: 'Dal Makhani',
        category: 'North Indian',
        price: 240,
        description: 'Slow-cooked black lentils in rich creamy butter gravy',
        isAvailable: true,
      },
      {
        name: 'Paneer Butter Masala',
        category: 'North Indian',
        price: 290,
        description: 'Fresh cottage cheese cubes in silky tomato and cashew makhani sauce',
        isAvailable: true,
      },
      {
        name: 'Kashmiri Rogan Josh',
        category: 'North Indian',
        price: 390,
        description: 'Tender braised lamb cooked with authentic Kashmiri spices and ratanjot',
        isAvailable: true,
      },

      // Indo-Chinese
      {
        name: 'Chilli Paneer Dry',
        category: 'Indo-Chinese',
        price: 250,
        description: 'Crispy cottage cheese tossed with bell peppers, green chillies, and soy glaze',
        isAvailable: true,
      },
      {
        name: 'Veg Hakka Noodles',
        category: 'Indo-Chinese',
        price: 210,
        description: 'Wok-tossed noodles with shredded vegetables and aromatic garlic',
        isAvailable: true,
      },
      {
        name: 'Chicken Manchurian Gravy',
        category: 'Indo-Chinese',
        price: 320,
        description: 'Golden chicken dumplings in savory scallion and coriander dark broth',
        isAvailable: true,
      },

      // South Indian
      {
        name: 'Crispy Masala Dosa',
        category: 'South Indian',
        price: 160,
        description: 'Fermented crepe filled with spiced potato masala, served with coconut chutney & sambar',
        isAvailable: true,
      },
      {
        name: 'Steamed Idli Sambar (2 pcs)',
        category: 'South Indian',
        price: 110,
        description: 'Fluffy steamed rice cakes served with hot lentil sambar and tomato chutney',
        isAvailable: true,
      },
      {
        name: 'Chettinad Pepper Chicken',
        category: 'South Indian',
        price: 340,
        description: 'Spicy Tamil Nadu style chicken cooked with freshly crushed black peppercorns and curry leaves',
        isAvailable: true,
      },

      // Street Food
      {
        name: 'Mumbai Pav Bhaji',
        category: 'Street Food',
        price: 180,
        description: 'Mashed spiced vegetables topped with dollop of butter, served with toasted pav',
        isAvailable: true,
      },
      {
        name: 'Delhi Chaat Papdi',
        category: 'Street Food',
        price: 140,
        description: 'Crisp wafers topped with potatoes, chickpeas, sweetened yogurt, and tamarind chutney',
        isAvailable: true,
      },
      {
        name: 'Dahi Ke Sholay',
        category: 'Street Food',
        price: 220,
        description: 'Crispy bread pockets stuffed with spiced hung curd and bell peppers',
        isAvailable: true,
      },

      // Grills
      {
        name: 'Charcoal Grilled Paneer Skewers',
        category: 'Grills',
        price: 280,
        description: 'Flame-grilled marinated cottage cheese skewers with bell pepper glaze',
        isAvailable: true,
      },
      {
        name: 'Herb Grilled Chicken Breast',
        category: 'Grills',
        price: 360,
        description: 'Tender chicken breast seared on ribbed cast iron grill with garlic rosemary jus',
        isAvailable: true,
      },
      {
        name: 'Grilled Fish with Lemon Butter',
        category: 'Grills',
        price: 420,
        description: 'Fresh sole fillet grilled to perfection, drizzled with caper lemon herb emulsion',
        isAvailable: true,
      },

      // Biryani
      {
        name: 'Hyderabadi Dum Chicken Biryani',
        category: 'Biryani',
        price: 350,
        description: 'Fragrant basmati rice layered with spiced marinated chicken, cooked in sealed pot',
        isAvailable: true,
      },
      {
        name: 'Awadhi Mutton Biryani',
        category: 'Biryani',
        price: 440,
        description: 'Lucknowi style fragrant rice infused with saffron, kewra water, and melt-in-mouth mutton',
        isAvailable: true,
      },
      {
        name: 'Subz Dum Veg Biryani',
        category: 'Biryani',
        price: 270,
        description: 'Assorted garden vegetables and paneer simmered with royal whole spices',
        isAvailable: true,
      },

      // Momos
      {
        name: 'Steamed Darjeeling Veg Momos',
        category: 'Momos',
        price: 160,
        description: 'Thin translucent wrappers filled with minced cabbage, carrots, served with spicy red chutney',
        isAvailable: true,
      },
      {
        name: 'Juicy Chicken Momos (Steamed)',
        category: 'Momos',
        price: 210,
        description: 'Himalayan style minced chicken dumplings bursting with spiced broth',
        isAvailable: true,
      },
      {
        name: 'Crispy Kurkure Momos',
        category: 'Momos',
        price: 230,
        description: 'Panko coated extra-crispy momos served with creamy mayo dip',
        isAvailable: true,
      },

      // Beverages
      {
        name: 'Alphonso Mango Lassi',
        category: 'Beverages',
        price: 120,
        description: 'Rich churned yogurt blended with authentic Alphonso mango pulp',
        isAvailable: true,
      },
      {
        name: 'Kullad Masala Chai',
        category: 'Beverages',
        price: 60,
        description: 'Brewed black tea infused with ginger, cardamom, and clove, served in clay cup',
        isAvailable: true,
      },
      {
        name: 'Fresh Lime Mint Soda',
        category: 'Beverages',
        price: 90,
        description: 'Freshly squeezed lime juice, mint leaves, and effervescent sparkling soda',
        isAvailable: true,
      },
    ];

    for (const item of menuItems) {
      await MenuItem.create(item);
    }
    console.log(`  ✔ Created ${menuItems.length} menu items across multi-cuisine categories.`);

    console.log('====================================================');
    console.log('🎉 SEED COMPLETED SUCCESSFULLY!');
    console.log('Staff Credentials for PIN Keypad:');
    console.log('  - Admin:   Rajesh Sharma   | PIN: 1111');
    console.log('  - Waiter:  Amit Verma      | PIN: 2222');
    console.log('  - Cook:    Chef Sanjeev    | PIN: 3333');
    console.log('  - Cleaner: Ramesh Lal      | PIN: 4444');
    console.log('====================================================');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(`[Seed Error] Failed to seed database: ${error.message}`);
    process.exit(1);
  }
};

seedDatabase();

