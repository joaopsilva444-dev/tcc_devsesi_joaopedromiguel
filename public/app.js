const state = {
  user: null,
  currentTab: 'login',
  activeGame: null,
  currentGameData: null
};

const authModal = document.getElementById('authModal');
const gameModal = document.getElementById('gameModal');
const authButton = document.getElementById('authButton');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const tabButtons = document.querySelectorAll('.tab');
const dashboardPanel = document.getElementById('dashboard');
const gameArea = document.getElementById('gameArea');
const gameModalTitle = document.getElementById('gameModalTitle');

function setAuthTab(tab) {
  state.currentTab = tab;
  tabButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tab);
  });

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
  } else {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
  }
}

function openAuthModal() {
  authModal.classList.remove('hidden');
  authModal.setAttribute('aria-hidden', 'false');
}

function closeAuthModal() {
  authModal.classList.add('hidden');
  authModal.setAttribute('aria-hidden', 'true');
}

function openGameModal(title) {
  gameModalTitle.textContent = title;
  gameModal.classList.remove('hidden');
  gameModal.setAttribute('aria-hidden', 'false');
}

function closeGameModal() {
  gameModal.classList.add('hidden');
  gameModal.setAttribute('aria-hidden', 'true');
  gameArea.innerHTML = '';
  state.activeGame = null;
  state.currentGameData = null;
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error(typeof data === 'string' ? data : (data.error || 'Erro inesperado.'));
  }

  return data;
}

async function loadSession() {
  try {
    const response = await apiFetch('/api/session');
    state.user = response.user;
    renderUserState();
    if (state.user) {
      await loadDashboard();
    }
  } catch (error) {
    console.error(error);
  }
}

function renderUserState() {
  const hasUser = Boolean(state.user);
  authButton.textContent = hasUser ? 'Sair' : 'Entrar';

  if (hasUser) {
    authButton.setAttribute('data-logged-in', 'true');
  } else {
    authButton.removeAttribute('data-logged-in');
  }

  dashboardPanel.classList.toggle('hidden', !hasUser);
}

async function loadDashboard() {
  if (!state.user) {
    dashboardPanel.classList.add('hidden');
    return;
  }

  try {
    const data = await apiFetch('/api/dashboard');

    document.getElementById('totalGames').textContent = data.stats.totalGames;
    document.getElementById('totalScore').textContent = data.stats.totalScore;
    document.getElementById('avgScore').textContent = `${Math.round(data.stats.avgScore)}%`;

    const achievements = data.achievements?.length ? data.achievements : [{ badge: 'Primeiros passos', description: 'Complete qualquer jogo para conquistar a primeira medalha.' }];
    const history = data.recent?.length ? data.recent : [{ game: 'Sem partidas ainda', score: 0, correct_answers: 0, total_questions: 0, created_at: new Date().toISOString() }];

    document.getElementById('achievementList').innerHTML = achievements
      .map((item) => `<li><strong>${item.badge}</strong><div>${item.description}</div></li>`)
      .join('');

    document.getElementById('historyList').innerHTML = history
      .map((item) => {
        const date = new Date(item.created_at).toLocaleDateString('pt-BR');
        const difficulty = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' }[item.difficulty] || '';
        const difficultyLabel = difficulty ? ` • ${difficulty}` : '';
        return `<li><strong>${item.game}</strong><div>Pontuação: ${item.score}%${difficultyLabel} • ${date}</div></li>`;
      })
      .join('');

    dashboardPanel.classList.remove('hidden');
  } catch (error) {
    console.error(error);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const response = await apiFetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    state.user = response.user;
    closeAuthModal();
    renderUserState();
    await loadDashboard();
  } catch (error) {
    alert(error.message);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const username = document.getElementById('registerUsername').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const role = document.getElementById('registerRole').value;

  try {
    const response = await apiFetch('/api/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, role })
    });

    state.user = response.user;
    closeAuthModal();
    renderUserState();
    await loadDashboard();
  } catch (error) {
    alert(error.message);
  }
}

