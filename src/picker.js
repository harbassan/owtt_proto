import * as THREE from 'three';

const pixelBuffer = new Uint8Array(4); // RGBA storage

function getRegionAtPixel(x, y, renderer, renderTarget) {
  const { height } = renderTarget;
  renderer.readRenderTargetPixels(renderTarget, x, height - y, 1, 1, pixelBuffer);
  return pixelBuffer[0];
}

export default function main(renderer, callback) {
  const canvas = renderer.domElement;
  const renderTarget = new THREE.WebGLRenderTarget(canvas.clientWidth, canvas.clientHeight, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: true
  });

  const material = new THREE.ShaderMaterial({
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D lookupTexture;
        void main() {
            vec4 regionColor = texture2D(lookupTexture, vUv);
            gl_FragColor = vec4(regionColor.r, 0.0, 0.0, 1.0); // Store region ID in red channel
            //gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); // Store region ID in red channel
        }
    `,
    uniforms: {
      lookupTexture: { value: null }
    }
  });

  const scene = new THREE.Scene();

  const fov = 75;
  const aspect = 2;
  const near = 0.01;
  const far = 5;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);


  function setup(mesh, texture) {
    const pickingMesh = mesh.clone();
    material.uniforms.lookupTexture.value = texture;
    material.needsUpdate = true;
    pickingMesh.material = material;
    scene.add(pickingMesh);
  }

  function updateCamera(primaryCamera) {
    if (camera.aspect !== primaryCamera.aspect) {
      camera.aspect = primaryCamera.aspect;
      camera.updateProjectionMatrix();
    }
    camera.position.copy(primaryCamera.position);
    camera.rotation.copy(primaryCamera.rotation);
  }

  window.addEventListener("click", (event) => {
    renderer.setRenderTarget(renderTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);

    const x = Math.floor((event.clientX / window.innerWidth) * renderTarget.width);
    const y = Math.floor((event.clientY / window.innerHeight) * renderTarget.height);
    const regionID = getRegionAtPixel(x, y, renderer, renderTarget);
    callback(regionID);
  });

  return { setup, updateCamera, scene, camera, renderTarget, material };
}

