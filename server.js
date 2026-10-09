const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const db = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mathplay',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z'
});

const MAX_PROFILE_IMAGE_BYTES = 200 * 1024;
const MAX_PROFILE_BANNER_BYTES = 400 * 1024;

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'mathplay-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 8,
      httpOnly: true,
      sameSite: 'lax'
    }
  })
);

app.use(express.static(path.join(__dirname, 'public')));

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Autenticação necessária.' });
  }
  next();
}

async function getRow(sql, values = []) {
  const [rows] = await db.execute(sql, values);
  return rows[0];
}

async function getRows(sql, values = []) {
  const [rows] = await db.execute(sql, values);
  return rows;
}

async function execute(sql, values = []) {
  const [result] = await db.execute(sql, values);
  return result;
}

const gameAwards = {
  inteiros: { badge: 'Explorador dos Inteiros', description: 'Concluiu a batalha de números inteiros com sucesso.' },
  fracoes: { badge: 'Mestre das Frações', description: 'Domina operações e proporções com frações.' },
  equacoes: { badge: 'Balança Equilibrada', description: 'Resolveu desafios de equações com confiança.' },
  geometria: { badge: 'Construtor de Cidades', description: 'Calculou áreas e perímetros como um verdadeiro arquiteto.' },
  financeiro: { badge: 'Gênio das Finanças', description: 'Completou desafios de porcentagem e educação financeira.' },
  estatistica: { badge: 'Detetive dos Dados', description: 'Interpretou médias, medianas e padrões estatísticos.' },
  coordenadas: { badge: 'Navegador do Plano', description: 'Encontrou caminhos usando coordenadas cartesianas.' },
  potencia: { badge: 'Mestre das Potências', description: 'Resolveu desafios de potenciação e radiciação.' }
};

const achievementCatalog = [
  ...Object.entries(gameAwards).flatMap(([game, award]) => [
    {
      badge: `${award.badge} - Primeira Partida`,
      description: `Completou sua primeira partida de ${award.badge}.`,
      requirement: 'Complete uma partida deste jogo em qualquer dificuldade.',
      category: 'Por jogo',
      icon: '♪'
    },
    {
      badge: award.badge,
      description: award.description,
      requirement: 'Alcance pelo menos 80% neste jogo.',
      category: 'Por jogo',
      icon: '★'
    },
    {
      badge: `${award.badge} + 3 Partidas`,
      description: 'Completou três ou mais partidas neste tema.',
      requirement: 'Jogue este tema pelo menos três vezes.',
      category: 'Por jogo',
      icon: '♛'
    },
    ...['Fácil', 'Difícil'].map((difficulty) => ({
      badge: `${award.badge} - Modo ${difficulty}`,
      description: `Demonstrou domínio de ${award.badge} no modo ${difficulty.toLowerCase()}.`,
      requirement: `Consiga pelo menos 80% neste jogo no modo ${difficulty.toLowerCase()}.`,
      category: 'Dificuldade',
      icon: difficulty === 'Fácil' ? '♫' : '⚡'
    }))
  ]),
  {
    badge: 'Primeira Missão',
    description: 'Concluiu sua primeira partida no MathPlay.',
    requirement: 'Complete uma partida em qualquer jogo.',
    category: 'Progresso',
    icon: '➤'
  },
  {
    badge: 'Resposta Perfeita',
    description: 'Acertou todas as questões de uma partida.',
    requirement: 'Consiga 100% em uma partida.',
    category: 'Desempenho',
    icon: '✓'
  },
  {
    badge: 'Explorador Completo',
    description: 'Experimentou pelo menos quatro jogos diferentes.',
    requirement: 'Jogue quatro jogos diferentes.',
    category: 'Progresso',
    icon: '⌖'
  },
  {
    badge: 'Colecionador de Pontos',
    description: 'Acumulou 500 pontos jogando MathPlay.',
    requirement: 'Acumule 500 pontos.',
    category: 'Progresso',
    icon: '◆'
  },
  {
    badge: 'Maratonista MathPlay',
    description: 'Completou dez partidas na plataforma.',
    requirement: 'Complete dez partidas.',
    category: 'Progresso',
    icon: '⚡'
  },
  {
    badge: 'Turnê MathPlay',
    description: 'Completou 25 partidas na plataforma.',
    requirement: 'Complete 25 partidas.',
    category: 'Progresso',
    icon: '♫'
  },
  {
    badge: 'Lenda do Palco',
    description: 'Completou 50 partidas na plataforma.',
    requirement: 'Complete 50 partidas.',
    category: 'Progresso',
    icon: '♛'
  },
  {
    badge: 'Versatilidade Musical',
    description: 'Jogou nos níveis fácil, médio e difícil.',
    requirement: 'Complete pelo menos uma partida em cada nível de dificuldade.',
    category: 'Dificuldade',
    icon: '♪'
  },
  {
    badge: 'Coragem no Desafio',
    description: 'Concluiu uma partida no nível difícil.',
    requirement: 'Complete uma partida no nível difícil.',
    category: 'Dificuldade',
    icon: '▲'
  },
  {
    badge: 'Lenda da Matemática',
    description: 'Acertou todas as questões em uma partida difícil.',
    requirement: 'Consiga 100% em uma partida difícil.',
    category: 'Dificuldade',
    icon: '✦'
  }
];

