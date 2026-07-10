require('dotenv').config();
const mongoose = require('mongoose');
const { Cart, User } = require('./database/db');

async function debugQuery() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Hardcode the IDs from previous output
  const _idStr = '6a3b6052c17b7c209e855040';
  const userIdStr = '6a3b6052ea648661412a1f55';
  
  const item1 = await Cart.findOne({ _id: _idStr, userId: userIdStr });
  console.log('Query with strings:', item1);
  
  const item2 = await Cart.findOne({ _id: new mongoose.Types.ObjectId(_idStr), userId: new mongoose.Types.ObjectId(userIdStr) });
  console.log('Query with ObjectIds:', item2);

  process.exit(0);
}
debugQuery().catch(console.error);
