import geojson from '../data/countries.json';

function isWithinPoly(poly, bounds, lat, lon) {
  if (lat > bounds.maxY || lat < bounds.minY || lon > bounds.maxX || lon < bounds.minX) {
    return 0;
  }

  let inside = false;
  let j = poly.length - 1;

  for (let i = 0; i < poly.length; i++) {
    const [lon1, lat1] = poly[i];
    const [lon2, lat2] = poly[j];

    if ((lat1 > lat) !== (lat2 > lat) && lon < ((lon2 - lon1) * (lat - lat1)) / (lat2 - lat1) + lon1) {
      inside = !inside;
    }

    j = i;
  }
  return inside;
}

function isWithinRegion(polys, bounds, lat, lon) {
  if (lat > bounds.maxY || lat < bounds.minY || lon > bounds.maxX || lon < bounds.minX) {
    return false;
  }

  for (let i = 0; i < polys.length; i++) {
    if (isWithinPoly(polys[i][0], bounds.all[i], lat, lon)) {
      return true;
    }
  }
  return false;
}

function isWithinAnyRegion(regions, boundss, lat, lon) {
  for (let i = 0; i < regions.length; i++) {
    if (regions[i].length === 1) {
      if (isWithinPoly(regions[i][0], boundss[i], lat, lon)) {
        return true;
      }
    }
    else if (isWithinRegion(regions[i], boundss[i], lat, lon)) {
      return true;
    }
  }
  return false;
}

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

function prefilter(features) {
  const regions = [];
  const boundss = [];

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

  return [regions, boundss];
}

export default function main() {
  console.log(geojson);

  const canvas = document.querySelector('#c');
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  const ctx = canvas.getContext("2d");

  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  let start = performance.now();

  const [regions, boundss] = prefilter(geojson.features);
  console.log(regions, boundss);

  let end = performance.now();
  console.log(end - start);

  start = performance.now();

  // extremely slow method to render the regions (> 60000 ms)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let index = (y * width + x) * 4;
      const lat = ((y / height) * 180 - 90) * -1;
      const lon = (x / width) * 360 - 180;
      const visible = isWithinAnyRegion(regions, boundss, lat, lon);
      data[index] = visible ? 255 : 0;
      data[index + 1] = visible ? 255 : 0;
      data[index + 2] = visible ? 255 : 0;
      data[index + 3] = 255;
    }
  }

  end = performance.now();
  console.log(end - start);

  ctx.putImageData(imageData, 0, 0);
};

