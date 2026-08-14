const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width, height;
function resize() {
  width = canvas.width = canvas.parentElement.clientWidth;
  height = canvas.height = canvas.parentElement.clientHeight;
}
resize();
window.addEventListener('resize', resize);

// State Management
let state = 'BOW'; // 'BOW' -> 'BLOOM' -> 'TREE'
let drag = false;
let pullX = 0, pullY = 0;

// Elements Setup
const targetHeart = {
  x: () => width / 2,
  y: () => height * 0.38,
  size: 80,
  blooms: []
};

const bow = {
  x: () => width / 2,
  y: () => height * 0.78,
  size: 70
};

let arrow = {
  x: bow.x(),
  y: bow.y(),
  vx: 0,
  vy: 0,
  stuck: false
};

// Tree Growth Mechanics
class Branch {
  constructor(x, y, angle, length, depth) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.length = length;
    this.depth = depth;
    this.growth = 0;
    this.branches = [];
    this.blooms = [];
    this.generated = false;
  }

  update() {
    if (this.growth < 1) this.growth += 0.02;
    
    if (this.growth >= 1 && !this.generated && this.depth > 0) {
      this.generated = true;
      const branchCount = Math.random() > 0.3 ? 2 : 3;
      for (let i = 0; i < branchCount; i++) {
        const newAngle = this.angle + (Math.random() - 0.5) * 0.8;
        const newLength = this.length * (0.65 + Math.random() * 0.2);
        const endX = this.x + Math.cos(this.angle) * this.length;
        const endY = this.y + Math.sin(this.angle) * this.length;
        this.branches.push(new Branch(endX, endY, newAngle, newLength, this.depth - 1));
      }
    }

    if (this.depth === 0 && this.growth >= 1 && this.blooms.length < 5) {
      if (Math.random() < 0.1) {
        const endX = this.x + Math.cos(this.angle) * this.length;
        const endY = this.y + Math.sin(this.angle) * this.length;
        this.blooms.push({
          x: endX + (Math.random() - 0.5) * 20,
          y: endY + (Math.random() - 0.5) * 20,
          size: 0,
          maxSize: 6 + Math.random() * 6
        });
      }
    }

    this.branches.forEach(b => b.update());
    this.blooms.forEach(b => {
      if (b.size < b.maxSize) b.size += 0.2;
    });
  }

  draw(ctx) {
    const currentLength = this.length * this.growth;
    const endX = this.x + Math.cos(this.angle) * currentLength;
    const endY = this.y + Math.sin(this.angle) * currentLength;

    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = '#4a2e2b';
    ctx.lineWidth = Math.max(1, this.depth * 2);
    ctx.lineCap = 'round';
    ctx.stroke();

    this.branches.forEach(b => b.draw(ctx));
    this.blooms.forEach(b => {
      drawHeart(ctx, b.x, b.y, b.size, '#ff4d6d');
    });
  }
}

let treeRoot = null;

