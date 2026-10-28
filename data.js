// Content for the project grid, drawers, index and skills map.
// media: {video:id} | {el:tag, src, classic?, attrs?} ; img paths are under media/img/

export const cards = [
  {
    id: 'beam', w: 6, title: 'Beam Balancer', kicker: 'Personal · 2025', media: { video: 'beam-balancer', img: 'beam_balancer_mechanism.webp' },
    blurb: 'The 1-D precursor to the Stewart platform. Linkage to firmware in two weeks.',
    body: [
      'A ball rolls on a beam tilted by a servo through a four-bar linkage. I chose link lengths from 2-D constraints for good mechanical advantage and a compact footprint, then modelled the mechanism in SolidWorks.',
      'An OpenCV tracker measures ball position. A tuned controller (Python) commands the servo through embedded C firmware, holding the ball at centre with little overshoot or oscillation.'
    ],
    points: ['Optimized link lengths from 2-D constraints (SolidWorks)', 'Controller tuned for minimal % overshoot (Python)', 'Servo actuation firmware (C)', 'Vision feedback with OpenCV'],
    gallery: ['beam_balancer_mechanism.webp', 'beam_simulink_loop.webp'],
    links: [['Demo video', 'https://youtube.com/shorts/xsgP9gpsP7k'], ['Ball & beam control lab', 'https://github.com/Armaan-Sengupta/Ball-Beam-Control']],
    skills: ['Python', 'C', 'PID', 'OpenCV', 'SolidWorks']
  },
  {
    id: 'segway', w: 6, title: 'Segway Dynamics', kicker: 'MTE 351 · Modelling', media: { el: 'as-segway-sweep', src: 'anim/segway-sweep.js' },
    blurb: 'Nonlinear EOMs, linearization and a 2-D parameter sweep, cross-checked in an acausal simulator.',
    body: [
      'We derived the nonlinear kinematic and kinetic equations of a human transporter, then linearized them with a small-angle approximation into a state-space model.',
      'A Simulink model swept thrust force F and lean angle β: coarse first, then 0.5 N × 0.05 rad steps. The surface peaks at <strong>12.3 m at 170 N</strong>. SimulationX models the system acausally without hand-derived equations, and gave 9.15 m at 110 N. That gap is the cost of the idealizations in the hand-derived model.'
    ],
    points: ['Hand-derived nonlinear EOMs → linear state-space', 'Simulink broad-then-narrow optimization sweep', 'SimulationX acausal validation, Python post-processing'],
    gallery: ['segway_dynamics_simulink.webp'],
    links: [['Simulink & SimX code', 'https://github.com/Armaan-Sengupta/MTE-351-Code']],
    skills: ['MATLAB', 'Simulink', 'SimulationX', 'Python']
  },
  {
    id: 'hub', w: 4, title: 'Clamping Hub', kicker: 'Product · Studica', media: { el: 'as-clamping-hub', src: 'elements/hub/clamping-hub.js' },
    blurb: 'An ultra-low-profile clamping shaft hub. Now sold commercially by Studica.',
    body: [
      'Set-screw hubs on the market marred shafts and worked loose. I designed a split, ultra-low-profile clamping hub that grips without marring.',
      'I used FEA to push how far the metal could flex while still transmitting high torque. The part is now sold by Studica Ltd.'
    ],
    points: ['Clamping topology replaces radial set screw', 'FEA-driven flexure geometry', 'Commercialized through Studica'],
    gallery: ['hub_fea.webp'],
    links: [],
    skills: ['SolidWorks', 'FEA']
  },
  {
    id: 'lidar', w: 4, title: 'LiDAR Point Clouds', kicker: 'Year 1 · Software', media: { el: 'as-point-cloud', src: 'anim/point-cloud.js' },
    blurb: 'Filtering, voxel downsampling and a fast furthest-pair search on millions of points.',
    body: [
      'Processing a large urban LiDAR scan with laspy, Open3D and NumPy. I voxel-downsampled it, removed dust and artifacts with a nearest-neighbour outlier filter, and wrote a custom furthest-pair search that cuts time complexity enough to handle 1M+ points.'
    ],
    points: ['laspy · Open3D · NumPy', 'Statistical outlier removal for dust', 'Custom furthest-pair algorithm for 1M+ points'],
    gallery: ['lidar_point_cloud_3d.webp'],
    links: [['Code & write-up', 'https://github.com/Armaan-Sengupta/Fyelabs-Project/blob/master/README.md'], ['3-D viewer', 'http://lidarview.com/?url=armaan-sengupta.github.io/Fyelabs-Project/CaliforniaBuildingsOnly.las']],
    skills: ['Python', 'NumPy', 'LiDAR']
  },
  {
    id: 'gantry', w: 4, title: 'Two-Axis Gantry', kicker: 'Year 3 · STM32', media: { el: 'as-gantry', src: 'anim/gantry.js' },
    blurb: 'Interrupt-driven endstops, UART positioning and an ADC-characterized pot.',
    body: [
      'An STM32 drives two stepper axes. Interrupts on the endstops stop motion into a limit, a homing routine zeros the machine, UART sets position from a PC, and a characterized ADC lets a potentiometer position each axis precisely.',
      'The final demo was a race to centre the toolhead over a target, as fast and as accurately as possible.'
    ],
    points: ['External interrupts for safety stops & homing', 'UART command interface', 'ADC characterization for analog positioning'],
    gallery: [],
    links: [['C code', 'https://github.com/Armaan-Sengupta/2-Axis-Gantry']],
    skills: ['C', 'STM32', 'UART']
  },
  {
    id: 'trash', w: 4, title: 'The Trashminator', kicker: 'Grade 12 · Tech Design', media: { video: 'trashminator' },
    blurb: 'An autonomous surface robot that collects floating trash. Meant to work in swarms.',
    body: [
      'A macro surface-level aquatic cleaning robot that autonomously navigates a body of water and collects floating debris. The idea is that a swarm of them could take on aquatic pollution.',
      'It began as a technological design course project and became a personal one.'
    ],
    points: ['Autonomous navigation on water', 'Custom collection mechanism', 'Designed to work in swarms'],
    gallery: [],
    links: [],
    skills: ['Arduino', 'Fusion 360']
  },
  {
    id: 'engine', w: 4, title: '6-Cylinder Radial Engine', kicker: 'Grade 11 · CAD', media: { video: 'radial-engine', img: 'radial_engine_render.webp' },
    blurb: 'More than 20 parts modelled from orthographic drawings, assembled into a working linkage.',
    body: ['A test of CAD skill. I modelled more than 20 intricate parts from orthographic drawings and assembled them into a working radial-engine linkage, then animated it.'],
    points: ['20+ parts from orthographic drawings', 'Fully constrained motion linkage', 'Rendered animation'],
    gallery: ['radial_engine_render.webp'],
    links: [],
    skills: ['Inventor', 'Fusion 360']
  },
  {
    id: 'ftc', w: 4, title: 'FTC 16397 Robots', kicker: 'Competitive robotics', media: { video: 'ftc-robot', img: 'ftc_16397_robot.webp' },
    blurb: 'All software, solo. Control Award at the Asia Pacific Open Championship.',
    body: [
      'I wrote all the robot software in Java. PIDF control holds the arm in position and the flywheel at speed under load, TensorFlow vision detects game elements, and distance sensors and gyros handle localization.',
      'The team won the Control Award at the Asia Pacific Open Championship for best software reliability.'
    ],
    points: ['PIDF position & velocity loops', 'TensorFlow object detection', 'Sensor-fused localization', 'Control Award · APAC Open Championship'],
    gallery: ['ftc_16397_robot.webp', 'ftc_robot_award_action.webp'],
    links: [['Robot reveal', 'https://youtu.be/yTg-Im7ZjQQ'], ['Top match', 'https://youtu.be/hSD0i93UDiY'], ['Technical report', 'https://docs.google.com/document/d/e/2PACX-1vSVVdnOZ4oryQ10ZGaDyl8QlIvqSbFl1s0W0ILoz-ML6YVNgPi8ymcQtdg66jIOdNx00qMrcp28F-am/pub']],
    skills: ['Java', 'PID', 'TensorFlow']
  }
];

