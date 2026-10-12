const { query } = require('../config/db');
const bcrypt = require('bcryptjs');

async function run() {
  const hash = bcrypt.hashSync('Admin@2026', 10);
  const res = await query('UPDATE users SET password_hash = $1', [hash]);
  console.log('Successfully updated password hashes for count:', res.rowCount);
  const check = await query('SELECT username, password_hash FROM users');
  console.log('Users in DB:');
  check.rows.forEach(u => console.log(` - ${u.username}: ${u.password_hash}`));
  process.exit(0);
}

run().catch(err => {
  console.error('Error updating password:', err);
  process.exit(1);
});
