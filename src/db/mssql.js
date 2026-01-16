import sql from "mssql";
import { getMssqlConfig } from "../config/database.js";

let pool = null;

export async function getPool() {
  if (pool && pool.connected) {
    return pool;
  }
  
  try {
    pool = await sql.connect(getMssqlConfig());
    
    pool.on("error", (err) => {
      console.error("MSSQL Pool Error:", err);
      pool = null;
    });
    
    return pool;
  } catch (error) {
    console.error("MSSQL Connection Error:", error);
    throw error;
  }
}

export async function closeMssql() {
  if (pool) {
    try {
      await pool.close();
      pool = null;
      console.log("✓ MSSQL Pool geschlossen");
    } catch (error) {
      console.error("Fehler beim Schließen des MSSQL Pools:", error);
    }
  }
}

export { sql };