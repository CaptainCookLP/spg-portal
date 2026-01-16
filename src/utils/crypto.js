import crypto from "crypto";

export function hashPassword(password, salt = null, iterations = 210000) {
  const usedSalt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, usedSalt, iterations, 32, "sha256")
    .toString("hex");
  
  return { hash, salt: usedSalt, iterations };
}

export function verifyPassword(password, record) {
  const { hash, salt, iterations } = record;
  
  const computedHash = crypto
    .pbkdf2Sync(password, salt, iterations, 32, "sha256")
    .toString("hex");
  
  return crypto.timingSafeEqual(
    Buffer.from(hash, "hex"),
    Buffer.from(computedHash, "hex")
  );
}

export function generateToken(length = 32) {
  return crypto.randomBytes(length).toString("hex");
}

export function generateUUID() {
  return crypto.randomUUID();
}