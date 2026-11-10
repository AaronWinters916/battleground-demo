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

// Stage 5: saved images are downsized on an off-screen canvas and re-exported as
// compressed JPEG so many fighters fit in localStorage's ~5MB quota.
const SAVED_IMAGE_SIZE = 256; // longest side in px
const SAVED_IMAGE_QUALITY = 0.6;

function compressImage(dataUri, maxSize = SAVED_IMAGE_SIZE, quality = SAVED_IMAGE_QUALITY) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas'); // never attached to the DOM
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; // JPEG has no alpha
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Could not load image for compression'));
    img.src = dataUri;
  });
}

// Compresses the image, then saves. Saving a label that already exists replaces
// its image instead of duplicating it. Resolves true on success, false if
// compression failed or storage is full.
async function saveFighter({ label, image }) {
  let compressed;
  try {
    compressed = await compressImage(image);
  } catch {
    return false;
  }
  const list = getFighters().filter((f) => f.label !== label);
  list.push({ label, image: compressed });
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