async function handleLogout() {
  try {
    await apiFetch('/api/logout', { method: 'POST' });
    state.user = null;
    renderUserState();
    dashboardPanel.classList.add('hidden');
  } catch (error) {
    console.error(error);
  }
}

function initAuthEvents() {
  authButton.addEventListener('click', () => {
    if (state.user) {
      handleLogout();
      return;
    }

    window.location.href = '/login';
  });

  document.getElementById('closeAuth').addEventListener('click', closeAuthModal);
  document.getElementById('exploreGames').addEventListener('click', () => {
    document.getElementById('games').scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('dashboardButton').addEventListener('click', () => {
    if (!state.user) {
      window.location.href = '/login';
      return;
    }
    document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' });
  });

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => setAuthTab(button.dataset.tab));
  });

  loginForm.addEventListener('submit', handleLogin);
  registerForm.addEventListener('submit', handleRegister);
  document.getElementById('closeGameModal').addEventListener('click', closeGameModal);
}

function gameConfigMap() {
  return {
    inteiros: {
      key: 'inteiros',
      title: 'Batalha dos Inteiros',
      questions: {
        facil: [
          { prompt: '6 + 3 = ?', answer: 9, hint: 'Some os dois números positivos.', explanation: '6 + 3 = 9.' },
          { prompt: '-4 + 2 = ?', answer: -2, hint: 'Avance 2 unidades a partir de -4.', explanation: '-4 + 2 = -2.' },
          { prompt: '7 - 5 = ?', answer: 2, hint: 'Retire 5 unidades de 7.', explanation: '7 - 5 = 2.' }
        ],
        medio: [
        { prompt: '-8 + 12 = ?', answer: 4, hint: 'Some 8 unidades em direção ao positivo e depois compare com zero.', explanation: 'Ao somar -8 + 12, avançamos 12 e retiramos 8, restando 4.' },
        { prompt: '5 - (-3) = ?', answer: 8, hint: 'Subtrair um número negativo equivale a somar o seu oposto.', explanation: '5 - (-3) = 5 + 3 = 8.' },
        { prompt: '-6 × 4 = ?', answer: -24, hint: 'Produto de sinais diferentes resulta em número negativo.', explanation: '-6 × 4 = -24 porque o sinal negativo prevalece no produto.' }
        ],
        dificil: [
          { prompt: '-18 + 7 - (-9) = ?', answer: -2, hint: 'Transforme a subtração de negativo em adição e calcule da esquerda para a direita.', explanation: '-18 + 7 + 9 = -2.' },
          { prompt: '(-6) × (-4) + 5 = ?', answer: 29, hint: 'Resolva a multiplicação antes da soma. Negativo vezes negativo é positivo.', explanation: '24 + 5 = 29.' },
          { prompt: '48 ÷ (-6) - (-3) = ?', answer: -5, hint: 'Faça a divisão primeiro e depois some o oposto de -3.', explanation: '-8 + 3 = -5.' }
        ]
      }
    },
    fracoes: {
      key: 'fracoes',
      title: 'Poções de Frações',
      questions: {
        facil: [
          { prompt: '1/4 de 20 = ?', answer: 5, hint: 'Divida 20 em quatro partes iguais.', explanation: '20 ÷ 4 = 5.' },
          { prompt: '2/4 é equivalente a qual número decimal?', answer: 0.5, hint: 'Simplifique a fração dividindo numerador e denominador por 2.', explanation: '2/4 = 1/2 = 0,5.' },
          { prompt: '1/3 + 1/3 = ? (responda em terços)', answer: 2, hint: 'Com denominadores iguais, some os numeradores.', explanation: '1/3 + 1/3 = 2/3.' }
        ],
        medio: [
        { prompt: '1/2 + 1/4 = ?', answer: 0.75, hint: 'Transforme as frações para o mesmo denominador.', explanation: '1/2 + 1/4 = 2/4 + 1/4 = 3/4 = 0,75.' },
        { prompt: '3/5 de 20 = ?', answer: 12, hint: 'Multiplique 20 por 3 e divida por 5.', explanation: '20 × 3/5 = 60/5 = 12.' },
        { prompt: 'Qual fração é equivalente a 1/2?', answer: 0.5, hint: 'Procure uma fração que represente a metade.', explanation: '2/4, 3/6 e 4/8 são equivalentes a 1/2.' }
        ],
        dificil: [
          { prompt: '3/4 + 2/3 = ? (responda em decimal)', answer: 1.4166666667, hint: 'Use 12 como denominador comum e divida o resultado final.', explanation: '9/12 + 8/12 = 17/12 = 1,4166…' },
          { prompt: '5/6 de 42 = ?', answer: 35, hint: 'Divida 42 por 6 e multiplique por 5.', explanation: '42 ÷ 6 × 5 = 35.' },
          { prompt: 'Uma receita usa 3/4 de xícara por porção. Para 4 porções, quantas xícaras são necessárias?', answer: 3, hint: 'Multiplique 3/4 por 4.', explanation: '3/4 × 4 = 3 xícaras.' }
        ]
      }
    },
    equacoes: {
      key: 'equacoes',
      title: 'Balança do Equilíbrio',
      questions: {
        facil: [
          { prompt: 'x + 3 = 8. Qual é o valor de x?', answer: 5, hint: 'Subtraia 3 dos dois lados.', explanation: 'x = 8 - 3 = 5.' },
          { prompt: 'x - 4 = 6. Qual é o valor de x?', answer: 10, hint: 'Some 4 aos dois lados.', explanation: 'x = 6 + 4 = 10.' },
          { prompt: '2x = 12. Qual é o valor de x?', answer: 6, hint: 'Divida os dois lados por 2.', explanation: 'x = 12 ÷ 2 = 6.' }
        ],
        medio: [
        { prompt: 'x + 7 = 15. Qual é o valor de x?', answer: 8, hint: 'Subtraia 7 de ambos os lados da equação.', explanation: 'x = 15 - 7 = 8.' },
        { prompt: '3x = 21. Qual é o valor de x?', answer: 7, hint: 'Divida os dois lados por 3.', explanation: 'x = 21 ÷ 3 = 7.' },
        { prompt: '2x - 5 = 9. Qual é o valor de x?', answer: 7, hint: 'Some 5 e depois divida por 2.', explanation: '2x = 14, então x = 7.' }
        ],
        dificil: [
          { prompt: '4x + 7 = 31. Qual é o valor de x?', answer: 6, hint: 'Subtraia 7 e depois divida por 4.', explanation: '4x = 24, então x = 6.' },
          { prompt: '3(x - 2) = 21. Qual é o valor de x?', answer: 9, hint: 'Divida por 3 antes de somar 2.', explanation: 'x - 2 = 7, então x = 9.' },
          { prompt: '5x - 8 = 2x + 13. Qual é o valor de x?', answer: 7, hint: 'Agrupe os termos com x de um lado e os números do outro.', explanation: '3x = 21, então x = 7.' }
        ]
      }
    },
    geometria: {
      key: 'geometria',
      title: 'Construtor de Cidades',
      questions: {
        facil: [
          { prompt: 'Qual é a área de um quadrado de lado 4 m?', answer: 16, hint: 'Multiplique lado por lado.', explanation: '4 × 4 = 16 m².' },
          { prompt: 'Qual é o perímetro de um retângulo de 3 m por 2 m?', answer: 10, hint: 'Some os quatro lados: dois de cada medida.', explanation: '3 + 2 + 3 + 2 = 10 m.' },
          { prompt: 'Qual é a área de um retângulo de 5 m por 2 m?', answer: 10, hint: 'Área = base × altura.', explanation: '5 × 2 = 10 m².' }
        ],
        medio: [
        { prompt: 'Qual é a área de um retângulo de 6 m por 4 m?', answer: 24, hint: 'Área = base × altura.', explanation: '6 × 4 = 24 m².' },
        { prompt: 'Qual é o perímetro de um quadrado de lado 5 m?', answer: 20, hint: 'Perímetro soma todos os lados.', explanation: '5 + 5 + 5 + 5 = 20 m.' },
        { prompt: 'Uma sala retangular mede 8 m por 3 m. Qual é a área?', answer: 24, hint: 'Use a fórmula da área do retângulo.', explanation: '8 × 3 = 24 m².' }
        ],
        dificil: [
          { prompt: 'Um jardim quadrado tem perímetro de 36 m. Qual é a área?', answer: 81, hint: 'Encontre o lado dividindo o perímetro por 4, depois eleve ao quadrado.', explanation: 'O lado mede 9 m; a área é 9 × 9 = 81 m².' },
          { prompt: 'Um retângulo tem área de 48 m² e base de 8 m. Qual é o perímetro?', answer: 28, hint: 'Descubra a altura pela área e some os quatro lados.', explanation: 'A altura é 48 ÷ 8 = 6 m. O perímetro é 2 × (8 + 6) = 28 m.' },
          { prompt: 'Um triângulo tem base de 10 cm e altura de 7 cm. Qual é sua área?', answer: 35, hint: 'Área do triângulo = base × altura ÷ 2.', explanation: '10 × 7 ÷ 2 = 35 cm².' }
        ]
      }
    },
    financeiro: {
      key: 'financeiro',
      title: 'Desafio da Loja',
      questions: {
        facil: [
          { prompt: 'Quanto é 10% de R$ 50?', answer: 5, hint: 'Divida 50 por 10.', explanation: '10% de R$ 50 é R$ 5.' },
          { prompt: 'Você compra um item de R$ 12 e paga com R$ 20. Qual é o troco?', answer: 8, hint: 'Subtraia o preço do valor pago.', explanation: '20 - 12 = R$ 8.' },
          { prompt: 'Quanto é 50% de R$ 30?', answer: 15, hint: '50% significa metade.', explanation: 'A metade de R$ 30 é R$ 15.' }
        ],
        medio: [
        { prompt: 'Quanto é 25% de R$ 80?', answer: 20, hint: '25% é a mesma coisa que um quarto do valor.', explanation: '80 ÷ 4 = R$ 20.' },
        { prompt: 'Um produto de R$ 120 teve 10% de desconto. Qual é o preço final?', answer: 108, hint: 'Calcule 10% de 120 e subtraia do preço.', explanation: '10% de 120 é 12. Então, 120 - 12 = R$ 108.' },
        { prompt: 'Três itens custam R$ 12 cada. Quanto sobra de R$ 50?', answer: 14, hint: 'Multiplique o preço por 3 e subtraia de 50.', explanation: '3 × 12 = 36; 50 - 36 = R$ 14.' }
        ],
        dificil: [
          { prompt: 'Um produto custa R$ 200 e recebe 15% de desconto. Qual é o preço final?', answer: 170, hint: 'Calcule 10% e 5% de 200, some e subtraia.', explanation: '15% de 200 = 30; o preço final é R$ 170.' },
          { prompt: 'Uma compra de R$ 150 teve acréscimo de 20%. Qual é o total?', answer: 180, hint: 'Calcule 20% de 150 e adicione ao valor inicial.', explanation: '20% de 150 = 30; o total é R$ 180.' },
          { prompt: 'Uma loja compra por R$ 80 e vende por R$ 100. Qual é o lucro percentual sobre o custo?', answer: 25, hint: 'Divida o lucro pelo custo e multiplique por 100.', explanation: '(100 - 80) ÷ 80 × 100 = 25%.' }
        ]
      }
    },
    estatistica: {
      key: 'estatistica',
      title: 'Detetives dos Dados',
      questions: {
        facil: [
          { prompt: 'Qual é a média de 2 e 4?', answer: 3, hint: 'Some os valores e divida por 2.', explanation: '(2 + 4) ÷ 2 = 3.' },
          { prompt: 'Qual é a moda de 1, 2, 2 e 3?', answer: 2, hint: 'Procure o número que mais aparece.', explanation: 'O número 2 aparece mais vezes.' },
          { prompt: 'Qual é a mediana de 1, 3 e 5?', answer: 3, hint: 'A mediana é o valor central quando a lista está em ordem.', explanation: 'O valor central é 3.' }
        ],
        medio: [
        { prompt: 'Qual é a média de 4, 6 e 8?', answer: 6, hint: 'Some os três valores e divida por 3.', explanation: '(4 + 6 + 8) ÷ 3 = 6.' },
        { prompt: 'Qual é a moda da sequência 2, 3, 3 e 5?', answer: 3, hint: 'A moda é o valor que mais se repete.', explanation: 'O número 3 aparece duas vezes, mais do que os outros valores.' },
        { prompt: 'Qual é a mediana de 4, 6, 10 e 12?', answer: 8, hint: 'Com quatro valores, tire a média dos dois valores centrais.', explanation: '(6 + 10) ÷ 2 = 8.' }
        ],
        dificil: [
          { prompt: 'Qual é a média de 12, 15, 18, 21 e 24?', answer: 18, hint: 'Some os cinco valores e divida por 5.', explanation: '90 ÷ 5 = 18.' },
          { prompt: 'Qual é a mediana de 3, 7, 9, 11, 15 e 19?', answer: 10, hint: 'Com seis valores, faça a média do 3º e do 4º.', explanation: '(9 + 11) ÷ 2 = 10.' },
          { prompt: 'A média de 6, 10 e x é 10. Qual é o valor de x?', answer: 14, hint: 'A soma total precisa ser a média multiplicada por 3.', explanation: '6 + 10 + x = 30, então x = 14.' }
        ]
      }
    },
    coordenadas: {
      key: 'coordenadas',
      title: 'Missão no Plano',
      questions: {
        facil: [
          { prompt: 'No ponto (2, 5), qual é a coordenada x?', answer: 2, hint: 'O primeiro número do par é x.', explanation: 'Em (2, 5), x = 2.' },
          { prompt: 'No ponto (4, 3), qual é a coordenada y?', answer: 3, hint: 'O segundo número do par é y.', explanation: 'Em (4, 3), y = 3.' },
          { prompt: 'Quantas unidades há entre x = 1 e x = 4?', answer: 3, hint: 'Subtraia a menor coordenada da maior.', explanation: '4 - 1 = 3 unidades.' }
        ],
        medio: [
        { prompt: 'No ponto (-3, 4), qual é a coordenada x?', answer: -3, hint: 'A coordenada x é sempre o primeiro número do par ordenado.', explanation: 'No par (-3, 4), x = -3.' },
        { prompt: 'No ponto (5, -2), qual é a coordenada y?', answer: -2, hint: 'A coordenada y é sempre o segundo número do par ordenado.', explanation: 'No par (5, -2), y = -2.' },
        { prompt: 'De (1, 2) até (5, 2), quantas unidades você anda na horizontal?', answer: 4, hint: 'Subtraia as coordenadas x: 5 - 1.', explanation: '5 - 1 = 4 unidades na horizontal.' }
        ],
        dificil: [
          { prompt: 'Qual é a distância entre (1, 2) e (4, 6) em uma rota que anda pelos eixos?', answer: 7, hint: 'Some a diferença horizontal e a diferença vertical.', explanation: '|4 - 1| + |6 - 2| = 3 + 4 = 7 unidades.' },
          { prompt: 'Um ponto começa em (-2, 3) e anda 5 para a direita e 4 para baixo. Qual é o novo valor de x + y?', answer: 2, hint: 'Atualize cada coordenada: direita aumenta x e descer diminui y.', explanation: 'O ponto chega a (3, -1), então x + y = 2.' },
          { prompt: 'Qual é a distância horizontal entre (-6, 4) e (3, -2)?', answer: 9, hint: 'Compare apenas os valores de x.', explanation: '|3 - (-6)| = 9 unidades.' }
        ]
      }
    },
    potencia: {
      key: 'potencia',
      title: 'Batalha das Potências',
      questions: {
        facil: [
          { prompt: 'Quanto é 2³?', answer: 8, hint: 'Multiplique 2 por ele mesmo três vezes.', explanation: '2 × 2 × 2 = 8.' },
          { prompt: 'Qual é a raiz quadrada de 25?', answer: 5, hint: 'Qual número vezes ele mesmo é 25?', explanation: '5 × 5 = 25.' },
          { prompt: 'Quanto é 10²?', answer: 100, hint: 'Multiplique 10 por 10.', explanation: '10 × 10 = 100.' }
        ],
        medio: [
        { prompt: 'Quanto é 2⁵?', answer: 32, hint: 'Multiplique 2 por ele mesmo cinco vezes.', explanation: '2 × 2 × 2 × 2 × 2 = 32.' },
        { prompt: 'Qual é a raiz quadrada de 81?', answer: 9, hint: 'Qual número multiplicado por ele mesmo resulta em 81?', explanation: '9 × 9 = 81, então √81 = 9.' },
        { prompt: 'Quanto é 3² + √16?', answer: 13, hint: 'Calcule primeiro a potência e a raiz, depois some.', explanation: '3² + √16 = 9 + 4 = 13.' }
        ],
        dificil: [
          { prompt: 'Quanto é 2⁴ × 2³?', answer: 128, hint: 'Ao multiplicar potências de mesma base, some os expoentes.', explanation: '2⁴ × 2³ = 2⁷ = 128.' },
          { prompt: 'Qual é a raiz cúbica de 216?', answer: 6, hint: 'Procure um número que multiplicado por si mesmo três vezes resulta em 216.', explanation: '6 × 6 × 6 = 216.' },
          { prompt: 'Quanto é √144 + 2³ × 3?', answer: 36, hint: 'Resolva raiz e potência antes da multiplicação e soma.', explanation: '12 + 8 × 3 = 12 + 24 = 36.' }
        ]
      }
    }
  };
}