// Helpers
function drawHeart(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.fillStyle = color;
  for (let t = 0; t < Math.PI * 2; t += 0.05) {
    const hx = 16 * Math.pow(Math.sin(t), 3);
    const hy = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
    const px = (hx / 16) * (size / 2);
    const py = (hy / 16) * (size / 2);
    if (t === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.fill();
  ctx.restore();
}

// Mouse / Touch Event Handlers
function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return { x: clientX - rect.left, y: clientY - rect.top };
}

window.addEventListener('mousedown', (e) => {
  if (state !== 'BOW') return;
  const pos = getPos(e);
  if (Math.hypot(pos.x - bow.x(), pos.y - bow.y()) < 80) drag = true;
});

window.addEventListener('mousemove', (e) => {
  if (!drag) return;
  const pos = getPos(e);
  pullX = pos.x - bow.x();
  pullY = pos.y - bow.y();
});

window.addEventListener('mouseup', () => {
  if (!drag) return;
  drag = false;
  // Release Arrow
  arrow.vx = -pullX * 0.15;
  arrow.vy = -pullY * 0.15;
  pullX = 0;
  pullY = 0;
});

// Main Loop
function animate() {
  ctx.clearRect(0, 0, width, height);

  if (state === 'BOW') {
    // 1. Draw Target Heart
    drawHeart(ctx, targetHeart.x(), targetHeart.y(), targetHeart.size, '#ff8fa3');

    // 2. Physics & Drawing Arrow
    if (!arrow.stuck && (arrow.vx !== 0 || arrow.vy !== 0)) {
      arrow.x += arrow.vx;
      arrow.y += arrow.vy;

      // Check Collision with Target Heart
      const dist = Math.hypot(arrow.x - targetHeart.x(), arrow.y - targetHeart.y());
      if (dist < targetHeart.size / 2) {
        arrow.stuck = true;
        arrow.vx = 0;
        arrow.vy = 0;
        triggerBloomPhase();
      }
    } else if (!arrow.stuck) {
      arrow.x = bow.x() + pullX;
      arrow.y = bow.y() + pullY;
    }

    // Draw Bow and String
    ctx.beginPath();
    ctx.arc(bow.x(), bow.y(), bow.size, Math.PI * 0.8, Math.PI * 0.2, true);
    ctx.strokeStyle = '#8b5a2b';
    ctx.lineWidth = 4;
    ctx.stroke();

    // String
    ctx.beginPath();
    ctx.moveTo(bow.x() - bow.size * 0.8, bow.y() - bow.size * 0.3);
    ctx.lineTo(arrow.x, arrow.y);
    ctx.lineTo(bow.x() + bow.size * 0.8, bow.y() - bow.size * 0.3);
    ctx.strokeStyle = '#d3c2b1';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Arrow
    ctx.save();
    ctx.translate(arrow.x, arrow.y);
    const angle = arrow.stuck ? -Math.PI / 2 : Math.atan2(arrow.vy || -pullY, arrow.vx || -pullX);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.lineTo(20, 0);
    ctx.strokeStyle = '#4a2e2b';
    ctx.lineWidth = 3;
    ctx.stroke();
    // Feather
    drawHeart(ctx, -20, 0, 8, '#ff4d6d');
    ctx.restore();

  } else if (state === 'BLOOM') {
    // Heart Blooming Inside Target
    drawHeart(ctx, targetHeart.x(), targetHeart.y(), targetHeart.size, '#ff4d6d');
    targetHeart.size = Math.min(targetHeart.size + 0.8, 220);

    // Inner Bloom Particles
    if (targetHeart.blooms.length < 180) {
      targetHeart.blooms.push({
        x: targetHeart.x() + (Math.random() - 0.5) * targetHeart.size * 0.7,
        y: targetHeart.y() + (Math.random() - 0.5) * targetHeart.size * 0.7,
        size: Math.random() * 8 + 2,
        color: '#ffccd5'
      });
    }

    targetHeart.blooms.forEach(b => {
      drawHeart(ctx, b.x, b.y, b.size, b.color);
    });

  } else if (state === 'TREE') {
    if (treeRoot) {
      treeRoot.update();
      treeRoot.draw(ctx);
    }
  }

  requestAnimationFrame(animate);
}

function triggerBloomPhase() {
  state = 'BLOOM';
  document.getElementById('subText').innerText = 'make a wish...';
  
  setTimeout(() => {
    document.getElementById('mainTitle').classList.add('show');
    document.getElementById('footerText').classList.add('show');
  }, 1000);

  // Transition to Growing Heart Tree Phase
  setTimeout(() => {
    state = 'TREE';
    document.getElementById('subText').innerText = 'and... make it count';
    document.getElementById('footerText').innerText = 'Here\'s to a year that blooms';
    treeRoot = new Branch(width / 2, height * 0.85, -Math.PI / 2, 90, 4);
  }, 4500);
}

animate();
