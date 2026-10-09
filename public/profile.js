const profileForm = document.getElementById('profileForm');
const displayNameInput = document.getElementById('profileDisplayName');
const pictureInput = document.getElementById('profilePictureInput');
const bannerInput = document.getElementById('profileBannerInput');
const previewImage = document.getElementById('profilePreviewImage');
const previewFallback = document.getElementById('profilePreviewFallback');
const bannerPreview = document.getElementById('profileBannerPreview');
const message = document.getElementById('profileMessage');
const removePictureButton = document.getElementById('removeProfilePicture');
const removeBannerButton = document.getElementById('removeProfileBanner');
const saveButton = document.getElementById('saveProfileButton');
const deleteAccountButton = document.getElementById('deleteAccountButton');
const deleteAccountMessage = document.getElementById('deleteAccountMessage');
const overviewTab = document.getElementById('profileOverviewTab');
const editTab = document.getElementById('profileEditTab');
const overview = document.getElementById('profileOverview');
const editor = document.getElementById('profileEditor');
let currentPicture = null;
let currentBanner = null;

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Não foi possível concluir a solicitação.');
  }
  return data;
}

function showMessage(text, type = '') {
  message.textContent = text;
  message.className = `profile-message${type ? ` ${type}` : ''}`;
}

function initialsFor(name) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => Array.from(part)[0]).join('').toUpperCase() || 'M';
}

function renderPreview() {
  const hasPicture = Boolean(currentPicture);
  previewImage.hidden = !hasPicture;
  if (hasPicture) previewImage.src = currentPicture;
  else previewImage.removeAttribute('src');
  previewFallback.hidden = hasPicture;
  previewFallback.textContent = initialsFor(displayNameInput.value);
  removePictureButton.hidden = !hasPicture;
  const hasBanner = Boolean(currentBanner);
  bannerPreview.hidden = !hasBanner;
  if (hasBanner) bannerPreview.src = currentBanner;
  else bannerPreview.removeAttribute('src');
  removeBannerButton.hidden = !hasBanner;
}

function setProfileTab(tab) {
  const showOverview = tab === 'overview';
  overview.hidden = !showOverview;
  editor.hidden = showOverview;
  overviewTab.classList.toggle('active', showOverview);
  overviewTab.setAttribute('aria-selected', String(showOverview));
  editTab.classList.toggle('active', !showOverview);
  editTab.setAttribute('aria-selected', String(!showOverview));
}

function renderProfileOverview(user, data) {
  const name = user.displayName || user.username;
  const initials = initialsFor(name);
  const avatar = document.getElementById('profileOverviewImage');
  const fallback = document.getElementById('profileOverviewFallback');
  document.getElementById('profileOverviewName').textContent = name;
  document.getElementById('profileUsername').textContent = `@${user.username}`;
  document.getElementById('profilePoints').textContent = Number(data.stats.totalScore).toLocaleString('pt-BR');
  document.getElementById('profileGames').textContent = Number(data.stats.totalGames).toLocaleString('pt-BR');
  document.getElementById('profileAverage').textContent = `${Math.round(data.stats.avgScore)}%`;

  const picture = user.profilePicture || null;
  avatar.hidden = !picture;
  if (picture) avatar.src = picture;
  else avatar.removeAttribute('src');
  fallback.hidden = Boolean(picture);
  fallback.textContent = initials;

  const banner = user.profileBanner || null;
  const overviewBannerImage = document.getElementById('profileOverviewBanner');
  overviewBannerImage.hidden = !banner;
  if (banner) overviewBannerImage.src = banner;
  else overviewBannerImage.removeAttribute('src');

  renderRecentAchievements(data.recentAchievements || []);
  renderRecentGames(data.recentGames || []);
}

function renderRecentAchievements(achievements) {
  const wall = document.getElementById('recentAchievements');
  wall.replaceChildren();
  if (!achievements.length) {
    const empty = document.createElement('p');
    empty.className = 'profile-empty-state';
    empty.textContent = 'Suas primeiras conquistas aparecerão aqui quando forem desbloqueadas.';
    wall.appendChild(empty);
    return;
  }

  for (const achievement of achievements) {
    const card = document.createElement('article');
    card.className = 'profile-achievement-card';
    const icon = document.createElement('span');
    icon.className = 'profile-achievement-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '★';
    const content = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = achievement.badge;
    const description = document.createElement('p');
    description.textContent = achievement.description;
    const date = document.createElement('time');
    date.dateTime = achievement.created_at;
    date.textContent = `Desbloqueada em ${new Date(achievement.created_at).toLocaleDateString('pt-BR')}`;
    content.append(title, description, date);
    card.append(icon, content);
    wall.appendChild(card);
  }
}

function renderRecentGames(games) {
  const list = document.getElementById('recentProfileGames');
  list.replaceChildren();
  if (!games.length) {
    const empty = document.createElement('p');
    empty.className = 'profile-empty-state';
    empty.textContent = 'Ainda não há partidas registradas. Escolha um jogo e comece sua jornada!';
    list.appendChild(empty);
    return;
  }

  const gameNames = {
    inteiros: 'Batalha dos Inteiros',
    fracoes: 'Poções de Frações',
    equacoes: 'Balança do Equilíbrio',
    geometria: 'Construtor de Cidades',
    financeiro: 'Desafio da Loja',
    estatistica: 'Detetives dos Dados',
    coordenadas: 'Missão no Plano',
    potencia: 'Batalha das Potências'
  };
  const difficultyNames = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };

  for (const game of games) {
    const item = document.createElement('article');
    item.className = 'profile-activity-item';
    const detail = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = gameNames[game.game] || game.game;
    const meta = document.createElement('p');
    const date = new Date(game.created_at).toLocaleDateString('pt-BR');
    meta.textContent = `${difficultyNames[game.difficulty] || ''} • ${date}`;
    const score = document.createElement('strong');
    score.textContent = `${game.score}%`;
    detail.append(title, meta);
    item.append(detail, score);
    list.appendChild(item);
  }
}

