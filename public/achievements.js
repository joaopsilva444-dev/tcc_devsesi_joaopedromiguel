const achievementGrid = document.getElementById('achievementGrid');
const achievementFilter = document.getElementById('achievementFilter');
const achievementStatus = document.getElementById('achievementStatus');
let achievementData = [];

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function renderAchievements() {
  const filter = achievementFilter.value;
  const filteredAchievements = achievementData.filter((achievement) => {
    if (filter === 'desbloqueadas') return achievement.unlocked;
    if (filter === 'bloqueadas') return !achievement.unlocked;
    return true;
  });

  if (filteredAchievements.length === 0) {
    achievementGrid.innerHTML = '<p class="achievement-empty">Nenhuma conquista nesta categoria ainda.</p>';
    return;
  }

  achievementGrid.innerHTML = filteredAchievements.map((achievement) => {
    const status = achievement.unlocked ? 'Desbloqueada' : 'Bloqueada';
    const unlockedDate = achievement.unlockedAt
      ? `<span class="achievement-date">Conquistada em ${escapeHtml(new Date(achievement.unlockedAt).toLocaleDateString('pt-BR'))}</span>`
      : `<span class="achievement-requirement">${escapeHtml(achievement.requirement)}</span>`;

    return `
      <article class="achievement-card ${achievement.unlocked ? 'is-unlocked' : 'is-locked'}">
        <div class="achievement-card-top">
          <span class="achievement-icon" aria-hidden="true">${escapeHtml(achievement.icon)}</span>
          <span class="achievement-state">${status}</span>
        </div>
        <span class="achievement-category">${escapeHtml(achievement.category)}</span>
        <h3>${escapeHtml(achievement.badge)}</h3>
        <p>${escapeHtml(achievement.description)}</p>
        ${unlockedDate}
      </article>
    `;
  }).join('');
}

async function loadAchievements() {
  try {
    const response = await fetch('/api/achievements');
    if (response.status === 401) {
      window.location.replace('/login');
      return;
    }
    if (!response.ok) {
      throw new Error('Não foi possível carregar suas conquistas.');
    }

    const data = await response.json();
    achievementData = data.achievements;
    const unlockedCount = data.unlocked;
    const percentage = data.total === 0 ? 0 : Math.round((unlockedCount / data.total) * 100);

    document.getElementById('achievementProgressText').textContent =
      unlockedCount === data.total ? 'Você conquistou todas as medalhas!' : 'Continue jogando para completar sua coleção';
    document.getElementById('achievementProgressPercent').textContent = `${percentage}%`;
    document.getElementById('achievementProgressCount').textContent = `${unlockedCount} de ${data.total}`;
    document.getElementById('achievementProgressBar').style.width = `${percentage}%`;
    document.getElementById('achievementProgressTrack').setAttribute('aria-valuemax', data.total);
    document.getElementById('achievementProgressTrack').setAttribute('aria-valuenow', unlockedCount);
    document.getElementById('unlockedCount').textContent = unlockedCount;
    document.getElementById('lockedCount').textContent = data.total - unlockedCount;
    document.getElementById('categoryCount').textContent =
      new Set(data.achievements.map((achievement) => achievement.category)).size;

    achievementStatus.textContent = '';
    renderAchievements();
  } catch (error) {
    achievementStatus.textContent = error.message;
  }
}

achievementFilter.addEventListener('change', renderAchievements);
loadAchievements();
