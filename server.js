const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const db = new Database(path.join(__dirname, 'mathplay.db'));

app.use(express.json());
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

const schema = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Aluno',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS game_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    game TEXT NOT NULL,
    score INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    badge TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, badge),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`;

db.exec(schema);

const gameResultColumns = db.prepare('PRAGMA table_info(game_results)').all();
if (!gameResultColumns.some((column) => column.name === 'difficulty')) {
  db.exec("ALTER TABLE game_results ADD COLUMN difficulty TEXT NOT NULL DEFAULT 'medio'");
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
    email: user.email,
    role: user.role
  };
}

function getDashboardData(userId) {
  const user = db
    .prepare('SELECT id, username, email, role FROM users WHERE id = ?')
    .get(userId);

  const totals = db
    .prepare(`
      SELECT
        COUNT(*) AS total_games,
        COALESCE(SUM(score), 0) AS total_score,
        COALESCE(AVG(score), 0) AS avg_score
      FROM game_results
      WHERE user_id = ?
    `)
    .get(userId);

  const bestScores = db
    .prepare(`
      SELECT game, MAX(score) AS best_score, COUNT(*) AS attempts
      FROM game_results
      WHERE user_id = ?
      GROUP BY game
      ORDER BY best_score DESC
    `)
    .all(userId);

  const achievements = db
    .prepare('SELECT badge, description, created_at FROM achievements WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId);

  const recent = db
    .prepare('SELECT game, difficulty, score, correct_answers, total_questions, created_at FROM game_results WHERE user_id = ? ORDER BY created_at DESC LIMIT 5')
    .all(userId);

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

function awardAchievements(userId) {
  const awardBadge = (badge, description) => {
    db.prepare('INSERT OR IGNORE INTO achievements (user_id, badge, description) VALUES (?, ?, ?)')
      .run(userId, badge, description);
  };

  const gameProgress = db.prepare(`
    SELECT
      game,
      COUNT(*) AS attempts,
      MAX(score) AS best_score,
      MAX(CASE WHEN difficulty = 'facil' THEN score END) AS easy_best_score,
      MAX(CASE WHEN difficulty = 'dificil' THEN score END) AS hard_best_score
    FROM game_results
    WHERE user_id = ?
    GROUP BY game
  `).all(userId);

  for (const result of gameProgress) {
    const config = gameAwards[result.game];
    if (!config) continue;

    if (result.attempts >= 1) {
      awardBadge(
        `${config.badge} - Primeira Partida`,
        `Completou sua primeira partida de ${config.badge}.`
      );
    }

    if (result.best_score >= 80) {
      awardBadge(config.badge, config.description);
    }

    if (result.attempts >= 3) {
      awardBadge(`${config.badge} + 3 Partidas`, 'Completou três ou mais partidas neste tema.');
    }

    if (result.easy_best_score >= 80) {
      awardBadge(
        `${config.badge} - Modo Fácil`,
        `Demonstrou domínio de ${config.badge} no modo fácil.`
      );
    }

    if (result.hard_best_score >= 80) {
      awardBadge(
        `${config.badge} - Modo Difícil`,
        `Demonstrou domínio de ${config.badge} no modo difícil.`
      );
    }
  }

  const progress = db.prepare(`
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
  `).get(userId);

  if (progress.total_games >= 1) {
    awardBadge('Primeira Missão', 'Concluiu sua primeira partida no MathPlay.');
  }

  if (progress.has_perfect_game) {
    awardBadge('Resposta Perfeita', 'Acertou todas as questões de uma partida.');
  }

  if (progress.has_hard_game) {
    awardBadge('Coragem no Desafio', 'Concluiu uma partida no nível difícil.');
  }

  if (progress.has_perfect_hard_game) {
    awardBadge('Lenda da Matemática', 'Acertou todas as questões em uma partida difícil.');
  }

  if (progress.different_games >= 4) {
    awardBadge('Explorador Completo', 'Experimentou pelo menos quatro jogos diferentes.');
  }

  if (progress.total_score >= 500) {
    awardBadge('Colecionador de Pontos', 'Acumulou 500 pontos jogando MathPlay.');
  }

  if (progress.total_games >= 10) {
    awardBadge('Maratonista MathPlay', 'Completou dez partidas na plataforma.');
  }

  if (progress.total_games >= 25) {
    awardBadge('Turnê MathPlay', 'Completou 25 partidas na plataforma.');
  }

  if (progress.total_games >= 50) {
    awardBadge('Lenda do Palco', 'Completou 50 partidas na plataforma.');
  }

  if (progress.different_difficulties === 3) {
    awardBadge('Versatilidade Musical', 'Jogou nos níveis fácil, médio e difícil.');
  }
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'MathPlay Solutions online.' });
});

app.post('/api/register', (req, res) => {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Preencha nome de usuário, e-mail e senha.' });
  }

  const safeRole = role === 'Professor' || role === 'Admin' ? role : 'Aluno';
  const passwordHash = bcrypt.hashSync(password, 10);

  try {
    const result = db.prepare(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run(username.trim(), email.trim(), passwordHash, safeRole);

    req.session.userId = result.lastInsertRowid;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      message: 'Cadastro realizado com sucesso.',
      user: getSafeUser(user)
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Usuário ou e-mail já cadastrados.' });
    }
    return res.status(500).json({ error: 'Erro ao criar usuário.' });
  }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Informe e-mail e senha.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim());

  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }

  const passwordMatches = bcrypt.compareSync(password, user.password_hash);

  if (!passwordMatches) {
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }

  req.session.userId = user.id;
  res.json({ message: 'Login realizado com sucesso.', user: getSafeUser(user) });
});

app.get('/api/session', (req, res) => {
  if (!req.session.userId) {
    return res.json({ user: null });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  return res.json({ user: user ? getSafeUser(user) : null });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logout realizado.' });
  });
});

app.get('/api/dashboard', requireAuth, (req, res) => {
  const data = getDashboardData(req.session.userId);
  res.json(data);
});

app.get('/api/achievements', requireAuth, (req, res) => {
  awardAchievements(req.session.userId);

  const unlockedAchievements = new Map(
    db.prepare('SELECT badge, created_at FROM achievements WHERE user_id = ?')
      .all(req.session.userId)
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
});

app.post('/api/game-result', requireAuth, (req, res) => {
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

  const result = db.prepare(
    'INSERT INTO game_results (user_id, game, difficulty, score, correct_answers, total_questions) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.session.userId, game, difficulty, score, correctAnswers, totalQuestions);

  awardAchievements(req.session.userId);

  const dashboard = getDashboardData(req.session.userId);

  res.status(201).json({
    message: 'Resultado salvo com sucesso.',
    insertedId: result.lastInsertRowid,
    dashboard
  });
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/conquistas', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'achievements.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`MathPlay Solutions running on http://localhost:${PORT}`);
});
