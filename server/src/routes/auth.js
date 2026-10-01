import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';

const router = Router();

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  college: z.string().optional(),
  gender: z.string().optional(),
  state: z.string().optional(),
  district: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const forgotPasswordSchema = z.object({
  email: z.string().email()
});

const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8)
});

const tokenFor = (u) =>
  jwt.sign(
    { id: u.id, email: u.email, role: u.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

const safe = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  college: u.college,
  bio: u.bio,
  avatarUrl: u.avatarUrl,
  githubUrl: u.githubUrl,
  linkedinUrl: u.linkedinUrl,
  skills: u.skills,
  role: u.role
});

const normalizeEmail = (email) => email.trim().toLowerCase();

/* REGISTER */
router.post('/register', async (req, res, next) => {
  try {
    console.log('REGISTER: request received');

    const d = signupSchema.parse(req.body);
    console.log('REGISTER: validation passed');

    const email = normalizeEmail(d.email);

    const exists = await prisma.user.findUnique({
      where: { email }
    });

    console.log('REGISTER: database lookup completed');

    if (exists) {
      return res.status(409).json({
        error: 'Email already registered'
      });
    }

    console.log('REGISTER: starting password hash');

    const passwordHash = await bcrypt.hash(d.password, 12);

    console.log('REGISTER: password hash completed');

    const user = await prisma.user.create({
      data: {
        name: d.name,
        email,
        college: d.college,
        gender: d.gender,
        state: d.state,
        district: d.district,
        passwordHash,
        skills: []
      }
    });

    console.log('REGISTER: user created');

    const token = tokenFor(user);

    console.log('REGISTER: token created');

    res.status(201).json({
      token,
      user: safe(user)
    });
  } catch (e) {
    console.error('REGISTER ERROR:', e);
    next(e);
  }
});

/* LOGIN */
router.post('/login', async (req, res, next) => {
  try {
    const d = loginSchema.parse(req.body);

    const u = await prisma.user.findUnique({
      where: {
        email: normalizeEmail(d.email)
      }
    });

    if (
      !u ||
      !(await bcrypt.compare(d.password, u.passwordHash))
    ) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    res.json({
      token: tokenFor(u),
      user: safe(u)
    });
  } catch (e) {
    next(e);
  }
});

/* FORGOT PASSWORD */
router.post('/forgot-password', async (req, res, next) => {
  try {
    const d = forgotPasswordSchema.parse(req.body);
    const email = normalizeEmail(d.email);

    const user = await prisma.user.findUnique({
      where: { email }
    });

    /*
      Always return the same response whether the email exists.
      This prevents people from discovering which emails have
      ProjectHub accounts.
    */
    if (!user) {
      return res.json({
        message:
          'If an account exists with that email, a password reset link will be sent.'
      });
    }

    // Delete previous reset tokens for this email.
    await prisma.passwordResetToken.deleteMany({
      where: { email }
    });

    // Generate a secure random token.
    const rawToken = crypto.randomBytes(32).toString('hex');

    // Store only a hash of the token.
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    // Token expires after 15 minutes.
    const expiresAt = new Date(
      Date.now() + 15 * 60 * 1000
    );

    await prisma.passwordResetToken.create({
      data: {
        email,
        tokenHash,
        expiresAt
      }
    });

    /*
      The frontend/email service will eventually use this token
      in a URL such as:

      https://projecthub-ashy.vercel.app/reset-password?token=TOKEN

      For now we return it only for development/testing.
      We will remove this before production.
    */
    res.json({
      message:
        'Password reset request created.',
      resetToken: rawToken
    });
  } catch (e) {
    next(e);
  }
});

/* RESET PASSWORD */
router.post('/reset-password', async (req, res, next) => {
  try {
    const d = resetPasswordSchema.parse(req.body);

    const tokenHash = crypto
      .createHash('sha256')
      .update(d.token)
      .digest('hex');

    const resetToken =
      await prisma.passwordResetToken.findUnique({
        where: { tokenHash }
      });

    if (!resetToken) {
      return res.status(400).json({
        error: 'Invalid or expired reset link'
      });
    }

    if (
      resetToken.used ||
      resetToken.expiresAt.getTime() < Date.now()
    ) {
      return res.status(400).json({
        error: 'Invalid or expired reset link'
      });
    }

    const passwordHash = await bcrypt.hash(
      d.password,
      12
    );

    await prisma.$transaction([
      prisma.user.update({
        where: {
          email: resetToken.email
        },
        data: {
          passwordHash
        }
      }),

      prisma.passwordResetToken.update({
        where: {
          id: resetToken.id
        },
        data: {
          used: true
        }
      })
    ]);

    res.json({
      message: 'Password reset successfully'
    });
  } catch (e) {
    next(e);
  }
});

export default router;