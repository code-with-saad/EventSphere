import { Router, Response } from 'express';
import { ObjectId } from 'mongodb';
import asyncHandler from '../utils/asyncHandler';
import FavoriteModel from '../models/Favorite.model';
import ExpoModel from '../models/Expo.model';
import ApplicationModel from '../models/Application.model';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/favorites/mine
 * Returns all favorited expos for the authenticated user, populated with basic expo details.
 */
router.get(
  '/mine',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const favorites = await FavoriteModel.findByUser(userId);

    if (favorites.length === 0) {
      return res.status(200).json({
        success: true,
        data: { favorites: [] },
      });
    }

    const expoIds = favorites.map((f) => f.expoId);
    const expos = await ExpoModel.getCollection()
      .find({ _id: { $in: expoIds } })
      .toArray();

    // Map approved exhibitor counts
    const approvedCounts = await ApplicationModel.getCollection()
      .aggregate<{ _id: ObjectId; count: number }>([
        { $match: { expoId: { $in: expoIds }, status: 'approved' } },
        { $group: { _id: '$expoId', count: { $sum: 1 } } },
      ])
      .toArray();
    const countMap = new Map<string, number>();
    approvedCounts.forEach((c) => countMap.set(c._id.toString(), c.count));

    const expoMap = new Map<string, any>();
    expos.forEach((expo) => {
      expoMap.set(expo._id.toString(), {
        _id: expo._id.toString(),
        name: expo.name,
        description: expo.description?.length > 160 ? expo.description.slice(0, 160) + '…' : expo.description,
        status: expo.status,
        startDate: expo.startDate?.toISOString?.() || expo.startDate,
        endDate: expo.endDate?.toISOString?.() || expo.endDate,
        venueName: expo.venueName,
        venueAddress: expo.venueAddress,
        bannerUrl: expo.bannerUrl,
        category: expo.category,
        approvedExhibitorCount: countMap.get(expo._id.toString()) ?? 0,
      });
    });

    const populatedFavorites = favorites
      .map((f) => ({
        _id: f._id.toString(),
        expoId: f.expoId.toString(),
        createdAt: f.createdAt,
        expo: expoMap.get(f.expoId.toString()) || null,
      }))
      .filter((f) => f.expo !== null);

    return res.status(200).json({
      success: true,
      data: { favorites: populatedFavorites },
    });
  })
);

/**
 * GET /api/favorites/mine/ids
 * Fast endpoint returning array of favorited expo ID strings for the authenticated user.
 */
router.get(
  '/mine/ids',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const favorites = await FavoriteModel.findByUser(userId);
    const favoriteExpoIds = favorites.map((f) => f.expoId.toString());

    return res.status(200).json({
      success: true,
      data: { favoriteExpoIds },
    });
  })
);

/**
 * POST /api/expos/:id/favorite or POST /api/favorites/:id
 * Toggle on / add favorite
 */
router.post(
  '/:id/favorite',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const expoId = req.params.id as string;

    const expo = await ExpoModel.findById(expoId);
    if (!expo) {
      return res.status(404).json({ success: false, message: 'Expo not found' });
    }

    const existing = await FavoriteModel.findByUserAndExpo(userId, expoId);
    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Expo already in favorites',
        data: { favorite: existing },
      });
    }

    const favorite = await FavoriteModel.create({
      userId: new ObjectId(userId),
      expoId: new ObjectId(expoId),
    });

    return res.status(201).json({
      success: true,
      message: 'Expo added to favorites',
      data: { favorite },
    });
  })
);

/**
 * DELETE /api/expos/:id/favorite or DELETE /api/favorites/:id
 * Toggle off / remove favorite
 */
router.delete(
  '/:id/favorite',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const expoId = req.params.id as string;

    await FavoriteModel.deleteByUserAndExpo(userId, expoId);

    return res.status(200).json({
      success: true,
      message: 'Expo removed from favorites',
    });
  })
);

export default router;
