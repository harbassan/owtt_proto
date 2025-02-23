import { globeToScreen } from '../utils.js';
import prefilter from '../prefilter';

function pathPolygon(ctx, vertices) {
  const { width, height } = ctx.canvas;

  ctx.beginPath();
  const initial = globeToScreen(...vertices[0], width, height);
  ctx.moveTo(initial.x, initial.y);

  for (let i = 0; i < vertices.length; i++) {
    const { x, y } = globeToScreen(...vertices[i], width, height);
    ctx.lineTo(x, y);
  }
}

function fillPolygon(ctx, vertices) {
  pathPolygon(ctx, vertices);
  ctx.fill();
}

function strokePolygon(ctx, vertices) {
  pathPolygon(ctx, vertices);
  ctx.stroke();
}

function traverse(ctx, region, cb) {
  if (region.length === 1) {
    cb(ctx, region[0]);
  } else {
    for (const polygon of region) {
      cb(ctx, polygon[0]);
    }
  }
}

function createCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = 10800;
  canvas.height = 5400;
  const ctx = canvas.getContext("2d");

  return { canvas, ctx };
}

function setupStroke(regions) {
  const { canvas, ctx } = createCanvas(10800, 5400);
  ctx.strokeStyle = `rgb(0, 0, 0)`;
  ctx.fillStyle = 'white';

  function generate(lineWidth) {
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = lineWidth;
    for (const region of regions) {
      traverse(ctx, region, strokePolygon);
    }
  }

  return { canvas, ctx, generate }
}

function setupFill(regions) {
  const { canvas, ctx } = createCanvas(10800, 5400);

  for (let i = 0; i < regions.length; i++) {
    ctx.fillStyle = `rgb(${i + 1}, 0, 0)`;
    traverse(ctx, regions[i], fillPolygon);
  }

  return { canvas, ctx }
}

export default function setup() {
  const regions = prefilter();
  const outline = setupStroke(regions);
  const lookup = setupFill(regions);
  return { lookup, outline };
};

