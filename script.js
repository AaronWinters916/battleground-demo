const VIEWS = ['form', 'loading', 'result', 'error'];

// Only one view visible at a time.
function showView(name) {
  for (const v of VIEWS) {
    document.getElementById(`view-${v}`).hidden = v !== name;
  }
}

function setSaveButton(id, label, image) {
  const btn = document.getElementById(id);
  btn.disabled = false;
  btn.textContent = 'Save to BattleDex';
  btn.onclick = async () => {
    btn.disabled = true;
    const ok = await saveFighter({ label, image });
    btn.textContent = ok ? 'Saved!' : 'Could not save (storage full?)';
    btn.disabled = ok;
  };
}

function showResult({ winner, reasoning, imageA, imageB }, fighterA, fighterB) {
  setSaveButton('save-a', fighterA, imageA);
  setSaveButton('save-b', fighterB, imageB);
  document.getElementById('result-winner').textContent = winner;
  document.getElementById('result-reasoning').textContent = reasoning;
  document.getElementById('image-a').src = imageA;
  document.getElementById('image-b').src = imageB;
  document.getElementById('label-a').textContent = fighterA;
  document.getElementById('label-b').textContent = fighterB;
  showView('result');
}

function showError(message) {
  document.getElementById('error-message').textContent = message;
  showView('error');
}

// Fight must finish within 60s (project-brief.md §7); abort and show an error otherwise.
const FIGHT_TIMEOUT_MS = 60 * 1000;

async function runFight(fighterA, fighterB) {
  showView('loading');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FIGHT_TIMEOUT_MS);
  try {
    const res = await fetch('/api/fight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fighterA, fighterB }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showError(data.error || 'The arena hit an unexpected snag. Give it another go.');
      return;
    }
    setLastFight({ fighterA, fighterB, ...data });
    showResult(data, fighterA, fighterB);
  } catch (err) {
    if (err.name === 'AbortError') {
      showError('This fight ran way past the final bell! Try again in a moment.');
    } else {
      showError("Can't reach the arena. Check your connection and try again.");
    }
  } finally {
    clearTimeout(timer);
  }
}

document.getElementById('fight-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const a = document.getElementById('fighter-a').value.trim();
  const b = document.getElementById('fighter-b').value.trim();
  if (!a || !b) return;
  runFight(a, b);
});

document.getElementById('again-btn').addEventListener('click', () => showView('form'));
document.getElementById('retry-btn').addEventListener('click', () => showView('form'));

// Coming back from the BattleDex: ?view=result restores the last fight.
const last = new URLSearchParams(location.search).get('view') === 'result' ? getLastFight() : null;
if (last) {
  showResult(last, last.fighterA, last.fighterB);
} else {
  showView('form');
}
