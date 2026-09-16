import { sites, RARITY_CONFIG } from './data.js';
import { pickWinner } from './random.js';
import { storage } from './storage.js';
import { renderCollection } from './collection.js';
import { spinRoulette } from './roulette.js';
import { SoundManager } from './sound.js';
import { preloadLogos, setBrandMark } from './logo.js';
import { ParticleEngine } from './particles.js';
import { API_BASE_URL, GITHUB_REPO } from './config.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const isDebugMode = new URLSearchParams(location.search).get('debug') === 'true';
const validIds = new Set(sites.map(({ id }) => id));
const state = {
  isOpening: false,
  unlockedSites: storage.getUnlocked().filter((id) => validIds.has(id)),
  soundEnabled: storage.isSoundEnabled(),
  currentWinner: null
};
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sound = new SoundManager(state.soundEnabled);
let resultActionTimer = null;
let latestGlobalOpens = null;

function showGlobalOpens(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value < (latestGlobalOpens ?? 0)) return;
  latestGlobalOpens = value;
  if (elements.globalCounterVal) {
    elements.globalCounterVal.textContent = value.toLocaleString('vi-VN');
  }
}

const elements = {
  ageGate: $('#age-gate'), confirmAge: $('#confirm-age'), resetAge: $('#reset-age'),
  soundToggle: $('#sound-toggle'), openCase: $('#open-case'), caseShell: $('#case-shell'),
  rouletteWrap: $('#roulette-wrap'), rouletteViewport: $('#roulette-viewport'),
  rouletteTrack: $('#roulette-track'), rouletteStatus: $('#roulette-status'),
  caseMessage: $('#case-message'), collection: $('#collection'),
  collectionCount: $('#collection-count'), headerCount: $('#header-count'),
  progressBar: $('#progress-bar'), resetCollection: $('#reset-collection'),
  completionBadge: $('#completion-badge'),
  resultDialog: $('#result-dialog'), resultPanel: $('#result-panel'),
  resultKicker: $('#result-kicker'), resultLogo: $('#result-logo'),
  resultInitials: $('#result-initials'), resultName: $('#result-name'),
  resultRarity: $('#result-rarity'), closeResult: $('#close-result'),
  continueButton: $('#continue-button'), screenFlash: $('#screen-flash'),
  revealCanvas: $('#reveal-canvas'),
  globalCounterVal: $('#global-counter-val'),
  recentDrop: $('#recent-drop'),
  githubStars: $('#github-stars'),
  githubLink: $('#github-link'),
  gameShell: $('#game-shell'),
  screenButtons: $$('[data-screen-target]'),
  screenPanels: $$('[data-screen-panel]')
};

const particles = new ParticleEngine(elements.revealCanvas);
particles.setReducedMotion(reducedMotion);

function setActiveScreen(name) {
  if (state.isOpening || !elements.screenPanels.some((panel) => panel.dataset.screenPanel === name)) return;
  elements.gameShell.dataset.activeScreen = name;

  elements.screenPanels.forEach((panel) => {
    const active = panel.dataset.screenPanel === name;
    panel.classList.toggle('is-active', active);
    panel.setAttribute('aria-hidden', String(!active));
    panel.inert = !active;
  });

  elements.screenButtons.forEach((button) => {
    const active = button.dataset.screenTarget === name;
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  });
}

function updateSoundButton() {
  elements.soundToggle.textContent = `SOUND ${state.soundEnabled ? 'ON' : 'OFF'}`;
  elements.soundToggle.setAttribute('aria-pressed', String(state.soundEnabled));
}

