// Page content. Chapters are pinned scroll sections; cards sit in the grid.
// View media: {el:{tag,src,classic?,attrs?}} | {video} | {img} | {lottie} | {scrub} (all-intra mp4 scrubbed by scroll)
// | {swap:[render, real]} (crossfades as the view scrolls). video + once: plays from the start on entry, its tab bar follows the video.
// progress: 'view' feeds the view's own scroll progress to the element, 'chapter' the whole chapter's.
// len: scroll length of a view in viewport heights (default 0.5).

const EL = {
  platform: { tag: 'as-platform-hero', src: 'elements/platform-hero/platform-hero.js' },
  airbrakes: {  tag: 'as-airbrakes', src: 'elements/airbrakes/airbrakes.js' },
  flight: { tag: 'as-flight-control', src: 'elements/airbrakes/flight-control.js', attrs: { autoplay: '', loop: '', clean: '' } },
  wire: { tag: 'as-wire-protocol', src: 'anim/wire-protocol.js' },
  segRide: { tag: 'as-segway-ride', src: 'anim/segway-ride.js' },
  segSweep: { tag: 'as-segway-sweep', src: 'anim/segway-sweep.js' },
  neural: { tag: 'as-neural-journey', src: 'elements/neuralink/neuralink-elements.js' },
  tesla: { tag: 'as-cybertruck-lighting', src: 'elements/tesla/cybertruck-lighting.js' },
  ixana: {  tag: 'as-ixana-link', src: 'elements/ixana/ixana-link.js', attrs: { controls: 'hidden' } },
  strain: { tag: 'as-strain-monitor', src: 'anim/strain-monitor.js' },
  fyelabs: { tag: 'as-fyelabs-system', src: 'elements/fyelabs/fyelabs-system.js' },
  hub: { tag: 'as-clamping-hub', src: 'elements/hub/clamping-hub.js' },
  contact: { tag: 'as-contact-loc', src: 'anim/contact-loc.js' },
  gantry: { tag: 'as-gantry', src: 'anim/gantry.js' },
  cloud: { tag: 'as-point-cloud', src: 'anim/point-cloud.js' }
};
const withAttrs = (el, attrs) => ({ ...el, attrs: { ...(el.attrs || {}), ...attrs } });

