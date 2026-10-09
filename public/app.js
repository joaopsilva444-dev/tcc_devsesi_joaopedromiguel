const state = {
  user: null,
  currentTab: 'login',
  activeGame: null,
  currentGameData: null
};

const authModal = document.getElementById('authModal');
const gameModal = document.getElementById('gameModal');
const authButton = document.getElementById('authButton');
const profileLink = document.getElementById('profileLink');
const profileLinkImage = document.getElementById('profileLinkImage');
const profileLinkFallback = document.getElementById('profileLinkFallback');
const profileLinkName = document.getElementById('profileLinkName');
const heroTitle = document.getElementById('heroTitle');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const tabButtons = document.querySelectorAll('.tab');
const dashboardPanel = document.getElementById('dashboard');
const gameArea = document.getElementById('gameArea');
const gameModalTitle = document.getElementById('gameModalTitle');
let lastDialogTrigger = null;
let activeDialog = null;

function setAuthTab(tab) {
  state.currentTab = tab;
  tabButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tab);
    button.setAttribute('aria-selected', String(button.dataset.tab === tab));
  });

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    loginForm.hidden = false;
    registerForm.classList.add('hidden');
    registerForm.hidden = true;
  } else {
    loginForm.classList.add('hidden');
    loginForm.hidden = true;
    registerForm.classList.remove('hidden');
    registerForm.hidden = false;
  }
}

function openAuthModal() {
  lastDialogTrigger = document.activeElement;
  activeDialog = authModal;
  authModal.classList.remove('hidden');
  authModal.setAttribute('aria-hidden', 'false');
  document.getElementById('closeAuth').focus();
}

function closeAuthModal() {
  authModal.classList.add('hidden');
  authModal.setAttribute('aria-hidden', 'true');
  restoreDialogFocus(authModal);
}

function openGameModal(title) {
  lastDialogTrigger = document.activeElement;
  activeDialog = gameModal;
  gameModalTitle.textContent = title;
  gameModal.classList.remove('hidden');
  gameModal.setAttribute('aria-hidden', 'false');
  document.getElementById('closeGameModal').focus();
}

function closeGameModal() {
  gameModal.classList.add('hidden');
  gameModal.setAttribute('aria-hidden', 'true');
  gameArea.innerHTML = '';
  state.activeGame = null;
  state.currentGameData = null;
  restoreDialogFocus(gameModal);
}

function restoreDialogFocus(dialog) {
  if (activeDialog !== dialog) return;
  activeDialog = null;
  if (lastDialogTrigger instanceof HTMLElement && lastDialogTrigger.isConnected) {
    lastDialogTrigger.focus();
  }
  lastDialogTrigger = null;
}

function handleDialogKeydown(event) {
  if (!activeDialog) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    if (activeDialog === authModal) closeAuthModal();
    else closeGameModal();
    return;
  }
  if (event.key !== 'Tab') return;

  const focusable = [...activeDialog.querySelectorAll(
    'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
  )].filter((element) => !element.hidden && element.getClientRects().length > 0);
  if (!focusable.length) {
    event.preventDefault();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
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
  profileLink.hidden = !hasUser;

  if (hasUser) {
    authButton.setAttribute('data-logged-in', 'true');
    const displayName = state.user.displayName || state.user.username;
    const initials = displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('pt-BR');
    const profilePicture = state.user.profilePicture || '';
    profileLinkName.textContent = displayName;
    profileLinkImage.hidden = !profilePicture;
    profileLinkFallback.hidden = Boolean(profilePicture);
    profileLinkFallback.textContent = initials;
    if (profilePicture) profileLinkImage.src = profilePicture;
    else profileLinkImage.removeAttribute('src');
    heroTitle.textContent = `Bem-vindo, ${displayName}!`;
  } else {
    authButton.removeAttribute('data-logged-in');
    profileLinkImage.hidden = true;
    profileLinkImage.removeAttribute('src');
    profileLinkFallback.hidden = true;
    profileLinkName.textContent = '';
    heroTitle.textContent = 'Aprender matemática nunca foi tão divertido.';
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
    await apiFetch('/api/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, role })
    });

    window.location.href = '/login?registered=1';
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
    button.addEventListener('keydown', (event) => {
      const tabs = [...tabButtons];
      const currentIndex = tabs.indexOf(button);
      let nextIndex = currentIndex;
      if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = tabs.length - 1;
      else return;

      event.preventDefault();
      setAuthTab(tabs[nextIndex].dataset.tab);
      tabs[nextIndex].focus();
    });
  });

  loginForm.addEventListener('submit', handleLogin);
  registerForm.addEventListener('submit', handleRegister);
  document.getElementById('closeGameModal').addEventListener('click', closeGameModal);
  document.addEventListener('keydown', handleDialogKeydown);
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

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(items) {
  return items[randomInt(0, items.length - 1)];
}

