import { generate2FATempToken } from '#server/services/twoFactorService.js';
import { setAuthTokens } from '#server/services/AuthService.js';
import { logger } from '#config/index.js';
import { authEvents } from '#utils/authEvents.js';

const loginController = async (req, res) => {
  try {
    if (!req.user) {
      authEvents.authFailure('Invalid credentials', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (req.user.twoFactorEnabled) {
      const tempToken = generate2FATempToken(req.user._id);
      return res.status(200).json({ twoFAPending: true, tempToken });
    }

    const { password: _p, totpSecret: _t, __v, ...user } = req.user;
    user.id = user._id.toString();

    const token = await setAuthTokens(req.user._id, res);

    // Log successful login
    authEvents.userLogin(req.user._id.toString(), 'credentials', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.status(200).send({ token, user });
  } catch (err) {
    logger.error('[loginController]', err);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

export { loginController };
