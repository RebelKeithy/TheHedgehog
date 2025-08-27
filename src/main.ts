import * as THREE from "three";
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {TurnController, TurnRegistry} from "./turn_controller.ts";
import {Cube} from "./cube.ts";
import {Game} from "./game.ts";
import {Config} from "./config.ts";
import {PerspectiveCamera, Scene, WebGLRenderer} from "three";


let config: Config, scene: Scene, camera: PerspectiveCamera, renderer: WebGLRenderer, controls: OrbitControls, cube: Cube;
let turnController: TurnController;

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
        RIGHT: THREE.MOUSE.ROTATE
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    cube = new Cube(scene)
    new Game(config, scene, cube)
    turnController = new TurnController(scene, cube)

    const scrambleBtn = document.getElementById('scramble-btn');
    if (scrambleBtn) {
        scrambleBtn.addEventListener('click', () => {
            turnController.scramble();
        });
    }

    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            cube.reset();
        })
    }

    setupSettingsPanel();

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
    const indicator = document.getElementById('mode-indicator');
    if (!indicator) return;
    
    if (shiftPressed && ctrlPressed) {
        indicator.textContent = 'Mode: 4D Rotations';
    } else if (shiftPressed) {
        indicator.textContent = 'Mode: 4D Turns';
    } else if (ctrlPressed) {
        indicator.textContent = 'Mode: 3D Rotations';
    } else {
        indicator.textContent = 'Mode: 3D Turns';
    }
}

