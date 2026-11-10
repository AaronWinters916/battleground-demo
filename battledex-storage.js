// Shared localStorage helpers for index.html and battledex.html.
// BattleDex entries are { label, image } only: no fight/winner/reasoning data.
// The last fight is stored under a separate key so the BattleDex page can link back to it.
const BATTLEDEX_KEY = 'battleground.battledex';
const LAST_FIGHT_KEY = 'battleground.lastFight';

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// Returns true on success, false if storage is full/unavailable.
function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function getFighters() {
  const list = readJSON(BATTLEDEX_KEY, []);
  return Array.isArray(list) ? list : [];
}

// Saving a label that already exists replaces its image instead of duplicating it.
function saveFighter({ label, image }) {
  const list = getFighters().filter((f) => f.label !== label);
  list.push({ label, image });
  return writeJSON(BATTLEDEX_KEY, list);
}

function deleteFighter(index) {
  const list = getFighters();
  list.splice(index, 1);
  return writeJSON(BATTLEDEX_KEY, list);
}

function clearFighters() {
  try {
    localStorage.removeItem(BATTLEDEX_KEY);
    return true;
  } catch {
    return false;
  }
}

function setLastFight(fight) {
  return writeJSON(LAST_FIGHT_KEY, fight);
}

function getLastFight() {
  return readJSON(LAST_FIGHT_KEY, null);
}
