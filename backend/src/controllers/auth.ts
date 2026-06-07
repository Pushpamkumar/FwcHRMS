import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, Department } from '../models';
import { redisClient } from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeyforfwchrms2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'supersecretrefreshjwtkeyforfwchrms2026';
const ACCESS_TOKEN_EXP = '15m';
const REFRESH_COOKIE_NAME = 'refreshToken';

// Helper: Generate Employee ID sequentially
const generateEmployeeId = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  // Find the last user sorted by employeeId matching FWC-YYYY-XXX pattern
  const lastUser = await User.findOne({
    employeeId: new RegExp(`^FWC-${currentYear}-\\d{3}$`)
  }).sort({ employeeId: -1 });

  if (!lastUser) {
    return `FWC-${currentYear}-001`;
  }

  const parts = lastUser.employeeId.split('-');
  const lastSeq = parseInt(parts[2], 10);
  const nextSeqStr = String(lastSeq + 1).padStart(3, '0');
  return `FWC-${currentYear}-${nextSeqStr}`;
};

// ==========================================
// 1. REGISTER
// ==========================================
export const register = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, password, role, phone, departmentId } = req.body;

    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ message: 'All mandatory fields are required.' });
    }

    // Validate email domain (must end in @fwcit.com)
    if (!email.endsWith('@fwcit.com')) {
      return res.status(400).json({ message: 'Registration is restricted to @fwcit.com domain email accounts only.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    // Verify department exists if provided
    if (departmentId) {
      const dept = await Department.findById(departmentId);
      if (!dept) {
        return res.status(400).json({ message: 'Invalid department ID.' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const employeeId = await generateEmployeeId();

    const newUser = await User.create({
      employeeId,
      firstName,
      lastName,
      email: email.toLowerCase(),
      passwordHash,
      role,
      phone,
      department: departmentId,
      isActive: true,
      isEmailVerified: false, // will require verification
    });

    // Generate validation verification token
    const verificationToken = jwt.sign(
      { sub: newUser._id, type: 'email_verification' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // NodeMailer Mock Email Simulation
    console.log('----------------------------------------------------');
    console.log(`[MOCK EMAIL SENT TO ${newUser.email}]`);
    console.log(`Subject: Verify your FWC HRMS Account`);
    console.log(`Verification Link: http://localhost:5000/api/v1/auth/verify-email/${verificationToken}`);
    console.log('----------------------------------------------------');

    return res.status(201).json({
      message: 'Registration successful. Verification email sent.',
      employeeId,
      // Provide link for easier dev testing
      devVerificationUrl: `http://localhost:5000/api/v1/auth/verify-email/${verificationToken}`
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ==========================================
// 2. LOGIN
// ==========================================
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingTime = Math.ceil((user.lockUntil.getTime() - Date.now()) / (1000 * 60));
      return res.status(423).json({
        message: `Account is temporarily locked due to multiple failed login attempts. Try again in ${remainingTime} minutes.`
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      // Increment login attempts
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // lock for 30 mins
        console.log(`[Auth] User ${user.email} account locked for 30 minutes.`);
      }
      await user.save();
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Reset login attempts on success
    user.loginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = new Date();

    // Sign tokens
    const tokenPayload = {
      sub: user._id,
      employeeId: user.employeeId,
      role: user.role,
      department: user.department,
      email: user.email,
    };

    const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXP });
    const refreshToken = jwt.sign({ sub: user._id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    // Store up to 5 refresh tokens for multi-device support
    user.refreshTokens.push(refreshToken);
    if (user.refreshTokens.length > 5) {
      user.refreshTokens.shift(); // remove oldest
    }
    await user.save();

    // Set refreshToken cookie
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json({
      accessToken,
      user: {
        id: user._id,
        employeeId: user.employeeId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        department: user.department,
      }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ==========================================
// 3. REFRESH TOKEN
// ==========================================
export const refresh = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies[REFRESH_COOKIE_NAME];

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token missing.' });
    }

    // Decode refresh token
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired refresh token.' });
    }

    const user = await User.findById(decoded.sub);
    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(401).json({ message: 'Unauthorized refresh attempt.' });
    }

    // Generate a fresh access token
    const tokenPayload = {
      sub: user._id,
      employeeId: user.employeeId,
      role: user.role,
      department: user.department,
      email: user.email,
    };

    const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXP });

    return res.status(200).json({
      accessToken,
      user: {
        id: user._id,
        employeeId: user.employeeId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        department: user.department,
      }
    });
  } catch (err) {
    console.error('Token refresh error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ==========================================
// 4. LOGOUT
// ==========================================
export const logout = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies[REFRESH_COOKIE_NAME];

    if (refreshToken) {
      // Remove token from database refreshTokens array
      try {
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { sub: string };
        await User.findByIdAndUpdate(decoded.sub, {
          $pull: { refreshTokens: refreshToken }
        });
      } catch (e) {
        // Token invalid/expired - just clear cookie anyway
      }
    }

    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return res.status(200).json({ message: 'Logged out successfully.' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ==========================================
// 5. EMAIL VERIFICATION
// ==========================================
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ message: 'Verification token is required.' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(400).send('<h1>Verification failed. Invalid or expired token.</h1>');
    }

    if (decoded.type !== 'email_verification') {
      return res.status(400).send('<h1>Invalid token type.</h1>');
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
      return res.status(404).send('<h1>User not found.</h1>');
    }

    user.isEmailVerified = true;
    await user.save();

    // Redirect to login page on the frontend (or display a nice HTML page)
    return res.status(200).send(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
        <h1 style="color: #4caf50;">Email Verification Successful!</h1>
        <p>Your account is now verified. You can proceed to log in to the FWC HRMS application.</p>
        <a href="http://localhost:3000/login" style="padding: 10px 20px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Login Now</a>
      </div>
    `);
  } catch (err) {
    console.error('Email verification error:', err);
    return res.status(500).send('<h1>Internal server error during email verification.</h1>');
  }
};

// ==========================================
// 6. FORGOT PASSWORD (OTP Generation)
// ==========================================
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Return 200/success to avoid user enumeration
      return res.status(200).json({ message: 'If the email exists, an OTP has been sent.' });
    }

    // Generate 6 digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const redisKey = `otp:${user.email}`;

    if (redisClient.isOpen) {
      // Store in Redis with 10 minute expiry (600 seconds)
      await redisClient.set(redisKey, otp, { EX: 600 });
    } else {
      console.warn('[Redis] Redis is down. Unable to store OTP. Defaulting to local console check.');
    }

    console.log('----------------------------------------------------');
    console.log(`[MOCK OTP SENT TO ${user.email}]`);
    console.log(`OTP Code: ${otp} (Valid for 10 minutes)`);
    console.log('----------------------------------------------------');

    return res.status(200).json({
      message: 'OTP sent to registered email address.',
      devOtp: otp // sent for ease of development testing
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ==========================================
// 7. RESET PASSWORD
// ==========================================
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Invalid request.' });
    }

    if (!redisClient.isOpen) {
      return res.status(500).json({ message: 'Service unavailable. Cache connection failed.' });
    }

    const redisKey = `otp:${user.email}`;
    const storedOtp = await redisClient.get(redisKey);

    if (!storedOtp || storedOtp !== otp) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    // Update password
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    // Delete OTP from Redis
    await redisClient.del(redisKey);

    return res.status(200).json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ==========================================
// 8. GET DEPARTMENTS (Public selection helper)
// ==========================================
export const getDepartments = async (req: Request, res: Response) => {
  try {
    const departments = await Department.find({}, 'name code _id');
    return res.status(200).json(departments);
  } catch (err) {
    console.error('Fetch departments error:', err);
    return res.status(500).json({ message: 'Failed to fetch departments.' });
  }
};