if (achievementCatalog.length !== 50) {
  throw new Error(`O catálogo deve conter exatamente 50 conquistas, mas contém ${achievementCatalog.length}.`);
}

function getSafeUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name || user.username,
    email: user.email,
    role: user.role,
    profilePicture: user.profile_picture || null,
    profileBanner: user.profile_banner || null
  };
}

async function getDashboardData(userId) {
  const [user, totals, bestScores, achievements, recent] = await Promise.all([
    getRow('SELECT id, username, display_name, profile_picture, profile_banner, email, role FROM users WHERE id = ?', [userId]),
    getRow(`
      SELECT
        COUNT(*) AS total_games,
        COALESCE(SUM(score), 0) AS total_score,
        COALESCE(AVG(score), 0) AS avg_score
      FROM game_results
      WHERE user_id = ?
    `, [userId]),
    getRows(`
      SELECT game, MAX(score) AS best_score, COUNT(*) AS attempts
      FROM game_results
      WHERE user_id = ?
      GROUP BY game
      ORDER BY best_score DESC
    `, [userId]),
    getRows('SELECT badge, description, created_at FROM achievements WHERE user_id = ? ORDER BY created_at DESC', [userId]),
    getRows('SELECT game, difficulty, score, correct_answers, total_questions, created_at FROM game_results WHERE user_id = ? ORDER BY created_at DESC LIMIT 5', [userId])
  ]);

  return {
    user: getSafeUser(user),
    stats: {
      totalGames: Number(totals.total_games || 0),
      totalScore: Number(totals.total_score || 0),
      avgScore: Number(totals.avg_score || 0)
    },
    bestScores,
    achievements,
    recent
  };
}

async function awardAchievements(userId) {
  const awardBadge = (badge, description) => execute(
    'INSERT IGNORE INTO achievements (user_id, badge, description) VALUES (?, ?, ?)',
    [userId, badge, description]
  );

  const gameProgress = await getRows(`
    SELECT
      game,
      COUNT(*) AS attempts,
      MAX(score) AS best_score,
      MAX(CASE WHEN difficulty = 'facil' THEN score END) AS easy_best_score,
      MAX(CASE WHEN difficulty = 'dificil' THEN score END) AS hard_best_score
    FROM game_results
    WHERE user_id = ?
    GROUP BY game
  `, [userId]);

  for (const result of gameProgress) {
    const config = gameAwards[result.game];
    if (!config) continue;

    if (result.attempts >= 1) {
      await awardBadge(
        `${config.badge} - Primeira Partida`,
        `Completou sua primeira partida de ${config.badge}.`
      );
    }

    if (result.best_score >= 80) {
      await awardBadge(config.badge, config.description);
    }

    if (result.attempts >= 3) {
      await awardBadge(`${config.badge} + 3 Partidas`, 'Completou três ou mais partidas neste tema.');
    }

    if (result.easy_best_score >= 80) {
      await awardBadge(
        `${config.badge} - Modo Fácil`,
        `Demonstrou domínio de ${config.badge} no modo fácil.`
      );
    }

    if (result.hard_best_score >= 80) {
      await awardBadge(
        `${config.badge} - Modo Difícil`,
        `Demonstrou domínio de ${config.badge} no modo difícil.`
      );
    }
  }

  const progress = await getRow(`
    SELECT
      COUNT(*) AS total_games,
      COALESCE(SUM(score), 0) AS total_score,
      COUNT(DISTINCT game) AS different_games,
      COUNT(DISTINCT difficulty) AS different_difficulties,
      MAX(CASE WHEN score = 100 THEN 1 ELSE 0 END) AS has_perfect_game,
      MAX(CASE WHEN difficulty = 'dificil' THEN 1 ELSE 0 END) AS has_hard_game,
      MAX(CASE WHEN difficulty = 'dificil' AND score = 100 THEN 1 ELSE 0 END) AS has_perfect_hard_game
    FROM game_results
    WHERE user_id = ?
  `, [userId]);

  if (progress.total_games >= 1) {
    await awardBadge('Primeira Missão', 'Concluiu sua primeira partida no MathPlay.');
  }

  if (progress.has_perfect_game) {
    await awardBadge('Resposta Perfeita', 'Acertou todas as questões de uma partida.');
  }

  if (progress.has_hard_game) {
    await awardBadge('Coragem no Desafio', 'Concluiu uma partida no nível difícil.');
  }

  if (progress.has_perfect_hard_game) {
    await awardBadge('Lenda da Matemática', 'Acertou todas as questões em uma partida difícil.');
  }

  if (progress.different_games >= 4) {
    await awardBadge('Explorador Completo', 'Experimentou pelo menos quatro jogos diferentes.');
  }

  if (progress.total_score >= 500) {
    await awardBadge('Colecionador de Pontos', 'Acumulou 500 pontos jogando MathPlay.');
  }

  if (progress.total_games >= 10) {
    await awardBadge('Maratonista MathPlay', 'Completou dez partidas na plataforma.');
  }

  if (progress.total_games >= 25) {
    await awardBadge('Turnê MathPlay', 'Completou 25 partidas na plataforma.');
  }

  if (progress.total_games >= 50) {
    await awardBadge('Lenda do Palco', 'Completou 50 partidas na plataforma.');
  }

  if (progress.different_difficulties === 3) {
    await awardBadge('Versatilidade Musical', 'Jogou nos níveis fácil, médio e difícil.');
  }
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

app.get('/api/health', asyncRoute(async (req, res) => {
  await db.query('SELECT 1');
  res.json({ ok: true, message: 'MathPlay Solutions online.' });
}));

app.post('/api/register', asyncRoute(async (req, res) => {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Preencha nome de usuário, e-mail e senha.' });
  }

  const safeRole = role === 'Professor' || role === 'Admin' ? role : 'Aluno';
  const passwordHash = bcrypt.hashSync(password, 10);

  try {
    const result = await execute(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username.trim(), email.trim(), passwordHash, safeRole]
    );

    req.session.userId = result.insertId;
    const user = await getRow('SELECT * FROM users WHERE id = ?', [result.insertId]);

    res.status(201).json({
      message: 'Cadastro realizado com sucesso.',
      user: getSafeUser(user)
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Usuário ou e-mail já cadastrados.' });
    }
    console.error('Erro ao criar usuário:', error);
    return res.status(500).json({ error: 'Erro ao criar usuário.' });
  }
}));

