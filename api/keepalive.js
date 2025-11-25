import mysql from 'mysql2/promise';
import { Pool } from 'pg'; // Импортируем Pool из 'pg'

// 🔗 Настройка пула для PostgreSQL
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
      rejectUnauthorized: false // Может понадобиться, если вы используете облачный хостинг с SSL, но не хотите проверять сертификат
  }
});

export default async function handler(req, res) {
  if (req.query.key !== process.env.API_KEY) {
    return res.status(403).send("Forbidden: Invalid API key.");
  }

  let successCount = 0;
  const errors = [];
  
  // --- 1. ЗАПИСЬ В MYSQL (Изолированный блок) ---
  try {
    const mysqlConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    await mysqlConnection.execute("INSERT INTO daily_check (cur_datetime) VALUES (NOW())");
    await mysqlConnection.end();
    
    successCount++;
  } catch (err) {
    console.error("❌ MySQL Error:", err.message);
    errors.push(`MySQL: ${err.message}`);
  }
  
  // --- 2. ЗАПИСЬ В POSTGRESQL (Изолированный блок) ---
  try {
    const pgClient = await pgPool.connect();
    try {
        await pgClient.query("INSERT INTO public.mytable (created_at) VALUES (NOW())"); 
        successCount++;
    } finally {
        pgClient.release();
    }
  } catch (err) {
    console.error("❌ PostgreSQL Error:", err.message);
    errors.push(`PostgreSQL: ${err.message}`);
  }
  
  // --- 3. ОТВЕТ КЛИЕНТУ ---
  if (successCount > 0 && errors.length === 0) {
    // Успех в обеих
    res.status(200).json({ message: "Record inserted successfully in both databases." });
  } else if (successCount > 0 && errors.length > 0) {
    // Частичный успех (одна БО сработала, другая нет)
    res.status(202).json({ 
        message: "Partial success. One database failed.", 
        failed_operations: errors 
    });
  } else {
    // Обе не сработали
    res.status(500).json({ 
        error: "Internal Server Error. Both databases failed.", 
        failed_operations: errors 
    });
  }
}