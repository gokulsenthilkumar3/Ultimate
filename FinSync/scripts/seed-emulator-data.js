#!/usr/bin/env node

/**
 * Seed Firebase Emulator with Sample Data
 * Run this to populate Firestore emulator with test data
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin for emulator
admin.initializeApp({
  projectId: 'finsync-super-2025',
});

// Connect to emulator
const db = admin.firestore();
db.settings({
  host: 'localhost:8080',
  ssl: false,
});

console.log('🌱 Seeding Firebase Emulator with sample data...\n');

const sampleUserId = 'test-user-123';

async function seedData() {
  try {
    // 1. Create test user profile
    await db.collection('users').doc(sampleUserId).set({
      email: 'test@finsyncsuper.com',
      name: 'Test User',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      phone: '+919876543210',
      pan: 'ABCDE1234F',
      dob: new Date('1990-01-01'),
      income: 600000, // ₹6L annually
    });
    console.log('✅ Created test user profile');

    // 2. Create sample transactions
    const transactions = [
      {
        amount: 450,
        type: 'debit',
        category: 'Food & Dining',
        merchant: 'Swiggy',
        source: 'sms',
        date: admin.firestore.Timestamp.fromDate(new Date('2025-11-01T14:30:00')),
        rawText: 'Your A/c debited Rs.450 on 01-Nov-25 at Swiggy Mumbai',
        balance: 49550,
      },
      {
        amount: 50000,
        type: 'credit',
        category: 'Salary',
        merchant: 'Acme Corp',
        source: 'email',
        date: admin.firestore.Timestamp.fromDate(new Date('2025-11-01T10:00:00')),
        rawText: 'Salary credited to your account',
        balance: 50000,
      },
      {
        amount: 1500,
        type: 'debit',
        category: 'Shopping',
        merchant: 'Amazon',
        source: 'sms',
        date: admin.firestore.Timestamp.fromDate(new Date('2025-10-30T19:45:00')),
        rawText: 'Your A/c debited Rs.1500 on 30-Oct-25 at Amazon',
        balance: 48450,
      },
      {
        amount: 200,
        type: 'debit',
        category: 'Bills & Utilities',
        merchant: 'Airtel',
        source: 'sms',
        date: admin.firestore.Timestamp.fromDate(new Date('2025-10-29T08:15:00')),
        rawText: 'Your A/c debited Rs.200 on 29-Oct-25 at Airtel prepaid recharge',
        balance: 49750,
      },
      {
        amount: 800,
        type: 'debit',
        category: 'Transport',
        merchant: 'Uber',
        source: 'sms',
        date: admin.firestore.Timestamp.fromDate(new Date('2025-10-28T22:30:00')),
        rawText: 'Your A/c debited Rs.800 on 28-Oct-25 at Uber trip',
        balance: 49950,
      },
    ];

    const batch = db.batch();
    transactions.forEach((txn) => {
      const ref = db.collection('users').doc(sampleUserId).collection('transactions').doc();
      batch.set(ref, {
        ...txn,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
    console.log(`✅ Created ${transactions.length} sample transactions`);

    // 3. Create sample bank account
    await db.collection('users').doc(sampleUserId).collection('accounts').doc('hdfc-savings').set({
      bankName: 'HDFC Bank',
      accountType: 'savings',
      accountNumber: '****1234',
      balance: 49750,
      linkedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSynced: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
    });
    console.log('✅ Created sample bank account');

    // 4. Create sample budget
    await db.collection('users').doc(sampleUserId).collection('budgets').doc('nov-2025').set({
      month: 'November',
      year: 2025,
      totalIncome: 50000,
      totalBudget: 40000,
      categories: {
        'Food & Dining': { allocated: 8000, spent: 450 },
        'Shopping': { allocated: 6000, spent: 1500 },
        'Bills & Utilities': { allocated: 5000, spent: 200 },
        'Transport': { allocated: 4000, spent: 800 },
        'Entertainment': { allocated: 3000, spent: 0 },
        'Healthcare': { allocated: 2000, spent: 0 },
        'Others': { allocated: 12000, spent: 0 },
      },
      rule: '50/30/20',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('✅ Created sample budget');

    // 5. Create app config (public)
    await db.collection('config').doc('categories').set({
      list: [
        'Food & Dining',
        'Shopping',
        'Bills & Utilities',
        'Transport',
        'Healthcare',
        'Education',
        'Entertainment',
        'Travel',
        'Personal Care',
        'Investments',
        'Transfers',
        'Salary',
        'Cashback',
        'Refunds',
        'Others',
      ],
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('✅ Created app config');

    console.log('\n🎉 Sample data seeded successfully!');
    console.log('\n📊 You can now:');
    console.log('   1. Open Emulator UI at http://localhost:4000');
    console.log('   2. View data in Firestore tab');
    console.log('   3. Test your app with test-user-123');
    console.log('\n💡 To use this data in your app, authenticate with:');
    console.log('   Email: test@finsyncsuper.com');
    console.log('   (In emulator, any password works)\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedData();
