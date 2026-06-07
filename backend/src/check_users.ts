import { connectMongo } from './config/db';
import { User } from './models';
import mongoose from 'mongoose';

const checkUsers = async () => {
  try {
    await connectMongo();
    const count = await User.countDocuments({});
    console.log(`[Check] Total users in MongoDB: ${count}`);

    const users = await User.find({}, 'email role employeeId');
    console.log('[Check] Users list:');
    users.forEach(u => console.log(` - Email: ${u.email} | Role: ${u.role} | ID: ${u.employeeId}`));

    mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[Check] Error:', err);
    process.exit(1);
  }
};

checkUsers();
