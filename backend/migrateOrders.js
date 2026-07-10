require('dotenv').config();
const mongoose = require('mongoose');
const { Order, Counter } = require('./database/db');

async function migrate() {
  try {
    const ordersToUpdate = await Order.find({ orderNumber: { $exists: false } }).sort({ createdAt: 1 });
    console.log(`Found ${ordersToUpdate.length} orders without an orderNumber.`);

    for (const order of ordersToUpdate) {
      const counter = await Counter.findOneAndUpdate(
        { _id: 'orderId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      order.orderNumber = counter.seq;
      await order.save();
      console.log(`Updated Order ${order._id} with orderNumber ${order.orderNumber}`);
    }

    console.log('Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

// Ensure connection is ready before running.
mongoose.connection.once('open', migrate);