function makeQuestion(prompt, answer, hint, explanation) {
  return { prompt, answer, hint, explanation };
}

const randomQuestionGenerators = {
  inteiros: {
    facil: [
      () => {
        const a = randomInt(2, 30);
        const b = randomInt(2, 30);
        return makeQuestion(`${a} + ${b} = ?`, a + b, 'Some as duas quantidades.', `${a} + ${b} = ${a + b}.`);
      },
      () => {
        const a = randomInt(10, 50);
        const b = randomInt(1, a);
        return makeQuestion(`${a} - ${b} = ?`, a - b, 'Retire a segunda quantidade da primeira.', `${a} - ${b} = ${a - b}.`);
      },
      () => {
        const a = randomInt(2, 12);
        const b = randomInt(2, 12);
        return makeQuestion(`${a} × ${b} = ?`, a * b, 'Multiplique os dois números.', `${a} × ${b} = ${a * b}.`);
      }
    ],
    medio: [
      () => {
        const a = randomInt(-35, 35);
        const b = randomInt(-35, 35);
        return makeQuestion(`${a} + (${b}) = ?`, a + b, 'Some os valores considerando seus sinais.', `${a} + (${b}) = ${a + b}.`);
      },
      () => {
        const a = randomInt(-30, 30);
        const b = randomInt(-30, 30);
        return makeQuestion(`${a} - (${b}) = ?`, a - b, 'Subtrair um número negativo equivale a somar seu oposto.', `${a} - (${b}) = ${a - b}.`);
      },
      () => {
        const a = randomInt(-12, 12) || 3;
        const b = randomInt(-12, 12) || -4;
        return makeQuestion(`(${a}) × (${b}) = ?`, a * b, 'Sinais iguais dão resultado positivo; sinais diferentes, negativo.', `(${a}) × (${b}) = ${a * b}.`);
      }
    ],
    dificil: [
      () => {
        const a = randomInt(-30, 30);
        const b = randomInt(-30, 30);
        const c = randomInt(-30, 30);
        return makeQuestion(`${a} + (${b}) - (${c}) = ?`, a + b - c, 'Resolva da esquerda para a direita, mantendo os sinais.', `${a} + (${b}) - (${c}) = ${a + b - c}.`);
      },
      () => {
        const a = randomInt(2, 12);
        const b = randomInt(-15, 15);
        const c = randomInt(-20, 20);
        return makeQuestion(`(${a}) × (${b}) + (${c}) = ?`, a * b + c, 'Faça a multiplicação antes da soma.', `${a} × (${b}) + (${c}) = ${a * b + c}.`);
      },
      () => {
        const divisor = randomInt(2, 12);
        const quotient = randomInt(-15, 15);
        const a = divisor * quotient;
        const b = randomInt(-20, 20);
        return makeQuestion(`${a} ÷ (${divisor}) - (${b}) = ?`, quotient - b, 'Faça a divisão primeiro e depois subtraia.', `${a} ÷ ${divisor} - (${b}) = ${quotient - b}.`);
      }
    ]
  },
  fracoes: {
    facil: [
      () => {
        const denominator = pickRandom([2, 4, 5, 10]);
        const numerator = randomInt(1, denominator);
        const groups = randomInt(2, 15);
        const total = denominator * groups;
        return makeQuestion(`Quanto é ${numerator}/${denominator} de ${total}?`, numerator * groups, 'Divida o total pelo denominador e multiplique pelo numerador.', `${numerator}/${denominator} de ${total} = ${total} ÷ ${denominator} × ${numerator} = ${numerator * groups}.`);
      },
      () => {
        const denominator = pickRandom([2, 3, 4, 5, 10]);
        const numerator = randomInt(1, denominator - 1);
        return makeQuestion(`Qual é o valor decimal de ${numerator}/${denominator}?`, numerator / denominator, 'Divida o numerador pelo denominador.', `${numerator} ÷ ${denominator} = ${Number((numerator / denominator).toFixed(4))}.`);
      },
      () => {
        const denominator = pickRandom([3, 4, 5, 6, 8, 10]);
        const numerator = randomInt(1, denominator - 1);
        const multiple = randomInt(2, 9);
        return makeQuestion(`Uma receita usa ${numerator}/${denominator} de xícara. Quanto usa para ${denominator * multiple} porções?`, numerator * multiple, 'Multiplique a quantidade por porção pelo número de porções.', `${numerator}/${denominator} × ${denominator * multiple} = ${numerator * multiple} xícaras.`);
      }
    ],
    medio: [
      () => {
        const denominator = pickRandom([2, 4, 5, 10]);
        const a = randomInt(1, denominator - 1);
        const b = randomInt(1, denominator - 1);
        const answer = Number((a / denominator + b / denominator).toFixed(4));
        return makeQuestion(`${a}/${denominator} + ${b}/${denominator} = ? (em decimal)`, answer, 'Como os denominadores são iguais, some os numeradores e divida pelo denominador.', `${a}/${denominator} + ${b}/${denominator} = ${a + b}/${denominator} = ${answer}.`);
      },
      () => {
        const denominator = pickRandom([3, 4, 5, 6, 8, 10]);
        const numerator = randomInt(2, denominator - 1);
        const groups = randomInt(3, 18);
        const total = denominator * groups;
        return makeQuestion(`Quanto é ${numerator}/${denominator} de ${total}?`, numerator * groups, 'Divida o total pelo denominador e multiplique pelo numerador.', `${total} ÷ ${denominator} × ${numerator} = ${numerator * groups}.`);
      },
      () => {
        const denominator = pickRandom([2, 3, 4, 5, 8, 10]);
        const numerator = randomInt(1, denominator - 1);
        const multiplier = randomInt(2, 12);
        return makeQuestion(`${numerator}/${denominator} × ${multiplier} = ? (em decimal)`, Number((numerator * multiplier / denominator).toFixed(6)), 'Multiplique o numerador pelo número inteiro e divida pelo denominador.', `${numerator}/${denominator} × ${multiplier} = ${Number((numerator * multiplier / denominator).toFixed(6))}.`);
      }
    ],
    dificil: [
      () => {
        const denominators = [2, 4, 5, 10];
        const d1 = pickRandom(denominators);
        const d2 = pickRandom(denominators);
        const n1 = randomInt(1, d1 - 1);
        const n2 = randomInt(1, d2 - 1);
        const answer = Number((n1 / d1 + n2 / d2).toFixed(4));
        return makeQuestion(`${n1}/${d1} + ${n2}/${d2} = ? (em decimal)`, answer, 'Converta as frações para decimal ou encontre um denominador comum.', `${n1}/${d1} + ${n2}/${d2} = ${answer}.`);
      },
      () => {
        const denominator = pickRandom([3, 4, 5, 6, 8, 10]);
        const numerator = randomInt(1, denominator - 1);
        const whole = randomInt(12, 80);
        const answer = Number((numerator * whole / denominator).toFixed(6));
        return makeQuestion(`Uma peça de ${whole} m foi dividida em ${denominator} partes iguais. Quantos metros correspondem a ${numerator} partes?`, answer, 'Calcule o tamanho de uma parte e multiplique pelo número de partes.', `${whole} ÷ ${denominator} × ${numerator} = ${answer} m.`);
      },
      () => {
        const denominator = pickRandom([2, 4, 5, 10]);
        const a = randomInt(1, denominator - 1);
        const b = randomInt(1, denominator - 1);
        const answer = Number((a / denominator - b / denominator).toFixed(4));
        return makeQuestion(`${a}/${denominator} - ${b}/${denominator} = ? (em decimal)`, answer, 'Subtraia os numeradores e divida pelo denominador comum.', `${a}/${denominator} - ${b}/${denominator} = ${a - b}/${denominator} = ${answer}.`);
      }
    ]
  },
  equacoes: {
    facil: [
      () => {
        const x = randomInt(1, 30);
        const a = randomInt(1, 20);
        return makeQuestion(`x + ${a} = ${x + a}. Qual é x?`, x, 'Subtraia o número conhecido dos dois lados.', `x = ${x + a} - ${a} = ${x}.`);
      },
      () => {
        const x = randomInt(1, 30);
        const a = randomInt(1, x);
        return makeQuestion(`x - ${a} = ${x - a}. Qual é x?`, x, 'Some o número subtraído aos dois lados.', `x = ${x - a} + ${a} = ${x}.`);
      },
      () => {
        const x = randomInt(2, 20);
        const a = randomInt(2, 10);
        return makeQuestion(`${a}x = ${a * x}. Qual é x?`, x, 'Divida os dois lados pelo coeficiente de x.', `x = ${a * x} ÷ ${a} = ${x}.`);
      }
    ],
    medio: [
      () => {
        const x = randomInt(2, 25);
        const a = randomInt(2, 9);
        const b = randomInt(1, 20);
        return makeQuestion(`${a}x + ${b} = ${a * x + b}. Qual é x?`, x, 'Isole o termo com x e divida pelo coeficiente.', `x = (${a * x + b} - ${b}) ÷ ${a} = ${x}.`);
      },
      () => {
        const x = randomInt(2, 30);
        const a = randomInt(2, 15);
        return makeQuestion(`${x} + ${a} = ${x + a}. Qual é o valor de x?`, x, 'Passe o termo conhecido para o outro lado subtraindo.', `x = ${x + a} - ${a} = ${x}.`);
      },
      () => {
        const x = randomInt(2, 20);
        const a = randomInt(2, 8);
        const b = randomInt(1, 12);
        return makeQuestion(`${a}(x - ${b}) = ${a * (x - b)}. Qual é x?`, x, 'Divida pelo coeficiente e depois some o valor subtraído.', `x - ${b} = ${x - b}, então x = ${x}.`);
      }
    ],
    dificil: [
      () => {
        const a = randomInt(2, 9);
        let c = randomInt(1, 9);
        while (c === a) c = randomInt(1, 9);
        const x = randomInt(1, 20);
        const b = randomInt(1, 20);
        const d = (a - c) * x + b;
        return makeQuestion(`${a}x + ${b} = ${c}x + ${d}. Qual é x?`, x, 'Agrupe os termos com x de um lado e os números do outro.', `${a - c}x = ${d - b}; x = ${x}.`);
      },
      () => {
        const a = randomInt(2, 9);
        const x = randomInt(2, 20);
        const b = randomInt(1, x - 1);
        return makeQuestion(`${a}(x - ${b}) = ${a * (x - b)}. Qual é x?`, x, 'Divida os dois lados pelo coeficiente e isole x.', `x - ${b} = ${x - b}; portanto, x = ${x}.`);
      },
      () => {
        const a = randomInt(2, 8);
        const x = randomInt(-10, 20);
        const b = randomInt(-15, 15);
        const result = a * x + b;
        return makeQuestion(`${a}x ${b < 0 ? '-' : '+'} ${Math.abs(b)} = ${result}. Qual é x?`, x, 'Isole o termo com x e divida pelo coeficiente.', `${a}x = ${result - b}; x = ${x}.`);
      }
    ]
  },
  geometria: {
    facil: [
      () => {
        const side = randomInt(2, 20);
        return makeQuestion(`Qual é a área de um quadrado de lado ${side} m?`, side * side, 'Área do quadrado = lado × lado.', `${side} × ${side} = ${side * side} m².`);
      },
      () => {
        const length = randomInt(3, 20);
        const width = randomInt(2, 15);
        return makeQuestion(`Qual é o perímetro de um retângulo de ${length} m por ${width} m?`, 2 * (length + width), 'Some os quatro lados, ou use 2 × (comprimento + largura).', `2 × (${length} + ${width}) = ${2 * (length + width)} m.`);
      },
      () => {
        const base = randomInt(2, 18);
        const height = randomInt(2, 18);
        return makeQuestion(`Qual é a área de um retângulo de base ${base} m e altura ${height} m?`, base * height, 'Área do retângulo = base × altura.', `${base} × ${height} = ${base * height} m².`);
      }
    ],
    medio: [
      () => {
        const base = randomInt(4, 24);
        const height = randomInt(3, 18);
        return makeQuestion(`Um terreno retangular mede ${base} m por ${height} m. Qual é sua área?`, base * height, 'Multiplique o comprimento pela largura.', `${base} × ${height} = ${base * height} m².`);
      },
      () => {
        const side = randomInt(4, 30);
        return makeQuestion(`Qual é o perímetro de um quadrado de lado ${side} cm?`, 4 * side, 'Um quadrado tem quatro lados iguais.', `4 × ${side} = ${4 * side} cm.`);
      },
      () => {
        const base = 2 * randomInt(3, 18);
        const height = randomInt(3, 20);
        return makeQuestion(`Qual é a área de um triângulo de base ${base} cm e altura ${height} cm?`, base * height / 2, 'Área do triângulo = base × altura ÷ 2.', `${base} × ${height} ÷ 2 = ${base * height / 2} cm².`);
      }
    ],
    dificil: [
      () => {
        const side = randomInt(5, 25);
        const extra = randomInt(2, 12);
        const width = side + extra;
        return makeQuestion(`Um retângulo tem perímetro ${2 * (side + width)} m e largura ${side} m. Qual é sua área?`, side * width, 'Use metade do perímetro para encontrar o outro lado.', `O outro lado mede ${width} m; área = ${side} × ${width} = ${side * width} m².`);
      },
      () => {
        const base = randomInt(4, 20);
        const height = randomInt(4, 20);
        const side = randomInt(3, 12);
        return makeQuestion(`Uma figura é formada por um retângulo ${base} × ${height} m e um quadrado de lado ${side} m. Qual é a área total?`, base * height + side * side, 'Calcule as duas áreas e depois some.', `${base} × ${height} + ${side}² = ${base * height} + ${side * side} = ${base * height + side * side} m².`);
      },
      () => {
        const perimeter = 4 * randomInt(4, 25);
        const side = perimeter / 4;
        return makeQuestion(`Um jardim quadrado tem perímetro ${perimeter} m. Qual é sua área?`, side * side, 'Divida o perímetro por 4 para encontrar o lado e eleve ao quadrado.', `Lado = ${perimeter} ÷ 4 = ${side}; área = ${side}² = ${side * side} m².`);
      }
    ]
  },
  financeiro: {
    facil: [
      () => {
        const amount = 10 * randomInt(5, 50);
        return makeQuestion(`Quanto é 10% de R$ ${amount}?`, amount / 10, 'Para encontrar 10%, divida o valor por 10.', `10% de R$ ${amount} = R$ ${amount / 10}.`);
      },
      () => {
        const price = randomInt(5, 80);
        const paid = price + randomInt(5, 50);
        return makeQuestion(`Um produto custa R$ ${price} e você paga com R$ ${paid}. Qual é o troco?`, paid - price, 'Subtraia o preço do valor pago.', `R$ ${paid} - R$ ${price} = R$ ${paid - price}.`);
      },
      () => {
        const amount = 2 * randomInt(10, 100);
        return makeQuestion(`Quanto é 50% de R$ ${amount}?`, amount / 2, '50% representa a metade.', `R$ ${amount} ÷ 2 = R$ ${amount / 2}.`);
      }
    ],
    medio: [
      () => {
        const amount = 4 * randomInt(10, 100);
        return makeQuestion(`Quanto é 25% de R$ ${amount}?`, amount / 4, '25% corresponde a um quarto do valor.', `R$ ${amount} ÷ 4 = R$ ${amount / 4}.`);
      },
      () => {
        const price = 10 * randomInt(10, 60);
        const percent = pickRandom([10, 20, 30]);
        const discount = price * percent / 100;
        return makeQuestion(`Um produto de R$ ${price} teve ${percent}% de desconto. Qual é o preço final?`, price - discount, 'Calcule o desconto e subtraia do preço original.', `Desconto = R$ ${discount}; preço final = R$ ${price - discount}.`);
      },
      () => {
        const quantity = randomInt(2, 9);
        const unitPrice = randomInt(4, 25);
        const paid = quantity * unitPrice + randomInt(5, 60);
        return makeQuestion(`${quantity} itens custam R$ ${unitPrice} cada. Quanto sobra de R$ ${paid}?`, paid - quantity * unitPrice, 'Multiplique o preço unitário pela quantidade e subtraia do valor pago.', `${paid} - ${quantity} × ${unitPrice} = R$ ${paid - quantity * unitPrice}.`);
      }
    ],
    dificil: [
      () => {
        const price = 20 * randomInt(10, 100);
        const percent = pickRandom([15, 20, 25, 30]);
        const discount = price * percent / 100;
        return makeQuestion(`Um produto de R$ ${price} recebe ${percent}% de desconto. Qual é o preço final?`, price - discount, 'Calcule a porcentagem de desconto e subtraia do preço inicial.', `Desconto = R$ ${discount}; preço final = R$ ${price - discount}.`);
      },
      () => {
        const price = 100 * randomInt(2, 20);
        const discountPercent = pickRandom([10, 20, 25]);
        const taxPercent = 10;
        const afterDiscount = price * (100 - discountPercent) / 100;
        const finalPrice = afterDiscount * (100 + taxPercent) / 100;
        return makeQuestion(`Um item de R$ ${price} tem ${discountPercent}% de desconto e depois recebe acréscimo de ${taxPercent}%. Qual é o preço final?`, finalPrice, 'Aplique o desconto primeiro; depois calcule o acréscimo sobre o novo preço.', `Após o desconto: R$ ${afterDiscount}. Com o acréscimo: R$ ${finalPrice}.`);
      },
      () => {
        const cost = 20 * randomInt(5, 40);
        const percent = pickRandom([10, 15, 20, 25, 30, 50]);
        const profit = cost * percent / 100;
        return makeQuestion(`Um produto custou R$ ${cost} e foi vendido por R$ ${cost + profit}. Qual foi o lucro percentual sobre o custo?`, percent, `Divida o lucro de R$ ${profit} pelo custo de R$ ${cost} e multiplique por 100.`, `(${profit} ÷ ${cost}) × 100 = ${percent}%.`);
      }
    ]
  },
  estatistica: {
    facil: [
      () => {
        const a = randomInt(1, 30);
        const b = randomInt(1, 30);
        return makeQuestion(`Qual é a média de ${a} e ${b}?`, (a + b) / 2, 'Some os valores e divida por 2.', `(${a} + ${b}) ÷ 2 = ${(a + b) / 2}.`);
      },
      () => {
        const a = randomInt(1, 15);
        const b = a + randomInt(1, 10);
        const c = b + randomInt(1, 10);
        return makeQuestion(`Qual é a mediana de ${a}, ${b} e ${c}?`, b, 'Com três valores ordenados, a mediana é o valor central.', `O valor central é ${b}.`);
      },
      () => {
        const mode = randomInt(1, 15);
        const a = mode + randomInt(1, 10);
        const b = mode - randomInt(1, mode);
        return makeQuestion(`Qual é a moda de ${a}, ${mode}, ${b}, ${mode}?`, mode, 'A moda é o valor que aparece mais vezes.', `${mode} aparece duas vezes; é a moda.`);
      }
    ],
    medio: [
      () => {
        const base = randomInt(2, 30);
        const step = randomInt(1, 8);
        const values = [base, base + step, base + 2 * step, base + 3 * step];
        return makeQuestion(`Qual é a média de ${values.join(', ')}?`, base + 1.5 * step, 'Some os quatro valores e divida por 4.', `(${values.join(' + ')}) ÷ 4 = ${base + 1.5 * step}.`);
      },
      () => {
        const mode = randomInt(2, 20);
        const values = [mode - 1, mode, mode + 2, mode, mode + 4].sort(() => Math.random() - 0.5);
        return makeQuestion(`Qual é a moda de ${values.join(', ')}?`, mode, 'Encontre o valor que aparece mais vezes.', `${mode} aparece duas vezes; é a moda.`);
      },
      () => {
        const a = randomInt(1, 20);
        const b = a + randomInt(2, 12);
        const c = b + randomInt(2, 12);
        const d = c + randomInt(2, 12);
        return makeQuestion(`Qual é a mediana de ${a}, ${b}, ${c} e ${d}?`, (b + c) / 2, 'Com quatro valores, tire a média dos dois valores centrais.', `(${b} + ${c}) ÷ 2 = ${(b + c) / 2}.`);
      }
    ],
    dificil: [
      () => {
        const center = randomInt(10, 50);
        const spread = randomInt(1, 12);
        const values = [center - 2 * spread, center - spread, center, center + spread, center + 2 * spread];
        return makeQuestion(`Qual é a média de ${values.join(', ')}?`, center, 'Some os cinco valores e divida por 5.', `A soma é ${center * 5}; ${center * 5} ÷ 5 = ${center}.`);
      },
      () => {
        const values = Array.from({ length: 6 }, () => randomInt(1, 50)).sort((a, b) => a - b);
        const answer = (values[2] + values[3]) / 2;
        return makeQuestion(`Qual é a mediana de ${values.join(', ')}?`, answer, 'Com seis valores ordenados, tire a média do 3º e do 4º.', `(${values[2]} + ${values[3]}) ÷ 2 = ${answer}.`);
      },
      () => {
        const mean = randomInt(5, 30);
        const a = randomInt(1, mean * 2);
        const b = randomInt(1, mean * 2);
        const x = 3 * mean - a - b;
        return makeQuestion(`A média de ${a}, ${b} e x é ${mean}. Qual é x?`, x, 'A soma total deve ser a média multiplicada por 3.', `${a} + ${b} + x = ${3 * mean}; x = ${x}.`);
      }
    ]
  },
  coordenadas: {
    facil: [
      () => {
        const x = randomInt(1, 20);
        const y = randomInt(1, 20);
        return makeQuestion(`No ponto (${x}, ${y}), qual é a coordenada x?`, x, 'A coordenada x é o primeiro número do par ordenado.', `No ponto (${x}, ${y}), x = ${x}.`);
      },
      () => {
        const x = randomInt(1, 20);
        const y = randomInt(1, 20);
        return makeQuestion(`No ponto (${x}, ${y}), qual é a coordenada y?`, y, 'A coordenada y é o segundo número do par ordenado.', `No ponto (${x}, ${y}), y = ${y}.`);
      },
      () => {
        const start = randomInt(1, 20);
        const distance = randomInt(1, 15);
        return makeQuestion(`Quantas unidades separam x = ${start} e x = ${start + distance}?`, distance, 'Subtraia a menor coordenada da maior.', `${start + distance} - ${start} = ${distance} unidades.`);
      }
    ],
    medio: [
      () => {
        const x = randomInt(-20, 20);
        const y = randomInt(-20, 20);
        return makeQuestion(`No ponto (${x}, ${y}), qual é a coordenada x?`, x, 'A coordenada x é o primeiro número do par ordenado.', `No ponto (${x}, ${y}), x = ${x}.`);
      },
      () => {
        const x = randomInt(-20, 20);
        const y = randomInt(-20, 20);
        return makeQuestion(`No ponto (${x}, ${y}), qual é a coordenada y?`, y, 'A coordenada y é o segundo número do par ordenado.', `No ponto (${x}, ${y}), y = ${y}.`);
      },
      () => {
        const start = randomInt(-15, 15);
        const distance = randomInt(2, 20);
        return makeQuestion(`De (${start}, 0) até (${start + distance}, 0), quantas unidades você anda na horizontal?`, distance, 'Calcule a diferença entre as coordenadas x.', `${start + distance} - (${start}) = ${distance} unidades.`);
      }
    ],
    dificil: [
      () => {
        const x1 = randomInt(-15, 15);
        const y1 = randomInt(-15, 15);
        const dx = randomInt(1, 15);
        const dy = randomInt(1, 15);
        return makeQuestion(`Qual é a distância entre (${x1}, ${y1}) e (${x1 + dx}, ${y1 + dy}) andando pelos eixos?`, dx + dy, 'Some as diferenças horizontal e vertical em valor absoluto.', `|${dx}| + |${dy}| = ${dx + dy} unidades.`);
      },
      () => {
        const x = randomInt(-20, 20);
        const y = randomInt(-20, 20);
        const dx = randomInt(-10, 10) || 3;
        const dy = randomInt(-10, 10) || -4;
        return makeQuestion(`O ponto (${x}, ${y}) anda ${dx} na horizontal e ${dy} na vertical. Qual é a soma x + y no novo ponto?`, x + dx + y + dy, 'Some o deslocamento horizontal a x e o vertical a y.', `Novo ponto: (${x + dx}, ${y + dy}); soma = ${x + dx + y + dy}.`);
      },
      () => {
        const x1 = randomInt(-20, 10);
        const distance = randomInt(2, 25);
        const x2 = x1 + distance;
        return makeQuestion(`Qual é a distância horizontal entre x = ${x1} e x = ${x2}?`, distance, 'Subtraia as coordenadas x e considere a distância positiva.', `|${x2} - (${x1})| = ${distance} unidades.`);
      }
    ]
  },
  potencia: {
    facil: [
      () => {
        const base = randomInt(2, 8);
        const exponent = randomInt(2, 3);
        return makeQuestion(`Quanto é ${base}^${exponent}?`, base ** exponent, 'Multiplique a base por ela mesma o número de vezes indicado pelo expoente.', `${base}^${exponent} = ${base ** exponent}.`);
      },
      () => {
        const root = randomInt(2, 15);
        return makeQuestion(`Qual é a raiz quadrada de ${root * root}?`, root, `Qual número multiplicado por ele mesmo resulta em ${root * root}?`, `√${root * root} = ${root}.`);
      },
      () => {
        const base = randomInt(2, 12);
        return makeQuestion(`Quanto é ${base}²?`, base * base, 'Eleve a base ao quadrado multiplicando-a por ela mesma.', `${base} × ${base} = ${base * base}.`);
      }
    ],
    medio: [
      () => {
        const base = randomInt(2, 5);
        const exponent = randomInt(3, 5);
        return makeQuestion(`Quanto é ${base}^${exponent}?`, base ** exponent, 'Multiplique a base por ela mesma o número de vezes indicado.', `${base}^${exponent} = ${base ** exponent}.`);
      },
      () => {
        const root = randomInt(3, 15);
        return makeQuestion(`Qual é a raiz quadrada de ${root * root}?`, root, `Procure o número que elevado ao quadrado resulta em ${root * root}.`, `√${root * root} = ${root}.`);
      },
      () => {
        const base = randomInt(2, 10);
        const root = randomInt(2, 12);
        return makeQuestion(`Quanto é ${base}² + √${root * root}?`, base * base + root, 'Calcule primeiro a potência e a raiz, depois some.', `${base * base} + ${root} = ${base * base + root}.`);
      }
    ],
    dificil: [
      () => {
        const base = randomInt(2, 5);
        const a = randomInt(2, 5);
        const b = randomInt(2, 5);
        return makeQuestion(`Quanto é ${base}^${a} × ${base}^${b}?`, base ** (a + b), 'Ao multiplicar potências de mesma base, some os expoentes.', `${base}^${a} × ${base}^${b} = ${base}^${a + b} = ${base ** (a + b)}.`);
      },
      () => {
        const root = randomInt(2, 10);
        return makeQuestion(`Qual é a raiz cúbica de ${root ** 3}?`, root, `Procure um número que multiplicado por si mesmo três vezes resulta em ${root ** 3}.`, `∛${root ** 3} = ${root}.`);
      },
      () => {
        const root = randomInt(2, 15);
        const base = randomInt(2, 5);
        const exponent = randomInt(2, 4);
        return makeQuestion(`Quanto é √${root * root} + ${base}^${exponent}?`, root + base ** exponent, 'Resolva a raiz e a potência antes de somar.', `${root} + ${base ** exponent} = ${root + base ** exponent}.`);
      }
    ]
  }
};