function launchGame(gameKey) {
  if (!state.user) {
    window.location.href = '/login';
    return;
  }

  const config = gameConfigMap()[gameKey];
  if (!config) return;

  state.activeGame = config.key;
  state.currentGameData = config;
  openGameModal(config.title);
  renderDifficultySelection(config);
}

function renderDifficultySelection(config) {
  gameArea.innerHTML = `
    <div class="game-screen">
      <div class="question-box difficulty-intro">
        <h3>Escolha a dificuldade</h3>
        <p>Selecione um nível para começar. Cada nível tem desafios próprios.</p>
        <div class="difficulty-options">
          <button type="button" class="difficulty-option" data-difficulty="facil">
            <strong>Fácil</strong><span>Comece praticando</span>
          </button>
          <button type="button" class="difficulty-option" data-difficulty="medio">
            <strong>Médio</strong><span>Um desafio equilibrado</span>
          </button>
          <button type="button" class="difficulty-option" data-difficulty="dificil">
            <strong>Difícil</strong><span>Teste seus conhecimentos</span>
          </button>
        </div>
      </div>
    </div>
  `;

  gameArea.querySelectorAll('[data-difficulty]').forEach((button) => {
    button.addEventListener('click', () => startGame(config, button.dataset.difficulty));
  });
}

