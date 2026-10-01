require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./src/config/database');

(async () => {
  try {
    const sqlPath = path.join(__dirname, '../database/seeds/010_demo_user_communities_and_posts.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Executing seed 010...');
    await pool.query(sql);
    console.log('Seed 010 executed successfully!');

    // Verify communities count
    const res = await pool.query('SELECT count(*) FROM communities');
    console.log('Total communities now:', res.rows[0].count);
    
    // Verify posts count
    const pRes = await pool.query('SELECT count(*) FROM posts');
    console.log('Total posts now:', pRes.rows[0].count);

    // Verify images in posts
    const imgRes = await pool.query('SELECT id, title, image_url FROM posts WHERE image_url IS NOT NULL');
    console.log('Posts with images:', imgRes.rows.length);
  } catch (err) {
    console.error('Error running seed 010:', err);
  } finally {
    await pool.end();
  }
})();
