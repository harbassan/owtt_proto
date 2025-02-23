import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import Stats from "stats.js";

import setupDynamicTextures from './tex_gen/canvas';
import setupPicking from './picker.js';
import setupOverlay from './overlay.js';

const selected = [0];

function setupCamera() {
  const fov = 75;
  const aspect = 2;
  const near = 0.01;
  const far = 5;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.z = 2;
  return camera;
}

function setupControls(camera, canvas) {
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);
  controls.update();
  return controls;
}

function setup(map) {
  map.flipY = false;
  map.magFilter = THREE.NearestFilter;
  map.minFilter = THREE.NearestFilter;
  map.needsUpdate = true;
  return map;
}

async function loadGltf(loader, fp) {
  return new Promise((resolve, reject) => {
    loader.load(fp, resolve, null, reject);
  })
}

function alterShader(material, baseMap, regionMap, outlineMap, selected) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.baseMap = { value: baseMap };
    shader.uniforms.regionMap = { value: regionMap };
    shader.uniforms.outlineMap = { value: outlineMap };
    shader.uniforms.selected = { type: "fv1", value: selected }

    // Inject new varying to pass UV coordinates
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
        varying vec2 vUv;`
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <uv_vertex>',
      `#include <uv_vertex>
        vUv = uv;`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      `#include <common>`,
      `
        #include <common>
        uniform float selected[1];
        uniform sampler2D baseMap;
        uniform sampler2D regionMap;
        uniform sampler2D outlineMap;
        varying vec2 vUv;
        `
    )

    shader.fragmentShader = shader.fragmentShader.replace(
      `#include <map_fragment>`,
      `
        #include <map_fragment>
        vec4 overlayColor = vec4(1.0, 0.8, 0.5, 1.0);
        vec4 baseColor = texture2D(baseMap, vUv);
        vec4 lookup = texture2D(regionMap, vUv);
        if (lookup.r == selected[0]) {
          overlayColor.rgb = vec3(1.0, 1.0, 1.0);
        }
        vec4 outline = texture2D(outlineMap, vUv);
        diffuseColor.rgb = mix(baseColor.rgb, overlayColor.rgb * outline.r, float(baseColor.g != 0.0));
        `
    );
  }
}


async function loadGlobe(outline, lookup) {
  const loader = new GLTFLoader();
  const { scene } = await loadGltf(loader, 'model/globe_model.gltf');
  const mesh = scene.children[0];

  const textureLoader = new THREE.TextureLoader();

  // mesh.material.bumpMap = textureLoader.load('model/texture_height.png');
  // mesh.material.bumpMap.flipY = false;
  // mesh.material.bumpScale = 100;

  const baseMap = setup(textureLoader.load('model/texture_height.png'));
  const lookupMap = setup(new THREE.CanvasTexture(lookup.canvas));
  const outlineMap = setup(new THREE.CanvasTexture(outline.canvas));

  alterShader(mesh.material, baseMap, lookupMap, outlineMap, selected);

  mesh.scale.set(1.295, 1.295, 1.295); // scale the mesh so sea level is close to 1 unit
  mesh.rotation.y = Math.PI; // start with the prime meridian in line with z axis

  return { mesh, lookupMap, outlineMap };
}

function setupLight() {
  const color = 0xFFFFFF;
  const pointIntensity = 10;
  const pointLight = new THREE.PointLight(color, pointIntensity, 0, 5);
  pointLight.position.set(0, 2, 0);
  return pointLight;
}

function resizeRendererToDisplaySize(renderer) {
  const canvas = renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const needResize = canvas.width !== width || canvas.height !== height;

  if (needResize) {
    renderer.setSize(width, height, false);
  }

  return needResize;
}

function setSelected(id) {
  console.log("selected region id - ", id);
  selected[0] = id / 255;
}

export default function main() {
  // fps stat 
  const stats = new Stats();
  stats.showPanel(0);
  document.body.appendChild(stats.dom);

  const canvas = document.querySelector('#c');
  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });

  const scene = new THREE.Scene();

  const camera = setupCamera();
  const controls = setupControls(camera, canvas);

  const axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);

  const pointLight = setupLight();
  scene.add(pointLight);

  const picker = setupPicking(renderer, setSelected);

  const { lookup, outline } = setupDynamicTextures();

  loadGlobe(outline, lookup).then(({ mesh, lookupMap, outlineMap }) => {
    scene.add(mesh);
    picker.setup(mesh, lookupMap);
  });

  const overlay = setupOverlay(camera);

  // const screenMaterial = new THREE.MeshBasicMaterial({ map: picker.renderTarget.texture });
  // const screenQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), screenMaterial);
  // const screenScene = new THREE.Scene();
  // const screenCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  // screenScene.add(screenQuad);

  let distance = camera.position.length();
  outline.generate(distance * 4);

  function render(time) {
    stats.begin();

    time *= 0.001;

    if (resizeRendererToDisplaySize(renderer)) {
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      overlay.updateSize();
    }

    controls.update();

    overlay.genLabels();

    // make point light follow camera position
    const direction = camera.position.clone().normalize();
    const offset = new THREE.Vector3(1, 1, 0).applyQuaternion(camera.quaternion);
    pointLight.position.copy(direction.multiplyScalar(1.5)).add(offset);

    renderer.render(scene, camera);
    // renderer.render(screenScene, screenCamera);

    picker.updateCamera(camera);

    stats.end();

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);

}
