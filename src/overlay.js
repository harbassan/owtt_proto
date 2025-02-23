import { globeToWorld, worldToScreen } from "./utils";
import geojson from '../data/countries.json';

function extractLabels({ properties }) {
  return { x: properties.LABEL_X, y: properties.LABEL_Y, label: properties.NAME };
}

export default function setup(camera) {
  const coords = geojson.features.map(extractLabels);
  const worldCoords = coords.map(({ x, y }) => globeToWorld(x, y, 1));

  const canvas = document.getElementById("o");
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  const ctx = canvas.getContext("2d");
  ctx.font = "12px serif";
  ctx.textAlign = "center";

  function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  const offset = 0.75;

  function updateSize() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
  }

  function drawFlag({ x, y }) {
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.ellipse(x, y, 3, 3, 0, 0, 2 * Math.PI);
    ctx.fill();

    const directionX = x - canvas.width / 2;
    const directionY = -y + canvas.height / 2;
    const magnitude = Math.sqrt(Math.pow(directionX, 2) + Math.pow(directionY, 2));

    const normalizedX = directionX / magnitude;
    const normalizedY = directionY / magnitude;

    const newX = x + normalizedX * 100;
    const newY = y - normalizedY * 100;

    ctx.lineWidth = "1.5";
    ctx.strokeStyle = "white";
    ctx.moveTo(x, y);
    ctx.lineTo(newX, newY);
    ctx.stroke();

    ctx.beginPath();
    ctx.rect(newX - 50, newY - 20, 100, 40);
    ctx.fillStyle = "black";
    ctx.fill();
    ctx.stroke();
  }

  const flags = [
    { lon: 100, lat: -10, content: "Hello" }, { lon: 150, lat: 5, content: "YOyo" },
    { lon: 115, lat: 30, content: "Hello" }, { lon: 140, lat: -30, content: "YOyo" }
  ];

  function genLabels() {
    clear();
    for (let i = 0; i < flags.length; i++) {
      const flag = flags[i];
      const world = globeToWorld(flag.lon, flag.lat, 1);
      const distance = world.distanceTo(camera.position);
      if (distance < camera.position.length() - 0.5) {
        const screen = worldToScreen(world, camera, canvas.width, canvas.height);
        drawFlag(screen);
      }
    }
    ctx.fillStyle = "white";
    for (let i = 0; i < coords.length; i++) {
      const distance = worldCoords[i].distanceTo(camera.position);
      if (distance < camera.position.length() - offset) {
        const screen = worldToScreen(worldCoords[i], camera, canvas.width, canvas.height);
        ctx.fillText(coords[i].label, screen.x, screen.y);
      }
    }
  }

  return { genLabels, updateSize };
}


