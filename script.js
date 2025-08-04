const canvas = document.getElementById("puzzleCanvas");
const ctx = canvas.getContext("2d");

const uploadInput = document.getElementById("upload");
const generateBtn = document.getElementById("generate");
const rowsInput = document.getElementById("rows");
const colsInput = document.getElementById("cols");

let image = new Image();
let imageLoaded = false;
let pieces = [];
let shapes = [];
let draggingGroup = null;   // groupe en cours de drag (tableau)
let draggingReference = null; // pièce de référence (celle cliquée)
let dragOffsetX = 0;
let dragOffsetY = 0;
let rows = 3, cols = 3;
let pieceWidth, pieceHeight;
let groupOffsets = []; // stocke {dx, dy} pour chaque pièce dans le groupe

uploadInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    image.onload = () => {
      imageLoaded = true;
      generatePuzzle();
    };
    image.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

generateBtn.addEventListener("click", () => {
  const canvas = document.getElementById("puzzleCanvas");
  const fullImg = document.getElementById("fullImage");

  // Reset affichages
  fullImg.style.opacity = "0";
  fullImg.style.display = "none";

  canvas.style.display = "block";
  canvas.style.opacity = "1";
  canvas.style.transition = ""; // reset la transition

  if (!imageLoaded) {
    showPopup("Veuillez d'abord choisir une image.");
    return;
  }
  generatePuzzle();
});

function generatePuzzle() {
  rows = parseInt(rowsInput.value);
  cols = parseInt(colsInput.value);

  canvas.width = 900;
  canvas.height = 700;

  const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
  const scaledWidth = image.width * scale;
  const scaledHeight = image.height * scale;

  pieceWidth = scaledWidth / cols;
  pieceHeight = scaledHeight / rows;

  shapes = generatePuzzleShapes(rows, cols);
  pieces = [];

  let id = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const shape = shapes[y][x];
      pieces.push({
        id: id,
        gridX: x,
        gridY: y,
        x: Math.random() * (canvas.width - pieceWidth),
        y: Math.random() * (canvas.height - pieceHeight),
        homeX: x * pieceWidth,
        homeY: y * pieceHeight,
        sx: x * (image.width / cols),
        sy: y * (image.height / rows),
        shape,
        groupId: id, // chaque pièce commence dans son propre groupe
      });
      id++;
    }
  }

  draw();
}

function generatePuzzleShapes(rows, cols) {
  const shapes = [];
  for (let y = 0; y < rows; y++) {
    shapes[y] = [];
    for (let x = 0; x < cols; x++) {
      shapes[y][x] = {
        top: y === 0 ? 0 : -shapes[y - 1][x].bottom,
        left: x === 0 ? 0 : -shapes[y][x - 1].right,
        bottom: y === rows - 1 ? 0 : Math.random() > 0.5 ? 1 : -1,
        right: x === cols - 1 ? 0 : Math.random() > 0.5 ? 1 : -1,
      };
    }
  }
  return shapes;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  pieces.forEach((p) => {
    drawPuzzlePiece(ctx, image, p.sx, p.sy, image.width / cols, image.height / rows,
      p.x, p.y, pieceWidth, pieceHeight, p.shape);
  });
}

function drawPuzzlePiece(ctx, img, sx, sy, sw, sh, dx, dy, dw, dh, shape) {
  const tabSize = Math.min(dw, dh) * 0.2;
  const path = new Path2D();

  path.moveTo(dx, dy);

  // Top
  if (shape.top === 0) {
    path.lineTo(dx + dw, dy);
  } else {
    const midX = dx + dw / 2;
    path.lineTo(midX - tabSize, dy);
    path.bezierCurveTo(
      midX - tabSize, dy - tabSize * shape.top,
      midX + tabSize, dy - tabSize * shape.top,
      midX + tabSize, dy
    );
    path.lineTo(dx + dw, dy);
  }

  // Right
  if (shape.right === 0) {
    path.lineTo(dx + dw, dy + dh);
  } else {
    const midY = dy + dh / 2;
    path.lineTo(dx + dw, midY - tabSize);
    path.bezierCurveTo(
      dx + dw + tabSize * shape.right, midY - tabSize,
      dx + dw + tabSize * shape.right, midY + tabSize,
      dx + dw, midY + tabSize
    );
    path.lineTo(dx + dw, dy + dh);
  }

  // Bottom
  if (shape.bottom === 0) {
    path.lineTo(dx, dy + dh);
  } else {
    const midX = dx + dw / 2;
    path.lineTo(midX + tabSize, dy + dh);
    path.bezierCurveTo(
      midX + tabSize, dy + dh + tabSize * shape.bottom,
      midX - tabSize, dy + dh + tabSize * shape.bottom,
      midX - tabSize, dy + dh
    );
    path.lineTo(dx, dy + dh);
  }

  // Left
  if (shape.left === 0) {
    path.lineTo(dx, dy);
  } else {
    const midY = dy + dh / 2;
    path.lineTo(dx, midY + tabSize);
    path.bezierCurveTo(
      dx - tabSize * shape.left, midY + tabSize,
      dx - tabSize * shape.left, midY - tabSize,
      dx, midY - tabSize
    );
    path.lineTo(dx, dy);
  }

  path.closePath();

  ctx.save();
  ctx.clip(path);
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  ctx.restore();

  ctx.strokeStyle = "#444";
  ctx.lineWidth = 1;
  ctx.stroke(path);
}

// Fusionne deux groupes en un seul groupe
function mergeGroups(groupA, groupB) {
  if (groupA === groupB) return;
  const newGroupId = Math.min(groupA, groupB);
  const oldGroupId = Math.max(groupA, groupB);

  pieces.forEach(p => {
    if (p.groupId === oldGroupId) {
      p.groupId = newGroupId;
    }
  });
}

