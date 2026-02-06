const gameArea = document.getElementById('game-area');
const imageInput = document.getElementById('imageInput');
const cutButton = document.getElementById('cutButton');

const winPopup = document.getElementById('win-popup');
const replayButton = document.getElementById('win-button');
const cancelButton = document.getElementById('cancel-button');

const errorPopup = document.getElementById('error-popup');
const errorOkButton = document.getElementById('error-ok-button');

const pauseButton = document.getElementById('pauseButton');
const pauseOverlay = document.getElementById('pauseOverlay');
const resumeButton = document.getElementById('resumeButton');

const snapSound = document.getElementById('snapSound');


let isPaused = false;
let elapsedTimeBeforePause = 0;

let zIndexCounter = 1;
let edgeMap = {};
let loadedImage = null;
let gameWon = false;

let rows = 4;
let cols = 4;
let pieceWidth = 100;
let pieceHeight = 100;
let cancelled = false;
let imageURL = null;
let pieces = [];

let timerInterval = null;
let startTime = null;
let timerStarted = false;

const timerDisplay = document.getElementById('timer');

imageInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      imageURL = evt.target.result;
    };
    reader.readAsDataURL(file);
  }
});

replayButton.addEventListener('click', () => {
  winPopup.classList.add('hidden');
  gameWon=false;
  timerStarted = false;
  startTime = null;
  timerDisplay.textContent = 'Temps : 00:00';
  cancelled = false;
  createPuzzle(imageURL);
});

cancelButton.addEventListener('click', () => {
  winPopup.classList.add('hidden');
  cancelled = true;
});

cutButton.addEventListener('click', () => {
  if (!imageURL) {
    errorPopup.classList.remove('hidden');
    return;
  }
  rows = parseInt(document.getElementById('rows').value) || 2;
  cols = parseInt(document.getElementById('cols').value) || 2;
  timerStarted = false;
  startTime = null;
  elapsedTimeBeforePause = 0;
  isPaused = false;
  timerDisplay.textContent = 'Temps : 00:00';
  cancelled = false;
  createPuzzle(imageURL);
});

errorOkButton.addEventListener('click', () => {
  errorPopup.classList.add('hidden');
});

pauseButton.addEventListener('click', () => {
  if (!isPaused) {
    pauseGame();
  }
});

resumeButton.addEventListener('click', () => {
  resumeGame();
});

function pauseGame() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  timerStarted = false;
  isPaused = true;
  elapsedTimeBeforePause = Date.now() - startTime;
  pauseOverlay.classList.remove('hidden');

  // Désactive le drag des pièces
  pieces.forEach(piece => {
    piece.style.pointerEvents = 'none';
  });
}

function resumeGame() {
  if (isPaused) {
    startTime = Date.now() - elapsedTimeBeforePause;
    
    isPaused = false;
    pauseOverlay.classList.add('hidden');

    // Réactive le drag des pièces
    pieces.forEach(piece => {
      piece.style.pointerEvents = 'auto';
    });
	startTimer();
  }
}

