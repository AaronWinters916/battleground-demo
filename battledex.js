const grid = document.getElementById('grid');
const emptyMsg = document.getElementById('empty-msg');
const clearBtn = document.getElementById('clear-btn');

function render() {
  const fighters = getFighters();
  grid.replaceChildren();
  emptyMsg.hidden = fighters.length > 0;
  clearBtn.hidden = fighters.length === 0;

  fighters.forEach((f, i) => {
    const card = document.createElement('figure');
    card.className = 'card';

    const img = document.createElement('img');
    img.src = f.image;
    img.alt = f.label;

    const caption = document.createElement('figcaption');
    caption.textContent = f.label;

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'delete';
    del.textContent = 'Delete';
    del.addEventListener('click', () => {
      deleteFighter(i);
      render();
    });

    card.append(img, caption, del);
    grid.append(card);
  });
}

clearBtn.addEventListener('click', () => {
  if (confirm('Remove every saved fighter?')) {
    clearFighters();
    render();
  }
});

// "Back to last fight" only makes sense if a fight has been stored.
document.getElementById('back-link').hidden = !getLastFight();

render();