function setupSettingsPanel() {
    const settingsToggle = document.getElementById('settings-toggle');
    const settingsPanel = document.getElementById('settings-panel');
    const settingsOverlay = document.getElementById('settings-overlay');
    const settingsClose = document.getElementById('settings-close');
    const turnSpeedSlider = document.getElementById('turn-speed-slider') as HTMLInputElement;
    const turnSpeedValue = document.getElementById('turn-speed-value');
    const cubieGapSlider = document.getElementById('cubie-gap-slider') as HTMLInputElement;
    const cubieGapValue = document.getElementById('cubie-gap-value');
    const hedgehogAngleSlider = document.getElementById('hedgehog-angle-slider') as HTMLInputElement;
    const hedgehogAngleValue = document.getElementById('hedgehog-angle-value');

    if (!settingsToggle || !settingsPanel) return;

    // Toggle settings panel
    settingsToggle.addEventListener('click', () => {
        settingsPanel.classList.toggle('open');
        if (settingsOverlay) {
            settingsOverlay.classList.toggle('open');
        }
    });

    // Close settings panel
    if (settingsClose) {
        settingsClose.addEventListener('click', () => {
            settingsPanel.classList.remove('open');
            if (settingsOverlay) {
                settingsOverlay.classList.remove('open');
            }
        });
    }

    // Close settings panel when clicking on overlay
    if (settingsOverlay) {
        settingsOverlay.addEventListener('click', () => {
            settingsPanel.classList.remove('open');
            settingsOverlay.classList.remove('open');
        });
    }

    // Close settings panel when clicking outside
    document.addEventListener('click', (e) => {
        if (!settingsPanel.contains(e.target as Node) && 
            !settingsToggle.contains(e.target as Node) && 
            settingsPanel.classList.contains('open')) {
            settingsPanel.classList.remove('open');
            if (settingsOverlay) {
                settingsOverlay.classList.remove('open');
            }
        }
    });

    // Turn Speed control
    if (turnSpeedSlider && turnSpeedValue) {
        turnSpeedSlider.value = config.turn_speed.toString();
        turnSpeedValue.textContent = config.turn_speed.toFixed(1);
        
        turnSpeedSlider.addEventListener('input', (e) => {
            const config = Config.config();
            const value = parseFloat((e.target as HTMLInputElement).value);
            config.turn_speed = value;
            turnSpeedValue.textContent = value.toFixed(1);
            config.saveToLocalStorage()
        });
    }

    // Cubie Gap control
    if (cubieGapSlider && cubieGapValue) {
        cubieGapSlider.value = (config.cubie_gap/2).toString();
        cubieGapValue.textContent = (config.cubie_gap/2).toFixed(2);
        
        cubieGapSlider.addEventListener('input', (e) => {
            const value = parseFloat((e.target as HTMLInputElement).value);
            config.cubie_gap = value * 2;
            cubieGapValue.textContent = value.toFixed(2);
            
            // Recalculate dependent values
            config.cubie_pos = config.cube_size + config.cubie_gap/2;
            config.w_center_x = config.cube_size + config.cubie_gap + config.angled_cubie_height;
            
            // Recreate the cube with new gap
            cube.unification()
            
            // Save to local storage
            config.saveToLocalStorage();
        });
    }

    // Hedgehog Angle control
    if (hedgehogAngleSlider && hedgehogAngleValue) {
        const c = Game.game().config
        hedgehogAngleSlider.value = c.hedgehog_angle.toString();
        hedgehogAngleValue.textContent = `${c.hedgehog_angle}°`;
        
        hedgehogAngleSlider.addEventListener('input', (e) => {
            const value = parseFloat((e.target as HTMLInputElement).value);
            c.hedgehog_angle = value;
            hedgehogAngleValue.textContent = `${value}°`;
            
            // Recalculate dependent values
            c._h_angle_rad = Math.PI/180 * c.hedgehog_angle;
            c.angled_cubie_height = c.cube_size * (Math.cos(c._h_angle_rad) + Math.sqrt(2) * Math.sin(c._h_angle_rad));
            c.w_center_x = c.cube_size + c.cubie_gap + c.angled_cubie_height;
            
            // Recreate the cube with new angle
            cube.unification()
            
            // Save to local storage
            c.saveToLocalStorage();
        });
    }
    
    // Color picker controls
    const colorInputs = {
        'plus-w': document.getElementById('color-plus-w') as HTMLInputElement,
        'minus-w': document.getElementById('color-minus-w') as HTMLInputElement,
        'plus-x': document.getElementById('color-plus-x') as HTMLInputElement,
        'minus-x': document.getElementById('color-minus-x') as HTMLInputElement,
        'plus-y': document.getElementById('color-plus-y') as HTMLInputElement,
        'minus-y': document.getElementById('color-minus-y') as HTMLInputElement,
        'plus-z': document.getElementById('color-plus-z') as HTMLInputElement,
        'minus-z': document.getElementById('color-minus-z') as HTMLInputElement,
    };
    
    Object.entries(colorInputs).forEach(([key, input]) => {
        if (input) {
            input.addEventListener('input', (e) => {
                const hexColor = (e.target as HTMLInputElement).value;
                const numericColor = parseInt(hexColor.slice(1), 16);
                
                const colorKey = key.replace('-', '_') as keyof typeof config.colors;
                config.colors[colorKey] = numericColor;
                
                cube.updateColors();
                
                // Save to local storage
                config.saveToLocalStorage();
            });
        }
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
    console.log(event.key)
    if (event.key == 'Shift') {
        if (turnController) {
            turnController.setShift(true)
        }
        shiftPressed = true;
        updateModeIndicator();
    }
    if (event.key == 'Control') {
        if(turnController) {
            turnController.ctrl = true
        }
        ctrlPressed = true;
        updateModeIndicator();
    }
})

document.addEventListener('keyup', (event) => {
    if (event.key == 'Shift') {
        if (turnController) {
            turnController.setShift(false)
        }
        shiftPressed = false;
        updateModeIndicator();
    }
    if (event.key == 'Control') {
        if(turnController) {
            turnController.ctrl = false
        }
        ctrlPressed = false;
        updateModeIndicator();
    }
})

document.addEventListener('mouseup', (_) => {
    preparing_turn = false
    turnController.mouseUp()
})

document.addEventListener('mousemove', (event) => {
    if (preparing_turn) {
        const x = event.clientX / window.innerWidth * 2 - 1;
        const y = (window.innerHeight - event.clientY) / window.innerHeight * 2 - 1
        const pointer = new THREE.Vector2(x, y);
        turnController.mouseMove(pointer)
    }
})

document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'w':
            turnController.startTurn(TurnRegistry.AU())
            break
        case 's':
            turnController.startTurn(TurnRegistry.AU())
            break
        case 'q':
            turnController.startTurn(TurnRegistry.AF())
            break
        case 'e':
            turnController.startTurn(TurnRegistry.AF())
            break
        case 'a':
            turnController.startTurn(TurnRegistry.I())
            break
        case 'd':
            turnController.startTurn(TurnRegistry.O())
            break
        case 'p':
            Config.config().debug_pause = !Config.config().debug_pause
            break
        case 'o':
            turnController.gyro()
            break
        case 'i':
            cube.unification()
            break
    }
});

init();

// Initialize Lucide icons
if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}

animate();