// Interactive Mechatronics Engineering grade skill tree for grades.html.
// Data sourced strictly from Quest ("View My Grades", Nov 17 2026).

const TERMS = [
  { id: '1A', label: '1A', calendar: 'Fall 2022', coopBefore: null },
  { id: '1B', label: '1B', calendar: 'Winter 2023', coopBefore: null },
  { id: '2A', label: '2A', calendar: 'Fall 2023', coopBefore: 'COOP 1 · S23' },
  { id: '2B', label: '2B', calendar: 'Spring 2024', coopBefore: 'COOP 2 · W24' },
  { id: '3A', label: '3A', calendar: 'Winter 2025', coopBefore: 'COOP 3 · F24' },
  { id: '3B', label: '3B', calendar: 'Fall 2025', coopBefore: 'COOP 4 · S25' },
  { id: '4A', label: '4A', calendar: 'Fall 2026', coopBefore: 'COOP 5–6 · 2026', inProgress: true }
];

const BRANCHES = [
  { id: 'math', name: 'Math Foundations', short: 'Math' },
  { id: 'embedded', name: 'Embedded & Computing', short: 'Embedded' },
  { id: 'controls', name: 'Controls & Systems', short: 'Controls' },
  { id: 'circuits', name: 'Circuits & Electronics', short: 'Circuits' },
  { id: 'mechanics', name: 'Mechanics & Solids', short: 'Mechanics' },
  { id: 'design', name: 'Design', short: 'Design' },
  { id: 'thermo', name: 'Thermofluids & Chem', short: 'Thermofluids' },
  { id: 'humanities', name: 'Humanities & Business', short: 'Humanities' }
];

const COURSES = [
  // Fall 2022 (1A)
  { code: 'CHE 102', title: 'Chemistry for Engineers', term: '1A', units: 0.50, grade: 83, branch: 'thermo' },
  { code: 'MATH 115', title: 'Linear Algebra (Eng)', term: '1A', units: 0.50, grade: 86, branch: 'math' },
  { code: 'MATH 116', title: 'Calculus 1 (Eng)', term: '1A', units: 0.50, grade: 90, branch: 'math' },
  { code: 'MTE 100', title: 'Mechatronics Engineering', term: '1A', units: 0.75, grade: 87, branch: 'design' },
  { code: 'MTE 121', title: 'Digital Computation', term: '1A', units: 0.50, grade: 97, branch: 'embedded' },

  // Winter 2023 (1B)
  { code: 'MATH 118', title: 'Calculus 2 (Eng)', term: '1B', units: 0.50, grade: 99, branch: 'math' },
  { code: 'MTE 111', title: 'Material Struct & Props', term: '1B', units: 0.50, grade: 92, branch: 'mechanics' },
  { code: 'MTE 119', title: 'Statics', term: '1B', units: 0.50, grade: 81, branch: 'mechanics' },
  { code: 'MTE 120', title: 'Circuits', term: '1B', units: 0.75, grade: 97, branch: 'circuits' },
  { code: 'MTE 140', title: 'Algorithms & Data Structures', term: '1B', units: 0.50, grade: 92, branch: 'embedded' },

  // Fall 2023 (2A)
  { code: 'MTE 201', title: 'Exp Measure & Stat Analysis', term: '2A', units: 0.50, grade: 87, branch: 'math' },
  { code: 'MTE 202', title: 'Ordinary Differential Equation', term: '2A', units: 0.50, grade: 89, branch: 'math' },
  { code: 'MTE 219', title: 'Mechanics of Deformable Solids', term: '2A', units: 0.50, grade: 86, branch: 'mechanics' },
  { code: 'MTE 262', title: 'Microprocessors & Digi Logic', term: '2A', units: 0.50, grade: 89, branch: 'embedded' },
  { code: 'PHIL 145', title: 'Critical Thinking', term: '2A', units: 0.50, grade: 85, branch: 'humanities' },
  { code: 'SYDE 182', title: 'Physics 2: Dynamics', term: '2A', units: 0.50, grade: 90, branch: 'mechanics' },

  // Spring 2024 (2B)
  { code: 'MTE 203', title: 'Advanced Calculus', term: '2B', units: 0.50, grade: 89, branch: 'math' },
  { code: 'MTE 204', title: 'Numerical Methods', term: '2B', units: 0.50, grade: 89, branch: 'math' },
  { code: 'MTE 220', title: 'Sensors & Instrumentation', term: '2B', units: 0.50, grade: 90, branch: 'circuits' },
  { code: 'MTE 241', title: 'Comp Struct & Real-Time Sys', term: '2B', units: 0.50, grade: 82, branch: 'embedded' },
  { code: 'SYDE 252', title: 'Linear Systems & Signals', term: '2B', units: 0.50, grade: 87, branch: 'controls' },

  // Winter 2025 (3A)
  { code: 'MTE 309', title: 'Intro Thermodyn & Heat Transf', term: '3A', units: 0.50, grade: 90, branch: 'thermo' },
  { code: 'MTE 320', title: 'Actuators & Power Electronics', term: '3A', units: 0.50, grade: 92, branch: 'circuits' },
  { code: 'MTE 321', title: 'Design & Dynamics of Machines', term: '3A', units: 0.50, grade: 94, branch: 'mechanics' },
  { code: 'MTE 325', title: 'Microprocessor Sys & Interface', term: '3A', units: 0.50, grade: 92, branch: 'embedded' },
  { code: 'MTE 351', title: 'Systems Models', term: '3A', units: 0.50, grade: 91, branch: 'controls' },

  // Fall 2025 (3B)
  { code: 'CLAS 104', title: 'Classical Mythology', term: '3B', units: 0.50, grade: 98, branch: 'humanities' },
  { code: 'MSE 261', title: 'Eng Economics: Fin Mgmt', term: '3B', units: 0.50, grade: 94, branch: 'humanities' },
  { code: 'MTE 322', title: 'Electromech Machine Design', term: '3B', units: 0.50, grade: 95, branch: 'mechanics' },
  { code: 'MTE 352', title: 'Fluid Mechanics 1', term: '3B', units: 0.50, grade: 95, branch: 'thermo' },
  { code: 'MTE 360', title: 'Automatic Control Systems', term: '3B', units: 0.50, grade: 87, branch: 'controls' },
  { code: 'MTE 380', title: 'Design Workshop', term: '3B', units: 0.50, grade: 100, branch: 'design' },

  // Fall 2026 (4A, in progress, grades Dec 24 2026)
  { code: 'ME 597', title: 'Special Topics', term: '4A', units: null, grade: null, branch: 'mechanics', inProgress: true },
  { code: 'MTE 420', title: 'Pwr Electronics & Motor Drives', term: '4A', units: null, grade: null, branch: 'circuits', inProgress: true },
  { code: 'MTE 481', title: 'Design Project 1', term: '4A', units: null, grade: null, branch: 'design', inProgress: true },
  { code: 'MTE 484', title: 'Digital Control Applications', term: '4A', units: null, grade: null, branch: 'controls', inProgress: true },
  { code: 'MTE 544', title: 'Autonomous Mobile Robots', term: '4A', units: null, grade: null, branch: 'controls', inProgress: true },
  { code: 'STV 302', title: 'Info Technology & Society', term: '4A', units: null, grade: null, branch: 'humanities', inProgress: true }
];

