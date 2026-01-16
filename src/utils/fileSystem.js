import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function setupUploadDir() {
  const uploadDir = path.join(process.cwd(), "uploads");
  const dataDir = path.join(process.cwd(), "data");
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // .gitkeep erstellen
  const gitkeepPath = path.join(uploadDir, ".gitkeep");
  if (!fs.existsSync(gitkeepPath)) {
    fs.writeFileSync(gitkeepPath, "");
  }
}

export function deleteFile(filepath) {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return true;
    }
  } catch (error) {
    console.error("Fehler beim Löschen der Datei:", error);
  }
  return false;
}

export function getFileStats(filepath) {
  try {
    return fs.statSync(filepath);
  } catch {
    return null;
  }
}