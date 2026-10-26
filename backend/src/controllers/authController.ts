import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { StudentProfile } from '../models/Profiles';
import { TrainerProfile } from '../models/Profiles';
import { Enrollment } from '../models/Batch';
import { config } from '../config/env';
import { AuthenticatedRequest } from '../middleware/auth';

function generateToken(user: IUser): string {
  return jwt.sign(
    { userId: user._id, role: user.role, email: user.email },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.' });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    if (user.status !== 'ACTIVE') {
      res.status(403).json({ success: false, message: 'Account is deactivated. Please contact administration.' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);

    // Set secure HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    let profile: any = null;
    let enrollment: any = null;

    if (user.role === 'STUDENT') {
      profile = await StudentProfile.findOne({ user: user._id });
      enrollment = await Enrollment.findOne({ user: user._id, status: 'ACTIVE' })
        .populate('batch')
        .populate('course');
    } else if (user.role === 'TRAINER') {
      profile = await TrainerProfile.findOne({ user: user._id }).populate('assignedBatches');
    }

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        status: user.status,
        mustChangePassword: !!user.mustChangePassword,
      },
      profile,
      enrollment,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server error during login.' });
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = req.user!;
    let profile: any = null;
    let enrollment: any = null;

    if (user.role === 'STUDENT') {
      profile = await StudentProfile.findOne({ user: user._id });
      enrollment = await Enrollment.findOne({ user: user._id, status: 'ACTIVE' })
        .populate('batch')
        .populate('course');
    } else if (user.role === 'TRAINER') {
      profile = await TrainerProfile.findOne({ user: user._id }).populate('assignedBatches');
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        status: user.status,
        mustChangePassword: !!user.mustChangePassword,
      },
      profile,
      enrollment,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully.' });
}

export async function firstTimeChangePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { newPassword } = req.body;
    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
      res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
      return;
    }

    const user = await User.findById(req.userId).select('+passwordHash');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    user.passwordHash = newPassword.trim();
    user.mustChangePassword = false;
    await user.save();

    res.json({
      success: true,
      message: 'New password successfully saved! Your account is now active.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        status: user.status,
        mustChangePassword: false,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error updating password.' });
  }
}

export async function changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, message: 'Both current and new password are required.' });
      return;
    }

    const user = await User.findById(req.userId).select('+passwordHash');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Incorrect current password.' });
      return;
    }

    user.passwordHash = newPassword;
    user.mustChangePassword = false;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
