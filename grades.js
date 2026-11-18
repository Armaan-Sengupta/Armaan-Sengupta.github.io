// Course grades and prerequisite graph for grades.html.

const TERMS = [
  { id: '1A', label: '1A', calendar: 'Fall 2022' },
  { id: '1B', label: '1B', calendar: 'Winter 2023' },
  { id: '2A', label: '2A', calendar: 'Fall 2023' },
  { id: '2B', label: '2B', calendar: 'Spring 2024' },
  { id: '3A', label: '3A', calendar: 'Winter 2025' },
  { id: '3B', label: '3B', calendar: 'Fall 2025' },
  { id: '4A', label: '4A', calendar: 'Fall 2026', inProgress: true }
];

const BRANCHES = [
  { id: 'math', name: 'Math' },
  { id: 'embedded', name: 'Embedded & Computing' },
  { id: 'controls', name: 'Controls & Systems' },
  { id: 'circuits', name: 'Circuits & Electronics' },
  { id: 'mechanics', name: 'Mechanics & Solids' },
  { id: 'design', name: 'Design' },
  { id: 'thermo', name: 'Thermofluids & Chem' },
  { id: 'humanities', name: 'Electives' }
];

const COURSES = [
  // Fall 2022 (1A)
  { code: 'CHE 102', title: 'Chemistry for Engineers', term: '1A', units: 0.50, grade: 83, branch: 'thermo' },
  { code: 'MATH 115', title: 'Linear Algebra', term: '1A', units: 0.50, grade: 86, branch: 'math' },
  { code: 'MATH 116', title: 'Calculus 1', term: '1A', units: 0.50, grade: 90, branch: 'math' },
  { code: 'MTE 100', title: 'Mechatronics Engineering', term: '1A', units: 0.75, grade: 87, branch: 'design' },
  { code: 'MTE 121', title: 'Digital Computation', term: '1A', units: 0.50, grade: 97, branch: 'embedded' },

  // Winter 2023 (1B)
  { code: 'MATH 118', title: 'Calculus 2', term: '1B', units: 0.50, grade: 99, branch: 'math' },
  { code: 'MTE 111', title: 'Material Structure & Properties', term: '1B', units: 0.50, grade: 92, branch: 'mechanics' },
  { code: 'MTE 119', title: 'Statics', term: '1B', units: 0.50, grade: 81, branch: 'mechanics' },
  { code: 'MTE 120', title: 'Circuits', term: '1B', units: 0.75, grade: 97, branch: 'circuits' },
  { code: 'MTE 140', title: 'Algorithms & Data Structures', term: '1B', units: 0.50, grade: 92, branch: 'embedded' },

  // Fall 2023 (2A)
  { code: 'MTE 201', title: 'Experimental Measurement & Stats', term: '2A', units: 0.50, grade: 87, branch: 'math' },
  { code: 'MTE 202', title: 'Ordinary Differential Equations', term: '2A', units: 0.50, grade: 89, branch: 'math' },
  { code: 'MTE 219', title: 'Mechanics of Deformable Solids', term: '2A', units: 0.50, grade: 86, branch: 'mechanics' },
  { code: 'MTE 262', title: 'Microprocessors & Digital Logic', term: '2A', units: 0.50, grade: 89, branch: 'embedded' },
  { code: 'PHIL 145', title: 'Critical Thinking', term: '2A', units: 0.50, grade: 85, branch: 'humanities' },
  { code: 'SYDE 182', title: 'Dynamics', term: '2A', units: 0.50, grade: 90, branch: 'mechanics' },

  // Spring 2024 (2B)
  { code: 'MTE 203', title: 'Advanced Calculus', term: '2B', units: 0.50, grade: 89, branch: 'math' },
  { code: 'MTE 204', title: 'Numerical Methods', term: '2B', units: 0.50, grade: 89, branch: 'math' },
  { code: 'MTE 220', title: 'Sensors & Instrumentation', term: '2B', units: 0.50, grade: 90, branch: 'circuits' },
  { code: 'MTE 241', title: 'Computer Structures & Real-Time Sys', term: '2B', units: 0.50, grade: 82, branch: 'embedded' },
  { code: 'SYDE 252', title: 'Linear Systems & Signals', term: '2B', units: 0.50, grade: 87, branch: 'controls' },

  // Winter 2025 (3A)
  { code: 'MTE 309', title: 'Thermodynamics & Heat Transfer', term: '3A', units: 0.50, grade: 90, branch: 'thermo' },
  { code: 'MTE 320', title: 'Actuators & Power Electronics', term: '3A', units: 0.50, grade: 92, branch: 'circuits' },
  { code: 'MTE 321', title: 'Design & Dynamics of Machines', term: '3A', units: 0.50, grade: 94, branch: 'mechanics' },
  { code: 'MTE 325', title: 'Microprocessor Systems & Interfacing', term: '3A', units: 0.50, grade: 92, branch: 'embedded' },
  { code: 'MTE 351', title: 'Systems Models', term: '3A', units: 0.50, grade: 91, branch: 'controls' },

  // Fall 2025 (3B)
  { code: 'CLAS 104', title: 'Classical Mythology', term: '3B', units: 0.50, grade: 98, branch: 'humanities' },
  { code: 'MSE 261', title: 'Engineering Economics', term: '3B', units: 0.50, grade: 94, branch: 'humanities' },
  { code: 'MTE 322', title: 'Electromechanical Machine Design', term: '3B', units: 0.50, grade: 95, branch: 'mechanics' },
  { code: 'MTE 352', title: 'Fluid Mechanics', term: '3B', units: 0.50, grade: 95, branch: 'thermo' },
  { code: 'MTE 360', title: 'Automatic Control Systems', term: '3B', units: 0.50, grade: 87, branch: 'controls' },
  { code: 'MTE 380', title: 'Mechatronics Design Workshop', term: '3B', units: 0.50, grade: 100, branch: 'design' },

  // Fall 2026 (4A)
  { code: 'ME 597', title: 'Special Topics in Mechanical Eng', term: '4A', units: null, grade: null, branch: 'mechanics', inProgress: true },
  { code: 'MTE 420', title: 'Power Electronics & Motor Drives', term: '4A', units: null, grade: null, branch: 'circuits', inProgress: true },
  { code: 'MTE 481', title: 'Mechatronics Design Project', term: '4A', units: null, grade: null, branch: 'design', inProgress: true },
  { code: 'MTE 484', title: 'Digital Control Applications', term: '4A', units: null, grade: null, branch: 'controls', inProgress: true },
  { code: 'MTE 544', title: 'Autonomous Mobile Robots', term: '4A', units: null, grade: null, branch: 'controls', inProgress: true },
  { code: 'STV 302', title: 'Information Technology & Society', term: '4A', units: null, grade: null, branch: 'humanities', inProgress: true }
];