function render(newId = null) {
  const count = state.unlockedSites.length;
  elements.collectionCount.textContent = `${count} / ${sites.length}`;
  elements.headerCount.textContent = `${count} / ${sites.length}`;
  elements.progressBar.style.width = `${(count / sites.length) * 100}%`;
  elements.progressBar.parentElement.setAttribute('aria-valuenow', String(count));
  elements.progressBar.parentElement.setAttribute('aria-valuemin', '0');
  elements.progressBar.parentElement.setAttribute('aria-valuemax', String(sites.length));
  elements.progressBar.parentElement.setAttribute('role', 'progressbar');
  renderCollection(elements.collection, sites, state.unlockedSites, newId);

  const complete = count === sites.length;
  elements.completionBadge.hidden = !complete;
  elements.openCase.disabled = complete || state.isOpening;
  elements.openCase.querySelector('span').textContent = complete ? 'COLLECTION COMPLETE' : 'ĐẬP QUẢ LỌ NGAY';
  elements.caseMessage.textContent = complete
    ? 'COLLECTION COMPLETE 50 / 50'
    : 'GIỜ KHÔNG LỌ THÌ KHI NÀO MỚI LỌ?';
}

function setOpening(opening) {
  state.isOpening = opening;
  elements.openCase.disabled = opening || state.unlockedSites.length === sites.length;
  document.body.classList.toggle('is-opening', opening);
  elements.screenButtons.forEach((button) => {
    button.disabled = opening;
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, reducedMotion ? Math.min(ms, 100) : ms));
}

function renderRecentDrop(drop) {
  if (!elements.recentDrop) return;
  if (!drop || !drop.name) {
    elements.recentDrop.classList.add('hidden');
    elements.recentDrop.innerHTML = '';
    return;
  }
  elements.recentDrop.classList.remove('hidden');
  elements.recentDrop.innerHTML = `Web vừa lọ: <img src="${drop.logo}" alt="" width="18" height="18"> <strong>${drop.name}</strong> · <span class="rarity-${drop.rarity}">${drop.rarity.toUpperCase()}</span>`;
}

function updateRecentDrop(winner) {
  const drop = {
    id: winner.id,
    name: winner.name,
    rarity: winner.rarity,
    logo: winner.logo
  };
  storage.setRecentDrop(drop);
  renderRecentDrop(drop);
}

async function fetchGlobalOpens() {
  if (!elements.globalCounterVal) return;
  if (!API_BASE_URL) {
    elements.globalCounterVal.textContent = '...';
    return;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/stats`);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    showGlobalOpens(data.totalOpens);
  } catch {
    if (latestGlobalOpens === null) elements.globalCounterVal.textContent = '...';
  }
}

async function recordGlobalOpen() {
  if (!API_BASE_URL) return;
  try {
    const res = await fetch(`${API_BASE_URL}/open-case`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) return;
    const data = await res.json();
    showGlobalOpens(data.totalOpens);
  } catch {
    // Non-blocking: failure does not affect local game
  }
}

async function fetchGitHubStars() {
  if (!elements.githubStars) return;
  let stars = null;

  try {
    if (API_BASE_URL) {
      const response = await fetch(`${API_BASE_URL}/github-stars`);
      if (response.ok) {
        const data = await response.json();
        if (Number.isInteger(data.stars) && data.stars >= 0) stars = data.stars;
      }
    }
  } catch {
    // The public GitHub API below remains available as a safe fallback.
  }

  if (stars === null) {
    try {
      const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`);
      if (response.ok) {
        const data = await response.json();
        if (Number.isInteger(data.stargazers_count) && data.stargazers_count >= 0) {
          stars = data.stargazers_count;
        }
      }
    } catch {
      // The compact outbound-link fallback is set below.
    }
  }

  elements.githubStars.textContent = stars === null ? '↗' : `★ ${stars}`;
}

