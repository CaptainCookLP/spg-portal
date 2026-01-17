import sql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const config = {
  server: process.env.DB_SERVER || 'localhost',
  authentication: {
    type: 'default',
    options: {
      userName: process.env.DB_USER || 'sa',
      password: process.env.DB_PASSWORD || ''
    }
  },
  options: {
    database: process.env.DB_DATABASE || 'master',
    port: Number(process.env.DB_PORT || 1433),
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true,
    connectionTimeout: 5000,
    requestTimeout: 5000
  }
};

async function checkEmail() {
  try {
    console.log('🔍 Verbinde mit MSSQL...');
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    const email = 'fabian.koch1998@gmail.com';
    
    console.log(`\n📧 Suche nach Email: ${email}`);
    const result = await pool.request()
      .input('email', email)
      .query(`
        SELECT TOP 5 MitgliedID, Vorname, Nachname, Email, Geloescht
        FROM dbo.tbl_Mitglied
        WHERE Email = @email
      `);
    
    if (result.recordset.length > 0) {
      console.log('✓ Email gefunden!');
      result.recordset.forEach(row => {
        console.log(`  - ID: ${row.MitgliedID}, Name: ${row.Vorname} ${row.Nachname}, Email: ${row.Email}, Gelöscht: ${row.Geloescht}`);
      });
    } else {
      console.log('✗ Email nicht gefunden!');
      
      console.log('\n🔎 Suche nach ähnlichen Emails...');
      const fuzzy = await pool.request()
        .input('search', `%koch%`)
        .query(`
          SELECT TOP 10 MitgliedID, Vorname, Nachname, Email, Geloescht
          FROM dbo.tbl_Mitglied
          WHERE Email LIKE @search AND Geloescht = 0
        `);
      
      if (fuzzy.recordset.length > 0) {
        console.log('Gefundene Emails mit "koch":');
        fuzzy.recordset.forEach(row => {
          console.log(`  - ${row.Email} (${row.Vorname} ${row.Nachname})`);
        });
      } else {
        console.log('Keine ähnlichen Emails gefunden.');
      }
    }
    
    await pool.close();
    process.exit(0);
  } catch (e) {
    console.error('❌ Fehler:', e.message);
    process.exit(1);
  }
}

checkEmail();
