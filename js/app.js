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
  resultDialog: $('#result-dialog'), resultPanel: $('#result-panel'),
  resultKicker: $('#result-kicker'), resultLogo: $('#result-logo'),
  resultInitials: $('#result-initials'), resultName: $('#result-name'),
  resultRarity: $('#result-rarity'), closeResult: $('#close-result'),
  continueButton: $('#continue-button'), screenFlash: $('#screen-flash')
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
  elements.openCase.disabled = complete || state.isOpening;
  elements.openCase.querySelector('span').textContent = complete ? 'COLLECTION COMPLETE' : 'OPEN CASE';
  elements.caseMessage.textContent = complete
    ? 'COLLECTION COMPLETE · 50 / 50 UNLOCKED'
    : '1 CASE · 1 NEW DISCOVERY · NO DUPLICATES';
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
  sound.click();
  elements.caseShell.classList.add('is-shaking');
  elements.caseMessage.textContent = 'AUTHENTICATING CASE…';
  await wait(540);
  elements.caseShell.classList.remove('is-shaking');
  elements.caseShell.classList.add('is-unlocked');
  elements.caseMessage.textContent = 'LOCK RELEASED · DECRYPTING ARCHIVE…';
  await wait(580);
  await logosReady;

  elements.caseShell.hidden = true;
  elements.rouletteWrap.classList.add('is-visible');
  elements.rouletteWrap.setAttribute('aria-hidden', 'false');
  elements.rouletteStatus.textContent = 'SCANNING';
  await spinRoulette({
    viewport: elements.rouletteViewport,
    track: elements.rouletteTrack,
    winner,
    items: sites,
    reducedMotion,
    onTick: (progress) => {
      sound.tick(progress);
      if (progress > 0.75) elements.rouletteStatus.textContent = 'TARGET LOCKING';
    }
  });

  elements.rouletteStatus.textContent = 'TARGET ACQUIRED';
  elements.screenFlash.className = `screen-flash rarity-${winner.rarity} active`;
  sound.reveal(winner.rarity);
  await wait(500);
  state.unlockedSites.push(winner.id);
  storage.setUnlocked(state.unlockedSites);
  render(winner.id);
  showResult(winner);
  setOpening(false);
}

function showResult(winner) {
  elements.resultPanel.className = `result-panel rarity-${winner.rarity}`;
  elements.resultKicker.textContent = winner.rarity === 'mythic' ? 'MYTHIC DISCOVERY' : 'NEW DISCOVERY';
  setBrandMark(elements.resultPanel.querySelector('.result-mark'), winner);
  elements.resultName.textContent = winner.name;
  elements.resultRarity.textContent = RARITY_CONFIG[winner.rarity].label;
  elements.resultDialog.showModal();
  elements.continueButton.focus();
}

function closeResult() {
  elements.resultDialog.close();
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