export const index = [
  ['2024', 'UW REACT · FRC Robot-in-3-Days', 'As team lead, organized the event and built a ring-launching robot in 48 hours with 5 people.', 'Robotics'],
  ['2025', 'Linkage Kinetic Analysis', 'Hand-derived kinematic and kinetic equations of a linkage, solved in MATLAB.', 'Dynamics', 'https://github.com/Armaan-Sengupta/LinkageMechanicalAnalysis'],
  ['2025', 'Bottle Draining Analysis', 'Modelled and measured the draining dynamics of a bottle.', 'Fluids', 'https://github.com/Armaan-Sengupta/352-project-bottle-draining-analysis'],
  ['2025', 'SmartRuler', 'A ruler with a digital LCD readout of the angle it is rotated.', 'Embedded', 'https://github.com/Armaan-Sengupta/SmartRuler'],
  ['2022', 'The Gooseminator', 'Sweeps an area and sorts invasive from protected bird eggs.', 'Mechatronics'],
  ['2023', '3-DOF Robotic Arm', 'Built in under 8 hours to pick up oddly shaped bones and place them in bins.', 'Robotics'],
  ['2023', '3-Joint Arm Optimizer', 'Brute-force search over link lengths that meets reach and minimizes joint torque.', 'Software', 'https://github.com/Armaan-Sengupta/3-Joint-Robot-Arm-Optimizer'],
  ['Gr 11', 'Motorized Pods', 'A wheel pod steering 0–360° that also tucks into the vehicle: three axes of motion.', 'Mechanical'],
  ['Gr 11', 'Mechanical Pull Toy', 'Three toy mechanisms: rotary → linear, perpendicular translation, twin-cam bobbing.', 'Mechanisms'],
  ['Gr 11', 'Falling Penny', 'A physics paper testing the myth of the lethal falling penny.', 'Physics'],
  ['Gr 10', 'Optica Technica', 'A modular optics kit that reconfigures into a telescope, microscope or projector.', 'Product'],
  ['Gr 10', 'Arduino Security System', 'Motion and distance sensing, keypad, LCD UI, loiter warnings and intrusion stages.', 'Embedded'],
  ['Gr 10', 'HydroStat · SHAD', 'Water-usage monitoring modules and app, designed and animated in under 24 hours.', 'Hackathon'],
  ['Gr 10', 'RFIDBLS', 'An RFID system that tells you what you forgot when you leave the house.', 'Hackathon'],
  ['Gr 10', 'Universal Translating Device', 'Phrase buttons translated via Google Translate, then shown on an LCD and spoken aloud.', 'Hackathon'],
  ['Gr 9', 'Hovercraft', 'Researched, designed and tested a hovercraft with a hand-built controller.', 'Mechanical'],
  ['Gr 9–12', 'VEX EDR · DiscoBots', 'Three years of VEX IQ and EDR competition, where my robotics journey began.', 'Robotics']
];

