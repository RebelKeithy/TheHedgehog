import * as THREE from "three";
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {TurnController, TurnRegistry} from "./turn_controller.ts";
import {Cube} from "./cube.ts";
import {Game} from "./game.ts";
import {Config} from "./config.ts";
import {PerspectiveCamera, Scene, WebGLRenderer} from "three";
import '@shoelace-style/shoelace/dist/themes/dark.css';
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';



let config: Config, scene: Scene, camera: PerspectiveCamera, renderer: WebGLRenderer, controls: OrbitControls, cube: Cube;
let turnController: TurnController;
let game: Game;

// Vignette+Noise full-screen background (clip-space quad)
function createVignetteBackground() {
    const geometry = new THREE.PlaneGeometry(2, 2);

    const material = new THREE.ShaderMaterial({
        uniforms: {
            u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            u_aspect: { value: window.innerWidth / window.innerHeight },
            u_time: { value: 0.0 },

            // Look & feel controls
            u_colorCenter: { value: new THREE.Color("#56567d") },   // center color
            u_colorEdge:   { value: new THREE.Color("#393945") },   // edge color

            u_vignetteRadius:   { value: 0.0 },  // where darkening begins (0..1 from center)
            u_vignetteSoftness: { value: 0.0 },   // how soft the falloff is
            u_vignetteStrength: { value: 0.85 },  // how strong the darkening is

            u_noiseAmount: { value: 0.03 },       // 0. ~0.3 typical
            u_noiseSpeed:  { value: 1.5 },        // grain flicker speed
            u_grainScale:  { value: 80.0 },      // spatial grain density (higher = finer)
        },
        vertexShader: /* glsl */`
      void main() {
        // clip-space quad, ignores camera/scene transforms
        gl_Position = vec4(position, 1.0);
      }
    `,
        fragmentShader: /* glsl */`
      precision highp float;

      uniform vec2  u_resolution;
      uniform float u_aspect;
      uniform float u_time;

      uniform vec3  u_colorCenter;
      uniform vec3  u_colorEdge;

      uniform float u_vignetteRadius;
      uniform float u_vignetteSoftness;
      uniform float u_vignetteStrength;

      uniform float u_noiseAmount;
      uniform float u_noiseSpeed;
      uniform float u_grainScale;

      // Cheap hash noise
      float hash(vec2 p) {
        // shift with time for animated grain
        p += u_time * u_noiseSpeed;
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;

        // Centered coords with aspect correction
        vec2 c = (uv - 0.5);
        c.x *= u_aspect;

        // Distance from center (0 at center, grows outward)
        float d = length(c);

        // Vignette mask: 0 = center, 1 = edges
        float vig = smoothstep(u_vignetteRadius, u_vignetteRadius - u_vignetteSoftness, d);
        vig = clamp(vig, 0.0, 1.0);

        // Gradient base (optional subtle center->edge shift)
        vec3 base = mix(u_colorCenter, u_colorEdge, smoothstep(0.0, 0.9, d));

        // Apply darkening
        base *= (1.0 - u_vignetteStrength * vig);

        // Film grain (centered around 0)
        float n = hash(uv * u_grainScale) - 0.5;
        vec3 color = base + n * u_noiseAmount;

        gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
      }
    `,
        depthWrite: false,
        depthTest: false,
        transparent: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;  // always render
    mesh.renderOrder = -1;       // draw before other objects
    return mesh as THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
}


function init() {
    // Set up Shoelace base path
    setBasePath('/node_modules/@shoelace-style/shoelace/dist');
    
    // Apply dark theme to document
    document.documentElement.classList.add('sl-theme-dark');
    
    config = Config.config()
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    const bgQuad = createVignetteBackground();
    scene.add(bgQuad);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 22);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 5;
    controls.maxDistance = 60;
    controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        RIGHT: THREE.MOUSE.ROTATE
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    cube = new Cube(scene)
    game = new Game(config, scene, cube)
    turnController = new TurnController(scene, cube)

    document.getElementById('scramble-btn')?.addEventListener('click', () => turnController.scramble());
    document.getElementById('reset-btn')?.addEventListener('click', () => {
        cube.reset();
        Game.game().timer.stop();
        Game.game().timer.reset();
    });
    document.getElementById('timer-toggle')?.addEventListener('click', () => {
        const enabled = game.timer.toggle();
        if (enabled) {
            // Reset first move flag when timer is enabled
            Game.game().timer.stop();
        }
    });

    setupSettingsPanel();
    setupInfoPanel();

    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

let tick = 0

function animate() {
    tick++
    requestAnimationFrame(animate);

    turnController.tick()

    controls.update();
    renderer.render(scene, camera);
}

let preparing_turn = false
let shiftPressed = false
let ctrlPressed = false

function updateModeIndicator() {
    const indicator = document.getElementById('mode-indicator') as any;
    if (!indicator) return;
    
    if (shiftPressed && ctrlPressed) {
        indicator.textContent = 'Mode: 4D Rotations';
        indicator.variant = 'warning';
    } else if (shiftPressed) {
        indicator.textContent = 'Mode: 4D Turns';
        indicator.variant = 'warning';
    } else if (ctrlPressed) {
        indicator.textContent = 'Mode: 3D Rotations';
        indicator.variant = 'warning';
    } else {
        indicator.textContent = 'Mode: 3D Turns';
        indicator.variant = 'neutral';
    }
}

function setupSettingsPanel() {
    const settingsToggle = document.getElementById('settings-toggle')!;
    const settingsPanel = document.getElementById('settings-panel') as any;
    const turnSpeedSlider = document.getElementById('turn-speed-slider') as any;
    const turnSpeedValue = document.getElementById('turn-speed-value');
    const cubieGapSlider = document.getElementById('cubie-gap-slider') as any;
    const cubieGapValue = document.getElementById('cubie-gap-value');
    const hedgehogAngleSlider = document.getElementById('hedgehog-angle-slider') as any;
    const hedgehogAngleValue = document.getElementById('hedgehog-angle-value');

    // Show/hide drawer
    settingsToggle.addEventListener('click', () => {
        settingsPanel.show();
    });

    // Turn Speed control - Shoelace sl-range
    turnSpeedSlider.value = config.turn_speed;
    if (turnSpeedValue) turnSpeedValue.textContent = config.turn_speed.toFixed(1);
    
    turnSpeedSlider.addEventListener('sl-change', (e: any) => {
        const value = parseFloat(e.target.value);
        config.turn_speed = value;
        if (turnSpeedValue) turnSpeedValue.textContent = value.toFixed(1);
        config.saveToLocalStorage();
    });

    // Cubie Gap control - Shoelace sl-range
    cubieGapSlider.value = config.cubie_gap / 2;
    if (cubieGapValue) cubieGapValue.textContent = (config.cubie_gap / 2).toFixed(2);
    
    cubieGapSlider.addEventListener('sl-change', (e: any) => {
        const value = parseFloat(e.target.value);
        config.cubie_gap = value * 2;
        if (cubieGapValue) cubieGapValue.textContent = value.toFixed(2);
        
        // Recalculate dependent values
        config.cubie_pos = config.cube_size + config.cubie_gap/2;
        config.w_center_x = config.cube_size + config.cubie_gap + config.angled_cubie_height;
        
        cube.unification();
        config.saveToLocalStorage();
    });

    // Hedgehog Angle control - Shoelace sl-range
    const c = Game.game().config;
    hedgehogAngleSlider.value = c.hedgehog_angle;
    if (hedgehogAngleValue) hedgehogAngleValue.textContent = `${c.hedgehog_angle}°`;
    
    hedgehogAngleSlider.addEventListener('sl-change', (e: any) => {
        const value = parseFloat(e.target.value);
        c.hedgehog_angle = value;
        if (hedgehogAngleValue) hedgehogAngleValue.textContent = `${value}°`;
        
        // Recalculate dependent values
        c._h_angle_rad = Math.PI/180 * c.hedgehog_angle;
        c.angled_cubie_height = c.cube_size * (Math.cos(c._h_angle_rad) + Math.sqrt(2) * Math.sin(c._h_angle_rad));
        c.w_center_x = c.cube_size + c.cubie_gap + c.angled_cubie_height;
        
        cube.unification();
        c.saveToLocalStorage();
    });
    
    // Color picker controls - Shoelace sl-color-picker
    const colorInputs = {
        'plus-w': document.getElementById('color-plus-w'),
        'minus-w': document.getElementById('color-minus-w'),
        'plus-x': document.getElementById('color-plus-x'),
        'minus-x': document.getElementById('color-minus-x'),
        'plus-y': document.getElementById('color-plus-y'),
        'minus-y': document.getElementById('color-minus-y'),
        'plus-z': document.getElementById('color-plus-z'),
        'minus-z': document.getElementById('color-minus-z'),
    };
    
    Object.entries(colorInputs).forEach(([key, input]) => {
        if (input) {
            input.addEventListener('sl-change', (e: any) => {
                const hexColor = e.target.value;
                const numericColor = parseInt(hexColor.slice(1), 16);
                
                const colorKey = key.replace('-', '_') as keyof typeof config.colors;
                config.colors[colorKey] = numericColor;
                
                cube.updateColors();
                config.saveToLocalStorage();
            });
        }
    });
}

function setupInfoPanel() {
    const infoToggle = document.getElementById('info-toggle')!;
    const infoPanel = document.getElementById('info-panel') as any;

    infoToggle.addEventListener('click', () => {
        infoPanel.show();
    });
}

document.addEventListener('mousedown', (event) => {
    const raycaster = new THREE.Raycaster();
    const x = event.clientX / window.innerWidth * 2 - 1;
    const y = (window.innerHeight - event.clientY) / window.innerHeight * 2 - 1
    const pointer = new THREE.Vector2(x, y);
    raycaster.setFromCamera(pointer, camera)
    const intersects = raycaster.intersectObjects(scene.children)
    let found = false
    for (let i = 0; i < intersects.length; i++) {
        cube.cubies.forEach((c) => {
            c.stickers.forEach((s) => {
                if (!found && s.cube.id == intersects[i].object.parent!.id) {
                    s.onClick()
                    preparing_turn = true
                    turnController.clickStart(s, pointer, event.button == 0)
                    found = true
                }
            })
        })
        if (found) break;
    }
})

document.addEventListener('keydown', (event) => {
    if (event.key === 'Shift') {
        turnController?.setShift(true);
        shiftPressed = true;
        updateModeIndicator();
    }
    if (event.key === 'Control') {
        if (turnController) turnController.ctrl = true;
        ctrlPressed = true;
        updateModeIndicator();
    }

    switch (event.key) {
        case 'w':
            turnController.startTurn(TurnRegistry.AR());
            break;
        case 's':
            turnController.startTurn(TurnRegistry.AL());
            break;
        case 'q':
            turnController.startTurn(TurnRegistry.AF());
            break;
        case 'e':
            turnController.startTurn(TurnRegistry.AB());
            break;
        case 'a':
            turnController.startTurn(TurnRegistry.AU());
            break;
        case 'd':
            turnController.startTurn(TurnRegistry.AD());
            break;
        case 'p':
            Config.config().debug_pause = !Config.config().debug_pause;
            break;
        case 'o':
            turnController.gyro();
            break;
        case 'i':
            cube.unification();
            break;
    }
});

document.addEventListener('keyup', (event) => {
    if (event.key === 'Shift') {
        turnController?.setShift(false);
        shiftPressed = false;
        updateModeIndicator();
    }
    if (event.key === 'Control') {
        if (turnController) turnController.ctrl = false;
        ctrlPressed = false;
        updateModeIndicator();
    }
});

document.addEventListener('mouseup', () => {
    preparing_turn = false;
    turnController.mouseUp();
});

document.addEventListener('mousemove', (event) => {
    if (preparing_turn) {
        const x = event.clientX / window.innerWidth * 2 - 1;
        const y = (window.innerHeight - event.clientY) / window.innerHeight * 2 - 1;
        const pointer = new THREE.Vector2(x, y);
        turnController.mouseMove(pointer);
    }
});

init();
animate();