export const chapters = [
  /* ─────────── personal ─────────── */
  {
    id: 'platform', flow: 'personal', hero: true,
    org: '3RRS parallel manipulator', dates: 'Sep – Dec 2025',
    title: 'Stewart Platform', role: 'Ball balancing robot',
    points: ['Inverse kinematics to three servos', 'Simscape plant, PID and feedforward', 'Force-torque sensor finds the ball'],
    views: [
      { id: 'assemble', label: 'Assembly', el: EL.platform, progress: 'view', len: 1.3 },
      { id: 'live', label: 'Live model', el: EL.platform, hint: 'Click the plate to drop the ball' },
      { id: 'demo', label: 'Full system demo', el: EL.platform, compare: 'media/stewart-demo.mp4', len: 1.2 }
    ]
  },
  {
    id: 'airbrakes', flow: 'personal',
    org: 'Waterloo Rocketry · Borealis', dates: '2023 – 2024',
    title: 'Rocket Airbrakes', role: 'Active drag control for Borealis',
    points: ['Designed the cam-slot mechanism that drives all three panels from one servo', 'Co-wrote the STM32 firmware: state estimation, apogee prediction, PI control', 'Designed the 4-layer avionics PCB for the canards: power efficiency 66% → 95%'],
    views: [
      { id: 'mechanism', label: 'Mechanism', el: withAttrs(EL.airbrakes, { view: 'mechanism' }), progress: 'view', len: 0.7 },
      { id: 'airframe', label: 'In the airframe', el: withAttrs(EL.airbrakes, { view: 'airframe' }), progress: 'view' },
      { id: 'flight', label: 'Control loop', el: EL.flight },
      { id: 'pcb', label: 'Flight computer', swap: ['media/airbrakes/canardian-render.webp', 'media/airbrakes/canardian-board.webp'], len: 0.7 },
      { id: 'hardware', label: 'Hardware', swap: ['media/airbrakes/render-deployed-transparent.webp', 'media/airbrakes/irl/airbrake-07.webp'], len: 0.7 },
      { id: 'launch', label: 'Launch', video: 'media/airbrakes/launch-scrub.mp4', once: true }
    ]
  },
  {
    id: 'measurement', flow: 'personal',
    org: 'Team of 3', dates: 'Sep – Dec 2023',
    title: 'Automated Tolerance Inspection', role: 'Hands-off part measurement',
    points: ['OpenCV orients the part', 'Custom 2-wire ESP32 ↔ VEX protocol', 'Within 0.3 mm, every time'],
    views: [
      { id: 'machine', label: 'Machine', scrub: 'media/lottie/measurement-device.mp4', progress: 'view', len: 0.9 },
      { id: 'protocol', label: '2-wire protocol', el: EL.wire, hint: 'Drag the turntable' },
      { id: 'real', label: 'Real run', video: 'media/gallery/measurement/demo-loop.mp4' }
    ]
  },
  {
    id: 'segway', flow: 'personal',
    org: 'Dynamics modelling', dates: 'Jan – Apr 2025',
    title: 'Segway Dynamics', role: 'Equations of motion to simulation',
    points: ['Hand-derived nonlinear model', 'Simulink parameter sweep', 'Cross-checked in SimulationX'],
    views: [
      { id: 'ride', label: 'Ride', el: EL.segRide, hint: 'Click to push' },
      { id: 'sweep', label: 'Parameter sweep', el: EL.segSweep }
    ]
  },

  /* ─────────── professional ─────────── */
  {
    id: 'neuralink', flow: 'professional', mono: true,
    org: 'Neuralink · California', dates: 'Jan – Aug 2026',
    title: 'Neuralink', role: 'Implant Firmware & Embedded Systems Intern',
    points: ['Stimulation implant firmware, 3,000+ electrodes', 'App-to-ASIC stack for Blindsight', 'Registration: 8 min → 15 s per trial'],
    views: [
      { id: 'implant', label: 'Implant', el: EL.neural, progress: 'chapter' },
      { id: 'threads', label: 'Threads', el: EL.neural, progress: 'chapter' },
      { id: 'signals', label: 'Signals', el: EL.neural, progress: 'chapter' },
      { id: 'perception', label: 'Perception', el: EL.neural, progress: 'chapter' }
    ]
  },
  {
    id: 'tesla', flow: 'professional',
    org: 'Tesla · California', dates: 'May – Aug 2025',
    title: 'Tesla', role: 'Vehicle Firmware Intern · Body Controls',
    points: ['Brought up ~20 Semi exterior lights', 'Cybercab light self-tests', 'Cybertruck headlamp calibration fix'],
    views: [
      { id: 'semi', label: 'Semi', el: withAttrs(EL.tesla, { view: 'semi' }) },
      { id: 'cybercab', label: 'Cybercab', el: withAttrs(EL.tesla, { view: 'cybercab' }) },
      { id: 'cybertruck', label: 'Cybertruck', el: withAttrs(EL.tesla, { view: 'cybertruck' }) }
    ]
  },
  {
    id: 'ixana', flow: 'professional',
    org: 'Ixana · Indiana', dates: 'Aug – Dec 2024',
    title: 'Ixana', role: 'Embedded Firmware Intern',
    points: ['Glasses to watch, through the body', 'Frame rate 4 → 13 fps', 'MIPI-DSI display drivers'],
    views: [
      { id: 'capture', label: 'Capture', el: withAttrs(EL.ixana, { view: 'capture' }) },
      { id: 'link', label: 'Through the body', el: withAttrs(EL.ixana, { view: 'link' }) },
      { id: 'display', label: 'On the watch', el: withAttrs(EL.ixana, { view: 'display' }) },
      { id: 'ces', label: 'CES demo', video: 'media/ixana/ixana-wir-demo-full.mp4' }
    ]
  },
  {
    id: 'magna', flow: 'professional', mono: true,
    org: 'Magna · Ontario', dates: 'Jan – Apr 2024',
    title: 'Magna', role: 'Crack detection in a stamping die',
    points: ['Strain gauges → MQTT → live dashboard', 'Every cracked part caught, zero false alarms', 'Patent-pending PLC buffer: 142 → 500 Hz'],
    views: [
      { id: 'detector', label: 'Live detector', el: EL.strain, hint: 'Click to inject a crack' },
      { id: 'dashboard', label: 'Dashboard', img: 'media/img/magna_crack_detection_dashboard.webp', color: true }
    ]
  },
  {
    id: 'fyelabs', flow: 'professional',
    org: 'FYELABS · Ontario', dates: 'May – Sep 2023',
    title: 'FYELABS', role: 'Robotics & Embedded Intern',
    points: ['Back-up safety for garbage trucks', 'LiDAR dust filter that still sees people', '100+ part enclosure, cost cut 56%'],
    views: [
      { id: 'case', label: 'Enclosure', el: withAttrs(EL.fyelabs, { view: 'case' }), progress: 'view' },
      { id: 'built', label: 'As built', img: 'media/fyelabs/case-photo.webp' },
      { id: 'lidar', label: 'LiDAR array', el: withAttrs(EL.fyelabs, { view: 'lidar' }) },
      { id: 'dust', label: 'Dust filter', el: withAttrs(EL.fyelabs, { view: 'dust' }) },
      { id: 'dust-test', label: 'Real dust test', video: 'media/fyelabs/dust-test-loop.mp4' },
      { id: 'hmi', label: 'HMI', img: 'media/fyelabs/hmi-prototype.webp' }
    ]
  }
];