async function preparePicture(file, { maxWidth, maxHeight, maxBytes, label }) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    throw new Error(`Escolha uma imagem PNG, JPEG ou WebP para ${label}.`);
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('A imagem original deve ter no máximo 5 MB.');
  }

  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 40000000) {
      throw new Error('A imagem tem resolução muito alta. Escolha uma imagem menor.');
    }

    const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível preparar a imagem neste navegador.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    let blob;
    for (const quality of [0.82, 0.68, 0.54]) {
      blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error(`Não foi possível processar ${label}.`));
        }, 'image/jpeg', quality);
      });
      if (blob.size <= maxBytes) break;
    }
    if (blob.size > maxBytes) {
      throw new Error(`${label} otimizado deve ter no máximo ${Math.floor(maxBytes / 1024)} KB.`);
    }

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(reader.result));
      reader.addEventListener('error', () => reject(new Error('Não foi possível ler a foto selecionada.')));
      reader.readAsDataURL(blob);
    });
  } finally {
    bitmap.close();
  }
}

pictureInput.addEventListener('change', async () => {
  const file = pictureInput.files[0];
  if (!file) return;
  try {
    currentPicture = await preparePicture(file, {
      maxWidth: 256,
      maxHeight: 256,
      maxBytes: 200 * 1024,
      label: 'a foto de perfil'
    });
    renderPreview();
    showMessage('Foto pronta. Salve para aplicar as alterações.', 'success');
  } catch (error) {
    pictureInput.value = '';
    showMessage(error.message, 'error');
  }
});

bannerInput.addEventListener('change', async () => {
  const file = bannerInput.files[0];
  if (!file) return;
  try {
    currentBanner = await preparePicture(file, {
      maxWidth: 1400,
      maxHeight: 500,
      maxBytes: 400 * 1024,
      label: 'o banner'
    });
    renderPreview();
    showMessage('Banner pronto. Salve para aplicar as alterações.', 'success');
  } catch (error) {
    bannerInput.value = '';
    showMessage(error.message, 'error');
  }
});

displayNameInput.addEventListener('input', renderPreview);

removePictureButton.addEventListener('click', () => {
  currentPicture = null;
  pictureInput.value = '';
  renderPreview();
  showMessage('A foto será removida quando você salvar o perfil.');
});

removeBannerButton.addEventListener('click', () => {
  currentBanner = null;
  bannerInput.value = '';
  renderPreview();
  showMessage('O banner será removido quando você salvar o perfil.');
});

profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  saveButton.disabled = true;
  showMessage('Salvando perfil...');
  try {
    const { user } = await fetchJson('/api/profile', {
      method: 'PUT',
      body: JSON.stringify({
        displayName: displayNameInput.value,
        profilePicture: currentPicture,
        profileBanner: currentBanner
      })
    });
    const data = await fetchJson('/api/profile');
    renderProfileOverview(user, data);
    showMessage('Perfil salvo! O nome escolhido aparecerá na saudação da página inicial.', 'success');
  } catch (error) {
    showMessage(error.message, 'error');
  } finally {
    saveButton.disabled = false;
  }
});

async function loadProfile() {
  try {
    const data = await fetchJson('/api/profile');
    const user = data.user;
    displayNameInput.value = user.displayName || user.username;
    currentPicture = user.profilePicture || null;
    currentBanner = user.profileBanner || null;
    renderPreview();
    renderProfileOverview(user, data);
  } catch (error) {
    if (error.message === 'Autenticação necessária.') {
      window.location.replace('/login');
      return;
    }
    showMessage(error.message, 'error');
  }
}

overviewTab.addEventListener('click', () => setProfileTab('overview'));
editTab.addEventListener('click', () => setProfileTab('edit'));
[overviewTab, editTab].forEach((tab, index, tabs) => {
  tab.addEventListener('keydown', (event) => {
    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    else return;

    event.preventDefault();
    tabs[nextIndex].click();
    tabs[nextIndex].focus();
  });
});
deleteAccountButton.addEventListener('click', async () => {
  const confirmed = window.confirm(
    'Tem certeza que deseja excluir sua conta? Seu perfil, pontos, partidas e conquistas serão apagados permanentemente.'
  );
  if (!confirmed) return;

  deleteAccountButton.disabled = true;
  deleteAccountMessage.textContent = 'Excluindo sua conta...';
  deleteAccountMessage.className = 'profile-message';
  try {
    await fetchJson('/api/account', { method: 'DELETE' });
    window.location.replace('/login?accountDeleted=1');
  } catch (error) {
    deleteAccountMessage.textContent = error.message;
    deleteAccountMessage.className = 'profile-message error';
    deleteAccountButton.disabled = false;
  }
});
document.getElementById('editProfileShortcut').addEventListener('click', () => {
  setProfileTab('edit');
  displayNameInput.focus();
});
setProfileTab('overview');
loadProfile();
