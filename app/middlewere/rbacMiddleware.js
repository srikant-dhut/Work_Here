const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: `Access Denied For ${userRole} Role` });
    }
    next();
  };
};
module.exports = checkRole;
