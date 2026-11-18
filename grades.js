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
  {
    code: 'CHE 102',
    title: 'Chemistry for Engineers',
    term: '1A',
    units: 0.50,
    grade: 83,
    branch: 'thermo',
    desc: 'Chemical principles with applications in engineering. Stoichiometric calculations, properties of gases, liquids, and solutions, gas-phase chemical equilibrium, ionic equilibrium in aqueous solution, oxidation-reduction reactions, and chemical kinetics.'
  },
  {
    code: 'MATH 115',
    title: 'Linear Algebra',
    term: '1A',
    units: 0.50,
    grade: 86,
    branch: 'math',
    desc: 'Linear equations, matrices, and determinants. Introduction to vector spaces. Eigenvalues and diagonalization. Applications. Complex numbers.'
  },
  {
    code: 'MATH 116',
    title: 'Calculus 1',
    term: '1A',
    units: 0.50,
    grade: 90,
    branch: 'math',
    desc: "Functions: polynomials, exponential, logarithmic, and trigonometric. Operations on functions and curve sketching. Trigonometric identities and inverse functions. Derivatives, rules of differentiation, Mean Value Theorem, Newton's Method, indeterminate forms, and L'Hôpital's rule. Riemann definite integrals, Fundamental Theorems, and applications of the integral."
  },
  {
    code: 'MTE 100',
    title: 'Mechatronics Engineering',
    term: '1A',
    units: 0.75,
    grade: 87,
    branch: 'design',
    desc: 'An introduction to mechatronics engineering and the engineering profession. Topics include the design process, project planning, data presentation, measurements and error, control logic, sensors and actuators, and engineering graphics fundamentals (CAD, freehand sketching, and technical drawings), supplemented by a group mechatronic design project.'
  },
  {
    code: 'MTE 121',
    title: 'Digital Computation',
    term: '1A',
    units: 0.50,
    grade: 97,
    branch: 'embedded',
    desc: 'Introduction to electronic digital computers, hardware and software organization, and examples of efficient numerical algorithms for basic scientific computations.'
  },

  // Winter 2023 (1B)
  {
    code: 'MATH 118',
    title: 'Calculus 2',
    term: '1B',
    units: 0.50,
    grade: 99,
    branch: 'math',
    desc: "Methods of integration: by parts, trigonometric substitutions, partial fractions; engineering applications, approximation of integrals, and improper integrals. Linear and separable first-order differential equations. Parametric curves and polar coordinates, arc length and area. Infinite sequences and series, convergence tests, power series, and Taylor's Remainder Theorem."
  },
  {
    code: 'MTE 111',
    title: 'Material Structure & Properties',
    term: '1B',
    units: 0.50,
    grade: 92,
    branch: 'mechanics',
    desc: 'Relationships between macroscopic physical properties (mechanical, photonic, thermal, electrical, and magnetic) and microscopic causes based on electronic and atomic structures, atomic bonding, crystal structure, and microstructure across metals, polymers, ceramics, semiconductors, and composite materials.'
  },
  {
    code: 'MTE 119',
    title: 'Statics',
    term: '1B',
    units: 0.50,
    grade: 81,
    branch: 'mechanics',
    desc: 'Basic concepts of mechanics and vectors. Statics of particles. Rigid bodies and force systems, equilibrium of rigid bodies. Analysis of trusses and frames. Distributed forces, centroids, and moments of inertia. Friction. Internal shear and bending moments in beams.'
  },
  {
    code: 'MTE 120',
    title: 'Circuits',
    term: '1B',
    units: 0.75,
    grade: 97,
    branch: 'circuits',
    desc: 'Basic electromagnetic theory; magnetic circuits; electric circuit elements; DC circuit analysis; first-order transient response; AC circuit analysis.'
  },
  {
    code: 'MTE 140',
    title: 'Algorithms & Data Structures',
    term: '1B',
    units: 0.50,
    grade: 92,
    branch: 'embedded',
    desc: 'Structured software design, data structures, abstract data types, recursive algorithms, algorithm analysis and design, sorting and searching, hashing, and problem-solving strategies.'
  },

  // Fall 2023 (2A)
  {
    code: 'MTE 201',
    title: 'Experimental Measurement & Stats',
    term: '2A',
    units: 0.50,
    grade: 87,
    branch: 'math',
    desc: 'Measurement errors, calculations with unknown quantities, and error propagation. Sensitivity analysis. Techniques of sampling and statistical estimation. Introduction to sensors and data acquisition tools. Frequency distributions and probability. Binomial, Poisson, and normal distributions. Tests of hypotheses, t-test, and chi-squared test. Curve fitting by least squares, correlation, regression, and design of experiments.'
  },
  {
    code: 'MTE 202',
    title: 'Ordinary Differential Equations',
    term: '2A',
    units: 0.50,
    grade: 89,
    branch: 'math',
    desc: 'First-order differential equations, direction fields, separable equations, integrating factors, and simple transformations; second- and higher-order ODEs with constant coefficients — transient and steady-state solutions; the Laplace Transform; systems of equations and matrix differential equations; introduction to partial differential equations.'
  },
  {
    code: 'MTE 219',
    title: 'Mechanics of Deformable Solids',
    term: '2A',
    units: 0.50,
    grade: 86,
    branch: 'mechanics',
    desc: 'Introduction to mechanical response of materials and stress-strain relationships. Behaviour of prismatic members in tension, compression, shear, bending, and torsion. Stress and strain transformations. Virtual work and energy methods.'
  },
  {
    code: 'MTE 262',
    title: 'Microprocessors & Digital Logic',
    term: '2A',
    units: 0.50,
    grade: 89,
    branch: 'embedded',
    desc: 'Number systems, logic gates, Boolean algebra, Karnaugh maps, and combinational logic design. Implementation of combinational and sequential logic circuits on Field Programmable Gate Array (FPGA) boards. Sequential logic and state machines. Programmable Logic Controllers (PLCs) and ladder logic programming.'
  },
  {
    code: 'PHIL 145',
    title: 'Critical Thinking',
    term: '2A',
    units: 0.50,
    grade: 85,
    branch: 'humanities',
    desc: 'An analysis of basic types of reasoning, structure of arguments, critical assessment of information, common fallacies, and problems of clarity and meaning.'
  },
  {
    code: 'SYDE 182',
    title: 'Dynamics',
    term: '2A',
    units: 0.50,
    grade: 90,
    branch: 'mechanics',
    desc: 'Kinematics of particles, rectilinear and curvilinear motion. Kinetics of particles and application to space mechanics. Energy and momentum methods. Systems of particles. Kinematics and kinetics of rigid bodies; planar motion.'
  },

  // Spring 2024 (2B)
  {
    code: 'MTE 203',
    title: 'Advanced Calculus',
    term: '2B',
    units: 0.50,
    grade: 89,
    branch: 'math',
    desc: "Vectors and 3-D analytic geometry; multivariable calculus including partial differentiation, total differential, chain rule, directional derivative, gradient operator, and extrema; multiple integrals for surface area, volume, and moments of inertia; line and surface integrals and vector theorems; complex analysis and Cauchy's Integral Formula; Fourier Series and Fourier Integrals."
  },
  {
    code: 'MTE 204',
    title: 'Numerical Methods',
    term: '2B',
    units: 0.50,
    grade: 89,
    branch: 'math',
    desc: 'Number systems and machine errors; roots of non-linear equations; matrix calculations; eigenvalue and eigenvector calculations; interpolation and approximation; numerical integration and solution of linear and non-linear ODEs and systems of ODEs; calculation of series; solution methods for PDEs; use of numeric and symbolic computing tools.'
  },
  {
    code: 'MTE 220',
    title: 'Sensors & Instrumentation',
    term: '2B',
    units: 0.50,
    grade: 90,
    branch: 'circuits',
    desc: 'Review of circuit theory; input-output relationships, transfer functions, and frequency response of linear systems; operational amplifiers and negative or positive feedback circuits; diodes; analog signal detection, conditioning, and conversion systems; transducers and sensors, difference and instrumentation amplifiers, and active filters.'
  },
  {
    code: 'MTE 241',
    title: 'Computer Structures & Real-Time Sys',
    term: '2B',
    units: 0.50,
    grade: 82,
    branch: 'embedded',
    desc: 'Introduction to computer organization, basic real-time concepts, process management, interprocess communication and synchronization, memory management, resource management, interrupt handling, concurrent programming, and file systems.'
  },
  {
    code: 'SYDE 252',
    title: 'Linear Systems & Signals',
    term: '2B',
    units: 0.50,
    grade: 87,
    branch: 'controls',
    desc: 'Models and analysis of linear systems. Discrete-time and continuous-time systems; difference and differential equations; impulse and frequency response. Complex frequency, functions of complex variables, and transform domain techniques: Z transforms, Fourier analysis, and Laplace transform. Transfer functions, sampling theory, stability, and linear filters.'
  },

  // Winter 2025 (3A)
  {
    code: 'MTE 309',
    title: 'Thermodynamics & Heat Transfer',
    term: '3A',
    units: 0.50,
    grade: 90,
    branch: 'thermo',
    desc: 'Macroscopic approach to energy analysis. Energy transfer as work and heat, and the First Law of thermodynamics. Properties and states of simple substances. Control-mass and control-volume analysis. Entropy, the Second Law of thermodynamics, and the Carnot cycle. Heat transfer by conduction, convection, and radiation; steady and transient problems; cooling of electrical devices.'
  },
  {
    code: 'MTE 320',
    title: 'Actuators & Power Electronics',
    term: '3A',
    units: 0.50,
    grade: 92,
    branch: 'circuits',
    desc: 'Review of circuit analysis and basic electromagnetic theory. Power electronics circuits, H-bridges, PWM control, interfacing, and power amplifiers. DC servo and stepper motors, AC synchronous and induction motors. Transformers. Introduction to speed and torque control techniques of motors.'
  },
  {
    code: 'MTE 321',
    title: 'Design & Dynamics of Machines',
    term: '3A',
    units: 0.50,
    grade: 94,
    branch: 'mechanics',
    desc: 'Principles of the geometry and motion in linkages and mechanisms. Computer-aided kinematic and kinetic analysis and synthesis of mechanisms. Static failure and yield criteria in ductile and brittle materials. Fatigue failure criteria due to fluctuating stresses. Shaft design under static and fluctuating loads, shaft components, and deflections.'
  },
  {
    code: 'MTE 325',
    title: 'Microprocessor Systems & Interfacing',
    term: '3A',
    units: 0.50,
    grade: 92,
    branch: 'embedded',
    desc: 'Synchronization and data flow; interfacing to sensors and actuators; parallel, serial, and analog interfacing; buses; direct memory access (DMA); interfacing considerations; privacy and security considerations.'
  },
  {
    code: 'MTE 351',
    title: 'Systems Models',
    term: '3A',
    units: 0.50,
    grade: 91,
    branch: 'controls',
    desc: 'Introduction to systems modelling and analysis. Graph-theoretic models and formulation of system equations. State-space formulation and solution. Time and frequency domain solution. Application to engineering systems.'
  },

  // Fall 2025 (3B)
  {
    code: 'CLAS 104',
    title: 'Classical Mythology',
    term: '3B',
    units: 0.50,
    grade: 98,
    branch: 'humanities',
    desc: 'A study of Greco-Roman mythology and legend, with special emphasis on the Olympian gods and the figure of the hero. Topics include myths of creation, the rise of the gods, divine myths, the tales surrounding Troy, Mycenae, and Thebes, and the heroes Herakles, Perseus, and Theseus.'
  },
  {
    code: 'MSE 261',
    title: 'Engineering Economics',
    term: '3B',
    units: 0.50,
    grade: 94,
    branch: 'humanities',
    desc: 'Introductory finance: time value of money and cash-flow analysis. Investment evaluation methods: present worth, annual worth, and internal rate of return. Depreciation models and asset replacement analysis. The impact of inflation, taxation, uncertainty, and risk on investment decisions.'
  },
  {
    code: 'MTE 322',
    title: 'Electromechanical Machine Design',
    term: '3B',
    units: 0.50,
    grade: 95,
    branch: 'mechanics',
    desc: 'Integrated design of mechanical motion transmission systems: gearing, couplings, bearings, power screws, fasteners, and their integration; sensing and measurement of mechanical motion; specification and selection of motors and electromechanical actuators; analysis and design of controllers for motion transmission systems; case studies.'
  },
  {
    code: 'MTE 352',
    title: 'Fluid Mechanics',
    term: '3B',
    units: 0.50,
    grade: 95,
    branch: 'thermo',
    desc: 'Physical properties of fluids and fundamental concepts in fluid mechanics. Hydrostatics. Conservation laws for mass, momentum, and energy. Flow similarity and dimensional analysis. Laminar and turbulent flow. Engineering applications such as flow measurement, flow in pipes, and fluid forces on moving bodies.'
  },
  {
    code: 'MTE 360',
    title: 'Automatic Control Systems',
    term: '3B',
    units: 0.50,
    grade: 87,
    branch: 'controls',
    desc: 'Feedback control design and analysis for linear dynamic systems with emphasis on mechanical engineering applications; transient and frequency response; stability; system performance; control modes; state-space techniques; introduction to digital control systems.'
  },
  {
    code: 'MTE 380',
    title: 'Mechatronics Design Workshop',
    term: '3B',
    units: 0.50,
    grade: 100,
    branch: 'design',
    desc: 'Study of the engineering design process, including needs analysis, problem definition, design criteria and critical parameter identification, generation of alternative solutions, conceptual design, detailed design, optimization, and implementation. Anchored by a major group project constructing and testing a competitive electromechanical prototype.'
  },

  // Fall 2026 (4A)
  {
    code: 'ME 597',
    title: 'Special Topics in Mechanical Eng',
    term: '4A',
    units: null,
    grade: null,
    branch: 'mechanics',
    inProgress: true,
    desc: 'Selected undergraduate topics in automation and control, solid mechanics and machine design, materials engineering and processing, fluid mechanics, and thermal engineering.'
  },
  {
    code: 'MTE 420',
    title: 'Power Electronics & Motor Drives',
    term: '4A',
    units: null,
    grade: null,
    branch: 'circuits',
    inProgress: true,
    desc: 'Analysis, design, and control of power electronic converters, principles of operation and control of DC and special-purpose motors, and power electronics-based control of DC and special-purpose motors.'
  },
  {
    code: 'MTE 481',
    title: 'Mechatronics Design Project',
    term: '4A',
    units: null,
    grade: null,
    branch: 'design',
    inProgress: true,
    desc: 'Reinforces and extends MTE 380. Student groups apply engineering design and problem-solving to an original mechatronic project incorporating mechanical design, electronics, computers, and software — covering needs analysis, prior-art search, alternative designs, and selection of a final design.'
  },
  {
    code: 'MTE 484',
    title: 'Digital Control Applications',
    term: '4A',
    units: null,
    grade: null,
    branch: 'controls',
    inProgress: true,
    desc: 'Dynamic system modelling: linear, nonlinear, state-space, sampled-data systems, computer simulation, and system identification. Discrete system stability and dynamic performance. Nonlinear system analysis and limit cycles. Digital control system design: emulation methods, z-domain, frequency domain, and pole placement, with laboratory implementation on mechatronic systems.'
  },
  {
    code: 'MTE 544',
    title: 'Autonomous Mobile Robots',
    term: '4A',
    units: null,
    grade: null,
    branch: 'controls',
    inProgress: true,
    desc: 'Fundamentals of autonomous mobile robotics, including perception and planning for autonomous operation, sensor modelling, vehicle state estimation using Bayes Filters, Kalman Filters, and Particle Filters, onboard localization and mapping (SLAM), vehicle motion modelling and control, and graph-based and probabilistic motion planning.'
  },
  {
    code: 'STV 302',
    title: 'Information Technology & Society',
    term: '4A',
    units: null,
    grade: null,
    branch: 'humanities',
    inProgress: true,
    desc: 'Provides a framework of intellectual tools to understand and evaluate technological change, applied to the development of information technology, its interaction with society, and possible future scenarios. Topics include digitization as culture, visions of the future, perils of prediction, and privacy and personal dignity issues associated with IT.'
  }
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
const termMap = new Map(TERMS.map((t) => [t.id, t]));
const branchMap = new Map(BRANCHES.map((b) => [b.id, b]));
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

