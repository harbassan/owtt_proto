// this will all be preprocessed and stored in the database at some point

import geojson from '../data/countries.json';

function updateExtremes(bounds, extremes) {
  if (bounds.maxX > extremes.maxX) {
    extremes.maxX = bounds.maxX;
  }
  if (bounds.minX < extremes.minX) {
    extremes.minX = bounds.minX;
  }
  if (bounds.maxY > extremes.maxY) {
    extremes.maxY = bounds.maxY;
  }
  if (bounds.minY < extremes.minY) {
    extremes.minY = bounds.minY;
  }
}

function generatePolyBounds(poly) {
  const extremes = { minX: 180, maxX: -180, minY: 90, maxY: -90 };

  for (let i = 0; i < poly.length; i++) {
    const lon = poly[i][0];
    const lat = poly[i][1];
    updateExtremes({ maxX: lon, minX: lon, maxY: lat, minY: lat }, extremes)
  }

  return extremes;
}

function generateRegionBounds(polys) {
  const extremes = { minX: 180, maxX: -180, minY: 90, maxY: -90 };
  const all = [];

  for (let i = 0; i < polys.length; i++) {
    const bounds = generatePolyBounds(polys[i][0]);
    updateExtremes(bounds, extremes)
    all.push(bounds);
  }

  return { ...extremes, all };
}

function threshold(bounds, min) {
  const { maxX, minX, maxY, minY } = bounds;
  return !((maxX - minX) < min || (maxY - minY) < min);
}

export default function prefilter() {
  const regions = [];
  const boundss = [];

  const { features } = geojson;

  for (let i = 0; i < features.length; i++) {
    const polygons = features[i].geometry.coordinates;
    let bounds;
    if (polygons.length === 1) {
      bounds = generatePolyBounds(polygons[0]);
    } else {
      bounds = generateRegionBounds(polygons);
    }
    if (threshold(bounds, 1)) {
      regions.push(polygons);
      boundss.push(bounds);
    }
  }

  return regions;
}