// Real UW Mechatronics prerequisite & curriculum progression links
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

// Conceptual insights attached to existing formal prereq edges (no duplicate SVG edge drawn)
const PREREQ_NOTES = new Map([
  ['MTE 309|MTE 352', 'Conservation of mass, momentum, and energy govern both heat transfer and fluid flow.'],
  ['MTE 111|MTE 219', "Crystal lattice bonding and microstructure set Young's modulus, yield strength, and failure modes."],
  ['MTE 219|MTE 321', 'Stress-strain and fatigue criteria bound dynamic loads on shafts, bearings, and linkages.'],
  ['MTE 219|MTE 322', 'Torsion, bending, and deflection formulas size electromechanical housings, shafts, and gears.'],
  ['MTE 120|MTE 220', 'Op-amp topologies, impedance, and RC filtering turn raw transducer voltages into clean signals.'],
  ['MTE 220|MTE 320', 'Closed-loop current and position sensing enables safe switching and PWM actuator drive.'],
  ['MTE 320|MTE 420', 'Single-phase switching and H-bridges scale into three-phase inverters and FOC motor drives.'],
  ['MTE 351|MTE 360', 'Bond-graph and transfer-function models become the feedback plants stabilized in MTE 360.'],
  ['MTE 360|MTE 484', 'Continuous PID and root-locus designs map to z-domain difference equations on MCUs.'],
  ['MTE 380|MTE 481', 'Rapid prototyping and subsystem integration habits scale directly into the two-term capstone.']
]);

// Cross-topic conceptual connections (distinct dashed lavender edges; none overlap EDGES)
const CONCEPTUAL_LINKS = [
  ['MATH 115', 'MTE 351', 'State-space matrices, eigenvalues, and modal decomposition model multi-DOF systems.'],
  ['MATH 115', 'MTE 360', 'Controllability, observability, and state-feedback pole placement rely on matrix algebra.'],
  ['MATH 115', 'MTE 544', 'SE(2)/SE(3) transforms, Jacobians, and covariance matrices underpin SLAM and localization.'],

  ['MTE 120', 'MTE 202', 'RC/RL/RLC circuit transients in MTE 120 are the exact 1st- and 2nd-order ODEs solved in MTE 202.'],
  ['MTE 202', 'MTE 321', 'Equations of motion for linkages, cams, and rotating machinery are coupled differential equations.'],
  ['MTE 202', 'MTE 360', 'Time-domain ODEs govern closed-loop damping, overshoot, and steady-state error.'],

  ['SYDE 252', 'MTE 484', 'Sampling, aliasing, and z-transforms bridge continuous-time signals to discrete digital controllers.'],
  ['MTE 204', 'ME 597', 'Gradient optimization, linear solvers, and numerical integration scale into computational ML/engineering.'],
  ['MTE 204', 'MTE 484', 'Discretization (Tustin/Euler) and numerical stability link continuous control laws to MCU code.'],

  ['MTE 201', 'MTE 544', 'Measurement uncertainty, Gaussian noise, and covariance propagation drive Kalman filters in robotics.'],
  ['MTE 220', 'MTE 544', 'IMU, encoder, and rangefinder signal conditioning and calibration feed robot perception.'],
  ['MTE 140', 'MTE 544', 'Graph search (A*/Dijkstra) and spatial data structures power robot path planning.'],
  ['MTE 241', 'MTE 484', 'Deterministic RTOS scheduling, ISRs, and jitter bounds keep digital control loops stable.'],
  ['MTE 241', 'MTE 544', 'Real-time task scheduling and concurrency coordinate perception, planning, and actuation loops.'],

  ['MTE 309', 'MTE 420', 'Conduction, convection, and thermal resistance curves size heatsinks for motor-drive inverters.'],

  ['PHIL 145', 'MTE 380', 'Clear problem framing and logical rigor guide open-ended design reviews.'],
  ['PHIL 145', 'MTE 481', 'Structured argumentation and fallacy checks sharpen engineering trade-off justification.'],
  ['PHIL 145', 'STV 302', 'Formal reasoning and argument analysis anchor technology-and-society ethics critique.'],
  ['STV 302', 'MTE 481', 'Societal impact, safety, and tech ethics frame capstone design choices in MTE 481.'],
  ['MSE 261', 'MTE 481', 'BOM costing, NPV, and lifecycle economics ground capstone component and build trade-offs.'],

  ['CLAS 104', 'MTE 544', "Hephaestus's self-moving tripods and Talos the bronze sentinel are humanity's earliest dreams of autonomous robots."]
];

