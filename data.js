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
  fyelabs: { tag: 'as-fyelabs-system', src: 'elements/fyelabs/fyelabs-system.js' },
  hub: { tag: 'as-clamping-hub', src: 'elements/hub/clamping-hub.js' },
  contact: { tag: 'as-contact-loc', src: 'anim/contact-loc.js' },
  gantry: { tag: 'as-gantry', src: 'anim/gantry.js' },
  cloud: { tag: 'as-point-cloud', src: 'anim/point-cloud.js' }
};
const withAttrs = (el, attrs) => ({ ...el, attrs: { ...(el.attrs || {}), ...attrs } });

// Each project's own page sits at the site root; a project that had a page on the old site keeps that address,
// so links and search results that point at it land on the real page with no redirect. Pages are written as
// <slug>.html, which GitHub Pages serves at /<slug> with no trailing slash, matching the old URLs exactly.
const PAGE_SLUG = { airbrakes: 'rocketry' };
export const pagePath = (id) => `/${PAGE_SLUG[id] || id}`;

export const chapters = [
  /* ─────────── personal ─────────── */
  {
    id: 'platform', flow: 'personal', hero: true,
    org: '3RRS parallel manipulator', dates: 'Dec 2025',
    title: 'Stewart Platform', role: 'Finding a 200× heavier ball by its moment',
    points: ['Redesigned the platform around a 538 g steel ball so a force-torque sensor could find it', 'Topology-optimized the plate: 14% lighter and 12% stiffer than a standard cutout design', 'Designed a ball-joint-free spherical parallel manipulator with pin joints only'],
    views: [
      { id: 'assemble', label: 'Assembly', el: EL.platform, progress: 'view', len: 1.3 },
      { id: 'live', label: 'Live model', el: EL.platform, hint: 'Click the plate to drop the ball' },
      { id: 'demo', label: 'Full system demo', el: EL.platform, compare: 'media/stewart-demo.mp4', len: 1.2 }
    ]
  },
  {
    id: 'airbrakes', flow: 'personal', intro: 1,
    org: 'Waterloo Rocketry · Borealis', dates: 'Dec 2024',
    title: 'Rocket Airbrakes', role: 'Active drag control for Borealis',
    points: ['Designed the cam-slot mechanism that drives all three panels from one servo', 'Co-wrote the STM32 firmware: state estimation, apogee prediction and PI control', 'Designed the 4-layer avionics PCB for the canards, raising power efficiency from 66% to 95%'],
    views: [
      { id: 'mechanism', label: 'Mechanism', captions: [['One servo turns the cam plate, which drives all three panels out together', 0], ['As the panels extend out of the rocket body, the drag force on the rocket increases', 0.47], ['In flight, the computer predicts apogee and moves the airbrakes in and out until the prediction meets the target', 0.66]], el: withAttrs(EL.airbrakes, { view: 'journey' }), progress: 'view', len: 7 },
      { id: 'pcb', label: 'Flight computer', caption: 'The Canard-ian avionics board, from render to the assembled board', swap: ['media/airbrakes/canardian-render.webp', 'media/airbrakes/canardian-board.webp'], len: 0.7 },
      { id: 'hardware', label: 'Hardware', caption: 'The machined airbrakes, from CAD to the real part', swap: ['media/airbrakes/render-deployed-transparent.webp', 'media/airbrakes/irl/airbrake-07.webp'], len: 0.7 },
      { id: 'launch', label: 'Launch', fall: true, caption: 'Borealis lifting off at Launch Canada, August 2024', video: 'media/airbrakes/launch-scrub.mp4', once: true }
    ]
  },
  {
    id: 'measurement', flow: 'personal', intro: 1,
    org: '', dates: 'Dec 2023',
    title: 'Automated Measurement System', role: '',
    points: ['Used OpenCV to turn each part to its critical dimension', 'Wrote a 2-wire protocol so an ESP32 could talk to the VEX brain', 'Measured parts to within 0.3 mm'],
    views: [
      { id: 'machine', label: 'Machine', scrub: 'media/lottie/measurement-device.mp4', progress: 'view', len: 1.8 },
      { id: 'rig', label: 'The rig', img: 'media/measurement-rig.webp' },
      { id: 'real', label: 'Real run', caption: 'A full run: find the orientation, turn the part, measure', video: 'media/gallery/measurement/demo-loop.mp4' },
      { id: 'protocol', label: '2-wire protocol', caption: 'Two wires carry each angle from the ESP32 to the VEX brain', el: EL.wire }
    ]
  },


  /* ─────────── professional ─────────── */
  {
    id: 'neuralink', flow: 'professional', mono: true, seq: true,
    org: 'California', logo: ['media/logos/neuralink.svg', 1.0], dates: 'Jan – Aug 2026',
    title: 'Neuralink', role: 'Implant Firmware & Embedded Systems Intern · Stimulation – Blindsight',
    points: ['Wrote stimulation implant firmware coordinating waveforms and sampling for 3k+ electrodes', 'Architected the app-to-ASIC stack for Blindsight', 'Cut registration time per trial by about 97%'],
    views: [
      { id: 'implant', label: 'Implant', el: EL.neural, progress: 'chapter', len: 1 },
      { id: 'threads', label: 'Threads', el: EL.neural, progress: 'chapter', len: 1 },
      { id: 'signals', label: 'Signals', el: EL.neural, progress: 'chapter', len: 1 },
      { id: 'perception', label: 'Perception', el: EL.neural, progress: 'chapter', len: 1 }
    ]
  },
  {
    id: 'tesla', flow: 'professional',
    org: 'California', logo: ['media/logos/tesla.svg', 0.42], dates: 'May – Aug 2025',
    title: 'Tesla', role: 'Vehicle Firmware Intern · Body Controls',
    points: ['Brought up about 20 exterior lights on the Semi', 'Wrote current-sense self-tests for the Cybercab lights', 'Fixed out-of-sync Cybertruck headlamp calibration'],
    views: [
      { id: 'semi', label: 'Semi', el: withAttrs(EL.tesla, { view: 'semi' }) },
      { id: 'cybercab', label: 'Cybercab', el: withAttrs(EL.tesla, { view: 'cybercab' }) },
      { id: 'cybertruck', label: 'Cybertruck', el: withAttrs(EL.tesla, { view: 'cybertruck' }) }
    ]
  },
  {
    id: 'ixana', flow: 'professional',
    org: 'Indiana', logo: ['media/logos/ixana.svg', 0.62], dates: 'Aug – Dec 2024',
    title: 'Ixana', role: 'Embedded Firmware Intern',
    points: ['Streamed video from smart glasses to a watch through the body', 'Raised the frame rate from 4 to 13 fps', 'Owned the MIPI-DSI display drivers'],
    views: [
      { id: 'capture', label: 'Capture', caption: 'A camera on smart glasses captures video', el: withAttrs(EL.ixana, { view: 'capture' }) },
      { id: 'link', label: 'Through the body', caption: 'The video travels through the body over Wi-R', el: withAttrs(EL.ixana, { view: 'link' }) },
      { id: 'display', label: 'On the watch', caption: 'It plays back on the watch', el: withAttrs(EL.ixana, { view: 'display' }) },
      { id: 'ces', label: 'CES demo', caption: 'The live demo at CES', video: 'media/ixana/ixana-wir-demo-full.mp4' }
    ]
  },
  {
    id: 'magna', flow: 'professional', mono: true,
    org: 'Ontario', logo: ['media/logos/magna.svg', 0.62], dates: 'Jan – Apr 2024',
    title: 'Magna', role: 'Crack detection in a stamping die',
    points: ['Streamed strain-gauge data over MQTT to a live dashboard', 'Caught every cracked part with no false alarms', 'Built a patent-pending PLC buffer that raised sampling from 142 to 500 Hz'],
    views: [
      { id: 'detector', label: 'Live detector', caption: 'Each stroke is checked against the learned normal envelope; cracked parts stand out', video: 'media/magna/strain-monitor.mp4' },
      { id: 'dashboard', label: 'Dashboard', caption: 'The operator dashboard', img: 'media/img/magna_crack_detection_dashboard.webp', color: true }
    ]
  },
  {
    id: 'fyelabs', flow: 'professional',
    org: 'Ontario', logo: ['media/logos/fyelabs.png', 0.58], dates: 'May – Sep 2023',
    title: 'FYELABS', role: 'Robotics & Embedded Intern',
    points: ['Built back-up safety sensing for garbage trucks', 'Designed a LiDAR dust filter that still detects people', 'Designed the 100+ part enclosure and cut its cost by 56%'],
    views: [
      { id: 'case', label: 'Enclosure', el: withAttrs(EL.fyelabs, { view: 'case' }), progress: 'view', len: 1 },
      { id: 'built', label: 'As built', caption: 'The built enclosure on the test rig', img: 'media/fyelabs/case-photo.webp' },
      { id: 'lidar', label: 'LiDAR array', el: withAttrs(EL.fyelabs, { view: 'lidar' }) },
      { id: 'dust', label: 'Dust filter', el: withAttrs(EL.fyelabs, { view: 'dust' }) },
      { id: 'dust-test', label: 'Real dust test', caption: 'Dust test in the field', video: 'media/fyelabs/dust-test-loop.mp4' },
      { id: 'hmi', label: 'HMI', caption: 'The HMI prototype mapping objects to zones', img: 'media/fyelabs/hmi-prototype.webp' }
    ]
  }
];