// grid cards. media: one of {el}, {lottie} (scrubbed by scroll position), {video}, {img}
export const cards = [
  { id: 'trashminator', title: 'The Trashminator', kicker: 'Grade 12 · Design', blurb: 'An autonomous surface robot that collects floating trash, built to work in swarms.', media: { scrub: 'media/lottie/trashminator.mp4' } },
  { id: 'radial-engine', title: 'Radial Engine', kicker: 'Grade 11 · CAD', blurb: 'Twenty-plus parts modelled from orthographic drawings into a working six-cylinder linkage.', media: { scrub: 'media/lottie/radial-engine.mp4' } },
  { id: 'clamping-hub', title: 'Clamping Hub', kicker: 'Product · Studica', blurb: 'An ultra-low-profile clamping shaft hub, now sold commercially by Studica.', media: { el: EL.hub, progress: true } },
  { id: 'ripl', title: 'Contact Localization', kicker: 'Research · RIPL', blurb: 'A MuJoCo–ROS 2 bridge for the Franka Panda with force injection to benchmark contact localization.', media: { el: EL.contact } },
  { id: 'beam-balancer', title: 'Beam Balancer', kicker: 'Personal · 2025', blurb: 'The 1-D precursor to the Stewart platform. Linkage to firmware in two weeks.', media: { video: 'media/beam-balancer.mp4' } },
  { id: 'gantry', title: 'Two-Axis Gantry', kicker: 'Year 3 · STM32', blurb: 'Interrupt-driven endstops, UART positioning and an ADC-characterized pot.', media: { el: EL.gantry } },
  { id: 'lidar', title: 'LiDAR Point Clouds', kicker: 'Year 1 · Software', blurb: 'Filtering, voxel downsampling and a fast furthest-pair search on millions of points.', media: { el: EL.cloud } },
  { id: 'ftc', title: 'FTC 16397 Robots', kicker: 'Competitive robotics', blurb: 'All software, solo. Control Award at the Asia Pacific Open Championship.', media: { video: 'media/ftc-robot.mp4' } },
  { id: 'ri3d', title: 'Robot in 3 Days', kicker: 'UW REACT · FRC', blurb: 'Organized the event and built a ring-launching robot in 48 hours with five people.', media: { img: 'https://i.ytimg.com/vi/qqqrSge0pF4/hqdefault.jpg' } },
  { id: 'tank-tread', title: 'Off-Road Tank Tread', kicker: 'Personal · CAD', blurb: 'A custom tracked drive designed for rough terrain.', media: { img: 'https://i.ytimg.com/vi/oDeQVKhRZAk/hqdefault.jpg' } },
  { id: 'gooseminator', title: 'The Gooseminator', kicker: 'First year · Team design', blurb: 'Sweeps an area and sorts bird eggs by whether they are an invasive or protected species.', media: { img: 'https://i.ytimg.com/vi/Ba5209A3aXg/hqdefault.jpg' } },
  { id: 'robotic-arm', title: '3-DOF Robotic Arm', kicker: 'First year · 8-hour build', blurb: 'Built in under 8 hours from a Tetrix kit to pick up oddly shaped bones and sort them.', media: { video: 'media/gallery/robotic-arm/demo.mp4' } }
];

