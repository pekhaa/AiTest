const svg = document.getElementById('diagram');
const nodesLayer = document.getElementById('nodes');
const pipesLayer = document.getElementById('pipes');
const connectModeBtn = document.getElementById('connectModeBtn');
const clearBtn = document.getElementById('clearBtn');
const statusEl = document.getElementById('status');

const toolLabels = {
  dryer: 'Kuivurilaite',
  elevator: 'Elevaattori',
  splitter2: '2-tie jakaja',
  splitter3: '3-tie jakaja',
  splitter6: '6-tie jakaja',
  fan: 'Puhallin/imuri',
  burner: 'Öljypoltin',
  conveyor: 'Kuljetin'
};

const state = {
  connectMode: false,
  selectedForConnect: null,
  nodeCount: 1,
  nodes: [],
  pipes: []
};

function setStatus(text) {
  statusEl.textContent = text;
}

function svgPointFromClient(clientX, clientY) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

function nodeCenter(node) {
  return {
    x: node.x + 55,
    y: node.y + 35
  };
}

function createShape(type) {
  switch (type) {
    case 'dryer':
      return '<rect class="shape" x="0" y="0" width="110" height="70" rx="8" />';
    case 'elevator':
      return '<rect class="shape" x="35" y="0" width="40" height="70" rx="6" />';
    case 'splitter2':
      return '<path class="shape" d="M55 0 L110 70 H0 Z" />';
    case 'splitter3':
      return '<polygon class="shape" points="55,0 110,45 85,70 25,70 0,45" />';
    case 'splitter6':
      return '<circle class="shape" cx="55" cy="35" r="34" />';
    case 'fan':
      return '<path class="shape" d="M55 2 A33 33 0 1 1 54.9 2 Z M55 35 L85 20 M55 35 L25 20 M55 35 L55 68" />';
    case 'burner':
      return '<rect class="shape" x="12" y="10" width="86" height="50" rx="8" /><circle class="shape" cx="92" cy="35" r="8" />';
    case 'conveyor':
      return '<rect class="shape" x="5" y="18" width="100" height="34" rx="17" />';
    default:
      return '<rect class="shape" x="0" y="0" width="110" height="70" rx="8" />';
  }
}

function updatePipesForNode(nodeId) {
  for (const pipe of state.pipes) {
    if (pipe.from === nodeId || pipe.to === nodeId) {
      const fromNode = state.nodes.find((n) => n.id === pipe.from);
      const toNode = state.nodes.find((n) => n.id === pipe.to);
      const a = nodeCenter(fromNode);
      const b = nodeCenter(toNode);
      pipe.line.setAttribute('x1', a.x);
      pipe.line.setAttribute('y1', a.y);
      pipe.line.setAttribute('x2', b.x);
      pipe.line.setAttribute('y2', b.y);
    }
  }
}

function onNodeClick(node, element) {
  if (!state.connectMode) return;

  if (!state.selectedForConnect) {
    state.selectedForConnect = node.id;
    element.classList.add('selected');
    setStatus(`Valittu lähtö: ${node.name}. Klikkaa kohdelaitetta.`);
    return;
  }

  if (state.selectedForConnect === node.id) {
    element.classList.remove('selected');
    state.selectedForConnect = null;
    setStatus('Lähtövalinta peruttu.');
    return;
  }

  const fromId = state.selectedForConnect;
  const toId = node.id;

  const alreadyExists = state.pipes.some((p) => p.from === fromId && p.to === toId);
  if (alreadyExists) {
    setStatus('Putki on jo olemassa näiden laitteiden välillä.');
  } else {
    const fromNode = state.nodes.find((n) => n.id === fromId);
    const toNode = state.nodes.find((n) => n.id === toId);
    const a = nodeCenter(fromNode);
    const b = nodeCenter(toNode);

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.classList.add('pipe');
    line.setAttribute('x1', a.x);
    line.setAttribute('y1', a.y);
    line.setAttribute('x2', b.x);
    line.setAttribute('y2', b.y);
    pipesLayer.append(line);

    state.pipes.push({ from: fromId, to: toId, line });
    setStatus(`Yhdistetty: ${fromNode.name} → ${toNode.name}`);
  }

  document.querySelectorAll('.node.selected').forEach((el) => el.classList.remove('selected'));
  state.selectedForConnect = null;
}

function makeDraggable(node, group) {
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  group.addEventListener('pointerdown', (event) => {
    if (state.connectMode) return;
    dragging = true;
    group.setPointerCapture(event.pointerId);
    const p = svgPointFromClient(event.clientX, event.clientY);
    offsetX = p.x - node.x;
    offsetY = p.y - node.y;
  });

  group.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const p = svgPointFromClient(event.clientX, event.clientY);
    node.x = p.x - offsetX;
    node.y = p.y - offsetY;
    group.setAttribute('transform', `translate(${node.x} ${node.y})`);
    updatePipesForNode(node.id);
  });

  group.addEventListener('pointerup', () => {
    dragging = false;
  });

  group.addEventListener('pointercancel', () => {
    dragging = false;
  });
}

function addNode(type, x, y) {
  const id = `n${Date.now()}-${Math.round(Math.random() * 9999)}`;
  const name = `${toolLabels[type]} ${state.nodeCount++}`;
  const node = { id, type, x, y, name };
  state.nodes.push(node);

  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.classList.add('node');
  group.setAttribute('transform', `translate(${x} ${y})`);
  group.innerHTML = `
    ${createShape(type)}
    <text class="node-label" x="55" y="35">${name}</text>
  `;

  makeDraggable(node, group);
  group.addEventListener('click', () => onNodeClick(node, group));
  nodesLayer.append(group);
}

document.querySelectorAll('.tool').forEach((tool) => {
  tool.addEventListener('dragstart', (event) => {
    event.dataTransfer.setData('text/plain', tool.dataset.type);
  });
});

svg.addEventListener('dragover', (event) => {
  event.preventDefault();
});

svg.addEventListener('drop', (event) => {
  event.preventDefault();
  const type = event.dataTransfer.getData('text/plain');
  if (!type) return;
  const p = svgPointFromClient(event.clientX, event.clientY);
  addNode(type, p.x - 55, p.y - 35);
});

connectModeBtn.addEventListener('click', () => {
  state.connectMode = !state.connectMode;
  connectModeBtn.classList.toggle('active', state.connectMode);
  connectModeBtn.textContent = `Yhdistä laitteita: ${state.connectMode ? 'PÄÄLLÄ' : 'POIS'}`;

  state.selectedForConnect = null;
  document.querySelectorAll('.node.selected').forEach((el) => el.classList.remove('selected'));

  setStatus(
    state.connectMode
      ? 'Yhdistystila päällä: klikkaa lähtölaite ja sitten kohde.'
      : 'Yhdistystila pois: voit siirtää laitteita.'
  );
});

clearBtn.addEventListener('click', () => {
  nodesLayer.innerHTML = '';
  pipesLayer.innerHTML = '';
  state.nodes = [];
  state.pipes = [];
  state.selectedForConnect = null;
  state.nodeCount = 1;
  setStatus('Kaavio tyhjennetty.');
});