const EDGES = [
  ['MATH 116', 'MATH 118'],
  ['MATH 118', 'MTE 203'],
  ['MATH 115', 'MTE 202'],
  ['MATH 115', 'MTE 204'],
  ['MATH 116', 'SYDE 182'],
  ['MATH 118', 'MTE 201'],
  ['MATH 118', 'MTE 202'],
  ['MATH 118', 'MTE 204'],
  ['MATH 118', 'MTE 309'],
  ['MTE 202', 'MTE 203'],
  ['MTE 202', 'SYDE 252'],
  ['MTE 203', 'MTE 352'],

  ['MTE 121', 'MTE 140'],
  ['MTE 121', 'MTE 204'],
  ['MTE 140', 'MTE 241'],
  ['MTE 120', 'MTE 262'],
  ['MTE 262', 'MTE 241'],
  ['MTE 262', 'MTE 325'],

  ['MTE 120', 'MTE 220'],
  ['MTE 220', 'MTE 320'],
  ['MTE 320', 'MTE 420'],

  ['MTE 119', 'MTE 219'],
  ['MTE 111', 'MTE 219'],
  ['MTE 119', 'SYDE 182'],
  ['MTE 219', 'MTE 321'],
  ['MTE 219', 'MTE 322'],
  ['SYDE 182', 'MTE 321'],
  ['MTE 321', 'MTE 322'],
  ['MTE 320', 'MTE 322'],

  ['SYDE 182', 'MTE 351'],
  ['SYDE 252', 'MTE 351'],
  ['MTE 220', 'MTE 360'],
  ['MTE 351', 'MTE 360'],
  ['MTE 360', 'MTE 484'],
  ['MTE 325', 'MTE 484'],
  ['MTE 360', 'MTE 544'],
  ['MTE 325', 'MTE 544'],

  ['MTE 100', 'MTE 380'],
  ['MTE 321', 'MTE 380'],
  ['MTE 325', 'MTE 380'],
  ['MTE 380', 'MTE 481'],
  ['MTE 322', 'MTE 481'],
  ['MTE 360', 'MTE 481'],

  ['CHE 102', 'MTE 309'],
  ['MTE 309', 'MTE 352']
];