const panelEl = document.getElementById('course-panel');
const spCodeEl = document.getElementById('sp-code');
const spGradeEl = document.getElementById('sp-grade');
const spTitleEl = document.getElementById('sp-title');
const spMetaEl = document.getElementById('sp-meta');
const spFlowEl = document.getElementById('sp-flow');
const spDescEl = document.getElementById('sp-desc');
const spPrereqsEl = document.getElementById('sp-prereqs');
const spUnlocksEl = document.getElementById('sp-unlocks');
const spCloseEl = document.getElementById('sp-close');

const nodeEls = new Map();
const tableRowEls = new Map();
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

function renderLinkList(codes, kind) {
  if (!codes.length) {
    return `<span class="sp-empty">None in curriculum graph</span>`;
  }
  return codes
    .map((code) => {
      const c = courseMap.get(code);
      if (!c) return '';
      const tier = gradeTier(c);
      const gradeTxt = c.inProgress ? 'IP' : `${c.grade}%`;
      return `
        <button type="button" class="sp-link ${kind}" data-jump="${esc(c.code)}">
          <span class="sp-link-main">
            <span class="sp-link-code mono">${esc(c.code)}</span>
            <span class="sp-link-title">${esc(c.title)}</span>
          </span>
          <span class="sp-link-grade mono ${tier}">${esc(gradeTxt)}</span>
        </button>
      `;
    })
    .join('');
}

