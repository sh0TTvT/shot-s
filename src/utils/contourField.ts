import { contours } from "d3-contour";
import { createNoise2D } from "simplex-noise";

export type ContourFieldSettings = {
  gridSize: number;
  bufferMarginRatio: number;
  contourLevels: number;
  thresholdMin: number;
  thresholdMax: number;
  terrainScale: number;
  warpScale: number;
  warpStrength: number;
  detailStrength: number;
  driftX: number;
  driftY: number;
  seed: number;
  maxDevicePixelRatio: number;
};

export const contourSettings: ContourFieldSettings = {
  gridSize: 5,
  bufferMarginRatio: 0.45,
  contourLevels: 5,
  thresholdMin: 0.2,
  thresholdMax: 0.75,
  terrainScale: 0.001,
  warpScale: 0.0019,
  warpStrength: 0,
  detailStrength: 0.1,
  driftX: 6,
  driftY: 16,
  seed: 616,
  maxDevicePixelRatio: 1.5,
};

type ContourCoordinates = Array<Array<Array<[number, number]>>>;

export type ContourBuffer = {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  originX: number;
  originY: number;
  pixelRatio: number;
};

const createSeededRandom = (seed: number) => {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const noise2D = createNoise2D(createSeededRandom(contourSettings.seed));

const sampleElevation = (worldX: number, worldY: number, settings: ContourFieldSettings) => {
  const warpX = noise2D(worldX * settings.warpScale + 17, worldY * settings.warpScale - 11);
  const warpY = noise2D(worldX * settings.warpScale - 29, worldY * settings.warpScale + 23);
  const x = (worldX + warpX * settings.warpStrength) * settings.terrainScale;
  const y = (worldY + warpY * settings.warpStrength) * settings.terrainScale;
  const amplitude = 0.58 + 0.27 + settings.detailStrength;
  const elevation =
    noise2D(x, y) * 0.58 +
    noise2D(x * 2.05 + 31, y * 2.05 - 19) * 0.27 +
    noise2D(x * 4.1 - 7, y * 4.1 + 13) * settings.detailStrength;

  return elevation / amplitude / 2 + 0.5;
};

const drawContour = (
  context: CanvasRenderingContext2D,
  coordinates: ContourCoordinates,
  gridSize: number,
) => {
  context.beginPath();

  for (const polygon of coordinates) {
    for (const ring of polygon) {
      const [first, ...points] = ring;
      if (!first) continue;

      context.moveTo(first[0] * gridSize, first[1] * gridSize);
      for (const [x, y] of points) context.lineTo(x * gridSize, y * gridSize);
      context.closePath();
    }
  }

  context.stroke();
};

export const createContourBuffer = (
  viewportWidth: number,
  viewportHeight: number,
  cameraX: number,
  cameraY: number,
  pixelRatio: number,
  settings = contourSettings,
): ContourBuffer => {
  const margin = Math.max(viewportWidth, viewportHeight) * settings.bufferMarginRatio;
  const width = viewportWidth + margin * 2;
  const height = viewportHeight + margin * 2;
  const originX = Math.floor((cameraX - margin) / settings.gridSize) * settings.gridSize;
  const originY = Math.floor((cameraY - margin) / settings.gridSize) * settings.gridSize;
  const columns = Math.ceil(width / settings.gridSize) + 1;
  const rows = Math.ceil(height / settings.gridSize) + 1;
  const values = new Array<number>(columns * rows);

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      values[row * columns + column] = sampleElevation(
        originX + column * settings.gridSize,
        originY + row * settings.gridSize,
        settings,
      );
    }
  }

  const thresholdStep =
    (settings.thresholdMax - settings.thresholdMin) / Math.max(1, settings.contourLevels - 1);
  const thresholds = Array.from(
    { length: settings.contourLevels },
    (_, index) => settings.thresholdMin + thresholdStep * index,
  );
  const generatedContours = contours().size([columns, rows]).thresholds(thresholds)(values);
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * pixelRatio);
  canvas.height = Math.ceil(height * pixelRatio);
  const context = canvas.getContext("2d");

  if (context) {
    context.scale(pixelRatio, pixelRatio);
    context.lineJoin = "round";
    context.lineCap = "round";

    generatedContours.forEach((contour, index) => {
      const major = index % 3 === 0;
      context.strokeStyle = major ? "rgba(232, 236, 233, 0.22)" : "rgba(232, 236, 233, 0.12)";
      context.lineWidth = major ? 0.82 : 0.62;
      drawContour(context, contour.coordinates as ContourCoordinates, settings.gridSize);
    });
  }

  return { canvas, width, height, originX, originY, pixelRatio };
};