// where each skill was used (ids match .uses rows below)
export const uses = [
  ['neuralink', 'Neuralink · implant firmware'], ['tesla', 'Tesla · vehicle lighting'], ['ixana', 'Ixana · wearable video'], ['magna', 'Magna · crack detection'],
  ['fyelabs', 'FYELABS · truck safety'], ['rocketry', 'Waterloo Rocketry · airbrakes'], ['ripl', 'RIPL · MuJoCo × ROS 2'], ['stewart', 'Stewart platform'],
  ['measure', 'Tolerance inspection'], ['beam', 'Beam balancer'], ['segway', 'Segway dynamics'], ['lidar', 'LiDAR point clouds'],
  ['gantry', 'Two-axis gantry'], ['hub', 'Clamping hub'], ['ftc', 'FTC 16397']
];

export const skills = {
  'Languages': {
    'C': ['neuralink', 'tesla', 'rocketry', 'stewart', 'measure', 'beam', 'gantry'],
    'C++': ['ixana', 'fyelabs', 'measure'],
    'Rust': ['neuralink'],
    'Python': ['tesla', 'magna', 'fyelabs', 'ripl', 'stewart', 'measure', 'beam', 'segway', 'lidar'],
    'Java': ['ftc'], 'Verilog': ['ixana'], 'MATLAB': ['segway', 'stewart']
  },
  'Embedded': {
    'STM32': ['rocketry', 'gantry'], 'ESP32': ['measure'], 'NXP · Ambiq': ['ixana'], 'FreeRTOS': ['rocketry'],
    'DMA · interrupts': ['neuralink', 'gantry'], 'ASIC bring-up': ['neuralink', 'ixana'], 'FPGA': ['ixana']
  },
  'Protocols': {
    'I²C': ['rocketry', 'measure'], 'SPI': [], 'BLE': [], 'gRPC · Protobuf': [], 'CAN': [], 'UART': ['fyelabs', 'rocketry', 'gantry'],
    'MIPI DSI': ['ixana'], 'LoRa': ['fyelabs'], 'MQTT': ['magna', 'fyelabs'], 'WebSockets': ['measure']
  },
  'Hardware & CAD': {
    'KiCad': ['rocketry'], 'Altium': ['tesla'], 'EasyEDA': ['fyelabs'], 'SolidWorks': ['rocketry', 'fyelabs', 'beam', 'hub', 'stewart'],
    'Ansys · FEA': ['rocketry', 'hub'], 'Sheet-metal DFM': ['fyelabs']
  },
  'Controls & Robotics': {
    'PID · PIDF': ['rocketry', 'stewart', 'beam', 'ftc'], 'State estimation': ['rocketry', 'stewart'], 'Kinematics': ['stewart', 'ripl'],
    'Trajectory planning': ['stewart', 'rocketry'], 'Simulink · Simscape': ['stewart', 'segway'], 'SimulationX': ['segway'],
    'ROS 2': ['ripl'], 'MuJoCo': ['ripl'], 'OpenCV': ['stewart', 'measure', 'beam'], 'LiDAR': ['fyelabs', 'lidar']
  },
  'Tooling': {
    'Git': ['neuralink', 'tesla', 'ixana', 'stewart'], 'Pytest · SIL / HIL': ['tesla', 'ixana', 'fyelabs'], 'PostgreSQL': ['magna'], 'GDB · JTAG': [], 'CMake · Bash': []
  }
};
