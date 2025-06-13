import appleLogin from './appleStrategy.js';
import passportLogin from './localStrategy.js';
import googleLogin from './googleStrategy.js';
import githubLogin from './githubStrategy.js';
import discordLogin from './discordStrategy.js';
import facebookLogin from './facebookStrategy.js';
import setupOpenId from './openidStrategy.js';
import jwtLogin from './jwtStrategy.js';
import ldapLogin from './ldapStrategy.js';

export {
  appleLogin,
  passportLogin,
  googleLogin,
  githubLogin,
  discordLogin,
  jwtLogin,
  facebookLogin,
  setupOpenId,
  ldapLogin,
};
