import { initSqlite, closeSqlite } from "./sqlite.js";
import { closeMssql } from "./mssql.js";

export async function initDatabase() {
  await initSqlite();
}

export async function closeDatabases() {
  await closeSqlite();
  await closeMssql();
}

export { sqliteRun, sqliteGet, sqliteAll } from "./sqlite.js";
export { getPool } from "./mssql.js";