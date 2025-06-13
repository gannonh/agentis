import {  Keyv  } from 'keyv';
import passport from 'passport';
import session from 'express-session';
import MemoryStore from 'memorystore';
import RedisStore from 'connect-redis';
import { 
  setupOpenId,
  googleLogin,
  githubLogin,
  discordLogin,
  facebookLogin,
  appleLogin,
 } from '#strategies/index.js';
import {  isEnabled  } from '#server/utils.js';
import keyvRedis from '#cache/keyvRedis.js';
import {  logger  } from '#config/index.js';

/**
 *
 * @param {Express.Application} app
 */
const configureSocialLogins = (app) => {
  logger.info('Configuring social logins...');

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(googleLogin());
  }
  if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
    passport.use(facebookLogin());
  }
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(githubLogin());
  }
  if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
    passport.use(discordLogin());
  }
  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_PRIVATE_KEY_PATH) {
    passport.use(appleLogin());
  }
  if (
    process.env.OPENID_CLIENT_ID &&
    process.env.OPENID_CLIENT_SECRET &&
    process.env.OPENID_ISSUER &&
    process.env.OPENID_SCOPE &&
    process.env.OPENID_SESSION_SECRET
  ) {
    logger.info('Configuring OpenID Connect...');
    const sessionOptions = {
      secret: process.env.OPENID_SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
    };
    if (isEnabled(process.env.USE_REDIS)) {
      logger.debug('Using Redis for session storage in OpenID...');
      const keyv = new Keyv({ store: keyvRedis });
      const client = keyv.opts.store.client;
      sessionOptions.store = new RedisStore({ client, prefix: 'openid_session' });
    } else {
      sessionOptions.store = new (MemoryStore(session))({
        checkPeriod: 86400000, // prune expired entries every 24h
      });
    }
    app.use(session(sessionOptions));
    app.use(passport.session());
    setupOpenId();

    logger.info('OpenID Connect configured.');
  }
};

export default configureSocialLogins;
