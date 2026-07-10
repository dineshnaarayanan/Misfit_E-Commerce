require('dotenv').config();
const mongoose = require('mongoose');
const { Order, Counter } = require('./database/db');

async function fix() {
  try {
    // Reset counter to 1000 plus the number of orders we update
    await Counter.updateOne({ _id: 'orderId' }, { $set: { seq: 1000 } }, { upsert: true });
    
    const ordersToUpdate = await Order.find({ orderNumber: { $lte: 100 } }).sort({ createdAt: 1 });
    console.log(`Found ${ordersToUpdate.length} orders to fix.`);

    for (const order of ordersToUpdate) {
      const counter = await Counter.findOneAndUpdate(
        { _id: 'orderId' },
        { $inc: { seq: 1 } },
        { new: true }
      );
      order.orderNumber = counter.seq;
      await order.save();
      console.log(`Fixed Order ${order._id} with orderNumber ${order.orderNumber}`);
    }

    console.log('Fix complete!');
    process.exit(0);
  } catch (err) {
    console.error('Fix failed:', err);
    process.exit(1);
  }
}

mongoose.connection.once('open', fix);