// details shown in the popup for any project (chapters and cards). Gallery comes from content.json too.
export const details = {
  platform: { hero: 'CxzUW5jrmIc', gallery: [
      { type: 'video', src: 'media/stewart-assembly.mp4', poster: 'media/stewart-assembly.jpg', caption: 'Assembly timelapse' },
      { type: 'video', src: 'media/stewart-setup.mp4', poster: 'media/stewart-setup.jpg', caption: 'Desk setup with live ball-position and kinematics plots' },
      { type: 'video', src: 'media/stewart-ik.mp4', poster: 'media/stewart-ik.jpg', caption: 'Prototype tilting alongside the live 3D inverse-kinematics plot' },
      { type: 'video', src: 'media/stewart-sensing.mp4', poster: 'media/stewart-sensing.jpg', caption: 'Force-torque sensor estimating contact position' },
      { type: 'video', src: 'media/stewart-demo.mp4', poster: 'media/stewart-demo.jpg', caption: 'Full system demo: the ball held on the plate; the LED ring turns green once balanced' },
      { type: 'video', src: 'media/stewart-sim.mp4', poster: 'media/stewart-sim.jpg', caption: 'Simscape ball-on-plate simulation' },
      { type: 'video', src: 'media/stewart-trajectory.mp4', poster: 'media/stewart-trajectory.jpg', caption: 'Trajectory planner profiles (simulation study)' },
      { type: 'video', src: 'media/stewart-skeleton.mp4', poster: 'media/stewart-skeleton.jpg', caption: 'SolidWorks kinematic skeleton' },
      { type: 'image', src: 'media/platform/spv4-ik-plot.webp', caption: 'Matplotlib inverse-kinematics model of the three chains' },
      { type: 'image', src: 'media/platform/simulink-plant-controller.webp', caption: 'Simulink plant and controller model' },
      { type: 'image', src: 'media/img/stewart_kinematics_diagram.webp', caption: 'Ball free-body diagram and overview' },
      { type: 'image', src: 'media/img/stewart_platform_prototype.webp', caption: 'Prototype' },
      { type: 'image', src: 'media/img/stewart_platform_sim_sensor.webp', caption: 'Kinematics, Simulink and sensor collage' }
    ],
    body: ['A 3RRS parallel manipulator that balances a ball on its plate. Inverse kinematics map a desired plate plane to three servo angles; a Simscape multibody plant with a custom C contact S-function let controllers be tuned before touching hardware.',
      'Trajectory-planned feedforward was compared against classic PID on settling and overshoot, and the ball was located with a 3-axis force-torque sensor, benchmarked against an OpenCV vision baseline.'],
    chips: ['Python', 'Simulink · Simscape', 'Kinematics', 'PID · feedforward', 'OpenCV']
  },
  airbrakes: { hero: 'Z126ZESX3uA', gallery: [
      { type: 'video', src: 'media/airbrakes/irl/actuation-1.mp4', caption: 'Bench actuation: the cam plate drives all three panels out together' },
      { type: 'video', src: 'media/airbrakes/irl/actuation-2.mp4', caption: 'Bench actuation, top view through the clear cam plate' },
      { type: 'image', src: 'media/airbrakes/irl/airbrake-07.webp', caption: 'The machined airbrakes, panels deployed' },
      { type: 'image', src: 'media/airbrakes/irl/airbrake-03.webp', caption: 'Cam plate and followers, close up' },
      { type: 'video', src: 'media/airbrakes/airframe-deploy.mp4', poster: 'media/airbrakes/airframe-deploy.jpg', caption: 'Panels deploying through the airframe' },
      { type: 'video', src: 'media/airbrakes/irl/actuation-3.mp4', caption: 'Actuation seen from below, inside the body tube' },
      { type: 'image', src: 'media/airbrakes/irl/airbrake-01.webp', caption: 'Retracted: the panels sit flush with the airframe' },
      { type: 'image', src: 'media/airbrakes/irl/airbrake-02.webp', caption: 'Panels deployed' },
      { type: 'image', src: 'media/airbrakes/irl/airbrake-04.webp', caption: 'Panels deployed, three-quarter view' },
      { type: 'image', src: 'media/airbrakes/irl/airbrake-05.webp', caption: 'Spiral cam plate from above' },
      { type: 'image', src: 'media/airbrakes/irl/airbrake-06.webp', caption: 'Deployed, from above' },
      { type: 'image', src: 'media/airbrakes/irl/airbrake-08.webp', caption: 'Panels deployed, side view' },
      { type: 'image', src: 'media/airbrakes/irl/airbrake-09.webp', caption: 'Underside: three-spoke bulkhead and servo' },
      { type: 'image', src: 'media/airbrakes/irl/airbrake-10.webp', caption: 'Brass shims and bearings on the followers' },
      { type: 'image', src: 'media/airbrakes/canardian-render.webp', caption: 'The Canard-ian: 4-layer STM32H7 avionics board for the roll-control canards (render)' },
      { type: 'image', src: 'media/airbrakes/canardian-board.webp', caption: 'The Canard-ian, assembled' },
      { type: 'image', src: 'media/airbrakes/canardian-layout.webp', caption: 'The Canard-ian, KiCad layout' },
      { type: 'image', src: 'media/airbrakes/render-deployed.webp', caption: 'Final design, panels deployed' },
      { type: 'image', src: 'media/airbrakes/render-retracted.webp', caption: 'Final design, panels retracted' },
      { type: 'image', src: 'media/airbrakes/render-underside.webp', caption: 'Underside: rail carriages and the brushless servo' },
      { type: 'image', src: 'media/airbrakes/render-linework.webp', caption: 'Line-drawing render' },
      { type: 'image', src: 'media/airbrakes/cad-cam-plate.webp', caption: 'The three-slot cam plate' },
      { type: 'image', src: 'media/airbrakes/cad-assembly.webp', caption: 'Assembly' },
      { type: 'image', src: 'media/airbrakes/cad-cross-section.webp', caption: 'Cross-section through the follower stack and servo coupler' },
      { type: 'image', src: 'media/airbrakes/cad-airframe.webp', caption: 'Panels deploying through the airframe' },
      { type: 'image', src: 'media/airbrakes/slide-cam-slot-desmos.webp', caption: 'Cam-slot study: 0.78 in of travel per 90° of rotation' },
      { type: 'image', src: 'media/airbrakes/photo-bulkhead-rails.jpg', caption: 'Machined bulkhead with linear rails' },
      { type: 'image', src: 'media/airbrakes/photo-bulkhead.webp', caption: 'Machined bulkhead with bearing' },
      { type: 'image', src: 'media/airbrakes/photo-follower-stack.webp', caption: 'Follower parts: shoulder bolt, brass shims, bearings' },
      { type: 'image', src: 'media/airbrakes/photo-load-test.jpg', caption: '15 lb-per-panel repeated-actuation test' },
      { type: 'image', src: 'media/airbrakes/slide-integration-section.webp', caption: 'Section view of the vent section, airbrakes and upper body tube' },
      { type: 'image', src: 'media/airbrakes/slide-firmware-overview.webp', caption: 'Firmware block diagram' },
      { type: 'image', src: 'media/airbrakes/slide-state-estimation.webp', caption: 'State estimation with a Madgwick filter' },
      { type: 'image', src: 'media/airbrakes/slide-rk4-prediction.webp', caption: 'RK4 apogee prediction' },
      { type: 'image', src: 'media/airbrakes/slide-pi-tuning.webp', caption: 'PI tuning in OpenRocket (D = 0)' },
      { type: 'image', src: 'media/airbrakes/slide-drag-ansys-vs-openrocket.webp', caption: 'Drag: Ansys against OpenRocket' },
      { type: 'image', src: 'media/airbrakes/slide-cfd-panel-pressure.webp', caption: 'CFD: pressure on the panels' },
      { type: 'image', src: 'media/airbrakes/slide-cfd-flow.webp', caption: 'CFD: flow around the panels' },
      { type: 'image', src: 'media/airbrakes/slide-drag-surface.webp', caption: 'Drag against velocity, altitude and extension' },
      { type: 'image', src: 'media/airbrakes/slide-drag-tables.webp', caption: 'Drag tables' }
    ],
    body: ['Airbrakes for Borealis, Canada\'s first liquid-fuelled student rocket. A modified cam-slot spiral drives three panels in perfect sync, with extension linear in servo angle.',
      'Ansys CFD gave C<sub>D</sub> against extension and checked the centre-of-pressure margin. STM32 / FreeRTOS firmware estimates state with a Madgwick filter, predicts apogee with RK4 and closes the loop with a PI controller. The 4-layer KiCad flight computer raised power efficiency from 66% to 95%.'],
    chips: ['C · FreeRTOS', 'STM32', 'KiCad', 'Ansys CFD', 'SolidWorks'], links: [['Borealis', 'https://www.waterloorocketry.com/rockets/borealis']]
  },
  measurement: {
    body: ['Owned all firmware: both motors, encoder-to-dimension mapping, the GUI, and a custom 2-wire clocked protocol so an ESP32 could talk to a VEX brain that only exposes digital reads.',
      'OpenCV finds part orientation, angles stream over WebSockets, and the part turns to its critical dimension. Out-of-spec parts are logged to a server.'],
    chips: ['C++', 'ESP32', 'Protocol design', 'OpenCV'],
    links: [['Demo', 'https://youtu.be/MB9A7U8ksmc']]
  },
  segway: { gallery: [
      { type: 'video', src: 'media/segway/simulationx-run.mp4', poster: 'media/segway/simulationx-run.jpg', caption: 'SimulationX model riding until it tips' },
      { type: 'image', src: 'media/segway/workflow-matlab-simulink.webp', caption: 'MATLAB init script and Simulink model' },
      { type: 'image', src: 'media/segway/simulink-sweep-broad.webp', caption: 'Broad thrust and lean sweep' },
      { type: 'image', src: 'media/segway/simulink-sweep-max-6p55.webp', caption: 'Sweep maximum: 6.55 m at 170 N, 0.2 rad' },
      { type: 'image', src: 'media/segway/simulink-sweep-narrow.webp', caption: 'Narrow sweep near 170 N' },
      { type: 'image', src: 'media/segway/simulink-distance-traces.webp', caption: 'Position traces' },
      { type: 'image', src: 'media/segway/simulationx-optimization.webp', caption: 'SimulationX optimum: 110 N, 11°, 9.15 m' },
      { type: 'pdf', src: 'media/segway/syde351-human-transporter-report.pdf', caption: 'Technical report: human transporter' }
    ],
    body: ['We derived the nonlinear kinematic and kinetic equations of a human transporter, then linearized them with a small-angle approximation into a state-space model.',
      'A Simulink model swept thrust force and lean angle, coarse first and then finely. SimulationX models the system acausally without hand-derived equations; the gap between the two is the cost of the idealizations.'],
    chips: ['MATLAB', 'Simulink', 'SimulationX', 'Python'],
    links: [['Code', 'https://github.com/Armaan-Sengupta/MTE-351-Code']]
  },
  neuralink: { gallery: [
      { type: 'video', src: 'elements/neuralink/media/neural-journey.mp4', poster: 'elements/neuralink/media/neural-journey.jpg', caption: 'From implant to perceived image. This is an artistic rendering, not official Neuralink material, and does not indicate product fidelity.' },
      { type: 'image', src: 'elements/neuralink/media/neural-implant-cutaway.jpg', caption: 'Cut-away implant and thread exit. This is an artistic rendering, not official Neuralink material, and does not indicate product fidelity.' },
      { type: 'image', src: 'elements/neuralink/media/neural-signals.jpg', caption: 'Stimulation pulses travelling to the electrode contacts. This is an artistic rendering, not official Neuralink material, and does not indicate product fidelity.' }
    ],
    body: ['Led firmware for a 1st-gen neural stimulation implant: interrupt-driven, DMA-fed, high-throughput code coordinating waveforms and sampling across 3,000+ electrodes (Rust and C). Architected the full app-to-ASIC stack for Blindsight, a human visual prosthesis.',
      'Cut registration from 8 min to 15 s per trial, enabling ~40M pulses per electrode in 13 weeks, which made the safety study feasible and met the FDA submission deadline. Brought up impedance and calibration so chips could self-test, unblocking the production line.'],
    chips: ['Rust', 'C', 'DMA', 'Interrupts', 'ASIC bring-up', 'Protobuf'], links: [['Blindsight', 'https://neuralink.com/trials/visual-prosthesis/']]
  },
  tesla: { gallery: [
      { type: 'image', src: 'media/img/tesla_lighting_vehicles.webp', caption: 'Semi and Cybercab lighting locations (render)' },
      { type: 'image', src: 'media/tesla/semi-lighting-front.webp', caption: 'Tesla Semi front lighting (render)' },
      { type: 'image', src: 'media/tesla/semi-lighting-quarter.webp', caption: 'Tesla Semi lighting, front quarter (render)' }
    ],
    body: ['Brought up all ~20 exterior lights on the Tesla Semi and their current-sense ADCs, from the hardware layer through to app-layer integration, writing the C drivers against the Altium schematics.',
      'Developed current-sense self-tests for every Cybercab exterior light so faulty units are caught before leaving the line. Diagnosed an ADC sample time that was too short: residual charge in a filter capacitor let disconnected endpoints false-pass, and fixing it means open lights are now caught in production.',
      'Corrected a logic error on legacy platforms (Model 3, Model Y and Cybertruck) where disconnected lights did not raise a fault, enabling better retroactive failure analysis. Fixed a Cybertruck bug that calibrated the left and right headlamp stepper motors out of sync, so headlights no longer move at night. Refined auto high-beam latching to activate only at night, with SIL tests (pytest and C unit tests) verifying homologated behaviour across previous vehicle platforms.'],
    chips: ['C', 'Altium', 'ADC · current sense', 'pytest · SIL', 'C unit tests']
  },
  ixana: { gallery: [
      { type: 'video', src: 'media/ixana/ixana-wir-demo-full.mp4', poster: 'media/ixana/ixana-wir-demo-full.jpg', caption: 'CES demo: video sent through the body over Wi-R (full length, with audio)' },
      { type: 'image', src: 'elements/ixana/assets/original-wearable-pipeline.png', caption: 'Camera → FPGA → MCU → Wi-R → MCU → FPGA → display' }
    ],
    body: ['Built video streaming from smart glasses to a smartwatch over Ixana\'s Wi-R body-coupled silicon, using the body as an ultra-low-power data bus.',
      'Raised frame rate from 4 to 13 fps and cut power by 8% with a bare-metal C++ core OS on Ambiq and NXP MCUs. Debugged the whole path (camera → FPGA encode → MCU → Wi-R → MCU → FPGA decode → AMOLED), owned the MIPI-DSI display drivers, and wrote a Python driver for a Rigol waveform generator for HIL testing.'],
    chips: ['C++', 'Bare metal', 'MIPI DSI', 'FPGA · Verilog', 'HIL'], links: [['CES demo', 'https://youtube.com/shorts/He_goadObV0']]
  },
  magna: {
    body: ['Streamed strain-gauge data from a hydraulic press over MQTT into PostgreSQL, with a live web dashboard for operators.',
      'An anomaly detector learns each part\'s normal stroke envelope; it caught 100% of cracked parts with zero false positives across a 150-part production run. A patent-pending, semaphore-driven multithreaded buffer on a memory-limited Beckhoff PLC raised the data rate from 142 Hz to 500 Hz.'],
    chips: ['Python', 'MQTT', 'PostgreSQL', 'PLC · multithreading', 'Signal processing']
  },
  fyelabs: { gallery: [
      { type: 'video', src: 'media/fyelabs/dust-test.mp4', poster: 'media/fyelabs/dust-test.jpg', caption: 'Dust filtering test' },
      { type: 'video', src: 'media/fyelabs/person-detection.mp4', poster: 'media/fyelabs/person-detection.jpg', caption: 'Person detection test' },
      { type: 'video', src: 'media/fyelabs/viz-showcase.mp4', poster: 'media/fyelabs/viz-showcase.jpg', caption: 'LiDAR visualizer used for live tuning' },
      { type: 'image', src: 'media/fyelabs/case-photo.webp', caption: 'The built enclosure on the test rig' },
      { type: 'image', src: 'media/fyelabs/manufactured-case.webp', caption: 'The real welded, black powder-coated sheet-metal case' },
      { type: 'image', src: 'media/fyelabs/case-hidden.webp', caption: 'Inner case with the cover hidden: camera window and LiDAR window band' },
      { type: 'image', src: 'media/fyelabs/case-bottom-section.webp', caption: 'Ten single-beam LiDARs on a semicircular bracket' },
      { type: 'image', src: 'media/fyelabs/case-back-section.webp', caption: 'Back section of the enclosure' },
      { type: 'image', src: 'media/fyelabs/case-side-section.webp', caption: 'Side section through the enclosure' },
      { type: 'image', src: 'media/fyelabs/case-electronics.webp', caption: 'Electronics stack inside the enclosure' },
      { type: 'image', src: 'media/fyelabs/case-special-components-1.webp', caption: 'Watertight bearing cover and distance-sensor array' },
      { type: 'image', src: 'media/fyelabs/case-special-components-2.webp', caption: 'Visual and depth camera, plus the light sensor' },
      { type: 'image', src: 'media/fyelabs/case-bearing-stack.webp', caption: 'Bearing stack section' },
      { type: 'image', src: 'media/fyelabs/drawing-case-body.webp', caption: 'Flat-pattern drawing of the main body' },
      { type: 'image', src: 'media/fyelabs/drawing-protective-cover.webp', caption: 'Flat-pattern drawing of the protective cover' },
      { type: 'image', src: 'media/fyelabs/system-diagram.webp', caption: 'System diagram: depth cameras, Pis, LiDAR PCB and the ESP32 link to the HMI' },
      { type: 'image', src: 'media/fyelabs/lidar-distance-flux.webp', caption: 'Distance and flux from one LiDAR as an object appears and moves' },
      { type: 'image', src: 'media/fyelabs/hmi-case-assembly.webp', caption: 'HMI case assembly' },
      { type: 'image', src: 'media/fyelabs/hmi-pcb-photo.webp', caption: 'HMI PCB' },
      { type: 'image', src: 'media/fyelabs/hmi-prototype.webp', caption: 'HMI prototype showing zone mapping' },
      { type: 'image', src: 'media/fyelabs/hmi-zone-display.webp', caption: 'HMI 12-zone display' }
    ],
    body: ['An autonomous back-up safety system for industrial garbage trucks: 10 LiDARs, 3 depth cameras, an IR camera, IMU and GPS across 6 microcontrollers.',
      'Designed a LiDAR dust-filtering algorithm from field data, five parallel filters that reject dust and still catch people (C++). Designed the HMI: a 2-layer PCB with two MCUs, a LoRa link with custom checksums, a graphics library and 12-zone object mapping. Designed the 100+ part actuating stainless enclosure over 15 revisions, cutting cost 56% and halving lead time.'],
    chips: ['C++', 'LiDAR', 'EasyEDA', 'LoRa · UART · I²C', 'SolidWorks · sheet metal']
  },
  'trashminator': { body: ['A macro surface-level aquatic cleaning robot that autonomously navigates a body of water and collects floating debris; a swarm of them could take on aquatic pollution. It began as a technological design course project and became a personal one.'], chips: ['Arduino', 'Fusion 360'] },
  'radial-engine': { body: ['A test of CAD skill: more than 20 intricate parts modelled from orthographic drawings and assembled into a working radial-engine linkage, then animated.'], chips: ['Inventor', 'Fusion 360'] },
  'clamping-hub': { gallery: [
      { type: 'image', src: 'media/img/hub_fea.webp', caption: 'CAD render beside the FEA result; peak von Mises stress 192.8 MPa at the clamp pad' },
      { type: 'image', src: 'media/hub/hub-cad-face.webp', caption: 'Two cantilever clamp arms cut free by the slit and slots' },
      { type: 'image', src: 'media/hub/hub-cad-screw.webp', caption: 'The socket screw that drives each clamp arm' },
      { type: 'image', src: 'media/hub/hub-fea-anim.webp', caption: 'The flexing arms carry the load while the body stays lightly stressed' }
    ], body: ['Set-screw hubs marred shafts and worked loose. This split, ultra-low-profile clamping hub grips without marring; FEA pushed how far the metal could flex while still transmitting high torque. It is now sold by Studica Ltd.'], chips: ['SolidWorks', 'FEA'] },
  ripl: { gallery: [
      { type: 'image', src: 'media/img/mujoco_franka_panda_ripl.webp', caption: 'Franka Panda in MuJoCo with an external force injected on the end effector' },
      { type: 'youtube', src: 'lbKC-9KtVCI', caption: 'MuJoCo–ROS 2 bridge demo' }
    ], body: ['Built a MuJoCo–ROS 2 bridge for the Franka Panda so existing robot missions run unchanged in high-fidelity physics, then added external force injection with live joint-torque feedback to benchmark torque-based contact localization.'], chips: ['Python', 'ROS 2', 'MuJoCo', 'Franka Panda'], links: [['Demo', 'https://youtube.com/shorts/lbKC-9KtVCI']] },
  'beam-balancer': { body: ['A ball rolls on a beam tilted by a servo through a four-bar linkage. Link lengths were chosen from 2-D constraints for mechanical advantage and a compact footprint. An OpenCV tracker measures ball position and a tuned controller commands the servo through embedded C firmware.'], chips: ['Python', 'C', 'PID', 'OpenCV', 'SolidWorks'], links: [['Demo video', 'https://youtube.com/shorts/xsgP9gpsP7k'], ['Code', 'https://github.com/Armaan-Sengupta/Ball-Beam-Control']] },
  gantry: { body: ['An STM32 drives two stepper axes. Interrupts on the endstops stop motion into a limit, a homing routine zeros the machine, UART sets position from a PC, and a characterized ADC lets a potentiometer position each axis precisely.'], chips: ['C', 'STM32', 'UART'], links: [['C code', 'https://github.com/Armaan-Sengupta/2-Axis-Gantry']] },
  lidar: { body: ['Processing a large urban LiDAR scan with laspy, Open3D and NumPy: voxel downsampling, a nearest-neighbour outlier filter for dust and artifacts, and a custom furthest-pair search fast enough for 1M+ points.'], chips: ['Python', 'NumPy', 'LiDAR'], links: [['Code and write-up', 'https://github.com/Armaan-Sengupta/Fyelabs-Project/blob/master/README.md']] },
  ftc: { hero: 'yTg-Im7ZjQQ', gallery: [
      { type: 'youtube', src: 'JKgwHWdiYf8', caption: 'Freight Frenzy Control Award submission' },
      { type: 'youtube', src: 'jVzE0RhTxNA', caption: 'Autonomous systems: Control Award video' },
      { type: 'youtube', src: 'hSD0i93UDiY', caption: 'Ontario Provincials match 6: 240 points' },
      { type: 'youtube', src: 'g0cYa1xLYmY', caption: 'Canada Cup match 6: 258 points' },
      { type: 'video', src: 'media/ftc-ring-shooter.mp4', poster: 'media/ftc-ring-shooter.jpg', caption: 'Ultimate Goal ring shooter in slow motion' },
      { type: 'youtube', src: 'JrPHVg6NnLc', caption: 'Ultimate Goal robot reveal v2.1' },
      { type: 'youtube', src: 'UXFpl0-dEx8', caption: 'Ultimate Goal shooter prototype' },
      { type: 'youtube', src: 'yatwMM1BCuk', caption: 'Skystone robot reveal' },
      { type: 'youtube', src: 'Pv3DPuoHrXA', caption: 'Robot version 1 CAD' }
    ], body: ['Wrote all the robot software in Java: PIDF control holds the arm in position and the flywheel at speed under load, TensorFlow vision detects game elements, and distance sensors and gyros handle localization. The team won the Control Award at the Asia Pacific Open Championship.'], chips: ['Java', 'PID', 'TensorFlow'], links: [['Robot reveal', 'https://youtu.be/yTg-Im7ZjQQ'], ['Top match', 'https://youtu.be/hSD0i93UDiY']] },
  ri3d: { hero: 'qqqrSge0pF4', body: ['As team lead of UW REACT, organized an FRC Robot-in-3-Days event and built a ring-launching robot in 48 hours with five people.'], chips: ['FRC', 'Rapid prototyping'] },
  'tank-tread': { body: ['A custom tank-tread drive for off-road terrain, designed in CAD and tested on rock.'], chips: ['CAD'] }
};

