import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import GUI from 'lil-gui'
import gsap from 'gsap'
import particlesVertexShader from './shaders/particles/vertex.glsl'
import particlesFragmentShader from './shaders/particles/fragment.glsl'

/**
 * Base
 */
// Debug
const gui = new GUI({ width: 340 })
const debugObject = {}

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// Loaders
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('./draco/')
const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: Math.min(window.devicePixelRatio, 2)
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    sizes.pixelRatio = Math.min(window.devicePixelRatio, 2)

    // Materials
    if(particles) particles.material.uniforms.uResolution.value.set(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio)

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(sizes.pixelRatio)
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100)
camera.position.set(0, 0, 8 * 2)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
})

renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(sizes.pixelRatio)

debugObject.clearColor = '#160920'
gui.addColor(debugObject, 'clearColor').onChange(() => { renderer.setClearColor(debugObject.clearColor) })
renderer.setClearColor(debugObject.clearColor)

/**
 * Particles
 */
let particles = {}

// Geometry
particles.geometry = new THREE.SphereGeometry(3)
particles.geometry.setIndex(null) // Remove the index to avoid drawing faces, we only want points

// Material
particles.material = new THREE.ShaderMaterial({
    vertexShader: particlesVertexShader,
    fragmentShader: particlesFragmentShader,
    uniforms:
    {
        uSize: new THREE.Uniform(0.4),
        uResolution: new THREE.Uniform(new THREE.Vector2(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio)),
        uProgress: new THREE.Uniform(0)
    },
    blending: THREE.AdditiveBlending,
    depthWrite: false,
})

// Points
particles.points = new THREE.Points(particles.geometry, particles.material)
// scene.add(particles.points)

// Load Models
gltfLoader.load('./models.glb', (gltf) => {
    // We initialize the particles when the models are being loaded
    particles = {}
    particles.positions = []
    particles.maxCount = 0

    // Positions of the particles
    const positions = gltf.scene.children.map(child => child.geometry.attributes.position)
    particles.maxCount = positions.reduce((max, position) => Math.max(max, position.count), 0)
    console.log('Max count of particles:', positions,particles.maxCount)
    // The positions array contains the vertices of the 4 objects, but none of them have the exact same size.
    for(const position of positions) {
        const originalArray = position.array;
        const newArray = new Float32Array(particles.maxCount * 3);

        for(let i = 0; i < particles.maxCount; i++) {
            const i3 = i * 3;

            if(i3 < originalArray.length) {
                // Extract the values from the original array as long as we can
                newArray[i3+0] = originalArray[i3 + 0]; // x
                newArray[i3+1] = originalArray[i3 + 1]; // y
                newArray[i3+2] = originalArray[i3 + 2]; // z
            } else {
                // Fill the rest with zeros
                const randomIndex = Math.floor(position.count * Math.random()) * 3;
                newArray[i3+0] = originalArray[randomIndex + 0]; // x
                newArray[i3+1] = originalArray[randomIndex + 1]; // y
                newArray[i3+2] = originalArray[randomIndex + 2]; // z
            }
        }

        particles.positions.push(new THREE.Float32BufferAttribute(newArray, 3)) // The 3 indicates that we have 3 values per vertex (x, y, z)
    }
    
    // Geometry
    particles.geometry = new THREE.BufferGeometry() // Create an empty geometry
    particles.geometry.setAttribute('position', particles.positions[1]) 
    particles.geometry.setAttribute('aPositionTarget', particles.positions[3]) // This is the target position for morphing
    //particles.geometry.setIndex(null) // Remove the index to avoid drawing faces, we only want points

    // Material
    particles.material = new THREE.ShaderMaterial({
        vertexShader: particlesVertexShader,
        fragmentShader: particlesFragmentShader,
        uniforms:
        {
            uSize: new THREE.Uniform(0.2), // This is for controlling the size of the particles
            uResolution: new THREE.Uniform(new THREE.Vector2(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio))
        },
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    })

    // Points
    particles.points = new THREE.Points(particles.geometry, particles.material)
    scene.add(particles.points)
})

/**
 * Animate
 */
const tick = () =>
{
    // Update controls
    controls.update()

    // Render normal scene
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()

/*
*Morphing concept
We are going to send two sets of positions to the vertex shader,
- The initial shape as "position"
- the targeted shape as "aPositionTarget"
- We send a "uProgress" uniform from 0 to 1. W use "uProgress" to mix between "position" and "aPositionTarget" in the vertex shader.
- Finally we animate the "uProgress"
*/ 
