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
            u_colorCenter: { value: new THREE.Color("#3a3a6a") },   // center color
            u_colorEdge:   { value: new THREE.Color("#2a2a4a") },   // edge color

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
    new Game(config, scene, cube)
    turnController = new TurnController(scene, cube)

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
    if (event.key == 'Shift') {
        if (turnController) {
            turnController.setShift(true)
        }
    }
})

document.addEventListener('keyup', (event) => {
    if (event.key == 'Shift') {
        if (turnController) {
            turnController.setShift(false)
        }
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
            turnController.startTurn(TurnRegistry.AU)
            break
        case 's':
            turnController.startTurn(TurnRegistry.AU)
            break
        case 'q':
            turnController.startTurn(TurnRegistry.AF)
            break
        case 'e':
            turnController.startTurn(TurnRegistry.AF)
            break
        case 'a':
            turnController.startTurn(TurnRegistry.I)
            break
        case 'd':
            turnController.startTurn(TurnRegistry.O)
            break
        case 'p':
            turnController.scramble()
            break
        case 'o':
            turnController.gyro()
            break
    }
});

init();
animate();