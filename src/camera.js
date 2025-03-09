import * as THREE from "three";

import { worldToGlobe, globeToWorld } from "./utils";

export default function setup() {
  const fov = 75;
  const aspect = 2;
  const near = 0.01;
  const far = 5;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.z = 2;

  function animationHandler() {
    let animation = null;

    function lerpPosition(t) {
      const { initial, final } = animation;
      const lat = THREE.MathUtils.lerp(initial.lat, final.lat, t);
      const lon = THREE.MathUtils.lerp(initial.lon, final.lon, t);
      const r = THREE.MathUtils.lerp(initial.r, final.r, t);
      camera.position.copy(globeToWorld(lon, lat, r));
    }

    function executeAnimation(elapsed) {
      if (!animation) return;

      if (!animation.startTime) {
        animation.startTime = elapsed;
        animation.endTime = elapsed + animation.duration;
        animation.initial = worldToGlobe(camera.position);
      } else if (elapsed > animation.endTime) {
        animation = null;
      } else {
        lerpPosition((elapsed - animation.startTime) / animation.duration);
      }
    }

    function addAnimation(position, duration) {
      animation = { duration, final: position };
    }

    return { addAnimation, executeAnimation }
  }


  return { camera, animationHandler };
}