function checkCompletion() {
  if (pieces.length === 0) return false;
  const firstGroupId = pieces[0].groupId;
  const allSameGroup = pieces.every(p => p.groupId === firstGroupId);
  if (allSameGroup) {
    centerPuzzle();
    setTimeout(() => { // délai avant popup pour centrer avant
      showPopup("Bravo, puzzle terminé !");
    }, 500);
	fadeOutPuzzleShowImage();
    return true;
  }
  return false;
}

function fadeOutPuzzleShowImage() {
  const canvas = document.getElementById("puzzleCanvas");
  const fullImg = document.getElementById("fullImage");

  // Met la source de l'image complète
  fullImg.src = image.src;
  fullImg.style.display = "block";

  // Démarre le fondu du canvas vers 0
  canvas.style.transition = "opacity 1s ease";
  canvas.style.opacity = "0";

  // Après le fondu, cache le canvas et affiche l'image en fondu
  setTimeout(() => {
    canvas.style.display = "none";
    fullImg.style.opacity = "1";
  }, 1000);
}

function centerPuzzle() {
  const groupPieces = pieces;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  groupPieces.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x + pieceWidth > maxX) maxX = p.x + pieceWidth;
    if (p.y + pieceHeight > maxY) maxY = p.y + pieceHeight;
  });

  const puzzleWidth = maxX - minX;
  const puzzleHeight = maxY - minY;

  const centerX = (canvas.width - puzzleWidth) / 2;
  const centerY = (canvas.height - puzzleHeight) / 2;

  const offsetX = centerX - minX;
  const offsetY = centerY - minY;

  groupPieces.forEach(p => {
    p.x += offsetX;
    p.y += offsetY;
  });

  draw();
}

function showPopup(message, duration = 2000) {
  const popup = document.getElementById("popup");
  popup.textContent = message;
  popup.style.opacity = "1";
  popup.style.pointerEvents = "auto";

  setTimeout(() => {
    popup.style.opacity = "0";
    popup.style.pointerEvents = "none";
  }, duration);
}

// DRAG & SNAP BETWEEN PIECES - version groupe avec pièce de référence cliquée

canvas.addEventListener("mousedown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  draggingGroup = null;
  draggingReference = null;

  for (let i = pieces.length - 1; i >= 0; i--) {
    const p = pieces[i];
    if (
      mouseX > p.x && mouseX < p.x + pieceWidth &&
      mouseY > p.y && mouseY < p.y + pieceHeight
    ) {
      draggingGroup = pieces.filter(piece => piece.groupId === p.groupId);
      draggingReference = p;

      dragOffsetX = mouseX - draggingReference.x;
      dragOffsetY = mouseY - draggingReference.y;

      // On remonte tout le groupe en haut du tableau pour draw au-dessus
      pieces = pieces.filter(piece => piece.groupId !== draggingReference.groupId).concat(draggingGroup);

      // Calcul des offsets relatifs à la pièce de référence
      groupOffsets = draggingGroup.map(piece => ({
        dx: piece.x - draggingReference.x,
        dy: piece.y - draggingReference.y,
      }));

      break;
    }
  }
});

canvas.addEventListener("mousemove", (e) => {
  if (draggingGroup && draggingReference) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    draggingGroup.forEach((p, i) => {
      p.x = mouseX - dragOffsetX + groupOffsets[i].dx;
      p.y = mouseY - dragOffsetY + groupOffsets[i].dy;
    });

    draw();
  }
});

canvas.addEventListener("mouseup", () => {
  if (draggingGroup) {
    const snapDistance = 30;

    outerLoop:
    for (const p of draggingGroup) {
      for (const other of pieces) {
        if (draggingGroup.includes(other)) continue;

        const dxGrid = p.gridX - other.gridX;
        const dyGrid = p.gridY - other.gridY;

        if (Math.abs(dxGrid) === 1 && dyGrid === 0) {
          const expectedX = other.x + dxGrid * pieceWidth;
          const distanceX = Math.abs(p.x - expectedX);
          const distanceY = Math.abs(p.y - other.y);

          if (distanceX < snapDistance && distanceY < snapDistance) {
            if (p.groupId !== other.groupId) {  // <-- IMPORTANT : fusionne que si groupes différents
              const deltaX = expectedX - p.x;
              const deltaY = other.y - p.y;
              draggingGroup.forEach(piece => {
                piece.x += deltaX;
                piece.y += deltaY;
              });

              mergeGroups(p.groupId, other.groupId);
              draw();
              if (checkCompletion()) {
                draggingGroup = null;
                draggingReference = null;
                groupOffsets = [];
              }
              break outerLoop;
            }
          }
        } else if (dxGrid === 0 && Math.abs(dyGrid) === 1) {
          const expectedY = other.y + dyGrid * pieceHeight;
          const distanceY = Math.abs(p.y - expectedY);
          const distanceX = Math.abs(p.x - other.x);

          if (distanceY < snapDistance && distanceX < snapDistance) {
            if (p.groupId !== other.groupId) {  // <-- IMPORTANT : fusionne que si groupes différents
              const deltaX = other.x - p.x;
              const deltaY = expectedY - p.y;
              draggingGroup.forEach(piece => {
                piece.x += deltaX;
                piece.y += deltaY;
              });

              mergeGroups(p.groupId, other.groupId);
              draw();
              if (checkCompletion()) {
                draggingGroup = null;
                draggingReference = null;
                groupOffsets = [];
              }
              break outerLoop;
            }
          }
        }
      }
    }

    draggingGroup = null;
    draggingReference = null;
    groupOffsets = [];
    draw();
  }
});
