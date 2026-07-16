export type Vec3 = {
  x: number;
  y: number;
  z: number;
};

export type SkyCamera = {
  longitude: number;
  latitude: number;
  roll: number;
  fov: number;
};

export type CameraBasis = {
  camera: SkyCamera;
  forward: Vec3;
  right: Vec3;
  up: Vec3;
  width: number;
  height: number;
  focalLength: number;
  nearClip: number;
};

export type ProjectedPoint = {
  x: number;
  y: number;
  depth: number;
  scale: number;
  inFront: boolean;
  onScreen: boolean;
  visible: boolean;
};

export type CameraRouteMode = "chart" | "drift" | "locked";

export type CameraAtTimeOptions = {
  /** 动画累计秒数。 */
  elapsed: number;
  mode: CameraRouteMode;
  reducedMotion: boolean;
  /** 指针坐标使用画布归一化范围 0..1。 */
  pointerX: number;
  pointerY: number;
  pointerPresence: number;
  lockedCamera?: SkyCamera;
};

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const EPSILON = 1e-7;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const dot = (left: Vec3, right: Vec3) =>
  left.x * right.x + left.y * right.y + left.z * right.z;

const cross = (left: Vec3, right: Vec3): Vec3 => ({
  x: left.y * right.z - left.z * right.y,
  y: left.z * right.x - left.x * right.z,
  z: left.x * right.y - left.y * right.x,
});

const add = (left: Vec3, right: Vec3): Vec3 => ({
  x: left.x + right.x,
  y: left.y + right.y,
  z: left.z + right.z,
});

const multiply = (vector: Vec3, scalar: number): Vec3 => ({
  x: vector.x * scalar,
  y: vector.y * scalar,
  z: vector.z * scalar,
});

const normalize = (vector: Vec3): Vec3 => {
  const length = Math.hypot(vector.x, vector.y, vector.z);
  if (length < EPSILON) return { x: 1, y: 0, z: 0 };

  return multiply(vector, 1 / length);
};

const vectorToCoordinate = (vector: Vec3) => {
  const normalized = normalize(vector);
  return {
    longitude: Math.atan2(normalized.z, normalized.x) * RAD_TO_DEG,
    latitude: Math.asin(clamp(normalized.y, -1, 1)) * RAD_TO_DEG,
  };
};

export const coordinateToVector = (longitude: number, latitude: number): Vec3 => {
  const longitudeRadians = longitude * DEG_TO_RAD;
  const latitudeRadians = clamp(latitude, -90, 90) * DEG_TO_RAD;
  const latitudeRadius = Math.cos(latitudeRadians);

  return {
    x: latitudeRadius * Math.cos(longitudeRadians),
    y: Math.sin(latitudeRadians),
    z: latitudeRadius * Math.sin(longitudeRadians),
  };
};

const createUnrolledBasis = (forward: Vec3) => {
  const north = { x: 0, y: 1, z: 0 };
  let right = cross(forward, north);

  // WHY: 极点附近“天球北方”与视线重合，固定备用轴可避免镜头突然产生 NaN。
  if (Math.hypot(right.x, right.y, right.z) < EPSILON) {
    right = cross(forward, { x: 0, y: 0, z: 1 });
  }

  right = normalize(right);
  return {
    right,
    up: normalize(cross(right, forward)),
  };
};

export const createCameraBasis = (
  camera: SkyCamera,
  width: number,
  height: number,
): CameraBasis => {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const safeCamera: SkyCamera = {
    longitude: camera.longitude,
    latitude: clamp(camera.latitude, -89.9, 89.9),
    roll: camera.roll,
    fov: clamp(camera.fov, 20, 140),
  };
  const forward = coordinateToVector(safeCamera.longitude, safeCamera.latitude);
  const unrolled = createUnrolledBasis(forward);
  const rollRadians = safeCamera.roll * DEG_TO_RAD;
  const cosine = Math.cos(rollRadians);
  const sine = Math.sin(rollRadians);

  // WHY: 将 roll 合并到基向量后，星点、连线和标签可共用同一次投影，避免各层漂移。
  const right = normalize(
    add(multiply(unrolled.right, cosine), multiply(unrolled.up, sine)),
  );
  const up = normalize(
    add(multiply(unrolled.up, cosine), multiply(unrolled.right, -sine)),
  );

  return {
    camera: safeCamera,
    forward,
    right,
    up,
    width: safeWidth,
    height: safeHeight,
    // WHY: 以短边定义视场角，竖屏仍能看到多个相邻星座，而不会被狭窄横向视野裁成单星座。
    focalLength:
      Math.min(safeWidth, safeHeight) /
      (2 * Math.tan((safeCamera.fov * DEG_TO_RAD) / 2)),
    // WHY: 接近侧后方的点会被透视除法无限放大，提前裁掉能保护 Canvas 路径稳定。
    nearClip: 0.015,
  };
};