export async function openCase(forcedWinner = null) {
  if (state.isOpening) return;
  const winner = forcedWinner ?? pickWinner(sites, state.unlockedSites);
  if (!winner) return render();
  state.currentWinner = winner;
  setOpening(true);
  if (!isDebugMode) {
    void recordGlobalOpen();
  }

  // Parallel preload logos & sound
  const logosReady = preloadLogos(sites);
  sound.unlock();
  await sound.ready();

  sound.press();
  sound.unlockCase();
  elements.caseShell.classList.add('is-shaking');
  elements.caseMessage.textContent = 'OPENING...';
  await wait(520);

  elements.caseShell.classList.remove('is-shaking');
  elements.caseShell.classList.add('is-unlocked');
  sound.openCase();
  elements.caseMessage.textContent = 'WEB ĐÃ MỞ. SẴN SÀNG LỌ...';
  await wait(700);
  await logosReady;

  elements.caseShell.hidden = true;
  elements.rouletteWrap.classList.add('is-visible');
  elements.rouletteWrap.setAttribute('aria-hidden', 'false');
  elements.rouletteStatus.textContent = 'ĐANG QUAY TAY...';

  await spinRoulette({
    viewport: elements.rouletteViewport,
    track: elements.rouletteTrack,
    winner,
    items: sites,
    reducedMotion,
    onTick: (progress) => {
      sound.tick(progress);
    }
  });

  elements.rouletteStatus.textContent = 'LỌ CỦA BẠN';
  sound.stop();

  // Pauses before reveal (Requirement 7)
  if (winner.rarity === 'rare') await wait(80);
  if (winner.rarity === 'epic') await wait(120);
  if (winner.rarity === 'legendary' || winner.rarity === 'mythic') {
    document.body.classList.add('is-anticipating-reveal');
  }
  if (winner.rarity === 'legendary') await wait(200);
  if (winner.rarity === 'mythic') await wait(300);

  elements.screenFlash.className = `screen-flash rarity-${winner.rarity} active`;
  sound.reveal(winner.rarity);

  await wait({ common: 80, uncommon: 140, rare: 220, epic: 300, legendary: 380, mythic: 480 }[winner.rarity]);

  if (!state.unlockedSites.includes(winner.id)) {
    state.unlockedSites.push(winner.id);
    storage.setUnlocked(state.unlockedSites);
  }

  // Update recent drop after the reveal
  updateRecentDrop(winner);

  render(winner.id);
  showResult(winner);
  setOpening(false);
}

function showResult(winner) {
  document.body.classList.remove('is-anticipating-reveal');
  elements.resultDialog.className = `result-dialog reveal-${winner.rarity}`;
  elements.resultPanel.className = `result-panel rarity-${winner.rarity}`;
  document.body.classList.add(`is-revealing-${winner.rarity}`);

  if (winner.rarity === 'epic' || winner.rarity === 'legendary' || winner.rarity === 'mythic') {
    elements.resultPanel.classList.add('screen-shake');
    setTimeout(() => elements.resultPanel?.classList.remove('screen-shake'), 450);
  }

  const headings = {
    epic: 'EPIC DISCOVERY',
    legendary: 'LEGENDARY DISCOVERY',
    mythic: 'MYTHIC DISCOVERY'
  };
  elements.resultKicker.textContent = headings[winner.rarity] || 'NEW DISCOVERY';

  setBrandMark(elements.resultPanel.querySelector('.result-mark'), winner);
  elements.resultName.textContent = winner.name;
  elements.resultRarity.textContent = RARITY_CONFIG[winner.rarity].label;

  elements.resultDialog.showModal();
  particles.explode(winner.rarity);
  const actionDelay = { epic: 400, legendary: 600, mythic: 800 }[winner.rarity] || 0;
  const cinematicReward = winner.rarity === 'legendary' || winner.rarity === 'mythic';
  elements.continueButton.disabled = actionDelay > 0;
  if (actionDelay) {
    (cinematicReward ? elements.resultPanel : elements.closeResult).focus();
    resultActionTimer = setTimeout(() => {
      elements.continueButton.disabled = false;
      resultActionTimer = null;
    }, reducedMotion ? 100 : actionDelay);
  } else {
    elements.continueButton.focus();
  }
}

function closeResult() {
  clearTimeout(resultActionTimer);
  resultActionTimer = null;
  elements.continueButton.disabled = false;
  particles.stop();
  elements.resultDialog.close();
  document.body.className = document.body.className.replace(/\bis-revealing-\S+/g, '').trim();
  elements.resultDialog.className = 'result-dialog';
  elements.screenFlash.className = 'screen-flash';
  elements.rouletteWrap.classList.remove('is-visible');
  elements.rouletteWrap.setAttribute('aria-hidden', 'true');
  elements.caseShell.hidden = false;
  elements.caseShell.classList.remove('is-unlocked');
  elements.openCase.focus();
}

