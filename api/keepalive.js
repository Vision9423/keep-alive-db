import mysql from "mysql2/promise";

export default async function handler(req, res) {
  if (req.query.key !== process.env.API_KEY) {
    return res.status(403).send("forbidden");
  }

  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),      // важно
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: "utf8mb4",                     // желательно
    connectTimeout: 10000                   // опционально
  });

  await db.execute("INSERT INTO daily_check (cur_datetime) VALUES (NOW())");
  await db.end(); // желательно закрывать соединение

  res.send("ok");
}