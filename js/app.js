import { sites, RARITY_CONFIG } from './data.js';
import { pickWinner } from './random.js';
import { storage } from './storage.js';
import { renderCollection } from './collection.js';
import { spinRoulette } from './roulette.js';
import { SoundManager } from './sound.js';
import { preloadLogos, setBrandMark } from './logo.js';

const $ = (selector) => document.querySelector(selector);
const validIds = new Set(sites.map(({ id }) => id));
const state = {
  isOpening: false,
  unlockedSites: storage.getUnlocked().filter((id) => validIds.has(id)),
  soundEnabled: storage.isSoundEnabled(),
  currentWinner: null
};
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sound = new SoundManager(state.soundEnabled);

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
  resultParticles: $('#result-particles')
};

function updateSoundButton() {
  elements.soundToggle.textContent = `SOUND ${state.soundEnabled ? 'ON' : 'OFF'}`;
  elements.soundToggle.setAttribute('aria-pressed', String(state.soundEnabled));
}

function render(newId = null) {
  const count = state.unlockedSites.length;
  elements.collectionCount.textContent = `${count} / ${sites.length}`;
  elements.headerCount.textContent = `${count} / ${sites.length}`;
  elements.progressBar.style.width = `${count / sites.length * 100}%`;
  elements.progressBar.parentElement.setAttribute('aria-valuenow', String(count));
  elements.progressBar.parentElement.setAttribute('aria-valuemin', '0');
  elements.progressBar.parentElement.setAttribute('aria-valuemax', String(sites.length));
  elements.progressBar.parentElement.setAttribute('role', 'progressbar');
  renderCollection(elements.collection, sites, state.unlockedSites, newId);

  const complete = count === sites.length;
  elements.completionBadge.hidden = !complete;
  elements.openCase.disabled = complete || state.isOpening;
  elements.openCase.querySelector('span').textContent = complete ? 'COLLECTION COMPLETE' : 'MỞ HÒM';
  elements.caseMessage.textContent = complete
    ? 'COLLECTION COMPLETE · 50 / 50'
    : '1 HÒM · 1 BRAND MỚI · KHÔNG TRÙNG';
}

function setOpening(opening) {
  state.isOpening = opening;
  elements.openCase.disabled = opening || state.unlockedSites.length === sites.length;
  document.body.classList.toggle('is-opening', opening);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, reducedMotion ? Math.min(ms, 120) : ms));
}

async function openCase() {
  if (state.isOpening) return;
  const winner = pickWinner(sites, state.unlockedSites);
  if (!winner) return render();
  state.currentWinner = winner;
  setOpening(true);
  const logosReady = preloadLogos(sites);
  sound.unlock();
  sound.press();
  sound.unlockCase();
  elements.caseShell.classList.add('is-shaking');
  elements.caseMessage.textContent = 'OPENING...';
  await wait(540);
  elements.caseShell.classList.remove('is-shaking');
  elements.caseShell.classList.add('is-unlocked');
  sound.openCase();
  elements.caseMessage.textContent = 'HÒM ĐÃ MỞ · GET READY...';
  await wait(720);
  await logosReady;

  elements.caseShell.hidden = true;
  elements.rouletteWrap.classList.add('is-visible');
  elements.rouletteWrap.setAttribute('aria-hidden', 'false');
  elements.rouletteStatus.textContent = 'ROLLING...';
  await spinRoulette({
    viewport: elements.rouletteViewport,
    track: elements.rouletteTrack,
    winner,
    items: sites,
    reducedMotion,
    onTick: (progress) => {
      sound.tick(progress);
      if (progress > 0.75) elements.rouletteStatus.textContent = 'SLOWING DOWN...';
    }
  });

  elements.rouletteStatus.textContent = 'YOU GOT';
  sound.stop();
  if (winner.rarity === 'epic') await wait(100);
  if (winner.rarity === 'legendary' || winner.rarity === 'mythic') {
    document.body.classList.add('is-anticipating-reveal');
  }
  if (winner.rarity === 'legendary') await wait(150);
  if (winner.rarity === 'mythic') await wait(250);
  elements.screenFlash.className = `screen-flash rarity-${winner.rarity} active`;
  sound.reveal(winner.rarity);
  await wait({ common: 80, uncommon: 140, rare: 240, epic: 340, legendary: 420, mythic: 520 }[winner.rarity]);
  state.unlockedSites.push(winner.id);
  storage.setUnlocked(state.unlockedSites);
  render(winner.id);
  showResult(winner);
  setOpening(false);
}

function showResult(winner) {
  document.body.classList.remove('is-anticipating-reveal');
  elements.resultDialog.className = `result-dialog reveal-${winner.rarity}`;
  elements.resultPanel.className = `result-panel rarity-${winner.rarity}`;
  document.body.classList.add(`is-revealing-${winner.rarity}`);
  const headings = { legendary: 'LEGENDARY DISCOVERY', mythic: 'MYTHIC DISCOVERY' };
  elements.resultKicker.textContent = headings[winner.rarity] || 'NEW DISCOVERY';
  const particleCount = { common: 0, uncommon: 4, rare: 8, epic: 12, legendary: 20, mythic: 28 }[winner.rarity];
  elements.resultParticles.innerHTML = Array.from({ length: particleCount }, (_, index) =>
    `<i style="--i:${index};--x:${(index * 47) % 100}%;--d:${(index % 7) * 70}ms"></i>`).join('');
  setBrandMark(elements.resultPanel.querySelector('.result-mark'), winner);
  elements.resultName.textContent = winner.name;
  elements.resultRarity.textContent = RARITY_CONFIG[winner.rarity].label;
  elements.resultDialog.showModal();
  elements.continueButton.focus();
}