// Event Listeners
elements.confirmAge.addEventListener('click', () => {
  storage.confirmAge();
  document.documentElement.classList.add('age-confirmed');
  elements.ageGate.classList.add('is-dismissed');
  document.body.classList.remove('age-locked');
  sound.unlock();
  elements.openCase.focus();
});

elements.soundToggle.addEventListener('click', () => {
  state.soundEnabled = !state.soundEnabled;
  storage.setSoundEnabled(state.soundEnabled);
  sound.setEnabled(state.soundEnabled);
  if (state.soundEnabled) sound.unlock();
  updateSoundButton();
});

elements.openCase.addEventListener('click', () => openCase());

elements.screenButtons.forEach((button, index) => {
  button.addEventListener('click', () => setActiveScreen(button.dataset.screenTarget));
  button.addEventListener('keydown', (event) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    let nextIndex = index;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + elements.screenButtons.length) % elements.screenButtons.length;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % elements.screenButtons.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = elements.screenButtons.length - 1;
    const next = elements.screenButtons[nextIndex];
    setActiveScreen(next.dataset.screenTarget);
    next.focus();
  });
});

document.querySelectorAll('button, a').forEach((control) => {
  control.addEventListener('pointerenter', () => sound.hover());
});

elements.closeResult.addEventListener('click', closeResult);
elements.continueButton.addEventListener('click', closeResult);
elements.resultDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  if (state.currentWinner?.rarity === 'legendary' || state.currentWinner?.rarity === 'mythic') return;
  closeResult();
});

elements.resetCollection.addEventListener('click', () => {
  if (!confirm('Bạn có chắc muốn LỌ LẠI TỪ ĐẦU?')) return;
  storage.resetCollection();
  state.unlockedSites = [];
  renderRecentDrop(null);
  render();
  setActiveScreen('case');
});

elements.resetAge.addEventListener('click', () => {
  storage.resetAge();
  document.documentElement.classList.remove('age-confirmed');
  elements.ageGate.classList.remove('is-dismissed');
  document.body.classList.add('age-locked');
  elements.confirmAge.focus();
});

// Initialization
if (storage.isAgeConfirmed()) {
  elements.ageGate.classList.add('is-dismissed');
  sound.unlock();
} else {
  document.body.classList.add('age-locked');
  elements.confirmAge.focus();
}

updateSoundButton();
setActiveScreen('case');
render();
renderRecentDrop(storage.getRecentDrop());
fetchGlobalOpens();
fetchGitHubStars();

// --- Debug Panel ---
(function initDebug() {
  if (!isDebugMode) return;

  const panel = document.createElement('div');
  panel.className = 'debug-panel';

  const title = document.createElement('div');
  title.className = 'debug-panel-title';
  title.textContent = 'DEBUG MODE';
  panel.appendChild(title);

  const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

  rarities.forEach((r) => {
    const btn = document.createElement('button');
    btn.textContent = r.toUpperCase();
    btn.addEventListener('click', () => {
      // Find a candidate in that rarity (prioritize non-unlocked, otherwise any in rarity)
      let candidates = sites.filter((s) => s.rarity === r && !state.unlockedSites.includes(s.id));
      if (candidates.length === 0) {
        candidates = sites.filter((s) => s.rarity === r);
      }
      if (candidates.length > 0) {
        const forced = candidates[Math.floor(Math.random() * candidates.length)];
        openCase(forced);
      }
    });
    panel.appendChild(btn);
  });

  const soundBtn = document.createElement('button');
  soundBtn.textContent = 'TEST SOUND';
  soundBtn.addEventListener('click', () => {
    sound.unlock();
    sound.reveal('legendary');
  });
  panel.appendChild(soundBtn);

  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'RESET DATA';
  resetBtn.style.borderColor = '#ff456d';
  resetBtn.style.color = '#ff456d';
  resetBtn.addEventListener('click', () => {
    storage.resetCollection();
    storage.resetAge();
    history.go(0);
  });
  panel.appendChild(resetBtn);

  document.body.appendChild(panel);
})();