function renderSidePanel() {
  if (!panelEl) return;
  const code = state.lockedCode;
  const c = code ? courseMap.get(code) : null;

  if (!c) {
    panelEl.classList.remove('is-open');
    panelEl.setAttribute('aria-hidden', 'true');
    return;
  }

  const tier = gradeTier(c);
  const term = termMap.get(c.term);
  const branch = branchMap.get(c.branch);
  const flowSlug = c.code.toLowerCase().replace(/\s+/g, '');

  spCodeEl.textContent = c.code;
  spGradeEl.textContent = c.inProgress ? 'In progress' : `${c.grade}%`;
  spGradeEl.className = `sp-grade mono ${tier}`;
  spTitleEl.textContent = c.title;

  const metaParts = [term ? `${term.label} · ${term.calendar}` : c.term];
  if (branch) metaParts.push(branch.name);
  if (c.units) metaParts.push(`${c.units.toFixed(2)} u`);
  spMetaEl.textContent = metaParts.join(' · ');

  spFlowEl.href = `https://uwflow.com/course/${flowSlug}`;
  spDescEl.textContent = c.desc || '';

  const prereqs = prereqsOf.get(c.code) || [];
  const unlocks = unlocksOf.get(c.code) || [];
  spPrereqsEl.innerHTML = renderLinkList(prereqs, 'is-prereq');
  spUnlocksEl.innerHTML = renderLinkList(unlocks, 'is-unlock');

  panelEl.classList.add('is-open');
  panelEl.setAttribute('aria-hidden', 'false');
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

  for (const [nCode, rowEl] of tableRowEls.entries()) {
    rowEl.classList.toggle('is-active', nCode === state.lockedCode);
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
          <tr class="t-row" data-code="${esc(c.code)}" tabindex="0" role="button" aria-label="${esc(c.code)} ${esc(c.title)}">
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

  tableRowEls.clear();
  for (const row of tableWrapEl.querySelectorAll('.t-row')) {
    tableRowEls.set(row.dataset.code, row);
  }
}

function selectCourse(code) {
  state.lockedCode = code;
  state.hoverCode = null;
  applyHighlights();
  renderSidePanel();
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
      const next = state.lockedCode === node.dataset.code ? null : node.dataset.code;
      selectCourse(next);
      return;
    }
    if (state.lockedCode || state.branch !== 'all') {
      state.branch = 'all';
      selectCourse(null);
    }
  });

  tableWrapEl.addEventListener('click', (e) => {
    const row = e.target.closest('.t-row');
    if (!row) return;
    const next = state.lockedCode === row.dataset.code ? null : row.dataset.code;
    selectCourse(next);
  });

  tableWrapEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const row = e.target.closest('.t-row');
      if (row) {
        e.preventDefault();
        const next = state.lockedCode === row.dataset.code ? null : row.dataset.code;
        selectCourse(next);
      }
    }
  });

  panelEl?.addEventListener('click', (e) => {
    const jumpBtn = e.target.closest('[data-jump]');
    if (jumpBtn) {
      selectCourse(jumpBtn.dataset.jump);
    }
  });

  panelEl?.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'touch') return;
    const jumpBtn = e.target.closest('[data-jump]');
    if (jumpBtn && state.hoverCode !== jumpBtn.dataset.jump) {
      state.hoverCode = jumpBtn.dataset.jump;
      applyHighlights();
    }
  });

  panelEl?.addEventListener('pointerout', (e) => {
    if (e.pointerType === 'touch') return;
    const jumpBtn = e.target.closest('[data-jump]');
    if (jumpBtn && !e.relatedTarget?.closest?.('[data-jump]')) {
      state.hoverCode = null;
      applyHighlights();
    }
  });

  spCloseEl?.addEventListener('click', () => {
    selectCourse(null);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && (state.lockedCode || state.branch !== 'all')) {
      state.branch = 'all';
      selectCourse(null);
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