const QUIET_RECORDS = [
  {
    term: '1A',
    items: [
      'GENE 119 · Problems Seminar (Non-graded)',
      'MTHEL 99 · First-Year Math Readiness (CR)'
    ]
  },
  { term: '1B', items: ['MTE 100B · Seminar (Non-graded)'] },
  { term: 'Spring 2023 Co-op', items: ['COOP 1 (CR)', 'PD 19 · Tactics for Workplace Success (CR)'] },
  { term: '2A', items: ['MTE 200A · Seminar (Non-graded)'] },
  { term: 'Winter 2024 Co-op', items: ['COOP 2 (CR)', 'PD 20 · Strategies for Career Success (CR)'] },
  {
    term: '2B',
    items: [
      'MTE 200B · Seminar (Non-graded)',
      'WKRPT 100 · Work-term Report · 0.13 u · 75 (not in GPA)'
    ]
  },
  { term: 'Fall 2024 Co-op', items: ['COOP 3 (CR)', 'PD 22 · Eng Professionalism & Ethics (CR)'] },
  {
    term: '3A',
    items: [
      'MTE 300A · Seminar (Non-graded)',
      'WKRPT 200 · Work-term Report · 0.13 u · 89 (not in GPA)'
    ]
  },
  { term: 'Spring 2025 Co-op', items: ['COOP 4 (CR)', 'PD 9 · Ethical Decision Making (CR)'] },
  { term: '3B', items: ['MTE 300B · Seminar (Non-graded)'] },
  { term: 'Winter 2026 Co-op', items: ['COOP 5 (CR)', 'PD 5 · Project Management (CR)'] },
  { term: 'Spring 2026 Co-op', items: ['COOP 6 (CR)'] },
  { term: '4A', items: ['MTE 400A · Seminar (Non-graded)'] }
];

// Index lookups
const courseMap = new Map(COURSES.map((c) => [c.code, c]));
const termMap = new Map(TERMS.map((t) => [t.id, t]));
const branchMap = new Map(BRANCHES.map((b) => [b.id, b]));
const prereqsOf = new Map(COURSES.map((c) => [c.code, []]));
const unlocksOf = new Map(COURSES.map((c) => [c.code, []]));
const conceptsOf = new Map(COURSES.map((c) => [c.code, []]));

for (const [from, to] of EDGES) {
  prereqsOf.get(to)?.push(from);
  unlocksOf.get(from)?.push(to);
}

for (const [from, to, why] of CONCEPTUAL_LINKS) {
  conceptsOf.get(from)?.push({ partner: to, why, kind: 'concept' });
  conceptsOf.get(to)?.push({ partner: from, why, kind: 'concept' });
}

const getCourseInsights = (code) => {
  const items = [...(conceptsOf.get(code) || [])];
  for (const p of prereqsOf.get(code) || []) {
    const why = PREREQ_NOTES.get(`${p}|${code}`);
    if (why) items.push({ partner: p, why, kind: 'prereq', dir: 'from' });
  }
  for (const n of unlocksOf.get(code) || []) {
    const why = PREREQ_NOTES.get(`${code}|${n}`);
    if (why) items.push({ partner: n, why, kind: 'prereq', dir: 'to' });
  }
  return items;
};

const gradeTier = (c) => {
  if (c.inProgress || c.grade === null) return 'tier-ip';
  if (c.grade >= 95) return 'tier-peak';
  if (c.grade >= 90) return 'tier-high';
  if (c.grade >= 85) return 'tier-mid';
  return 'tier-base';
};

