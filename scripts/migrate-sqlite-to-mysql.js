const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const sourcePath = path.resolve(process.argv[2] || path.join(__dirname, '..', 'mathplay.db'));

if (!fs.existsSync(sourcePath)) {
  console.error(`Banco SQLite não encontrado: ${sourcePath}`);
  process.exit(1);
}

const source = new Database(sourcePath, { readonly: true });
const target = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mathplay',
  waitForConnections: true,
  connectionLimit: 1
});

async function migrate() {
  const columns = source.prepare('PRAGMA table_info(game_results)').all();
  const hasDifficulty = columns.some((column) => column.name === 'difficulty');
  const users = source.prepare('SELECT id, username, email, password_hash, role, created_at FROM users ORDER BY id').all();
  const gameResults = source.prepare(`
    SELECT id, user_id, game, ${hasDifficulty ? 'difficulty' : "'medio' AS difficulty"},
      score, correct_answers, total_questions, created_at
    FROM game_results
    ORDER BY id
  `).all();
  const achievements = source.prepare(`
    SELECT id, user_id, badge, description, created_at
    FROM achievements
    ORDER BY id
  `).all();
  const connection = await target.getConnection();

  try {
    const [counts] = await connection.query(`
      SELECT
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM game_results) AS game_results,
        (SELECT COUNT(*) FROM achievements) AS achievements
    `);

    if (Number(counts[0].users) || Number(counts[0].game_results) || Number(counts[0].achievements)) {
      throw new Error('O banco MySQL de destino não está vazio. A migração foi cancelada para evitar misturar ou sobrescrever dados.');
    }

    await connection.beginTransaction();
    for (const user of users) {
      await connection.execute(
        'INSERT INTO users (id, username, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [user.id, user.username, user.email, user.password_hash, user.role, user.created_at]
      );
    }

    for (const result of gameResults) {
      await connection.execute(
        'INSERT INTO game_results (id, user_id, game, difficulty, score, correct_answers, total_questions, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [result.id, result.user_id, result.game, result.difficulty, result.score, result.correct_answers, result.total_questions, result.created_at]
      );
    }

    for (const achievement of achievements) {
      await connection.execute(
        'INSERT INTO achievements (id, user_id, badge, description, created_at) VALUES (?, ?, ?, ?, ?)',
        [achievement.id, achievement.user_id, achievement.badge, achievement.description, achievement.created_at]
      );
    }

    await connection.commit();
    console.log(`Migração concluída: ${users.length} usuários, ${gameResults.length} partidas e ${achievements.length} conquistas.`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

migrate()
  .catch((error) => {
    console.error('Falha ao migrar os dados SQLite para MySQL:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    source.close();
    await target.end();
  });