app.post('/api/login', asyncRoute(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Informe e-mail e senha.' });
  }

  const user = await getRow('SELECT * FROM users WHERE email = ?', [email.trim()]);

  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }

  const passwordMatches = bcrypt.compareSync(password, user.password_hash);

  if (!passwordMatches) {
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }

  req.session.userId = user.id;
  res.json({ message: 'Login realizado com sucesso.', user: getSafeUser(user) });
}));

app.get('/api/session', asyncRoute(async (req, res) => {
  if (!req.session.userId) {
    return res.json({ user: null });
  }

  const user = await getRow('SELECT * FROM users WHERE id = ?', [req.session.userId]);
  return res.json({ user: user ? getSafeUser(user) : null });
}));

app.put('/api/profile', requireAuth, asyncRoute(async (req, res) => {
  const { displayName, profilePicture, profileBanner } = req.body;
  if (typeof displayName !== 'string') {
    return res.status(400).json({ error: 'Informe um nome de perfil.' });
  }

  const normalizedName = displayName.trim();
  if (!normalizedName || Array.from(normalizedName).length > 40) {
    return res.status(400).json({ error: 'O nome de perfil deve ter entre 1 e 40 caracteres.' });
  }

  const validateProfileImage = (dataUrl, maxBytes, label) => {
    if (dataUrl === null || dataUrl === '') return null;
    if (
      typeof dataUrl !== 'string' ||
      !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(dataUrl)
    ) {
      throw new Error(`${label} deve ser uma imagem PNG, JPEG ou WebP válida.`);
    }

    const mimeType = dataUrl.slice(11, dataUrl.indexOf(';'));
    const encodedImage = dataUrl.slice(dataUrl.indexOf(',') + 1);
    const imageBytes = Buffer.from(encodedImage, 'base64');
    const validImageSignature = mimeType === 'jpeg'
      ? imageBytes[0] === 0xff && imageBytes[1] === 0xd8 && imageBytes[2] === 0xff
      : mimeType === 'png'
        ? imageBytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
        : imageBytes.toString('ascii', 0, 4) === 'RIFF' && imageBytes.toString('ascii', 8, 12) === 'WEBP';
    if (imageBytes.length > maxBytes || imageBytes.toString('base64') !== encodedImage || !validImageSignature) {
      throw new Error(`${label} inválido ou maior que ${Math.floor(maxBytes / 1024)} KB.`);
    }
    return dataUrl;
  };

  if (profilePicture === undefined || profileBanner === undefined) {
    return res.status(400).json({ error: 'Envie a foto e o banner atuais ou remova-os antes de salvar.' });
  }

  let normalizedPicture;
  let normalizedBanner;
  try {
    normalizedPicture = validateProfileImage(profilePicture, MAX_PROFILE_IMAGE_BYTES, 'Foto de perfil');
    normalizedBanner = validateProfileImage(profileBanner, MAX_PROFILE_BANNER_BYTES, 'Banner');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  await execute(
    'UPDATE users SET display_name = ?, profile_picture = ?, profile_banner = ? WHERE id = ?',
    [normalizedName, normalizedPicture, normalizedBanner, req.session.userId]
  );

  const user = await getRow(
    'SELECT id, username, display_name, profile_picture, profile_banner, email, role FROM users WHERE id = ?',
    [req.session.userId]
  );
  if (!user) {
    return res.status(404).json({ error: 'Conta não encontrada.' });
  }

  res.json({ message: 'Perfil atualizado com sucesso.', user: getSafeUser(user) });
}));

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logout realizado.' });
  });
});

