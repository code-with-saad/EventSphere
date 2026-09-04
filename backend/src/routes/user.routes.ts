import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import UserModel from '../models/User.model';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

/**
 * GET /api/users/me
 *
 * Returns current authenticated user profile (including avatarUrl).
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id.toString(),
          email: user.email,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
          role: user.role,
          status: user.status,
          isEmailVerified: user.isEmailVerified,
        },
      },
    });
  })
);

/**
 * PATCH /api/users/me
 *
 * Allows updating fullName and avatarUrl only.
 * Explicitly ignores/disallows email, role, status, isEmailVerified, passwordHash changes.
 */
router.patch(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const { fullName, avatarUrl } = req.body;
    const updateData: { fullName?: string; avatarUrl?: string } = {};

    if (fullName !== undefined) {
      if (typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.trim().length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Full name must be between 2 and 100 characters',
        });
      }
      updateData.fullName = fullName.trim();
    }

    if (avatarUrl !== undefined) {
      if (typeof avatarUrl === 'string') {
        updateData.avatarUrl = avatarUrl.trim();
      } else if (avatarUrl === null) {
        updateData.avatarUrl = '';
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update (allowed: fullName, avatarUrl)',
      });
    }

    const updatedUser = await UserModel.updateById(userId, updateData);
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: updatedUser._id.toString(),
          email: updatedUser.email,
          fullName: updatedUser.fullName,
          avatarUrl: updatedUser.avatarUrl,
          role: updatedUser.role,
          status: updatedUser.status,
          isEmailVerified: updatedUser.isEmailVerified,
        },
      },
    });
  })
);

export default router;
