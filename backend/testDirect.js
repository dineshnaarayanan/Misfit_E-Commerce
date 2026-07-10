require('dotenv').config();
const mongoose = require('mongoose');
const { Cart } = require('./database/db');

async function debugUpdate() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Create a fake user and product
  const userId = new mongoose.Types.ObjectId();
  const productId = new mongoose.Types.ObjectId();

  // Add to cart
  const created = await Cart.findOneAndUpdate(
    { userId: userId, productId: productId, size: 'M', colour: 'Black' },
    { $inc: { qty: 1 } },
    { upsert: true, new: true }
  );

  console.log('Created cart item:', created);

  // Now simulate updateCartItem / removeFromCart
  const idToFind = created._id.toString();
  const userIdStr = userId.toString();

  const found = await Cart.findOne({ _id: idToFind, userId: userIdStr });
  console.log('Found with strings:', found);

  process.exit(0);
}
debugUpdate().catch(console.error);
