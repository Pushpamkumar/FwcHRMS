import { connectMongo } from './config/db';
import { User } from './models';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

const checkPassword = async () => {
  try {
    await connectMongo();
    const user = await User.findOne({ email: 'shalini.dey@fwcit.com' });
    if (!user) {
      console.log('[Check] Shalini not found!');
      process.exit(1);
    }

    const testPasswords = ['Password@2026', 'AdminPassword@2026'];
    for (const test of testPasswords) {
      const isMatch = await bcrypt.compare(test, user.passwordHash);
      console.log(`[Check] Test password "${test}": Match = ${isMatch}`);
    }

    mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[Check] Error:', err);
    process.exit(1);
  }
};

checkPassword();
