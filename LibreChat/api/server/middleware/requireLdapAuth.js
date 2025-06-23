import passport from 'passport';

const requireLdapAuth = (req, res, next) => {
  passport.authenticate('ldapauth', (err, user, info) => {
    if (err) {
      if (process.env.NODE_ENV === 'development') {
        console.log({
          title: '(requireLdapAuth) Error at passport.authenticate',
          parameters: [{ name: 'error', value: err }],
        });
      }
      return next(err);
    }
    if (!user) {
      if (process.env.NODE_ENV === 'development') {
        console.log({
          title: '(requireLdapAuth) Error: No user',
        });
      }
      return res.status(404).send(info);
    }
    req.user = user;
    next();
  })(req, res, next);
};
export default requireLdapAuth;