// grid cards. media: one of {el}, {lottie} (scrubbed by scroll position), {video}, {img}
export const cards = [
  { id: 'platform', date: 'Dec 2025', title: 'Stewart Platform', kicker: 'MTE 380 · Team of five', blurb: 'Led the mechanical, electrical, software and firmware design of a ball balancer that finds a 538 g steel ball from the moment it produces on a force-torque sensor.', media: { video: 'media/stewart-demo.mp4' } },
  { id: 'airbrakes', date: 'Dec 2024', title: 'Rocket Airbrakes', kicker: 'Waterloo Rocketry', blurb: 'Designed the cam mechanism that drives three panels from one servo, and co-wrote the firmware that steers Borealis to its target apogee.', media: { video: 'media/airbrakes/irl/actuation-1.mp4' } },
  { id: 'measurement', date: 'Dec 2023', title: 'Automated Measurement System', kicker: 'Team project', blurb: 'Led the firmware for a station that measures parts to 0.3 mm, including a custom 2-wire protocol to the VEX brain.', media: { scrub: 'media/lottie/measurement-device.mp4' } },
  { id: 'trashminator', date: '2022', title: 'The Trashminator', kicker: 'Grade 12 · Design', blurb: 'Designed and built an autonomous surface robot that collects floating trash, meant to work in swarms.', media: { scrub: 'media/lottie/trashminator.mp4' } },
  { id: 'radial-engine', date: '2021', title: 'Radial Engine', kicker: 'Grade 11 · CAD', blurb: 'Modelled twenty-plus parts from orthographic drawings and assembled them into a working six-cylinder linkage.', media: { scrub: 'media/lottie/radial-engine.mp4' } },
  { id: 'clamping-hub', title: 'Clamping Hub', kicker: 'Product · Studica', blurb: 'Designed and FEA-tested an ultra-low-profile clamping shaft hub, now sold commercially by Studica.', media: { el: EL.hub, progress: true } },
  { id: 'ripl', date: 'Sep 2025 – Jan 2026', title: 'Contact Localization', kicker: 'Research · RIPL', blurb: 'Built a MuJoCo–ROS 2 bridge for the Franka Panda, with force injection to benchmark contact localization.', media: { el: EL.contact } },
  { id: 'beam-balancer', date: '2025', title: 'Beam Balancer', kicker: 'Personal · 2025', blurb: 'Took a 1-D ball balancer from linkage design to working firmware in two weeks.', media: { video: 'media/beam-balancer.mp4' } },
  { id: 'segway', date: 'Apr 2025', title: 'Segway Dynamics', kicker: 'Year 3 · Modelling', blurb: 'Derived the equations of motion for a human transporter by hand and checked them in Simulink against SimulationX.', media: { el: EL.segRide } },
  { id: 'gantry', date: '2025', title: 'Two-Axis Gantry', kicker: 'Year 3 · STM32', blurb: 'Wrote the STM32 firmware: interrupt-driven endstops, homing, UART positioning and an ADC-characterized pot.', media: { el: EL.gantry } },
  { id: 'lidar', date: '2023', title: 'LiDAR Point Clouds', kicker: 'Year 1 · Software', blurb: 'Wrote filtering, voxel downsampling and a fast furthest-pair search for millions of points.', media: { el: EL.cloud } },
  { id: 'ftc', date: '2022', title: 'FTC 16397 Robots', kicker: 'Competitive robotics', blurb: 'All software, solo. Control Award at the Asia Pacific Open Championship.', media: { video: 'media/ftc-robot.mp4' } },
  { id: 'ri3d', date: 'Jan 2024', title: 'Robot in 3 Days', kicker: 'UW REACT · FRC', blurb: 'Organized the event and built a ring-launching robot in 48 hours with five people.', media: { img: 'https://i.ytimg.com/vi/qqqrSge0pF4/hqdefault.jpg' } },
  { id: 'tank-tread', title: 'Off-Road Tank Tread', kicker: 'Design · Studica', blurb: 'Designed a tracked drive concept for rough terrain, shown here as a CAD render.', media: { img: 'https://i.ytimg.com/vi/oDeQVKhRZAk/hqdefault.jpg' } },
  { id: 'gooseminator', date: '2022', title: 'The Gooseminator', kicker: 'First year · Team design', blurb: 'Sweeps an area and sorts bird eggs by whether they are an invasive or protected species.', media: { img: 'https://i.ytimg.com/vi/Ba5209A3aXg/hqdefault.jpg' } },
  { id: 'robotic-arm', date: '2022', title: '3-DOF Robotic Arm', kicker: 'First year · 8-hour build', blurb: 'Built in under 8 hours from a Tetrix kit to pick up oddly shaped bones and sort them.', media: { video: 'media/gallery/robotic-arm/demo.mp4' } }
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
      { type: 'image', src: 'media/platform/slides/topo-plate.webp', caption: 'The topology-optimized plate' },
      { type: 'image', src: 'media/platform/slides/topo-comparison.webp', caption: 'FEA: topology-optimized against standard cutouts, with the ball at the edge' },
      { type: 'image', src: 'media/platform/slides/link-failure.webp', caption: 'The first plate overloaded the links, which cracked at the bearing' },
      { type: 'image', src: 'media/platform/slides/link-redesign.webp', caption: 'Redesigned links: wider around the bearings, with a new washer stack' },
      { type: 'image', src: 'media/platform/slides/joint-slop.webp', caption: 'Joint stack: shims reduced the slop but could not remove it' },
      { type: 'image', src: 'media/platform/slides/redesign-why.webp', caption: 'Why the linkage needed a deeper redesign' },
      { type: 'image', src: 'media/platform/slides/spm-layouts.webp', caption: 'Spherical parallel manipulator layouts: every joint axis must meet at one point' },
      { type: 'image', src: 'media/platform/slides/spm-egg.webp', caption: 'The 3D-printed spherical parallel manipulator, pin joints only, balancing an egg' },
      { type: 'image', src: 'media/platform/spv4-ik-plot.webp', caption: 'Matplotlib inverse-kinematics model of the three chains' },
      { type: 'image', src: 'media/platform/simulink-plant-controller.webp', caption: 'Simulink plant and controller model' },
      { type: 'image', src: 'media/img/stewart_kinematics_diagram.webp', caption: 'Ball free-body diagram and overview' },
      { type: 'image', src: 'media/img/stewart_platform_prototype.webp', caption: 'Prototype' },
      { type: 'image', src: 'media/img/stewart_platform_sim_sensor.webp', caption: 'Kinematics, Simulink and sensor collage' }
    ],
    body: ["A ball-balancing platform: a 3-RRS parallel manipulator, where three legs, each a revolute–revolute–spherical joint chain, tilt and lift the plate with three degrees of freedom to hold a ball still. The usual version, from our course, balances a 2.7 g ping-pong ball under an overhead camera. I had never seen anyone find the ball from the moment it produces instead, so our team of five tried it for the novelty: a force-torque sensor under the plate reads the moments the ball's weight creates, and its position follows from them.",
      "A ping-pong ball barely registers on a load cell, so we switched to a 538 g steel ball, about 200 times heavier, and that broke almost every part of the platform. I led the mechanical, electrical, software and firmware design: a topology-optimized plate 14% lighter and 12% stiffer than a standard cutout design, stronger links, a protection circuit for the large back EMF from servos the heavy ball drove backwards, the forward and inverse kinematics, the ball position estimate from the force sensor, the controller, and the servo control firmware.",
      "The play left in the ball joints led to a second design: a spherical parallel manipulator with pin joints only. Its 3D-printed prototype moves smoothly with no bearings at all and balances an egg."],
    chips: ['SolidWorks', 'Topology optimization · FEA', 'Laser cutting · 3D printing', 'Kinematics', 'Python', 'Simulink', 'PID']
  },
  airbrakes: { hero: 'SJO39WQ7Uv0', gallery: [
      { type: 'youtube', src: 'Z126ZESX3uA', caption: 'Borealis launch, Launch Canada 2024' },
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
    body: ['Borealis is Waterloo Rocketry\'s rocket, Canada\'s first liquid-fuelled student rocket. At competition each team declares a target apogee before launch and is scored on how close it gets. Without active control, the team\'s 2023 rocket came within 1,500 ft of its 30,000 ft target. For 2024 we added airbrakes: three panels that extend out of the airframe in flight, adding drag to bleed off extra altitude and steer the rocket onto its target.',
      'I designed the mechanism: one servo turns a plate cut with three modified cam-slot spirals, so all three panels move in perfect sync and extension is linear in servo angle. With a teammate I ran Ansys CFD to map drag coefficient against extension and check the centre of pressure stays safely behind the centre of gravity. With the subteam I wrote the STM32 / FreeRTOS firmware, which estimates the rocket\'s state with a Madgwick filter, predicts apogee with RK4 and closes the loop with a PI controller.',
      'At launch the propellant was underfilled by more than the airbrakes could correct for, so they correctly stayed retracted. For the next rocket I designed the 4-layer KiCad flight computer for its roll-control canards, raising power efficiency from 66% to 95%.'],
    chips: ['C · FreeRTOS', 'STM32', 'DMA · interrupts', 'KiCad', 'Ansys CFD', 'SolidWorks'], links: [['Borealis', 'https://www.waterloorocketry.com/rockets/borealis']]
  },
  measurement: { gallery: [
      { type: 'image', src: 'media/measurement-rig.webp', caption: 'The built rig: VEX brain, turntable, clamp and the camera mast' }
    ],
    body: ["A quality-assurance station for an automation line: it checks each part's tolerances right after manufacturing, with no human involved. Computer vision turns the part to its critical dimension, a clamp on a rotary encoder closes on it until it senses firm contact, and the encoder rotation becomes a length, accurate to within 0.3 mm. Out-of-spec parts are logged to a server with their image and the failing dimension.",
      "I was the lead firmware engineer, writing the C++ on the ESP32 and the main controller: both motors, turning encoder rotation into dimensions, and the GUI. I also worked with a teammate on the OpenCV orientation detection, which sends its angle to the ESP32 over WebSockets.",
      "The awkward link was the last one. The VEX V5 brain exposes no UART, I²C or SPI, only reading a pin as high or low, so we designed our own 2-wire clocked protocol, loosely inspired by I²C, to carry the angle from the ESP32 to the brain."],
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
    body: ["The goal was to tune a human transporter, with no active control, to travel as far as possible before tipping, and to compare a model we derived by hand against an acausal one that needs no derivation.",
      "We derived the nonlinear kinematic and kinetic equations, linearized them with a small-angle approximation into a state-space model, and swept thrust force and lean angle in Simulink, coarsely and then finely. SimulationX models the same system acausally; the gap between the two results is the cost of our idealizations."],
    chips: ['MATLAB', 'Simulink', 'SimulationX', 'Python'],
    links: [['Code', 'https://github.com/Armaan-Sengupta/MTE-351-Code']]
  },
  neuralink: { gallery: [
      { type: 'video', src: 'elements/neuralink/media/neural-journey.mp4', poster: 'elements/neuralink/media/neural-journey.jpg', caption: 'From implant to perceived image. This is an artistic rendering, not official Neuralink material, and does not indicate product fidelity.' },
      { type: 'image', src: 'elements/neuralink/media/neural-implant-cutaway.jpg', caption: 'Cut-away implant and thread exit. This is an artistic rendering, not official Neuralink material, and does not indicate product fidelity.' },
      { type: 'image', src: 'elements/neuralink/media/neural-signals.jpg', caption: 'Stimulation pulses travelling to the electrode contacts. This is an artistic rendering, not official Neuralink material, and does not indicate product fidelity.' }
    ],
    body: ["Blindsight is Neuralink's visual prosthesis, which aims to give people who are blind a form of sight by stimulating the brain through an implant. I worked on the firmware that does the stimulating.",
      "I led firmware for a 1st-gen neural stimulation implant: interrupt-driven, DMA-fed, high-throughput code coordinating waveforms and sampling for 3k+ electrodes, in Rust and C. I also architected the full app-to-ASIC stack for Blindsight.",
      "I cut registration time per trial by about 97%, which made the stimulation safety study feasible on schedule and met the FDA submission deadline, and brought up impedance and calibration so chips could self-test, unblocking the production line."],
    chips: ['Rust', 'C', 'ARM', 'Nordic', 'DMA', 'Interrupts', 'ASIC bring-up', 'Protobuf'], links: [['Blindsight', 'https://neuralink.com/trials/visual-prosthesis/']]
  },
  tesla: { gallery: [
      { type: 'image', src: 'media/img/tesla_lighting_vehicles.webp', caption: 'Semi and Cybercab lighting locations (render)' },
      { type: 'image', src: 'media/tesla/semi-lighting-front.webp', caption: 'Tesla Semi front lighting (render)' },
      { type: 'image', src: 'media/tesla/semi-lighting-quarter.webp', caption: 'Tesla Semi lighting, front quarter (render)' }
    ],
    body: ["On the Body Controls firmware team I worked on exterior lighting: the firmware that drives a vehicle's lights and detects when one has failed, across the Semi, the Cybercab and earlier vehicles.",
      "I brought up all ~20 exterior lights on the Tesla Semi and their current-sense ADCs, from the hardware layer through to app-layer integration, writing the C drivers against the Altium schematics. For the Cybercab I developed current-sense self-tests for every exterior light so faulty units are caught before leaving the line, and diagnosed an ADC sample time that was too short: residual charge in a filter capacitor let disconnected lights pass, and with it fixed, open lights are now caught in production.",
      "On the Model 3, Model Y and Cybertruck I corrected a logic error where disconnected lights did not raise a fault, enabling better failure analysis after the fact. I fixed a Cybertruck bug that calibrated the left and right headlamp stepper motors out of sync, so headlights no longer move at night, and refined auto high-beam latching to activate only at night, with SIL tests (pytest and C unit tests) verifying homologated behaviour across earlier vehicles."],
    chips: ['C', 'Altium', 'ADC · current sense', 'pytest · SIL', 'C unit tests']
  },
  ixana: { gallery: [
      { type: 'video', src: 'media/ixana/ixana-wir-demo-full.mp4', poster: 'media/ixana/ixana-wir-demo-full.jpg', caption: 'CES demo: video sent through the body over Wi-R (full length, with audio)' },
      { type: 'image', src: 'elements/ixana/assets/original-wearable-pipeline.png', caption: 'The video path: camera, FPGA, MCU, Wi-R, MCU, FPGA, display' }
    ],
    body: ["Ixana's Wi-R silicon uses the wearer's body as the data link between devices, using less power than Bluetooth or Wi-Fi. My project was to stream video over it, from a camera on smart glasses to a smartwatch display.",
      "I raised the frame rate from 4 to 13 fps and cut power by 8% with a bare-metal C++ core OS on Ambiq and NXP MCUs. I debugged the whole path (camera, FPGA encode, MCU, Wi-R, MCU, FPGA decode, AMOLED), owned the MIPI-DSI display drivers, and wrote a Python driver for a Rigol waveform generator for hardware-in-the-loop testing."],
    chips: ['C++', 'Bare metal', 'Nordic', 'MIPI DSI', 'FPGA · Verilog', 'HIL'], links: [['CES demo', 'https://youtube.com/shorts/He_goadObV0']]
  },
  magna: {
    body: ["Parts can crack as a hydraulic press stamps them. I built a real-time monitor that catches it in the die, using strain gauges embedded near the die, so cracked parts are pulled from the line automatically.",
      "I built the pipeline end to end: strain data streamed over MQTT into PostgreSQL, with a live web dashboard where operators compare strain profiles and review anomalies. An anomaly detector learns each part's normal stroke and caught 100% of cracked parts with zero false positives across a 150-part production run.",
      "The press's PLC had very little memory, so I engineered a patent-pending, semaphore-driven multithreaded buffer that raised the data rate from 142 Hz to 500 Hz, for much finer analysis of each stroke."],
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
    body: ["Industrial garbage trucks reverse in harsh, dirty conditions and need to reliably avoid people and objects. I worked on an autonomous back-up safety system for them: a sensing unit on the back of the truck with 10 LiDARs, 3 depth cameras, an IR camera, an IMU and GPS, run by 6 microcontrollers.",
      "Dust was setting off false alarms, so from field data I designed a LiDAR dust-filtering algorithm, five parallel filters in C++ that reject dust and still catch people. I also designed the driver's HMI: a 2-layer PCB with two MCUs, a LoRa link with custom checksums, a graphics library and 12-zone object mapping. And I designed the 100+ part actuating stainless enclosure over 15 revisions, cutting its cost by 56% and halving lead time."],
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
    ], body: ["Contact localization means working out where on a robot arm it has been touched, here from its joint torques alone. Testing that needs contacts of known force at known places, so I built the simulation to provide them.",
      "I built a MuJoCo–ROS 2 bridge for the Franka Panda so existing robot missions run unchanged in high-fidelity physics, then added external force injection with live joint-torque feedback to benchmark torque-based contact localization."], chips: ['Python', 'ROS 2', 'MuJoCo', 'Franka Panda'], links: [['Demo', 'https://youtube.com/shorts/lbKC-9KtVCI']] },
  'beam-balancer': { body: ["A 1-D warm-up for the Stewart platform: balancing a ball on a beam before balancing it on a plate. I took it from choosing link lengths to working firmware in about two weeks.",
      "A servo tilts the beam through a four-bar linkage, with link lengths chosen from 2-D constraints for mechanical advantage and a compact footprint. An OpenCV tracker measures the ball's position and a tuned controller commands the servo through embedded C firmware."], chips: ['Python', 'C', 'PID', 'OpenCV', 'SolidWorks'], links: [['Demo video', 'https://youtube.com/shorts/xsgP9gpsP7k'], ['Code', 'https://github.com/Armaan-Sengupta/Ball-Beam-Control']] },
  gantry: { body: ["A two-axis machine to be positioned over a target as fast and precisely as possible, without ever driving past its limits. I wrote the STM32 firmware for its two stepper axes.",
      "Interrupts on the endstops stop motion into a limit, a homing routine zeros the machine, UART sets position from a PC, and a characterized ADC lets a potentiometer position each axis precisely."], chips: ['C', 'STM32', 'UART'], links: [['C code', 'https://github.com/Armaan-Sengupta/2-Axis-Gantry']] },
  lidar: { body: ["A large urban LiDAR scan of millions of points: the goal was to clean it, extract the buildings and find the two points furthest apart, a good excuse to try some fun algorithms.",
      "Using laspy, Open3D and NumPy I wrote voxel downsampling, a nearest-neighbour outlier filter for dust and artifacts, and a custom furthest-pair search fast enough for 1M+ points."], chips: ['Python', 'NumPy', 'LiDAR'], links: [['Code and write-up', 'https://github.com/Armaan-Sengupta/Fyelabs-Project/blob/master/README.md']] },
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
  ri3d: { hero: 'qqqrSge0pF4', body: ["Robot in 3 Days: the challenge is unknown until the start, and you build a robot from nothing in 48 hours, as a reference for the high school teams who then have 6 to 8 weeks to build theirs.",
      "As team lead of UW REACT I organized the event, and with four teammates built a robot that takes rings and launches them into a goal."], chips: ['FRC', 'Rapid prototyping'] },
  'tank-tread': { body: ['A tank-tread drive concept for off-road terrain, designed in CAD as part of my work with Studica. What you see is a render.'], chips: ['CAD'] }
};

