const VIEWS = ['form', 'loading', 'result', 'error'];

// Only one view visible at a time.
function showView(name) {
  for (const v of VIEWS) {
    document.getElementById(`view-${v}`).hidden = v !== name;
  }
}

function showResult({ winner, reasoning, imageA, imageB }, fighterA, fighterB) {
  document.getElementById('result-winner').textContent = winner;
  document.getElementById('result-reasoning').textContent = reasoning;
  document.getElementById('image-a').src = imageA;
  document.getElementById('image-b').src = imageB;
  document.getElementById('label-a').textContent = fighterA;
  document.getElementById('label-b').textContent = fighterB;
  showView('result');
}

// Stage 1: fake data + timeout. Replaced by fetch('/api/fight') in Stage 3.
function runFight(fighterA, fighterB) {
  showView('loading');
  setTimeout(() => {
    showResult({
      winner: fighterA,
      reasoning: 'Placeholder reasoning: this verdict is fake until the API is wired up.',
      imageA: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="%23457b9d"/></svg>',
      imageB: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="%232a9d8f"/></svg>',
    }, fighterA, fighterB);
  }, 1500);
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

showView('form');
