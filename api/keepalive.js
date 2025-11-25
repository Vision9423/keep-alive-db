const mysql = require('mysql2/promise');

export default async function handler(req, res) {
  try {
    if (req.query.key !== process.env.API_KEY) {
      return res.status(403).send("forbidden");
    }

    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    await db.execute("INSERT INTO daily_check (cur_datetime) VALUES (NOW())");
    await db.end();

    res.send("ok");
  } catch (err) {
    console.error(err);
    res.status(500).send("error: " + err.message);
  }
}