function closeResult() {
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
elements.openCase.addEventListener('click', openCase);
document.querySelectorAll('button, a').forEach((control) => {
  control.addEventListener('pointerenter', () => sound.hover());
});
elements.closeResult.addEventListener('click', closeResult);
elements.continueButton.addEventListener('click', closeResult);
elements.resultDialog.addEventListener('cancel', (event) => { event.preventDefault(); closeResult(); });
elements.resetCollection.addEventListener('click', () => {
  if (!confirm('Bạn có chắc muốn reset toàn bộ collection?')) return;
  storage.resetCollection();
  state.unlockedSites = [];
  render();
  scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
});
elements.resetAge.addEventListener('click', () => {
  storage.resetAge();
  document.documentElement.classList.remove('age-confirmed');
  elements.ageGate.classList.remove('is-dismissed');
  document.body.classList.add('age-locked');
  elements.confirmAge.focus();
});

if (storage.isAgeConfirmed()) {
  elements.ageGate.classList.add('is-dismissed');
} else {
  document.body.classList.add('age-locked');
  elements.confirmAge.focus();
}
updateSoundButton();
render();

// --- Debug Panel ---
(function initDebug() {
  const params = new URLSearchParams(location.search);
  if (params.get('debug') !== 'true') return;

  const panel = document.createElement('div');
  panel.className = 'debug-panel';
  const title = document.createElement('div');
  title.className = 'debug-panel-title';
  title.textContent = 'DEBUG';
  panel.appendChild(title);

  const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
  let forceRarity = null;

  rarities.forEach((r) => {
    const btn = document.createElement('button');
    btn.textContent = r.toUpperCase();
    btn.addEventListener('click', () => {
      // Force a specific rarity
      const candidates = sites.filter((s) => s.rarity === r && !state.unlockedSites.includes(s.id));
      if (candidates.length === 0) {
        btn.textContent = `${r.toUpperCase()} (EMPTY)`;
        return;
      }
      // Override pickWinner temporarily
      const origPick = window.__debugForceItem;
      window.__debugForceItem = candidates[Math.floor(Math.random() * candidates.length)];
      openCase();
    });
    panel.appendChild(btn);
  });

  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'RESET DATA';
  resetBtn.style.borderColor = '#ff456d';
  resetBtn.style.color = '#ff456d';
  resetBtn.addEventListener('click', () => {
    storage.resetCollection();
    storage.resetAge();
    location.reload();
  });
  panel.appendChild(resetBtn);

  document.body.appendChild(panel);

  // Monkey-patch pickWinner for debug mode
  const origOpenCase = openCase;
  const patchedOpenCase = async function() {
    if (window.__debugForceItem) {
      if (state.isOpening) return;
      const winner = window.__debugForceItem;
      window.__debugForceItem = null;
      state.currentWinner = winner;
      setOpening(true);
      const logosReady = preloadLogos(sites);
      sound.unlock();
      sound.press();
      sound.unlockCase();
      elements.caseShell.classList.add('is-shaking');
      elements.caseMessage.textContent = 'OPENING...';
      await wait(540);
      elements.caseShell.classList.remove('is-shaking');
      elements.caseShell.classList.add('is-unlocked');
      sound.openCase();
      elements.caseMessage.textContent = 'HÒM ĐÃ MỞ · GET READY...';
      await wait(720);
      await logosReady;

      elements.caseShell.hidden = true;
      elements.rouletteWrap.classList.add('is-visible');
      elements.rouletteWrap.setAttribute('aria-hidden', 'false');
      elements.rouletteStatus.textContent = 'ROLLING...';
      await spinRoulette({
        viewport: elements.rouletteViewport,
        track: elements.rouletteTrack,
        winner,
        items: sites,
        reducedMotion,
        onTick: (progress) => {
          sound.tick(progress);
          if (progress > 0.75) elements.rouletteStatus.textContent = 'SLOWING DOWN...';
        }
      });

      elements.rouletteStatus.textContent = 'YOU GOT';
      sound.stop();
      if (winner.rarity === 'epic') await wait(100);
      if (winner.rarity === 'legendary' || winner.rarity === 'mythic') {
        document.body.classList.add('is-anticipating-reveal');
      }
      if (winner.rarity === 'legendary') await wait(150);
      if (winner.rarity === 'mythic') await wait(250);
      elements.screenFlash.className = `screen-flash rarity-${winner.rarity} active`;
      sound.reveal(winner.rarity);
      await wait({ common: 80, uncommon: 140, rare: 240, epic: 340, legendary: 420, mythic: 520 }[winner.rarity]);
      state.unlockedSites.push(winner.id);
      storage.setUnlocked(state.unlockedSites);
      render(winner.id);
      showResult(winner);
      setOpening(false);
    } else {
      return origOpenCase();
    }
  };
  // Replace the click handler
  elements.openCase.removeEventListener('click', openCase);
  elements.openCase.addEventListener('click', patchedOpenCase);
})();
