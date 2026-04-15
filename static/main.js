const fileInput     = document.getElementById('file-input');
const dropZone      = document.getElementById('drop-zone');
const previewWrap   = document.getElementById('preview-wrap');
const previewImg    = document.getElementById('preview-img');
const previewName   = document.getElementById('preview-name-text');
const canvas        = document.getElementById('canvas-overlay');
const analyzeBtn    = document.getElementById('analyze-btn');
const clearBtn      = document.getElementById('clear-btn');
const statusEl      = document.getElementById('status');
const statusText    = document.getElementById('status-text');
const statusSpinner = document.getElementById('status-spinner');
const resultsEl     = document.getElementById('results');
const labelsGrid    = document.getElementById('labels-grid');
const resultsCount  = document.getElementById('results-count');

const COLORS = ['#6c63ff', '#00e5a0', '#ff6b6b', '#ffd166', '#06d6a0', '#118ab2'];

let selectedFile = null;

dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('drag');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag'));

dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag');
  const f = e.dataTransfer.files[0];
  if (f && f.type.startsWith('image/')) setFile(f);
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) setFile(fileInput.files[0]);
});

function setFile(file) {
  selectedFile = file;
  previewImg.src = URL.createObjectURL(file);
  previewName.textContent = `${file.name}  (${(file.size / 1024).toFixed(1)} KB)`;
  previewWrap.style.display = 'block';
  dropZone.style.display = 'none';
  analyzeBtn.disabled = false;
  clearBtn.style.display = 'inline-flex';
  clearOverlay();
  hideResults();
  hideStatus();
}

clearBtn.addEventListener('click', () => {
  selectedFile = null;
  fileInput.value = '';
  previewImg.src = '';
  previewWrap.style.display = 'none';
  dropZone.style.display = 'block';
  clearBtn.style.display = 'none';
  analyzeBtn.disabled = true;
  clearOverlay();
  hideResults();
  hideStatus();
});

analyzeBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  analyzeBtn.disabled = true;
  clearBtn.disabled = true;
  showStatus('loading', 'Uploading to S3…');
  hideResults();
  clearOverlay();

  const formData = new FormData();
  formData.append('image', selectedFile);

  try {
    showStatus('loading', 'Running Rekognition…');
    const res  = await fetch('/analyze', { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Server error');

    hideStatus();
    renderResults(data);
  } catch (err) {
    showStatus('error', err.message);
  } finally {
    analyzeBtn.disabled = false;
    clearBtn.disabled = false;
  }
});

function renderResults(data) {
  labelsGrid.innerHTML = '';

  canvas.width  = previewImg.naturalWidth  || data.image_width;
  canvas.height = previewImg.naturalHeight || data.image_height;

  previewImg.onload = () => drawBoxes(data);
  drawBoxes(data);

  data.labels.forEach((label, i) => {
    const boxCount = label.instances.length;
    const card = document.createElement('div');
    card.className = 'label-card';
    card.style.animationDelay = `${i * 60}ms`;
    card.innerHTML = `
      <div class="label-name">${label.name}</div>
      <div class="label-bar-bg">
        <div class="label-bar" style="width:${label.confidence}%; background:${COLORS[i % COLORS.length]};"></div>
      </div>
      <div class="label-conf">${label.confidence}% confidence</div>
      ${boxCount ? `<div class="label-boxes">↳ ${boxCount} instance${boxCount > 1 ? 's' : ''} located</div>` : ''}
    `;
    labelsGrid.appendChild(card);
  });

  resultsCount.textContent = `${data.labels.length} label${data.labels.length !== 1 ? 's' : ''} found`;
  resultsEl.style.display = 'flex';
}

function drawBoxes(data) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const scaleX = canvas.width  / data.image_width;
  const scaleY = canvas.height / data.image_height;

  data.labels.forEach((label, i) => {
    const color = COLORS[i % COLORS.length];
    label.instances.forEach(inst => {
      const x = inst.left   * scaleX;
      const y = inst.top    * scaleY;
      const w = inst.width  * scaleX;
      const h = inst.height * scaleY;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x, y, w, h);

      const txt = `${label.name} ${label.confidence}%`;
      ctx.font = 'bold 13px DM Sans, sans-serif';
      const tw = ctx.measureText(txt).width;

      ctx.fillStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x, y - 22, tw + 10, 20);

      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.fillText(txt, x + 5, y - 7);
    });
  });
}

function showStatus(type, msg) {
  statusEl.className = type;
  statusText.textContent = msg;
  statusSpinner.style.display = type === 'loading' ? 'block' : 'none';
}

function hideStatus() {
  statusEl.className = '';
  statusEl.style.display = 'none';
}

function hideResults() {
  resultsEl.style.display = 'none';
  labelsGrid.innerHTML = '';
}

function clearOverlay() {
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}