function generateRandomQuestions(config, difficulty, total = 10) {
  const generators = randomQuestionGenerators[config.key]?.[difficulty];
  if (!generators) {
    throw new Error(`Não há geradores para ${config.key} na dificuldade ${difficulty}.`);
  }

  const questions = [];
  const prompts = new Set();
  let attempts = 0;

  while (questions.length < total && attempts < total * 100) {
    attempts += 1;
    const question = pickRandom(generators)();
    if (!prompts.has(question.prompt)) {
      prompts.add(question.prompt);
      questions.push(question);
    }
  }

  if (questions.length !== total) {
    throw new Error(`Não foi possível gerar ${total} questões diferentes para ${config.key} (${difficulty}).`);
  }

  return questions;
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
        <h3 tabindex="-1">Escolha a dificuldade</h3>
        <p>Selecione um nível para começar. Cada rodada traz 10 questões aleatórias e diferentes.</p>
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

  gameArea.querySelector('h3').focus();
  gameArea.querySelectorAll('[data-difficulty]').forEach((button) => {
    button.addEventListener('click', () => startGame(config, button.dataset.difficulty));
  });
}

function startGame(config, difficulty) {
  if (!config.questions[difficulty]) {
    throw new Error(`Dificuldade inválida: ${difficulty}`);
  }
  const questions = generateRandomQuestions(config, difficulty);

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
        <h3 tabindex="-1">${question.prompt}</h3>
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
      <div id="gameFeedback" class="feedback-box hidden" role="status" aria-live="polite" aria-atomic="true"></div>
    </div>
  `;

  gameArea.querySelector('.question-box h3').focus();
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
