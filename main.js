import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x333333);

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 3);

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
// Fix outdated property references
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);
controls.update();

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 20;
directionalLight.shadow.camera.left = -8;
directionalLight.shadow.camera.right = 8;
directionalLight.shadow.camera.top = 8;
directionalLight.shadow.camera.bottom = -8;
scene.add(directionalLight);

// Environment map
new RGBELoader()
    .load('https://threejs.org/examples/textures/equirectangular/venice_sunset_1k.hdr', function(texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
        
        // Load model after environment
        loadModel();
    });

// Ground
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x999999,
    roughness: 0.8,
    metalness: 0.2
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Grid helper
const grid = new THREE.GridHelper(100, 100, 0x000000, 0x444444);
scene.add(grid);

// Character variables
let mixer;
let model;
let skeleton;
let idleAction, walkAction, runAction;
let activeAction;
let lastAction;
const animationActions = [];

// Loading manager for tracking progress
const loadingManager = new THREE.LoadingManager();
loadingManager.onProgress = function(url, loaded, total) {
    console.log(`Loading: ${url} (${Math.round(loaded / total * 100)}%)`);
};

// Function to transition between animations
function fadeToAction(newAction, duration) {
    if (activeAction !== newAction) {
        lastAction = activeAction;
        activeAction = newAction;
        
        lastAction.fadeOut(duration);
        activeAction.reset()
            .setEffectiveTimeScale(1)
            .setEffectiveWeight(1)
            .fadeIn(duration)
            .play();
    }
}

// Handle window resize
window.addEventListener('resize', onWindowResize);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function loadModel() {
    const loader = new GLTFLoader(loadingManager);
    
    // Load character with animation
    loader.load('https://threejs.org/examples/models/gltf/Xbot.glb', function(gltf) {
        model = gltf.scene;
        model.traverse(function(object) {
            if (object.isMesh) {
                object.castShadow = true;
                object.receiveShadow = true;
            }
        });
        
        // Scale and position the model
        model.scale.set(1, 1, 1);
        model.position.set(0, 0, 0);
        scene.add(model);
        
        // Create and setup animation mixer
        mixer = new THREE.AnimationMixer(model);
        
        // Get all animations
        const animations = gltf.animations;
        
        // Store all animation actions
        animations.forEach(animation => {
            const action = mixer.clipAction(animation);
            animationActions.push(action);
            
            // Assign common animations to variables
            if (animation.name.includes('idle')) {
                idleAction = action;
            } else if (animation.name.includes('walk')) {
                walkAction = action;
            } else if (animation.name.includes('run')) {
                runAction = action;
            }
        });
        
        // Set default animation
        activeAction = idleAction || animationActions[0];
        activeAction.play();
        
        // Setup skeleton helper
        skeleton = new THREE.SkeletonHelper(model);
        skeleton.visible = true;
        scene.add(skeleton);
        
        // Enable user interactions after model is loaded
        setupEventListeners();
    });
}

function setupEventListeners() {
    // Mouse click for switching camera view
    window.addEventListener('click', function() {
        controls.reset();
        if (camera.position.z > 0) {
            camera.position.set(0, 1.6, -3);
        } else {
            camera.position.set(0, 1.6, 3);
        }
    });
    
    // Keyboard controls for animations and movement
    const keysPressed = {};
    document.addEventListener('keydown', function(event) {
        keysPressed[event.code] = true;
        
        // Space to toggle animation
        if (event.code === 'Space') {
            if (activeAction === idleAction) {
                fadeToAction(walkAction, 0.5);
            } else if (activeAction === walkAction) {
                fadeToAction(runAction, 0.5);
            } else {
                fadeToAction(idleAction, 0.5);
            }
        }
    });
    
    document.addEventListener('keyup', function(event) {
        keysPressed[event.code] = false;
    });
    
    // Update function to check for movement keys
    function checkMovementKeys() {
        const moveSpeed = 0.05;
        let moved = false;
        
        if (keysPressed['KeyW']) {
            model.position.z -= moveSpeed;
            model.rotation.y = 0;
            moved = true;
        }
        if (keysPressed['KeyS']) {
            model.position.z += moveSpeed;
            model.rotation.y = Math.PI;
            moved = true;
        }
        if (keysPressed['KeyA']) {
            model.position.x -= moveSpeed;
            model.rotation.y = Math.PI / 2;
            moved = true;
        }
        if (keysPressed['KeyD']) {
            model.position.x += moveSpeed;
            model.rotation.y = -Math.PI / 2;
            moved = true;
        }
        
        // Set walking animation when moving
        if (moved) {
            if (activeAction !== walkAction && activeAction !== runAction) {
                fadeToAction(walkAction, 0.5);
            }
        } else if (activeAction === walkAction) {
            fadeToAction(idleAction, 0.5);
        }
        
        // Update skeleton position to follow model
        if (skeleton) {
            skeleton.position.copy(model.position);
            skeleton.rotation.copy(model.rotation);
        }
    }
    
    // Add movement check to animation loop
    let animationLoop = function() {
        requestAnimationFrame(animationLoop);
        
        checkMovementKeys();
        
        const delta = 0.016; // Approximate value for 60fps
        
        // Update animation mixer
        if (mixer) {
            mixer.update(delta);
        }
        
        controls.update();
        renderer.render(scene, camera);
    };
    
    // Start animation loop
    animationLoop();
}

// Animation loop (initial version before model is loaded)
let animationLoop = function() {
    requestAnimationFrame(animationLoop);
    controls.update();
    renderer.render(scene, camera);
};

// Start initial animation loop
animationLoop();