export const projectVector = (
  vector: Vec3,
  basis: CameraBasis,
): ProjectedPoint => {
  const normalized = normalize(vector);
  const depth = dot(normalized, basis.forward);
  const inFront = depth > basis.nearClip;

  if (!inFront) {
    return {
      x: Number.NaN,
      y: Number.NaN,
      depth,
      scale: 0,
      inFront: false,
      onScreen: false,
      visible: false,
    };
  }

  const x = basis.width / 2 + (dot(normalized, basis.right) / depth) * basis.focalLength;
  const y = basis.height / 2 - (dot(normalized, basis.up) / depth) * basis.focalLength;
  const onScreen = x >= 0 && x <= basis.width && y >= 0 && y <= basis.height;

  return {
    x,
    y,
    depth,
    scale: 1 / depth,
    inFront,
    onScreen,
    visible: inFront && onScreen,
  };
};

export const projectCoordinate = (
  longitude: number,
  latitude: number,
  basis: CameraBasis,
) => projectVector(coordinateToVector(longitude, latitude), basis);

type CameraWaypoint = {
  camera: SkyCamera;
  travelDuration: number;
  holdDuration: number;
};

// WHY: 航点覆盖不同季节与南北天区，镜头移动时屏幕外会持续进入新的星座，而不是绕同一构图摆动。
const CAMERA_ROUTE: readonly CameraWaypoint[] = [
  {
    camera: { longitude: 72, latitude: 10, roll: -1.4, fov: 72 },
    travelDuration: 13.5,
    holdDuration: 4.2,
  },
  {
    camera: { longitude: 96, latitude: 31, roll: 1.1, fov: 65 },
    travelDuration: 12.5,
    holdDuration: 3.6,
  },
  {
    camera: { longitude: 44, latitude: 53, roll: -2.5, fov: 70 },
    travelDuration: 16.5,
    holdDuration: 4.8,
  },
  {
    camera: { longitude: -65, latitude: 29, roll: 2.6, fov: 76 },
    travelDuration: 18,
    holdDuration: 4,
  },
  {
    camera: { longitude: 165, latitude: 52, roll: -1, fov: 68 },
    travelDuration: 18,
    holdDuration: 4.5,
  },
  {
    camera: { longitude: 180, latitude: 7, roll: 2, fov: 75 },
    travelDuration: 14,
    holdDuration: 3.5,
  },
  {
    camera: { longitude: -91, latitude: -29, roll: -2.8, fov: 78 },
    travelDuration: 17,
    holdDuration: 5,
  },
  {
    camera: { longitude: -10, latitude: 31, roll: 1.5, fov: 72 },
    travelDuration: 16,
    holdDuration: 4.2,
  },
] as const;

export const DEFAULT_LOCKED_CAMERA: SkyCamera = {
  longitude: 44,
  latitude: 53,
  roll: -2.5,
  fov: 72,
};

const positiveModulo = (value: number, divisor: number) =>
  ((value % divisor) + divisor) % divisor;

const normalizeAngle = (angle: number) => positiveModulo(angle + 180, 360) - 180;

const normalizeCamera = (camera: SkyCamera): SkyCamera => ({
  longitude: normalizeAngle(camera.longitude),
  latitude: clamp(camera.latitude, -89.9, 89.9),
  roll: normalizeAngle(camera.roll),
  fov: clamp(camera.fov, 20, 140),
});

const smootherstep = (value: number) => {
  const progress = clamp(value, 0, 1);
  return progress * progress * progress * (progress * (progress * 6 - 15) + 10);
};

const slerpVectors = (start: Vec3, end: Vec3, progress: number): Vec3 => {
  const from = normalize(start);
  const to = normalize(end);
  const amount = clamp(progress, 0, 1);
  const cosine = clamp(dot(from, to), -1, 1);

  if (cosine > 0.9995) {
    return normalize(add(multiply(from, 1 - amount), multiply(to, amount)));
  }

  // WHY: 反向向量不存在唯一最短弧，固定一个正交方向可保证极端数据下仍有连续路径。
  if (cosine < -0.9995) {
    const reference = Math.abs(from.x) < 0.8
      ? { x: 1, y: 0, z: 0 }
      : { x: 0, y: 1, z: 0 };
    const perpendicular = normalize(cross(from, reference));
    const angle = Math.PI * amount;
    return normalize(
      add(multiply(from, Math.cos(angle)), multiply(perpendicular, Math.sin(angle))),
    );
  }

  const angle = Math.acos(cosine);
  const sine = Math.sin(angle);
  return normalize(
    add(
      multiply(from, Math.sin((1 - amount) * angle) / sine),
      multiply(to, Math.sin(amount * angle) / sine),
    ),
  );
};

export const interpolateSkyCamera = (
  start: SkyCamera,
  end: SkyCamera,
  progress: number,
): SkyCamera => {
  const direction = slerpVectors(
    coordinateToVector(start.longitude, start.latitude),
    coordinateToVector(end.longitude, end.latitude),
    progress,
  );
  const coordinate = vectorToCoordinate(direction);
  const rollDelta = normalizeAngle(end.roll - start.roll);

  return {
    ...coordinate,
    roll: normalizeAngle(start.roll + rollDelta * progress),
    fov: start.fov + (end.fov - start.fov) * progress,
  };
};