const barPercent = (grade) => {
  if (grade === null) return 0;
  return Math.max(8, Math.min(100, ((grade - 72) / 28) * 100));
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

// Application state
const state = {
  view: 'tree',
  branch: 'all',
  lockedCode: null,
  hoverCode: null,
  hoverEdge: null
};

const activeCode = () => state.hoverCode || state.lockedCode;

// DOM references
const summaryEl = document.getElementById('summary');
const branchBarEl = document.getElementById('branch-bar');
const inspectorEl = document.getElementById('inspector');
const treeCanvasEl = document.getElementById('tree-canvas');
const treeEdgesEl = document.getElementById('tree-edges');
const treeGridEl = document.getElementById('tree-grid');
const edgeTipEl = document.getElementById('edge-tip');
const mobileFlowEl = document.getElementById('mobile-flow');
const tableWrapEl = document.getElementById('table-wrap');
const quietGridEl = document.getElementById('quiet-grid');
const treeViewEl = document.getElementById('tree-view');
const tableViewEl = document.getElementById('table-view');
const sheetEl = document.getElementById('sheet');
const sheetPanelEl = document.getElementById('sheet-panel');
const sheetScrimEl = document.getElementById('sheet-scrim');

const nodeEls = new Map();
const edgeEls = [];
const branchHeadEls = new Map();

function renderSummary() {
  const stats = weightedAverage(COURSES);
  const inProgCount = COURSES.filter((c) => c.inProgress).length;
  summaryEl.innerHTML = [
    { val: `${stats.avg.toFixed(2)}%`, lbl: 'Cumulative avg', sub: `${stats.units.toFixed(2)} graded units` },
    { val: `${stats.count}`, lbl: 'Graded courses', sub: 'Terms 1A – 3B (81 to 100)' },
    { val: `${inProgCount}`, lbl: 'In progress (4A)', sub: 'Grades due Dec 24, 2026' },
    { val: '6 / 6', lbl: 'Co-op work terms', sub: 'All academic terms Excellent' }
  ]
    .map(
      (s) =>
        `<div class="stat"><span class="stat-val">${esc(s.val)}</span><span class="stat-lbl mono">${esc(s.lbl)}</span><span class="stat-sub">${esc(s.sub)}</span></div>`
    )
    .join('');
}

function renderBranchBar() {
  const buttons = [
    { id: 'all', label: 'All Branches', count: COURSES.length },
    ...BRANCHES.map((b) => ({
      id: b.id,
      label: b.short,
      count: COURSES.filter((c) => c.branch === b.id).length
    }))
  ];

  branchBarEl.innerHTML = buttons
    .map(
      (b) =>
        `<button type="button" class="pill${state.branch === b.id ? ' is-on' : ''}" data-branch="${esc(b.id)}">${esc(b.label)} <span class="pill-count">${b.count}</span></button>`
    )
    .join('');
}

function renderTreeGrid() {
  const cells = [];

  // Header row: corner + 7 academic terms
  cells.push(`<div class="corner-cell mono">Skill Branch</div>`);
  for (const t of TERMS) {
    const termCourses = COURSES.filter((c) => c.term === t.id);
    const avg = weightedAverage(termCourses);
    const avgLabel = avg ? `${avg.avg.toFixed(1)}%` : 'In Prog';
    cells.push(`
      <div class="term-head">
        ${t.coopBefore ? `<span class="coop-gap" title="${esc(t.coopBefore)}">${esc(t.coopBefore)}</span>` : ''}
        <div class="term-head-top">
          <span class="term-code">${esc(t.label)}</span>
          <span class="term-avg">${esc(avgLabel)}</span>
        </div>
        <span class="term-cal">${esc(t.calendar)}</span>
      </div>
    `);
  }

  // Branch rows
  for (const b of BRANCHES) {
    const bCourses = COURSES.filter((c) => c.branch === b.id);
    const avg = weightedAverage(bCourses);
    const avgStr = avg ? `${avg.avg.toFixed(1)}% avg` : 'In progress';
    cells.push(`
      <div class="branch-head" data-branch-head="${esc(b.id)}">
        <button type="button" class="branch-head-btn" data-branch="${esc(b.id)}" aria-label="Filter ${esc(b.name)}">
          <span class="branch-name">${esc(b.name)}</span>
          <span class="branch-meta">${bCourses.length} courses · ${esc(avgStr)}</span>
        </button>
      </div>
    `);

    for (const t of TERMS) {
      const slot = bCourses.filter((c) => c.term === t.id);
      const nodesHtml = slot
        .map((c) => {
          const tier = gradeTier(c);
          const hundred = c.grade === 100 ? ' is-hundred' : '';
          const unitBadge = c.units && c.units !== 0.50 ? `<span class="node-unit">${c.units.toFixed(2)}u</span>` : '';
          const gradeBadge = c.inProgress
            ? `<span class="node-grade"><i class="ip-dot" aria-hidden="true"></i>4A</span>`
            : `<span class="node-grade">${c.grade}</span>`;
          const bar = c.inProgress
            ? ''
            : `<span class="node-bar" aria-hidden="true"><i style="width:${barPercent(c.grade).toFixed(1)}%"></i></span>`;
          const ariaGrade = c.inProgress ? 'In progress, grades due Dec 24, 2026' : `${c.grade} percent`;

          return `
            <button type="button"
              class="node ${tier}${hundred}"
              data-code="${esc(c.code)}"
              data-branch="${esc(c.branch)}"
              aria-label="${esc(c.code)}: ${esc(c.title)}, ${esc(t.calendar)} ${esc(t.label)}, ${ariaGrade}">
              <span class="node-top">
                <span class="node-code">${esc(c.code)}${unitBadge}</span>
                ${gradeBadge}
              </span>
              <span class="node-name">${esc(c.title)}</span>
              ${bar}
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

function edgeGeometry(elA, elB, canvasRect, curveOffset = 0) {
  const rA = elA.getBoundingClientRect();
  const rB = elB.getBoundingClientRect();
  const sameCol = Math.abs(rA.left - rB.left) < 24;

  if (sameCol) {
    const x1 = rA.left - canvasRect.left + 2;
    const y1 = rA.top - canvasRect.top + rA.height / 2;
    const x2 = rB.left - canvasRect.left + 2;
    const y2 = rB.top - canvasRect.top + rB.height / 2;
    const bulge = 28 + Math.abs(curveOffset);
    const d = `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${(x1 - bulge).toFixed(1)} ${y1.toFixed(1)}, ${(x2 - bulge).toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    return { d, mx: x1 - bulge * 0.75, my: (y1 + y2) / 2 };
  }

  const x1 = rA.right - canvasRect.left;
  const y1 = rA.top - canvasRect.top + rA.height / 2;
  const x2 = rB.left - canvasRect.left - 2;
  const y2 = rB.top - canvasRect.top + rB.height / 2;
  const dx = Math.max(26, (x2 - x1) * 0.48);
  const cy1 = y1 + curveOffset;
  const cy2 = y2 + curveOffset;
  const d = `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${(x1 + dx).toFixed(1)} ${cy1.toFixed(1)}, ${(x2 - dx).toFixed(1)} ${cy2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  return { d, mx: (x1 + x2) / 2, my: (y1 + y2) / 2 + curveOffset * 0.75 };
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
        <path d="M0,1 L7,4 L0,7 Z" fill="rgba(242,239,233,0.22)"></path>
      </marker>
      <marker id="arr-prereq" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0,1 L7,4 L0,7 Z" fill="#f0dfba"></path>
      </marker>
      <marker id="arr-unlock" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0,1 L7,4 L0,7 Z" fill="#7dd3b0"></path>
      </marker>
      <marker id="arr-concept" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
        <path d="M0,1 L7,4 L0,7 Z" fill="rgba(184,156,245,0.45)"></path>
      </marker>
      <marker id="arr-concept-on" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0,1 L7,4 L0,7 Z" fill="#d0befa"></path>
      </marker>
    </defs>
  `;

  edgeEls.length = 0;

  const addEdge = (from, to, kind, why = '', offset = 0) => {
    const elA = nodeEls.get(from);
    const elB = nodeEls.get(to);
    if (!elA || !elB) return;

    const { d, mx, my } = edgeGeometry(elA, elB, canvasRect, offset);
    const cross = courseMap.get(from).branch !== courseMap.get(to).branch;

    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d);
    path.setAttribute(
      'class',
      `edge${kind === 'concept' ? ' is-concept' : ''}${cross ? ' is-cross' : ''}`
    );
    path.setAttribute('marker-end', kind === 'concept' ? 'url(#arr-concept)' : 'url(#arr-idle)');
    path.dataset.from = from;
    path.dataset.to = to;
    path.dataset.kind = kind;
    path.dataset.why = why;
    path.dataset.mx = String(mx);
    path.dataset.my = String(my);
    treeEdgesEl.appendChild(path);
    edgeEls.push(path);

    if (why) {
      const hit = document.createElementNS(ns, 'path');
      hit.setAttribute('d', d);
      hit.setAttribute('class', 'edge-hit');
      hit.dataset.edgeIdx = String(edgeEls.length - 1);
      treeEdgesEl.appendChild(hit);
    }
  };

  for (const [from, to] of EDGES) {
    addEdge(from, to, 'prereq', PREREQ_NOTES.get(`${from}|${to}`) || '', 0);
  }
  for (const [from, to, why] of CONCEPTUAL_LINKS) {
    addEdge(from, to, 'concept', why, -10);
  }

  applyHighlights();
}

function renderMobileFlow() {
  const activeBranches = state.branch === 'all' ? BRANCHES : BRANCHES.filter((b) => b.id === state.branch);

  mobileFlowEl.innerHTML = activeBranches
    .map((b) => {
      const bCourses = COURSES.filter((c) => c.branch === b.id);
      const avg = weightedAverage(bCourses);
      const avgText = avg ? `${avg.avg.toFixed(1)}% avg` : 'In progress';

      const itemsHtml = bCourses
        .map((c) => {
          const tier = gradeTier(c);
          const t = termMap.get(c.term);
          const pre = prereqsOf.get(c.code) || [];
          const next = unlocksOf.get(c.code) || [];
          const linksText = [
            pre.length ? `from ${pre.join(', ')}` : '',
            next.length ? `→ ${next.join(', ')}` : ''
          ]
            .filter(Boolean)
            .join(' · ');

          const insights = getCourseInsights(c.code);
          const insightsHtml = insights.length
            ? `<div class="m-concepts">${insights
                .map(
                  (item) =>
                    `<span class="m-concept-line${item.kind === 'prereq' ? ' is-prereq-note' : ''}"><b>${
                      item.kind === 'prereq' ? (item.dir === 'from' ? `from ${esc(item.partner)}` : `→ ${esc(item.partner)}`) : `↔ ${esc(item.partner)}`
                    }</b>${esc(item.why)}</span>`
                )
                .join('')}</div>`
            : '';

          return `
            <div class="m-item ${tier}">
              <button type="button" class="node ${tier}${c.grade === 100 ? ' is-hundred' : ''}" data-mobile-code="${esc(c.code)}">
                <span class="node-top">
                  <span class="node-code">${esc(c.code)} · ${esc(t.label)} (${esc(t.calendar)})</span>
                  ${
                    c.inProgress
                      ? `<span class="node-grade"><i class="ip-dot" aria-hidden="true"></i>IP</span>`
                      : `<span class="node-grade">${c.grade}%</span>`
                  }
                </span>
                <span class="node-name">${esc(c.title)}</span>
                ${
                  c.inProgress
                    ? `<span class="m-node-sub">Grades due Dec 24, 2026${linksText ? ` · ${esc(linksText)}` : ''}</span>`
                    : `<span class="m-node-sub">${c.units.toFixed(2)} units${linksText ? ` · ${esc(linksText)}` : ''}</span>`
                }
                ${c.inProgress ? '' : `<span class="node-bar" aria-hidden="true"><i style="width:${barPercent(c.grade).toFixed(1)}%"></i></span>`}
                ${insightsHtml}
              </button>
            </div>
          `;
        })
        .join('');

      return `
        <article class="m-branch">
          <div class="m-branch-head">
            <h2>${esc(b.name)}</h2>
            <span>${bCourses.length} courses · ${esc(avgText)}</span>
          </div>
          <div class="m-rail">${itemsHtml}</div>
        </article>
      `;
    })
    .join('');
}

function renderEdgeTip() {
  const edge = state.hoverEdge;
  if (!edge || !edge.why) {
    edgeTipEl.hidden = true;
    return;
  }
  const isPrereq = edge.kind === 'prereq';
  edgeTipEl.classList.toggle('is-prereq-tip', isPrereq);
  edgeTipEl.innerHTML = `
    <div class="edge-tip-head">${esc(edge.from)} → ${esc(edge.to)} · ${isPrereq ? 'Prerequisite insight' : 'Cross-topic link'}</div>
    <div class="edge-tip-body">${esc(edge.why)}</div>
  `;
  const w = treeCanvasEl.clientWidth || 1180;
  const x = Math.max(170, Math.min(w - 170, edge.mx));
  const y = Math.max(66, edge.my);
  edgeTipEl.style.left = `${x.toFixed(0)}px`;
  edgeTipEl.style.top = `${y.toFixed(0)}px`;
  edgeTipEl.hidden = false;
}

function renderInspector() {
  const code = activeCode();
  if (!code) {
    const branchLabel = state.branch === 'all' ? 'All 8 branches' : branchMap.get(state.branch).name;
    inspectorEl.innerHTML = `
      <div class="inspector-idle">
        <span>Hover or click any course node to trace prerequisites and cross-topic links (${esc(branchLabel)}). Hover dashed edges for connection notes.</span>
        <span class="mono">Tip: Click a node to lock selection</span>
      </div>
    `;
    return;
  }

  const c = courseMap.get(code);
  const t = termMap.get(c.term);
  const b = branchMap.get(c.branch);
  const tier = gradeTier(c);
  const pre = prereqsOf.get(code) || [];
  const next = unlocksOf.get(code) || [];
  const insights = getCourseInsights(code);

  const preHtml = pre.length
    ? `<div class="link-group"><span class="link-lbl">Prereqs</span>${pre
        .map((p) => `<button type="button" class="chip-link is-prereq" data-jump="${esc(p)}">← ${esc(p)}</button>`)
        .join('')}</div>`
    : '';
  const nextHtml = next.length
    ? `<div class="link-group"><span class="link-lbl">Feeds</span>${next
        .map((n) => `<button type="button" class="chip-link is-unlock" data-jump="${esc(n)}">${esc(n)} →</button>`)
        .join('')}</div>`
    : '';

  const insightsHtml = insights.length
    ? `<div class="inspector-concepts">${insights
        .map((item) => {
          const isPre = item.kind === 'prereq';
          const chipClass = isPre ? (item.dir === 'from' ? 'is-prereq' : 'is-unlock') : 'is-concept';
          const arrow = isPre ? (item.dir === 'from' ? '← ' : '→ ') : '↔ ';
          const tag = isPre ? '<span class="concept-tag">Prereq</span>' : '';
          return `<div class="concept-item"><button type="button" class="chip-link ${chipClass}" data-jump="${esc(item.partner)}">${arrow}${esc(item.partner)}</button>${tag}<span class="concept-why">${esc(item.why)}</span></div>`;
        })
        .join('')}</div>`
    : '';

  const unitLabel = c.inProgress ? 'In progress · Grades Dec 24, 2026' : `${c.units.toFixed(2)} units`;
  const gradeHtml = c.inProgress
    ? `<span class="grade-big tier-ip">In Progress</span>`
    : `<span class="grade-big ${tier}">${c.grade}%</span>`;

  inspectorEl.innerHTML = `
    <div class="inspector-row">
      <div class="inspector-main">
        <div class="inspector-top">
          <span class="ins-code">${esc(c.code)}</span>
          <span class="ins-meta">${esc(t.calendar)} · ${esc(t.label)} · ${esc(unitLabel)} · ${esc(b.name)}</span>
        </div>
        <h2 class="ins-title">${esc(c.title)}</h2>
      </div>
      <div class="inspector-links">${preHtml}${nextHtml}</div>
      <div class="inspector-grade">
        ${gradeHtml}
        ${state.lockedCode ? `<button type="button" class="clear-btn" data-clear-lock>Clear</button>` : ''}
      </div>
    </div>
    ${insightsHtml}
  `;
}

function applyHighlights() {
  const code = activeCode();
  const hoverEdge = state.hoverEdge;
  const hasFocus = Boolean(code || hoverEdge);
  const hasBranch = state.branch !== 'all';

  treeCanvasEl.classList.toggle('has-focus', hasFocus);
  treeCanvasEl.classList.toggle('has-branch', hasBranch);

  const ancestors = code ? collectAncestors(code) : new Set();
  const descendants = code ? collectDescendants(code) : new Set();
  const conceptPartners = new Set(code ? (conceptsOf.get(code) || []).map((i) => i.partner) : []);

  for (const [bId, headEl] of branchHeadEls.entries()) {
    headEl.classList.toggle('is-on', hasBranch && state.branch === bId);
    headEl.classList.toggle('is-dim', hasBranch && state.branch !== bId);
  }

  for (const [nCode, el] of nodeEls.entries()) {
    const c = courseMap.get(nCode);
    const isEdgeEnd = hoverEdge && (hoverEdge.from === nCode || hoverEdge.to === nCode);
    el.classList.toggle('is-active', nCode === code || Boolean(isEdgeEnd && hoverEdge.kind === 'prereq'));
    el.classList.toggle('is-prereq', ancestors.has(nCode));
    el.classList.toggle('is-unlock', descendants.has(nCode));
    el.classList.toggle('is-concept', conceptPartners.has(nCode) || Boolean(isEdgeEnd && hoverEdge.kind === 'concept'));
    el.classList.toggle('is-branch-dim', hasBranch && c.branch !== state.branch);
  }

  for (const path of edgeEls) {
    const { from, to, kind } = path.dataset;
    const isHoveredEdge = hoverEdge && hoverEdge.from === from && hoverEdge.to === to && hoverEdge.kind === kind;

    const isPreEdge =
      kind === 'prereq' && Boolean(code) && (to === code || ancestors.has(to)) && (ancestors.has(from) || from === code);
    const isUnlEdge =
      kind === 'prereq' && Boolean(code) && (from === code || descendants.has(from)) && (descendants.has(to) || to === code);
    const isConceptEdge = kind === 'concept' && Boolean(code) && (from === code || to === code);

    const cFrom = courseMap.get(from);
    const cTo = courseMap.get(to);
    const inBranch = hasBranch && (cFrom.branch === state.branch || cTo.branch === state.branch);

    path.classList.toggle('is-prereq', isPreEdge);
    path.classList.toggle('is-unlock', isUnlEdge);
    path.classList.toggle('is-concept-on', isConceptEdge);
    path.classList.toggle('is-edge-hover', Boolean(isHoveredEdge));
    path.classList.toggle('is-branch-on', hasBranch && inBranch);
    path.classList.toggle('is-branch-dim', hasBranch && !inBranch);

    if (isHoveredEdge) {
      path.setAttribute('marker-end', kind === 'concept' ? 'url(#arr-concept-on)' : 'url(#arr-prereq)');
    } else if (isPreEdge) path.setAttribute('marker-end', 'url(#arr-prereq)');
    else if (isUnlEdge) path.setAttribute('marker-end', 'url(#arr-unlock)');
    else if (isConceptEdge) path.setAttribute('marker-end', 'url(#arr-concept-on)');
    else path.setAttribute('marker-end', kind === 'concept' ? 'url(#arr-concept)' : 'url(#arr-idle)');
  }

  renderEdgeTip();
  renderInspector();
}

function renderTable() {
  const filteredTerms = TERMS.map((t) => {
    const termCourses = COURSES.filter(
      (c) => c.term === t.id && (state.branch === 'all' || c.branch === state.branch)
    );
    return { term: t, courses: termCourses };
  }).filter((group) => group.courses.length > 0);

  tableWrapEl.innerHTML = filteredTerms
    .map(({ term, courses }) => {
      const avg = weightedAverage(courses);
      const rightMeta = avg ? `${avg.avg.toFixed(2)}% term avg` : 'Grades Dec 24, 2026';

      const rows = courses
        .map((c) => {
          const tier = gradeTier(c);
          const b = branchMap.get(c.branch);
          return `
            <tr>
              <td class="t-code">${esc(c.code)}</td>
              <td class="t-title"><button type="button" data-table-jump="${esc(c.code)}">${esc(c.title)}</button><div class="mono" style="font-size:9.5px;color:var(--faint)">${esc(b.short)}</div></td>
              <td class="t-units">${c.units ? c.units.toFixed(2) : '—'}</td>
              <td class="t-grade ${tier}">${c.inProgress ? 'IN PROG' : `${c.grade}%`}</td>
            </tr>
          `;
        })
        .join('');

      return `
        <article class="term-card">
          <div class="term-card-head">
            <h2>${esc(term.label)} · ${esc(term.calendar)}</h2>
            <span>${esc(rightMeta)}</span>
          </div>
          <table class="t-table">
            <tbody>${rows}</tbody>
          </table>
        </article>
      `;
    })
    .join('');
}

function renderQuietRecords() {
  const coopPd = QUIET_RECORDS.filter((r) => r.term.includes('Co-op'))
    .map((r) => `${r.term}: ${r.items.join(', ')}`)
    .join(' · ');
  const seminars = [
    'GENE 119 (1A)',
    'MTE 100B (1B)',
    'MTE 200A (2A)',
    'MTE 200B (2B)',
    'MTE 300A (3A)',
    'MTE 300B (3B)',
    'MTE 400A (4A)',
    'MTHEL 99 · First-Year Math Readiness (1A · CR)'
  ].join(', ');
  const wkrpt = 'WKRPT 100 (Spring 2024 · 0.13 u · 75, not in GPA) · WKRPT 200 (Winter 2025 · 0.13 u · 89, not in GPA)';

  quietGridEl.innerHTML = `
    <div class="quiet-col">
      <h3>Co-op &amp; PD (CR)</h3>
      <p>${esc(coopPd)}</p>
    </div>
    <div class="quiet-col">
      <h3>Seminars &amp; Readiness</h3>
      <p>${esc(seminars)}</p>
    </div>
    <div class="quiet-col">
      <h3>Work-term Reports</h3>
      <p>${esc(wkrpt)}</p>
    </div>
  `;
}

function openSheet(code) {
  const c = courseMap.get(code);
  if (!c) return;
  const t = termMap.get(c.term);
  const b = branchMap.get(c.branch);
  const tier = gradeTier(c);
  const pre = prereqsOf.get(code) || [];
  const next = unlocksOf.get(code) || [];
  const insights = getCourseInsights(code);

  const insightsHtml = insights.length
    ? `<div class="sheet-concepts">
        <span class="link-lbl">Cross-topic &amp; curriculum insights</span>
        ${insights
          .map((item) => {
            const isPre = item.kind === 'prereq';
            const chipClass = isPre ? (item.dir === 'from' ? 'is-prereq' : 'is-unlock') : 'is-concept';
            const arrow = isPre ? (item.dir === 'from' ? '← ' : '→ ') : '↔ ';
            return `<div class="sheet-concept-row"><div><button type="button" class="chip-link ${chipClass}" data-sheet-jump="${esc(item.partner)}">${arrow}${esc(item.partner)}</button></div><p>${esc(item.why)}</p></div>`;
          })
          .join('')}
      </div>`
    : '';

  sheetPanelEl.innerHTML = `
    <div class="sheet-head">
      <div>
        <div class="mono" style="color:var(--mute)">${esc(c.code)} · ${esc(t.calendar)} (${esc(t.label)})</div>
        <h2 id="sheet-title" style="margin:6px 0 0;font:500 22px/1.2 var(--display)">${esc(c.title)}</h2>
      </div>
      <button type="button" class="sheet-close" id="sheet-close">Close</button>
    </div>
    <div class="sheet-body">
      <div class="sheet-grade-row">
        <div>
          <div class="mono" style="color:var(--mute)">${esc(b.name)}</div>
          <div style="font-size:13px;color:var(--fg-2)">${c.inProgress ? 'In progress · Grades Dec 24, 2026' : `${c.units.toFixed(2)} units`}</div>
        </div>
        ${c.inProgress ? `<span class="grade-big tier-ip">In Progress</span>` : `<span class="grade-big ${tier}">${c.grade}%</span>`}
      </div>
      ${
        pre.length
          ? `<div class="link-group"><span class="link-lbl">Prereqs</span>${pre
              .map((p) => `<button type="button" class="chip-link is-prereq" data-sheet-jump="${esc(p)}">← ${esc(p)}</button>`)
              .join('')}</div>`
          : ''
      }
      ${
        next.length
          ? `<div class="link-group"><span class="link-lbl">Feeds</span>${next
              .map((n) => `<button type="button" class="chip-link is-unlock" data-sheet-jump="${esc(n)}">${esc(n)} →</button>`)
              .join('')}</div>`
          : ''
      }
      ${insightsHtml}
    </div>
  `;

  sheetEl.hidden = false;
  document.getElementById('sheet-close')?.focus();
}

function closeSheet() {
  sheetEl.hidden = true;
}

function setBranch(branchId) {
  state.branch = state.branch === branchId && branchId !== 'all' ? 'all' : branchId;
  renderBranchBar();
  renderMobileFlow();
  renderTable();
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
  if (view === 'tree') requestAnimationFrame(drawEdges);
}

function selectCourse(code) {
  state.lockedCode = state.lockedCode === code ? null : code;
  state.hoverCode = null;
  applyHighlights();
}

function bindEvents() {
  // View switch
  document.querySelector('.seg').addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (btn) setView(btn.dataset.view);
  });

  // Branch pills
  branchBarEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-branch]');
    if (btn) setBranch(btn.dataset.branch);
  });

  // Edge hover tooltips (conceptual links & annotated prerequisites)
  treeEdgesEl.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'touch') return;
    const hit = e.target.closest('.edge-hit');
    if (!hit) return;
    const path = edgeEls[Number(hit.dataset.edgeIdx)];
    if (!path) return;
    state.hoverEdge = {
      from: path.dataset.from,
      to: path.dataset.to,
      kind: path.dataset.kind,
      why: path.dataset.why,
      mx: Number(path.dataset.mx),
      my: Number(path.dataset.my)
    };
    applyHighlights();
  });

  treeEdgesEl.addEventListener('pointerout', (e) => {
    if (e.pointerType === 'touch') return;
    const hit = e.target.closest('.edge-hit');
    if (!hit) return;
    const related = e.relatedTarget?.closest?.('.edge-hit');
    if (!related && state.hoverEdge) {
      state.hoverEdge = null;
      applyHighlights();
    }
  });

  // Tree interactions (hover, focus, click, branch row click)
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
      selectCourse(node.dataset.code);
      return;
    }
    if (state.lockedCode) {
      state.lockedCode = null;
      applyHighlights();
    }
  });

  // Inspector chip jumps & clear
  inspectorEl.addEventListener('click', (e) => {
    const jump = e.target.closest('[data-jump]');
    if (jump) {
      const targetCode = jump.dataset.jump;
      state.lockedCode = targetCode;
      state.hoverCode = null;
      applyHighlights();
      nodeEls.get(targetCode)?.focus();
      return;
    }
    if (e.target.closest('[data-clear-lock]')) {
      state.lockedCode = null;
      state.hoverCode = null;
      applyHighlights();
    }
  });

  // Mobile node taps
  mobileFlowEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-mobile-code]');
    if (btn) openSheet(btn.dataset.mobileCode);
  });

  // Table row jump to skill tree
  tableWrapEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-table-jump]');
    if (!btn) return;
    const code = btn.dataset.tableJump;
    setView('tree');
    if (window.matchMedia('(max-width: 780px)').matches) {
      openSheet(code);
    } else {
      state.lockedCode = code;
      state.hoverCode = null;
      applyHighlights();
      nodeEls.get(code)?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      nodeEls.get(code)?.focus();
    }
  });

  // Sheet controls
  sheetScrimEl.addEventListener('click', closeSheet);
  sheetPanelEl.addEventListener('click', (e) => {
    if (e.target.closest('#sheet-close')) {
      closeSheet();
      return;
    }
    const jump = e.target.closest('[data-sheet-jump]');
    if (jump) openSheet(jump.dataset.sheetJump);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!sheetEl.hidden) closeSheet();
      else if (state.lockedCode) {
        state.lockedCode = null;
        applyHighlights();
      }
    }
  });

  // Re-route SVG edges cleanly whenever layout or fonts change
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(() => drawEdges());
    ro.observe(treeCanvasEl);
  } else {
    window.addEventListener('resize', drawEdges);
  }
  document.fonts?.ready?.then(drawEdges);
}

// Initialize
renderSummary();
renderBranchBar();
renderTreeGrid();
renderMobileFlow();
renderTable();
renderQuietRecords();
bindEvents();
drawEdges();