function startGame(config, difficulty) {
  const questions = config.questions[difficulty];
  if (!questions) {
    throw new Error(`Dificuldade inválida: ${difficulty}`);
  }

  state.activeGame = config.key;
  state.currentGameData = {
    key: config.key,
    title: config.title,
    difficulty,
    questions,
    index: 0,
    correct: 0,
    hintsUsed: 0,
    total: questions.length
  };

  renderCurrentQuestion();
}

function renderCurrentQuestion() {
  const data = state.currentGameData;
  if (!data) return;

  const question = data.questions[data.index];
  const progressText = `Questão ${data.index + 1} de ${data.total}`;

  gameArea.innerHTML = `
    <div class="game-screen">
      <div class="game-progress">
        <span>${progressText}</span>
        <span>${{ facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' }[data.difficulty]} • Acertos: ${data.correct}</span>
      </div>
      <div class="question-box">
        <h3>${question.prompt}</h3>
        <form id="answerForm">
          <label>
            Resposta
            <input id="answerInput" type="number" step="any" placeholder="Digite sua resposta" required />
          </label>
          <div class="game-actions">
            <button type="button" class="secondary-button" id="hintButton">Dica</button>
            <button type="submit" class="primary-button">Responder</button>
          </div>
        </form>
      </div>
      <div id="gameFeedback" class="feedback-box hidden"></div>
    </div>
  `;

  document.getElementById('answerForm').addEventListener('submit', handleAnswerSubmission);
  document.getElementById('hintButton').addEventListener('click', showHint);
}