const courseMap = new Map(COURSES.map((c) => [c.code, c]));
const prereqsOf = new Map(COURSES.map((c) => [c.code, []]));
const unlocksOf = new Map(COURSES.map((c) => [c.code, []]));

for (const [from, to] of EDGES) {
  prereqsOf.get(to)?.push(from);
  unlocksOf.get(from)?.push(to);
}

const gradeTier = (c) => {
  if (c.inProgress || c.grade === null) return 'tier-ip';
  if (c.grade >= 95) return 'tier-peak';
  if (c.grade >= 90) return 'tier-high';
  if (c.grade >= 85) return 'tier-mid';
  return 'tier-base';
};

const collectAncestors = (code, out = new Set()) => {
  for (const p of prereqsOf.get(code) || []) {
    if (!out.has(p)) {
      out.add(p);
      collectAncestors(p, out);
    }
  }
  return out;
};

const collectDescendants = (code, out = new Set()) => {
  for (const n of unlocksOf.get(code) || []) {
    if (!out.has(n)) {
      out.add(n);
      collectDescendants(n, out);
    }
  }
  return out;
};

const weightedAverage = (list) => {
  const graded = list.filter((c) => c.grade !== null && c.units);
  if (!graded.length) return null;
  const w = graded.reduce((sum, c) => sum + c.grade * c.units, 0);
  const u = graded.reduce((sum, c) => sum + c.units, 0);
  return { avg: w / u, units: u, count: graded.length };
};

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));

const state = {
  view: 'tree',
  branch: 'all',
  lockedCode: null,
  hoverCode: null
};

const activeCode = () => state.hoverCode || state.lockedCode;

const summaryEl = document.getElementById('summary');
const legendEl = document.getElementById('legend');
const treeCanvasEl = document.getElementById('tree-canvas');
const treeEdgesEl = document.getElementById('tree-edges');
const treeGridEl = document.getElementById('tree-grid');
const tableWrapEl = document.getElementById('table-wrap');
const treeViewEl = document.getElementById('tree-view');
const tableViewEl = document.getElementById('table-view');

const nodeEls = new Map();
const edgeEls = [];
const branchHeadEls = new Map();

function renderSummary() {
  const stats = weightedAverage(COURSES);
  if (stats && summaryEl) {
    summaryEl.textContent = `${stats.avg.toFixed(1)}% avg`;
  }
}

function renderTreeGrid() {
  const cells = [];

  cells.push(`<div class="corner-cell mono"></div>`);
  for (const t of TERMS) {
    const termCourses = COURSES.filter((c) => c.term === t.id);
    const avg = weightedAverage(termCourses);
    const avgLabel = avg ? `${avg.avg.toFixed(1)}%` : 'IP';
    cells.push(`
      <div class="term-head">
        <div class="term-head-top">
          <span class="term-code">${esc(t.label)}</span>
          <span class="term-avg">${esc(avgLabel)}</span>
        </div>
        <span class="term-cal">${esc(t.calendar)}</span>
      </div>
    `);
  }

  for (const b of BRANCHES) {
    const bCourses = COURSES.filter((c) => c.branch === b.id);
    const avg = weightedAverage(bCourses);
    const avgStr = avg ? `${avg.avg.toFixed(1)}%` : '';
    cells.push(`
      <div class="branch-head" data-branch-head="${esc(b.id)}">
        <button type="button" class="branch-head-btn" data-branch="${esc(b.id)}">
          <span class="branch-name">${esc(b.name)}</span>
          ${avgStr ? `<span class="branch-meta">${esc(avgStr)}</span>` : ''}
        </button>
      </div>
    `);

    for (const t of TERMS) {
      const slot = bCourses.filter((c) => c.term === t.id);
      const nodesHtml = slot
        .map((c) => {
          const tier = gradeTier(c);
          const gradeBadge = c.inProgress
            ? `<span class="node-grade">IP</span>`
            : `<span class="node-grade">${c.grade}</span>`;

          return `
            <button type="button"
              class="node ${tier}"
              data-code="${esc(c.code)}"
              data-branch="${esc(c.branch)}">
              <span class="node-top">
                <span class="node-code">${esc(c.code)}</span>
                ${gradeBadge}
              </span>
              <span class="node-name">${esc(c.title)}</span>
            </button>
          `;
        })
        .join('');

      cells.push(`<div class="tree-cell">${nodesHtml}</div>`);
    }
  }

  treeGridEl.innerHTML = cells.join('');

  nodeEls.clear();
  for (const el of treeGridEl.querySelectorAll('.node')) {
    nodeEls.set(el.dataset.code, el);
  }
  branchHeadEls.clear();
  for (const el of treeGridEl.querySelectorAll('.branch-head')) {
    branchHeadEls.set(el.dataset.branchHead, el);
  }
}

