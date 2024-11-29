// src/api/v1/middleware/auth.middleware.js
exports.isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ 
    error: "Unauthorized", 
    message: "Please login to access this resource",
    code: "AUTH_REQUIRED"
  });
};
