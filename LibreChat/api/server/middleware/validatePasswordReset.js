import { isEnabled } from '#server/utils/index.js';
import { logger } from '#config/index.js';

function validatePasswordReset(req, res, next) {
  if (isEnabled(process.env.ALLOW_PASSWORD_RESET)) {
    next();
  } else {
    logger.warn(`Password reset attempt while not allowed. IP: ${req.ip}`);
    res.status(403).send('Password reset is not allowed.');
  }
}

export default validatePasswordReset;
