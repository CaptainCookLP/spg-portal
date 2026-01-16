import dotenv from "dotenv";
dotenv.config();

export function getMssqlConfig() {
  return {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    port: Number(process.env.DB_PORT || 1433),
    database: process.env.DB_DATABASE,
    options: {
      encrypt: String(process.env.DB_ENCRYPT).toLowerCase() === "true",
      trustServerCertificate: true,
      enableArithAbort: true,
      connectionTimeout: 30000,
      requestTimeout: 30000
    },
    pool: {
      max: 10,
      min: 2,
      idleTimeoutMillis: 30000
    }
  };
}

export function getSqlitePath() {
  return process.env.SQLITE_PATH || "./data/portal.db";
}