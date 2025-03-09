import * as THREE from 'three';

export function globeToScreen(lon, lat, width, height) {
  const x = (lon + 180) / 360 * width;
  const y = (lat - 90) / -180 * height;
  return { x, y };
}

export function globeToWorld(lon, lat, radius) {
  lon = THREE.MathUtils.degToRad(lon);
  lat = THREE.MathUtils.degToRad(lat);

  const position = new THREE.Vector3();
  position.z = radius * Math.cos(lat) * Math.cos(lon);
  position.x = radius * Math.cos(lat) * Math.sin(lon);
  position.y = radius * Math.sin(lat);

  return position;
}

export function worldToGlobe(position) {
  const r = position.length();
  const lon = THREE.MathUtils.radToDeg(Math.atan2(position.x, position.z));
  const lat = THREE.MathUtils.radToDeg(Math.asin(position.y / r));

  return { lat, lon, r };
}

export function worldToScreen(position, camera, width, height) {
  const ndc = position.clone().project(camera);
  const x = (ndc.x * 0.5 + 0.5) * width;
  const y = (1 - (ndc.y * 0.5 + 0.5)) * height;

  return { x, y };
}