function startTimer() {
  if (timerStarted || gameWon || isPaused) return;
  timerStarted = true;
   if (!startTime) { 
     startTime = Date.now();
   } else {
     startTime = Date.now() - elapsedTimeBeforePause;
   }

  timerInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);

    timerDisplay.textContent = `Temps : ${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
  }, 1000);
}


function stopTimer() {
  if(timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  timerStarted = false;
  
  // Sauvegarder le temps écoulé au moment de la pause
  if (startTime) {
    elapsedTimeBeforePause = Date.now() - startTime;
  }
}

function createPuzzle(imgSrc) {
  gameWon=false;
  gameArea.querySelectorAll('.piece').forEach(p => p.remove());
  pieces = [];
  edgeMap = {};

  loadedImage = new Image();
  loadedImage.src = imgSrc;

  loadedImage.onload = () => {
    const img = loadedImage;

    const imgWidth = img.width;
    const imgHeight = img.height;

    pieceWidth = imgWidth / cols;
    pieceHeight = imgHeight / rows;

    const tabSizeX = pieceWidth / 4;
    const tabSizeY = pieceHeight / 4;
    const canvasWidth = pieceWidth + tabSizeX * 2;
    const canvasHeight = pieceHeight + tabSizeY * 2;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const key = `${x},${y}`;
        const top = y === 0 ? 0 : -edgeMap[`${x},${y - 1}`].bottom;
        const left = x === 0 ? 0 : -edgeMap[`${x - 1},${y}`].right;
        const bottom = y === rows - 1 ? 0 : Math.random() < 0.5 ? 1 : -1;
        const right = x === cols - 1 ? 0 : Math.random() < 0.5 ? 1 : -1;

        edgeMap[key] = { top, right, bottom, left };

        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        canvas.classList.add('piece');
        canvas.dataset.gridX = x;
        canvas.dataset.gridY = y;
        canvas.connected = new Set();

        const ctx = canvas.getContext('2d');

        // Dessin de la pièce
        ctx.save();
        drawPuzzlePiece(ctx, tabSizeX, tabSizeY, pieceWidth, pieceHeight, top, right, bottom, left);

        // Portion d’image dessinée avec décalage
        ctx.drawImage(
          img,
          x * pieceWidth - tabSizeX,
          y * pieceHeight - tabSizeY,
          canvasWidth,
          canvasHeight,
          0,
          0,
          canvasWidth,
          canvasHeight
        );

        ctx.restore();

        // Position aléatoire
        const randX = Math.random() * (gameArea.clientWidth - canvasWidth);
        const randY = Math.random() * (gameArea.clientHeight - canvasHeight);
        canvas.style.position = 'absolute';
        canvas.style.left = `${randX}px`;
        canvas.style.top = `${randY}px`;

        makeDraggable(canvas);
		gameArea.appendChild(canvas);
		pieces.push(canvas);

		drawPiece(canvas, img, x, y, edgeMap[key], true);
      }
    }
  };
}

function drawPiece(canvas, img, gridX, gridY, edge, withShadow = false) {
  const ctx = canvas.getContext('2d');

  const tabSizeX = pieceWidth / 4;
  const tabSizeY = pieceHeight / 4;
  const canvasW = pieceWidth + tabSizeX * 2;
  const canvasH = pieceHeight + tabSizeY * 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1) Dessine l'image découpée
  ctx.save();
  ctx.beginPath();
  drawPuzzlePiece(ctx, tabSizeX, tabSizeY, pieceWidth, pieceHeight, edge.top, edge.right, edge.bottom, edge.left);
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(
    img,
    gridX * pieceWidth - tabSizeX,
    gridY * pieceHeight - tabSizeY,
    canvasW,
    canvasH,
    0,
    0,
    canvasW,
    canvasH
  );
  ctx.restore();
/*
  // 2) Crée un chemin pour le contour (bord pièce)
  ctx.beginPath();
  drawPuzzlePiece(ctx, tabSizeX, tabSizeY, pieceWidth, pieceHeight, edge.top, edge.right, edge.bottom, edge.left);
  ctx.closePath();

  // 3) Ajout effet lumière - liseré blanc épais sur haut/gauche
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 6;
  const gradientHighlight = ctx.createLinearGradient(0, 0, tabSizeX * 2, tabSizeY * 2);
  gradientHighlight.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  gradientHighlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.strokeStyle = gradientHighlight;
  ctx.shadowColor = 'rgba(255,255,255,0.6)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = -2;
  ctx.shadowOffsetY = -2;
  ctx.stroke();
  ctx.restore();

  // 4) Ajout effet ombre - liseré noir épais sur bas/droite
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 8;
  const gradientShadow = ctx.createLinearGradient(canvasW, canvasH, canvasW - tabSizeX * 2, canvasH - tabSizeY * 2);
  gradientShadow.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
  gradientShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.strokeStyle = gradientShadow;
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;
  ctx.stroke();
  ctx.restore();
*/
  // 5) Ombre portée sous la pièce (optionnelle)
  if (withShadow) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.shadowColor = 'rgba(0,0,0,1)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.beginPath();
    drawPuzzlePiece(ctx, tabSizeX, tabSizeY, pieceWidth, pieceHeight, edge.top, edge.right, edge.bottom, edge.left);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function makeDraggable(piece) {
  const tabSizeX = pieceWidth / 6;
  const tabSizeY = pieceHeight / 6;
  // let zIndexCounter = 1;

  piece.addEventListener('mousemove', e => {
    const rect = piece.getBoundingClientRect();
    const ctx = piece.getContext('2d');
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pixel = ctx.getImageData(x, y, 1, 1).data;

    // Si pixel transparent → curseur normal
    if (pixel[3] > 0) {
      piece.style.cursor = 'grab';
    } else {
      piece.style.cursor = 'default';
    }
  });

  piece.addEventListener('mouseleave', () => {
    piece.style.cursor = 'default';
  });

  piece.addEventListener('mousedown', e => {
    e.preventDefault();

    const rect = piece.getBoundingClientRect();
    const ctx = piece.getContext('2d');
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const pixel = ctx.getImageData(clickX, clickY, 1, 1).data;

    // On ne démarre pas le drag si c’est transparent
    if (pixel[3] === 0) return;

    startTimer();

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;

    const group = getConnectedGroup(piece);

    zIndexCounter++;
    group.forEach(p => {
      p.style.zIndex = zIndexCounter;
    });

    const startPositions = group.map(p => ({
      piece: p,
      offsetX: startMouseX - p.offsetLeft,
      offsetY: startMouseY - p.offsetTop
    }));

    group.forEach(p => {
      p.style.zIndex = 1000;
      const x = parseInt(p.dataset.gridX);
      const y = parseInt(p.dataset.gridY);
	  const key = `${x},${y}`;
      drawPiece(p, loadedImage, x, y, edgeMap[key], false);
    });

    function move(e) {
      startPositions.forEach(pos => {
        const newX = e.clientX - pos.offsetX;
        const newY = e.clientY - pos.offsetY;
        pos.piece.style.left = `${newX}px`;
        pos.piece.style.top = `${newY}px`;
      });
    }

    function stop() {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', stop);

      group.forEach(p => {
        p.style.zIndex = zIndexCounter;
        const x = parseInt(p.dataset.gridX);
        const y = parseInt(p.dataset.gridY);
        const key = `${x},${y}`;
        const img = new Image();
        drawPiece(p, loadedImage, x, y, edgeMap[key], false);
      });

      group.forEach(p => checkConnections(p));
    }

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', stop);
  });
}

function getConnectedGroup(startPiece) {
  const visited = new Set();
  const stack = [startPiece];

  while (stack.length > 0) {
    const current = stack.pop();
    if (visited.has(current)) continue;
    visited.add(current);
    current.connected.forEach(p => stack.push(p));
  }

  return Array.from(visited);
}

function checkVictory() {  
  const group = getConnectedGroup(pieces[0]);
  if (group.length === pieces.length && !cancelled) {
    gameWon = true; 
    stopTimer();

    // Récupérer le texte actuel du timer et l'afficher dans le popup
    document.getElementById('final-time').textContent = timerDisplay.textContent;
    winPopup.classList.remove('hidden');
  }
}

function checkConnections(piece) {
  const gx = parseInt(piece.dataset.gridX);
  const gy = parseInt(piece.dataset.gridY);
  const px = piece.offsetLeft;
  const py = piece.offsetTop;

  for (let other of pieces) {
    if (other === piece || piece.connected.has(other)) continue;

    const ogx = parseInt(other.dataset.gridX);
    const ogy = parseInt(other.dataset.gridY);
    const ox = other.offsetLeft;
    const oy = other.offsetTop;

    const isNeighbor =
      (gx === ogx && Math.abs(gy - ogy) === 1) ||
      (gy === ogy && Math.abs(gx - ogx) === 1);

    // 👉 Remplace pieceSize par pieceWidth/pieceHeight selon la direction
    const dx = gx - ogx;
    const dy = gy - ogy;

    const expectedX = ox + dx * pieceWidth;
    const expectedY = oy + dy * pieceHeight;

    const distance = Math.hypot(px - expectedX, py - expectedY);

    if (isNeighbor && distance < 25) {
      const shiftX = expectedX - px;
      const shiftY = expectedY - py;

      const group = getConnectedGroup(piece);
      group.forEach(p => {
        p.style.left = `${p.offsetLeft + shiftX}px`;
        p.style.top = `${p.offsetTop + shiftY}px`;
      });

      const otherGroup = getConnectedGroup(other);
      group.forEach(p =>
        otherGroup.forEach(o => {
          p.connected.add(o);
          o.connected.add(p);
        })
      );
	  snapSound.currentTime = 0; // Repart du début si déjà en cours
	  snapSound.play();
      break;
    }
  }
  checkVictory();
}


function drawPuzzlePiece(ctx, x, y, w, h, top, right, bottom, left) {
  const tabWidth = w / 4;
  const tabHeight = h / 4;

  ctx.beginPath();
  ctx.moveTo(x, y);

  // TOP
  if (top === 1) {
    // avancer un peu
    ctx.lineTo(x + w / 3, y);
    // col étroit vers le haut
    ctx.bezierCurveTo(
      x + w / 3 + tabWidth / 8, y,
      x + w / 2 - tabWidth / 8, y - tabHeight / 2,
      x + w / 2, y - tabHeight / 2
    );
    // tête arrondie du champignon
    ctx.bezierCurveTo(
      x + w / 2 + tabWidth / 8, y - tabHeight / 2,
      x + 2 * w / 3 - tabWidth / 8, y,
      x + 2 * w / 3, y
    );
  } else if (top === -1) {
    ctx.lineTo(x + w / 3, y);
    ctx.bezierCurveTo(
      x + w / 3 + tabWidth / 8, y,
      x + w / 2 - tabWidth / 8, y + tabHeight / 2,
      x + w / 2, y + tabHeight / 2
    );
    ctx.bezierCurveTo(
      x + w / 2 + tabWidth / 8, y + tabHeight / 2,
      x + 2 * w / 3 - tabWidth / 8, y,
      x + 2 * w / 3, y
    );
  }
  ctx.lineTo(x + w, y);

  // RIGHT
  if (right === 1) {
    ctx.lineTo(x + w, y + h / 3);
    ctx.bezierCurveTo(
      x + w, y + h / 3 + tabHeight / 8,
      x + w + tabWidth / 2, y + h / 2 - tabHeight / 8,
      x + w + tabWidth / 2, y + h / 2
    );
    ctx.bezierCurveTo(
      x + w + tabWidth / 2, y + h / 2 + tabHeight / 8,
      x + w, y + 2 * h / 3 - tabHeight / 8,
      x + w, y + 2 * h / 3
    );
  } else if (right === -1) {
    ctx.lineTo(x + w, y + h / 3);
    ctx.bezierCurveTo(
      x + w, y + h / 3 + tabHeight / 8,
      x + w - tabWidth / 2, y + h / 2 - tabHeight / 8,
      x + w - tabWidth / 2, y + h / 2
    );
    ctx.bezierCurveTo(
      x + w - tabWidth / 2, y + h / 2 + tabHeight / 8,
      x + w, y + 2 * h / 3 - tabHeight / 8,
      x + w, y + 2 * h / 3
    );
  }
  ctx.lineTo(x + w, y + h);

  // BOTTOM
  if (bottom === 1) {
    ctx.lineTo(x + 2 * w / 3, y + h);
    ctx.bezierCurveTo(
      x + 2 * w / 3 - tabWidth / 8, y + h,
      x + w / 2 + tabWidth / 8, y + h + tabHeight / 2,
      x + w / 2, y + h + tabHeight / 2
    );
    ctx.bezierCurveTo(
      x + w / 2 - tabWidth / 8, y + h + tabHeight / 2,
      x + w / 3 + tabWidth / 8, y + h,
      x + w / 3, y + h
    );
  } else if (bottom === -1) {
    ctx.lineTo(x + 2 * w / 3, y + h);
    ctx.bezierCurveTo(
      x + 2 * w / 3 - tabWidth / 8, y + h,
      x + w / 2 + tabWidth / 8, y + h - tabHeight / 2,
      x + w / 2, y + h - tabHeight / 2
    );
    ctx.bezierCurveTo(
      x + w / 2 - tabWidth / 8, y + h - tabHeight / 2,
      x + w / 3 + tabWidth / 8, y + h,
      x + w / 3, y + h
    );
  }
  ctx.lineTo(x, y + h);

  // LEFT
  if (left === 1) {
    ctx.lineTo(x, y + 2 * h / 3);
    ctx.bezierCurveTo(
      x, y + 2 * h / 3 - tabHeight / 8,
      x - tabWidth / 2, y + h / 2 + tabHeight / 8,
      x - tabWidth / 2, y + h / 2
    );
    ctx.bezierCurveTo(
      x - tabWidth / 2, y + h / 2 - tabHeight / 8,
      x, y + h / 3 + tabHeight / 8,
      x, y + h / 3
    );
  } else if (left === -1) {
    ctx.lineTo(x, y + 2 * h / 3);
    ctx.bezierCurveTo(
      x, y + 2 * h / 3 - tabHeight / 8,
      x + tabWidth / 2, y + h / 2 + tabHeight / 8,
      x + tabWidth / 2, y + h / 2
    );
    ctx.bezierCurveTo(
      x + tabWidth / 2, y + h / 2 - tabHeight / 8,
      x, y + h / 3 + tabHeight / 8,
      x, y + h / 3
    );
  }

  ctx.closePath();
}
