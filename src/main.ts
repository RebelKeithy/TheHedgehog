import * as THREE from "three";
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {TurnController, TurnRegistry} from "./turn_controller.ts";
import {Cube} from "./cube.ts";
import {Game} from "./game.ts";
import {Config} from "./config.ts";


let config: Config, scene, camera, renderer, controls, cube: Cube;

// Vignette+Noise full-screen background (clip-space quad)
function createVignetteBackground() {
    const geometry = new THREE.PlaneGeometry(2, 2);

    const material = new THREE.ShaderMaterial({
        uniforms: {
            u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            u_aspect: { value: window.innerWidth / window.innerHeight },
            u_time: { value: 0.0 },

            // Look & feel controls
            u_colorCenter: { value: new THREE.Color("#3a3a6a") },   // center color
            u_colorEdge:   { value: new THREE.Color("#2a2a4a") },   // edge color

            u_vignetteRadius:   { value: 0.0 },  // where darkening begins (0..1 from center)
            u_vignetteSoftness: { value: 0.0 },   // how soft the falloff is
            u_vignetteStrength: { value: 0.85 },  // how strong the darkening is

            u_noiseAmount: { value: 0.03 },       // 0.. ~0.3 typical
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
    config = new Config()
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
    const game = new Game(config, scene, cube)

    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

let active_turn = undefined
const turn_controller = new TurnController(scene, cube)

let tick = 0

function animate() {
    tick++
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);

    turn_controller.tick()

    if (cube) {
        cube.cubies.forEach((c) => {
            c.stickers.forEach((s) => {
                // const angle = (Math.sin(tick / 40) + 1)/2 * 360;
                // const angle = tick / 200 * 360;
                // console.log(angle)
                // s.setRotation(Math.PI * angle/180)
            })
        })
    }

    if (!turn_controller.cube) {
        turn_controller.scene = scene
        turn_controller.cube = cube
    }

    if (cube && active_turn) {
        active_turn.update(0.1)
        if (active_turn.angle > Math.PI) {
            active_turn.stop()
            active_turn = undefined
        }

    }
}

let mouse_down = false
let preparing_turn = false
let turn_start = undefined

document.addEventListener('mousedown', (event) => {
    mouse_down = true
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
                    turn_start = pointer
                    preparing_turn = true
                    turn_controller.clickStart(s, pointer, event.button == 0, event.button == 2)
                    found = true
                }
            })
        })
        if (found) break;
    }
})

document.addEventListener('keydown', (event) => {
    if (event.key == 'Shift') {
        if (turn_controller) {
            turn_controller.setShift(true)
        }
    }
})

document.addEventListener('keyup', (event) => {
    if (event.key == 'Shift') {
        if (turn_controller) {
            turn_controller.setShift(false)
        }
    }
})

document.addEventListener('mouseup', (event) => {
    mouse_down = false
    turn_start = false
    preparing_turn = false
    turn_controller.mouseUp()
})

document.addEventListener('mousemove', (event) => {
    if (preparing_turn) {
        const x = event.clientX / window.innerWidth * 2 - 1;
        const y = (window.innerHeight - event.clientY) / window.innerHeight * 2 - 1
        const pointer = new THREE.Vector2(x, y);
        turn_controller.mouseMove(pointer)
    }
})

document.addEventListener('keydown', (event) => {
    if (active_turn) {
        return
    }
    switch (event.key) {
        case 'w':
            active_turn = TurnRegistry.AU
            break
        case 's':
            active_turn = TurnRegistry.AU
            break
        case 'q':
            active_turn = TurnRegistry.AF
            break
        case 'e':
            active_turn = TurnRegistry.AF
            break
        case 'a':
            active_turn = TurnRegistry.O
            break
        case 'd':
            active_turn = TurnRegistry.I
            break
        case 'p':
            turn_controller.scramble()
            break
        case 'o':
            turn_controller.gyro()
            break
    }
    if (active_turn) {
        active_turn.scene = scene
        active_turn.start(cube)
    }
});

init();
animate();