const chartCameraAt = (elapsed: number): SkyCamera => {
  const cycleDuration = CAMERA_ROUTE.reduce(
    (duration, waypoint) =>
      duration + waypoint.holdDuration + waypoint.travelDuration,
    0,
  );
  let routeTime = positiveModulo(elapsed, cycleDuration);

  for (let index = 0; index < CAMERA_ROUTE.length; index += 1) {
    const waypoint = CAMERA_ROUTE[index];
    const nextWaypoint = CAMERA_ROUTE[(index + 1) % CAMERA_ROUTE.length];
    if (!waypoint || !nextWaypoint) continue;

    if (routeTime < waypoint.holdDuration) {
      return waypoint.camera;
    }
    routeTime -= waypoint.holdDuration;

    if (routeTime < waypoint.travelDuration) {
      return interpolateSkyCamera(
        waypoint.camera,
        nextWaypoint.camera,
        smootherstep(routeTime / waypoint.travelDuration),
      );
    }
    routeTime -= waypoint.travelDuration;
  }

  return CAMERA_ROUTE[0]?.camera ?? DEFAULT_LOCKED_CAMERA;
};

const DRIFT_DURATION_SCALE = 1.75;

const driftCameraAt = (elapsed: number): SkyCamera => {
  const cycleDuration = CAMERA_ROUTE.reduce(
    (duration, waypoint) =>
      duration + waypoint.travelDuration * DRIFT_DURATION_SCALE,
    0,
  );
  let routeTime = positiveModulo(elapsed, cycleDuration);

  for (let index = 0; index < CAMERA_ROUTE.length; index += 1) {
    const waypoint = CAMERA_ROUTE[index];
    const nextWaypoint = CAMERA_ROUTE[(index + 1) % CAMERA_ROUTE.length];
    if (!waypoint || !nextWaypoint) continue;

    const segmentDuration = waypoint.travelDuration * DRIFT_DURATION_SCALE;
    if (routeTime < segmentDuration) {
      const linearProgress = routeTime / segmentDuration;
      // WHY: 漂移模式不设停留，并保留端点速度，防止长周期背景在航点处看似卡住。
      const continuousProgress =
        linearProgress - Math.sin(linearProgress * Math.PI * 2) * 0.035;
      return interpolateSkyCamera(
        waypoint.camera,
        nextWaypoint.camera,
        continuousProgress,
      );
    }
    routeTime -= segmentDuration;
  }

  return CAMERA_ROUTE[0]?.camera ?? DEFAULT_LOCKED_CAMERA;
};

const applyPointerOffset = (
  camera: SkyCamera,
  pointerX: number,
  pointerY: number,
  pointerPresence: number,
): SkyCamera => {
  const presence = clamp(pointerPresence, 0, 1);
  const horizontal = clamp(pointerX, 0, 1) * 2 - 1;
  const vertical = clamp(pointerY, 0, 1) * 2 - 1;
  const pointerDistance = Math.hypot(horizontal, vertical);

  if (presence < EPSILON || pointerDistance < EPSILON) return camera;

  const forward = coordinateToVector(camera.longitude, camera.latitude);
  const unrolled = createUnrolledBasis(forward);
  const rollRadians = camera.roll * DEG_TO_RAD;
  const cosine = Math.cos(rollRadians);
  const sine = Math.sin(rollRadians);
  const screenRight = normalize(
    add(multiply(unrolled.right, cosine), multiply(unrolled.up, sine)),
  );
  const screenUp = normalize(
    add(multiply(unrolled.up, cosine), multiply(unrolled.right, -sine)),
  );
  const tangent = normalize(
    add(
      multiply(screenRight, horizontal / pointerDistance),
      multiply(screenUp, -vertical / pointerDistance),
    ),
  );
  const offsetRadians =
    2 * DEG_TO_RAD * presence * Math.min(1, pointerDistance);
  const offsetDirection = normalize(
    add(
      multiply(forward, Math.cos(offsetRadians)),
      multiply(tangent, Math.sin(offsetRadians)),
    ),
  );

  // WHY: 将输入限制为总计约 2°，只让指针补充观察感，不夺走自动巡航的主叙事。
  return {
    ...camera,
    ...vectorToCoordinate(offsetDirection),
  };
};

export const cameraAtTime = ({
  elapsed,
  mode,
  reducedMotion,
  pointerX,
  pointerY,
  pointerPresence,
  lockedCamera,
}: CameraAtTimeOptions): SkyCamera => {
  const stableCamera = normalizeCamera(lockedCamera ?? DEFAULT_LOCKED_CAMERA);

  if (mode === "locked" || reducedMotion) return stableCamera;

  const routeElapsed = Number.isFinite(elapsed) ? elapsed : 0;
  const routeCamera = mode === "chart"
    ? chartCameraAt(routeElapsed)
    : driftCameraAt(routeElapsed);

  return normalizeCamera(
    applyPointerOffset(
      routeCamera,
      pointerX,
      pointerY,
      pointerPresence,
    ),
  );
};