export const uses = [
  ['neuralink', 'Neuralink · implant firmware'], ['tesla', 'Tesla · vehicle lighting'], ['ixana', 'Ixana · wearable video'], ['magna', 'Magna · crack detection'],
  ['fyelabs', 'FYELABS · truck safety'], ['airbrakes', 'Waterloo Rocketry · airbrakes'], ['ripl', 'RIPL · contact localization'], ['platform', 'Stewart platform'],
  ['measurement', 'Tolerance inspection'], ['beam-balancer', 'Beam balancer'], ['segway', 'Segway dynamics'], ['lidar', 'LiDAR point clouds'],
  ['gantry', 'Two-axis gantry'], ['clamping-hub', 'Clamping hub'], ['ftc', 'FTC 16397']
];

export const skills = {
  'Languages': {
    'C': ['neuralink', 'tesla', 'airbrakes', 'platform', 'measurement', 'beam-balancer', 'gantry'],
    'C++': ['ixana', 'fyelabs', 'measurement'],
    'Rust': ['neuralink'],
    'Python': ['tesla', 'magna', 'fyelabs', 'ripl', 'platform', 'measurement', 'beam-balancer', 'segway', 'lidar'],
    'Java': ['ftc'], 'Verilog': ['ixana'], 'MATLAB': ['segway', 'platform']
  },
  'Embedded': {
    'STM32': ['airbrakes', 'gantry'], 'ESP32': ['measurement'], 'NXP · Ambiq': ['ixana'], 'FreeRTOS': ['airbrakes'],
    'DMA · interrupts': ['neuralink', 'gantry'], 'ASIC bring-up': ['neuralink', 'ixana'], 'FPGA': ['ixana']
  },
  'Protocols': {
    'I²C': ['airbrakes', 'measurement', 'fyelabs'], 'Protobuf': ['neuralink'], 'UART': ['fyelabs', 'airbrakes', 'gantry'],
    'MIPI DSI': ['ixana'], 'LoRa': ['fyelabs'], 'MQTT': ['magna', 'fyelabs'], 'WebSockets': ['measurement']
  },
  'Hardware & CAD': {
    'KiCad': ['airbrakes'], 'Altium': ['tesla'], 'EasyEDA': ['fyelabs'], 'SolidWorks': ['airbrakes', 'fyelabs', 'beam-balancer', 'clamping-hub', 'platform'],
    'Ansys · FEA': ['airbrakes', 'clamping-hub'], 'Sheet-metal DFM': ['fyelabs']
  },
  'Controls & Robotics': {
    'PID · PIDF': ['airbrakes', 'platform', 'beam-balancer', 'ftc'], 'State estimation': ['airbrakes', 'platform'], 'Kinematics': ['platform', 'ripl'],
    'Trajectory planning': ['platform', 'airbrakes'], 'Simulink · Simscape': ['platform', 'segway'], 'SimulationX': ['segway'],
    'ROS 2': ['ripl'], 'MuJoCo': ['ripl'], 'OpenCV': ['platform', 'measurement', 'beam-balancer'], 'LiDAR': ['fyelabs', 'lidar']
  },
  'Tooling': {
    'Git': ['neuralink', 'tesla', 'ixana', 'platform'], 'Pytest · SIL / HIL': ['tesla', 'ixana', 'fyelabs'], 'PostgreSQL': ['magna']
  }
};