export const uses = [
  ['neuralink', 'Neuralink · implant firmware'], ['tesla', 'Tesla · vehicle lighting'], ['ixana', 'Ixana · wearable video'], ['magna', 'Magna · crack detection'],
  ['fyelabs', 'FYELABS · truck safety'], ['airbrakes', 'Waterloo Rocketry · airbrakes'], ['ripl', 'RIPL · contact localization'], ['platform', 'Stewart platform'],
  ['measurement', 'Automated measurement system'], ['beam-balancer', 'Beam balancer'], ['segway', 'Segway dynamics'], ['lidar', 'LiDAR point clouds'],
  ['gantry', 'Two-axis gantry'], ['clamping-hub', 'Clamping hub'], ['ftc', 'FTC 16397']
];

export const skills = {
  'Languages': {
    'C': ['neuralink', 'tesla', 'airbrakes', 'platform', 'measurement', 'beam-balancer', 'gantry'],
    'C++': ['ixana', 'fyelabs', 'measurement'],
    'Rust': ['neuralink'],
    'Python': ['tesla', 'magna', 'fyelabs', 'ixana', 'ripl', 'platform', 'measurement', 'beam-balancer', 'segway', 'lidar'],
    'MATLAB': ['segway', 'platform'], 'Java': ['ftc']
  },
  'Embedded': {
    'ARM Cortex-M': ['neuralink', 'ixana', 'airbrakes', 'gantry'], 'STM32': ['airbrakes', 'gantry'], 'Nordic': ['neuralink', 'ixana'], 'ESP32': ['measurement'],
    'RTOS': ['airbrakes'], 'DMA · interrupts': ['neuralink', 'airbrakes', 'gantry'], 'Device drivers': ['tesla', 'ixana', 'neuralink'],
    'Hardware bring-up': ['tesla', 'neuralink', 'ixana'], 'FPGA': ['ixana']
  },
  'Protocols': {
    'I²C': ['airbrakes', 'measurement', 'fyelabs', 'ixana'], 'SPI': ['ixana'], 'UART': ['fyelabs', 'airbrakes', 'gantry'], 'CAN': ['airbrakes'],
    'MIPI DSI': ['ixana'], 'MQTT': ['magna', 'fyelabs'], 'Protobuf': ['neuralink']
  },
  'Hardware & CAD': {
    'PCB design': ['airbrakes', 'fyelabs', 'tesla'], 'SolidWorks': ['airbrakes', 'fyelabs', 'beam-balancer', 'clamping-hub', 'platform'],
    'FEA · CFD': ['airbrakes', 'clamping-hub']
  },
  'Controls & Robotics': {
    'PID control': ['airbrakes', 'platform', 'beam-balancer', 'ftc'], 'State estimation': ['airbrakes', 'platform'], 'Kinematics': ['platform', 'ripl'],
    'Simulink': ['platform', 'segway'], 'ROS 2': ['ripl'], 'Computer vision': ['platform', 'measurement', 'beam-balancer'], 'Signal processing': ['magna', 'fyelabs']
  },
  'Testing & tools': {
    'Git': ['neuralink', 'tesla', 'ixana', 'platform'], 'SIL · HIL testing': ['tesla', 'ixana', 'fyelabs'], 'SQL': ['magna']
  }
};
