import celestialAtlasData from "../data/celestialAtlas.json";
import { coordinateToVector, type Vec3 } from "./celestialProjection";

export type AtlasFieldMode = "chart" | "drift" | "locked";

export type AtlasStar = {
  longitude: number;
  latitude: number;
  magnitude: number;
  colorIndex: number;
  phase: number;
  vector: Vec3;
};

export type AtlasConstellationLine = {
  vectors: Vec3[];
};

export type AtlasConstellation = {
  id: string;
  code: string;
  label: string;
  rank: number;
  labelVector: Vec3;
  lines: AtlasConstellationLine[];
  anchorVectors: Vec3[];
};

export type AtlasScene = {
  stars: AtlasStar[];
  constellations: AtlasConstellation[];
};

type RawCoordinate = [longitude: number, latitude: number];

type RawAtlas = {
  stars: [longitude: number, latitude: number, magnitude: number, colorIndex: number][];
  constellations: {
    id: string;
    name: string;
    rank: number;
    label: RawCoordinate;
    lines: RawCoordinate[][];
  }[];
};

const rawAtlas = celestialAtlasData as unknown as RawAtlas;

const phaseFor = (longitude: number, latitude: number, index: number) => {
  const value = Math.sin(longitude * 12.9898 + latitude * 78.233 + index * 0.013) *
    43_758.5453;
  return (value - Math.floor(value)) * Math.PI * 2;
};

const anchorKey = ([longitude, latitude]: RawCoordinate) =>
  `${longitude.toFixed(4)}:${latitude.toFixed(4)}`;

const createConstellation = (
  source: RawAtlas["constellations"][number],
  index: number,
): AtlasConstellation => {
  const anchors = new Map<string, Vec3>();
  const lines = source.lines.map((line) => {
    const vectors = line.map((coordinate) => {
      const key = anchorKey(coordinate);
      const vector = anchors.get(key) ?? coordinateToVector(coordinate[0], coordinate[1]);
      anchors.set(key, vector);
      return vector;
    });

    return { vectors };
  });

  return {
    // WHY: 巨蛇座头尾共享 Ser 缩写，加入序号可让渲染状态分别追踪两组图形。
    id: `${source.id.toLowerCase()}-${index}`,
    code: source.id.toUpperCase(),
    label: source.name.toUpperCase(),
    rank: source.rank,
    labelVector: coordinateToVector(source.label[0], source.label[1]),
    lines,
    anchorVectors: [...anchors.values()],
  };
};

const scene: AtlasScene = {
  stars: rawAtlas.stars.map(
    ([longitude, latitude, magnitude, colorIndex], index): AtlasStar => ({
      longitude,
      latitude,
      magnitude,
      colorIndex,
      phase: phaseFor(longitude, latitude, index),
      vector: coordinateToVector(longitude, latitude),
    }),
  ),
  constellations: rawAtlas.constellations.map(createConstellation),
};

// WHY: 星表只需在模块加载时规范化一次；resize 只改变投影，不应重建全天数据。
export const createAtlasScene = () => scene;

export const atlasPalette = {
  white: [232, 236, 233] as const,
  muted: [135, 144, 140] as const,
  cyan: [85, 230, 220] as const,
};