function edgeGeometry(elA, elB, canvasRect) {
  const rA = elA.getBoundingClientRect();
  const rB = elB.getBoundingClientRect();
  const sameCol = Math.abs(rA.left - rB.left) < 24;

  if (sameCol) {
    const x1 = rA.left - canvasRect.left + 2;
    const y1 = rA.top - canvasRect.top + rA.height / 2;
    const x2 = rB.left - canvasRect.left + 2;
    const y2 = rB.top - canvasRect.top + rB.height / 2;
    const bulge = 26;
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${(x1 - bulge).toFixed(1)} ${y1.toFixed(1)}, ${(x2 - bulge).toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }

  const x1 = rA.right - canvasRect.left;
  const y1 = rA.top - canvasRect.top + rA.height / 2;
  const x2 = rB.left - canvasRect.left - 2;
  const y2 = rB.top - canvasRect.top + rB.height / 2;
  const dx = Math.max(24, (x2 - x1) * 0.48);
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${(x1 + dx).toFixed(1)} ${y1.toFixed(1)}, ${(x2 - dx).toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

function drawEdges() {
  const canvasRect = treeCanvasEl.getBoundingClientRect();
  if (!canvasRect.width || !canvasRect.height) return;

  const ns = 'http://www.w3.org/2000/svg';
  treeEdgesEl.setAttribute('viewBox', `0 0 ${canvasRect.width} ${canvasRect.height}`);
  treeEdgesEl.setAttribute('width', String(canvasRect.width));
  treeEdgesEl.setAttribute('height', String(canvasRect.height));
  treeEdgesEl.innerHTML = `
    <defs>
      <marker id="arr-idle" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
        <path d="M0,1 L7,4 L0,7 Z" fill="rgba(242,239,233,0.18)"></path>
      </marker>
      <marker id="arr-prereq" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0,1 L7,4 L0,7 Z" fill="#4ade80"></path>
      </marker>
      <marker id="arr-unlock" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0,1 L7,4 L0,7 Z" fill="#68b898"></path>
      </marker>
    </defs>
  `;

  edgeEls.length = 0;

  for (const [from, to] of EDGES) {
    const elA = nodeEls.get(from);
    const elB = nodeEls.get(to);
    if (!elA || !elB) continue;

    const d = edgeGeometry(elA, elB, canvasRect);
    const cross = courseMap.get(from).branch !== courseMap.get(to).branch;

    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', `edge${cross ? ' is-cross' : ''}`);
    path.setAttribute('marker-end', 'url(#arr-idle)');
    path.dataset.from = from;
    path.dataset.to = to;
    treeEdgesEl.appendChild(path);
    edgeEls.push(path);
  }

  applyHighlights();
}

function applyHighlights() {
  const code = activeCode();
  const hasFocus = Boolean(code);
  const hasBranch = state.branch !== 'all';

  treeCanvasEl.classList.toggle('has-focus', hasFocus);
  treeCanvasEl.classList.toggle('has-branch', hasBranch);

  const ancestors = code ? collectAncestors(code) : new Set();
  const descendants = code ? collectDescendants(code) : new Set();

  for (const [bId, headEl] of branchHeadEls.entries()) {
    headEl.classList.toggle('is-on', hasBranch && state.branch === bId);
    headEl.classList.toggle('is-dim', hasBranch && state.branch !== bId);
  }

  for (const [nCode, el] of nodeEls.entries()) {
    const c = courseMap.get(nCode);
    el.classList.toggle('is-active', nCode === code);
    el.classList.toggle('is-prereq', ancestors.has(nCode));
    el.classList.toggle('is-unlock', descendants.has(nCode));
    el.classList.toggle('is-branch-dim', hasBranch && c.branch !== state.branch);
  }

  for (const path of edgeEls) {
    const { from, to } = path.dataset;
    const isPreEdge =
      Boolean(code) && (to === code || ancestors.has(to)) && (ancestors.has(from) || from === code);
    const isUnlEdge =
      Boolean(code) && (from === code || descendants.has(from)) && (descendants.has(to) || to === code);

    const cFrom = courseMap.get(from);
    const cTo = courseMap.get(to);
    const inBranch = hasBranch && (cFrom.branch === state.branch || cTo.branch === state.branch);

    path.classList.toggle('is-prereq', isPreEdge);
    path.classList.toggle('is-unlock', isUnlEdge);
    path.classList.toggle('is-branch-on', hasBranch && inBranch);
    path.classList.toggle('is-branch-dim', hasBranch && !inBranch);

    if (isPreEdge) path.setAttribute('marker-end', 'url(#arr-prereq)');
    else if (isUnlEdge) path.setAttribute('marker-end', 'url(#arr-unlock)');
    else path.setAttribute('marker-end', 'url(#arr-idle)');
  }
}

function renderTable() {
  tableWrapEl.innerHTML = TERMS.map((term) => {
    const courses = COURSES.filter((c) => c.term === term.id);
    const avg = weightedAverage(courses);
    const rightMeta = avg ? `${avg.avg.toFixed(1)}%` : 'In progress';

    const rows = courses
      .map((c) => {
        const tier = gradeTier(c);
        return `
          <tr>
            <td class="t-code">${esc(c.code)}</td>
            <td class="t-title">${esc(c.title)}</td>
            <td class="t-grade ${tier}">${c.inProgress ? 'IP' : `${c.grade}%`}</td>
          </tr>
        `;
      })
      .join('');

    return `
      <article class="term-card">
        <div class="term-card-head">
          <h2>${esc(term.label)} <span class="term-card-cal">· ${esc(term.calendar)}</span></h2>
          <span class="term-card-avg">${esc(rightMeta)}</span>
        </div>
        <table class="t-table">
          <tbody>${rows}</tbody>
        </table>
      </article>
    `;
  }).join('');
}

function setBranch(branchId) {
  state.branch = state.branch === branchId ? 'all' : branchId;
  applyHighlights();
}

function setView(view) {
  state.view = view;
  for (const btn of document.querySelectorAll('.seg-btn')) {
    const on = btn.dataset.view === view;
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-selected', String(on));
  }
  treeViewEl.hidden = view !== 'tree';
  tableViewEl.hidden = view !== 'table';
  if (legendEl) legendEl.hidden = view !== 'tree';
  if (view === 'tree') requestAnimationFrame(drawEdges);
}

function bindEvents() {
  document.querySelector('.seg')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (btn) setView(btn.dataset.view);
  });

  treeGridEl.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'touch') return;
    const node = e.target.closest('.node');
    if (!node) return;
    if (state.hoverCode !== node.dataset.code) {
      state.hoverCode = node.dataset.code;
      applyHighlights();
    }
  });

  treeGridEl.addEventListener('pointerout', (e) => {
    if (e.pointerType === 'touch') return;
    const node = e.target.closest('.node');
    if (!node) return;
    const related = e.relatedTarget?.closest?.('.node');
    if (!related) {
      state.hoverCode = null;
      applyHighlights();
    }
  });

  treeGridEl.addEventListener('focusin', (e) => {
    const node = e.target.closest('.node');
    if (node) {
      state.hoverCode = node.dataset.code;
      applyHighlights();
    }
  });

  treeGridEl.addEventListener('focusout', (e) => {
    const node = e.target.closest('.node');
    if (node && !treeGridEl.contains(e.relatedTarget)) {
      state.hoverCode = null;
      applyHighlights();
    }
  });

  treeGridEl.addEventListener('click', (e) => {
    const branchBtn = e.target.closest('.branch-head-btn');
    if (branchBtn) {
      setBranch(branchBtn.dataset.branch);
      return;
    }
    const node = e.target.closest('.node');
    if (node) {
      state.lockedCode = state.lockedCode === node.dataset.code ? null : node.dataset.code;
      state.hoverCode = null;
      applyHighlights();
      return;
    }
    if (state.lockedCode || state.branch !== 'all') {
      state.lockedCode = null;
      state.branch = 'all';
      applyHighlights();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && (state.lockedCode || state.branch !== 'all')) {
      state.lockedCode = null;
      state.branch = 'all';
      applyHighlights();
    }
  });

  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(() => drawEdges());
    ro.observe(treeCanvasEl);
  } else {
    window.addEventListener('resize', drawEdges);
  }
  document.fonts?.ready?.then(drawEdges);
}

renderSummary();
renderTreeGrid();
renderTable();
bindEvents();
drawEdges();
