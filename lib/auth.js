// lib/auth.js
import jwt from "jsonwebtoken";

export function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new Error("No token provided");

  const token = authHeader.split(" ")[1]; // Bearer <token>
  const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey");
  return decoded; // contains { messId, email, iat, exp }
}