app.get('/api/dashboard', requireAuth, asyncRoute(async (req, res) => {
  const data = await getDashboardData(req.session.userId);
  res.json(data);
}));

app.get('/api/profile', requireAuth, asyncRoute(async (req, res) => {
  await awardAchievements(req.session.userId);
  const data = await getDashboardData(req.session.userId);
  res.json({
    user: data.user,
    stats: data.stats,
    recentAchievements: data.achievements.slice(0, 8),
    recentGames: data.recent
  });
}));

app.get('/api/achievements', requireAuth, asyncRoute(async (req, res) => {
  await awardAchievements(req.session.userId);

  const unlockedAchievements = new Map(
    (await getRows('SELECT badge, created_at FROM achievements WHERE user_id = ?', [req.session.userId]))
      .map((achievement) => [achievement.badge, achievement.created_at])
  );

  const achievements = achievementCatalog.map((achievement) => ({
    ...achievement,
    unlocked: unlockedAchievements.has(achievement.badge),
    unlockedAt: unlockedAchievements.get(achievement.badge) || null
  }));

  res.json({
    total: achievements.length,
    unlocked: achievements.filter((achievement) => achievement.unlocked).length,
    achievements
  });
}));

app.post('/api/game-result', requireAuth, asyncRoute(async (req, res) => {
  const { game, difficulty, score, correctAnswers, totalQuestions } = req.body;

  if (
    !Object.prototype.hasOwnProperty.call(gameAwards, game) ||
    !['facil', 'medio', 'dificil'].includes(difficulty) ||
    !Number.isInteger(score) ||
    !Number.isInteger(correctAnswers) ||
    !Number.isInteger(totalQuestions) ||
    totalQuestions <= 0 ||
    correctAnswers < 0 ||
    correctAnswers > totalQuestions
  ) {
    return res.status(400).json({ error: 'Dados do jogo incompletos.' });
  }

  const calculatedScore = Math.round((correctAnswers / totalQuestions) * 100);
  if (score !== calculatedScore) {
    return res.status(400).json({ error: 'A pontuação não corresponde às respostas informadas.' });
  }

  const result = await execute(
    'INSERT INTO game_results (user_id, game, difficulty, score, correct_answers, total_questions) VALUES (?, ?, ?, ?, ?, ?)',
    [req.session.userId, game, difficulty, score, correctAnswers, totalQuestions]
  );

  await awardAchievements(req.session.userId);

  const dashboard = await getDashboardData(req.session.userId);

  res.status(201).json({
    message: 'Resultado salvo com sucesso.',
    insertedId: result.insertId,
    dashboard
  });
}));

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/perfil', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/conquistas', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'achievements.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  res.status(500).json({ error: 'Erro interno ao acessar o banco de dados.' });
});

async function startServer() {
  await db.query('SELECT 1');
  const [columns] = await db.query('SHOW COLUMNS FROM users');
  const existingColumns = new Set(columns.map((column) => column.Field));
  if (!existingColumns.has('display_name')) {
    await db.query('ALTER TABLE users ADD COLUMN display_name VARCHAR(40) NULL AFTER username');
  }
  if (!existingColumns.has('profile_picture')) {
    await db.query('ALTER TABLE users ADD COLUMN profile_picture MEDIUMTEXT NULL AFTER display_name');
  }
  if (!existingColumns.has('profile_banner')) {
    await db.query('ALTER TABLE users ADD COLUMN profile_banner MEDIUMTEXT NULL AFTER profile_picture');
  }
  app.listen(PORT, () => {
    console.log(`MathPlay Solutions running on http://localhost:${PORT}`);
  });
}

startServer().catch(async (error) => {
  console.error('Não foi possível conectar ao MySQL. Confira as variáveis DB_* e importe database/schema.sql.', error);
  await db.end();
  process.exitCode = 1;
});
