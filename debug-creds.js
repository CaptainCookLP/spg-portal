import Database from 'better-sqlite3';

const db = new Database('./data/portal.db');

try {
  const result = db.prepare('SELECT * FROM credentials WHERE email = ?').all('fabian.koch1998@gmail.com');
  console.log('Credentials:', JSON.stringify(result, null, 2));
} catch (err) {
  console.error('Error:', err.message);
} finally {
  db.close();
}
