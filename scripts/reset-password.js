import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { hashPassword } from '../src/utils/crypto.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../data/portal.db');

async function resetPassword() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        console.error('❌ DB-Fehler:', err);
        reject(err);
        return;
      }

      try {
        const email = 'fabian.koch1998@gmail.com';
        const password = 'Start1234!';
        
        console.log(`🔐 Setze Passwort für ${email}...`);
        
        // Hash das Passwort
        const { hash, salt, iterations } = hashPassword(password);
        
        console.log(`📝 Hash erstellt: ${hash.substring(0, 30)}...`);
        console.log(`Salt: ${salt}`);
        console.log(`Iterations: ${iterations}`);
        
        // Lösche alten Eintrag
        db.run(`DELETE FROM credentials WHERE email = ?`, [email], (err) => {
          if (err) {
            console.error('❌ Delete-Fehler:', err);
            db.close();
            reject(err);
            return;
          }
          
          // Füge neuen Eintrag ein
          db.run(
            `INSERT INTO credentials (email, passwordHash, salt, iterations, updatedAt) 
             VALUES (?, ?, ?, ?, ?)`,
            [email, hash, salt, iterations, new Date().toISOString()],
            function(err) {
              if (err) {
                console.error('❌ Insert-Fehler:', err);
                db.close();
                reject(err);
                return;
              }
              
              console.log(`✅ Passwort aktualisiert für ${email}`);
              console.log(`Rows affected: ${this.changes}`);
              
              // Verifiziere das neu gesetzte Passwort
              db.get(
                `SELECT * FROM credentials WHERE email = ?`,
                [email],
                (err, row) => {
                  if (err) {
                    console.error('❌ Verify-Fehler:', err);
                  } else if (!row) {
                    console.error('❌ Eintrag nicht gefunden nach Insert!');
                  } else {
                    console.log(`✓ Verifizierung erfolgreich`);
                    console.log(`  Email: ${row.email}`);
                    console.log(`  Hash: ${row.passwordHash.substring(0, 30)}...`);
                    console.log(`  Salt: ${row.salt}`);
                    console.log(`  Iterations: ${row.iterations}`);
                  }
                  
                  db.close();
                  resolve();
                }
              );
            }
          );
        });
      } catch (e) {
        console.error('❌ Fehler:', e.message);
        db.close();
        reject(e);
      }
    });
  });
}

resetPassword()
  .then(() => {
    console.log('\n✅ Passwort erfolgreich zurückgesetzt!');
    process.exit(0);
  })
  .catch((e) => {
    console.error('\n❌ Fehler beim Zurücksetzen:', e);
    process.exit(1);
  });