function showHint() {
  const data = state.currentGameData;
  const question = data.questions[data.index];
  const feedback = document.getElementById('gameFeedback');
  feedback.className = 'hint-box';
  feedback.textContent = `Dica: ${question.hint}`;
  feedback.classList.remove('hidden');
  data.hintsUsed += 1;
}

async function handleAnswerSubmission(event) {
  event.preventDefault();
  const data = state.currentGameData;
  const question = data.questions[data.index];
  const answerValue = Number(document.getElementById('answerInput').value);
  const feedback = document.getElementById('gameFeedback');

  if (Number.isNaN(answerValue)) {
    feedback.className = 'feedback-box error';
    feedback.textContent = 'Digite um valor numérico válido antes de responder.';
    feedback.classList.remove('hidden');
    return;
  }

  const isCorrect = Number(answerValue) === Number(question.answer);
  const answerIsCorrect = Number.isInteger(question.answer)
    ? isCorrect
    : Math.abs(answerValue - question.answer) < 0.000001;

  if (answerIsCorrect) {
    data.correct += 1;
    feedback.className = 'feedback-box success';
    feedback.textContent = `Correto! ${question.explanation}`;
  } else {
    feedback.className = 'feedback-box error';
    feedback.textContent = `Não foi desta vez. ${question.explanation}`;
  }

  feedback.classList.remove('hidden');

  setTimeout(async () => {
    data.index += 1;

    if (data.index < data.questions.length) {
      renderCurrentQuestion();
      return;
    }

    const finalScore = Math.round((data.correct / data.total) * 100);
    const payload = {
      game: data.key,
      difficulty: data.difficulty,
      score: finalScore,
      correctAnswers: data.correct,
      totalQuestions: data.total
    };

    try {
      await apiFetch('/api/game-result', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const finalMessage = document.createElement('div');
      finalMessage.className = 'question-box';
      finalMessage.innerHTML = `
        <h3>Missão concluída!</h3>
        <p>Você marcou ${finalScore}% com ${data.correct} acertos em ${data.total} questões.</p>
        <p>Seu progresso foi salvo no painel e suas conquistas foram atualizadas.</p>
        <div class="game-actions">
          <button type="button" class="primary-button" id="closeAfterGame">Voltar ao painel</button>
        </div>
      `;
      gameArea.innerHTML = '';
      gameArea.appendChild(finalMessage);
      document.getElementById('closeAfterGame').addEventListener('click', async () => {
        closeGameModal();
        await loadDashboard();
      });
    } catch (error) {
      alert(error.message);
      closeGameModal();
    }
  }, 900);
}

function bindGameCards() {
  document.querySelectorAll('.play-button').forEach((button) => {
    button.addEventListener('click', () => {
      const card = button.closest('.game-card');
      launchGame(card.dataset.game);
    });
  });
}

initAuthEvents();
bindGameCards();
loadSession();
