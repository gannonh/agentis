/**
 * Middleware to check if user has admin role using Better Auth
 * This replaces the legacy SystemRoles.ADMIN check
 */
function checkAdmin(req, res, next) {
  try {
    // Check for Better Auth admin role (lowercase)
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

export default checkAdmin;
