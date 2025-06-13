import mongoose from 'mongoose';
import logger from '../config/winston.js';
import { bannerSchema } from '@librechat/data-schemas';

const Banner = mongoose.model('Banner', bannerSchema);

/**
 * Retrieves the current active banner.
 * @returns {Promise<Object|null>} The active banner object or null if no active banner is found.
 */
const getBanner = async (user) => {
  try {
    const now = new Date();
    const banner = await Banner.findOne({
      displayFrom: { $lte: now },
      $or: [{ displayTo: { $gte: now } }, { displayTo: null }],
      type: 'banner',
    }).lean();

    if (!banner || banner.isPublic || user) {
      return banner;
    }

    return null;
  } catch (error) {
    logger.error('[getBanners] Error getting banners', error);
    throw new Error('Error getting banners');
  }
};

export default Banner;

export { getBanner };
