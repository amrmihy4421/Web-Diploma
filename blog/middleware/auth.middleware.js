const jwt = require("jsonwebtoken");
const AppDataSource = require("../db");
const UserSchema = require("../entites/users");

const authMiddleware = async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || "").split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  try {
    const user = await AppDataSource.getRepository(UserSchema).findOne({
      where: { id: decoded.userId },
    });
    if (!user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Read the current role from the database so role changes take effect
    // immediately and are never trusted from a client-supplied token claim.
    req.user = { userId: user.id, role: user.role };
    return next();
  } catch {
    return res.status(500).json({ message: "Could not verify account" });
  }
};

module.exports = authMiddleware;
