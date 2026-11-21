import * as THREE from 'three/webgpu';

const clamp01 = value => THREE.MathUtils.clamp(value, 0, 1);
const smooth = value => value * value * (3 - 2 * value);

/** Scroll-driven camera controller. It owns no DOM listeners and is reversible by design. */
export class OceanCameraRig {
  constructor(camera, pathData, { minHeight = -5.05 } = {}) {
    this.camera = camera;
    this.points = pathData.points;
    this.hasTimeline = this.points.length > 1 && this.points.every(point => Number.isFinite(point.progress));
    this.minHeight = minHeight;
    this.progress = 0;
    this.positionCurve = new THREE.CatmullRomCurve3(
      this.points.map(point => new THREE.Vector3(...point.position)),
      Boolean(pathData.closed),
      'centripetal',
      0.45
    );
    this.targetCurve = new THREE.CatmullRomCurve3(
      this.points.map(point => new THREE.Vector3(...point.target)),
      Boolean(pathData.closed),
      'centripetal',
      0.45
    );
    this.positionCurve.arcLengthDivisions = 320;
    this.targetCurve.arcLengthDivisions = 320;
    this.positionCurve.updateArcLengths();
    this.targetCurve.updateArcLengths();
    this.position = new THREE.Vector3();
    this.target = new THREE.Vector3();
  }

  resolveProgress(progress) {
    if (!this.hasTimeline) {
      const scaled = progress * (this.points.length - 1);
      const index = Math.min(this.points.length - 2, Math.floor(scaled));
      return { index, local: scaled - index, curveProgress: progress, arcLength: true };
    }
    let index = this.points.length - 2;
    for (let i = 0; i < this.points.length - 1; i++) {
      if (progress <= this.points[i + 1].progress) {
        index = i;
        break;
      }
    }
    const start = this.points[index].progress;
    const end = this.points[index + 1].progress;
    const local = end === start ? 0 : clamp01((progress - start) / (end - start));
    return {
      index,
      local,
      curveProgress: (index + local) / (this.points.length - 1),
      arcLength: false
    };
  }

  setProgress(value) {
    this.progress = clamp01(value);
    return this;
  }

  apply() {
    const progress = this.progress;
    const sample = this.resolveProgress(progress);
    // Recorded paths use their explicit timeline; legacy paths keep constant arc-length speed.
    const pointMethod = sample.arcLength ? 'getPointAt' : 'getPoint';
    this.positionCurve[pointMethod](sample.curveProgress, this.position);
    this.targetCurve[pointMethod](sample.curveProgress, this.target);
    this.position.y = Math.max(this.position.y, this.minHeight);
    this.target.y = Math.max(this.target.y, this.minHeight + 0.25);
    this.camera.position.copy(this.position);
    this.camera.lookAt(this.target);

    const local = smooth(sample.local);
    const fov = THREE.MathUtils.lerp(this.points[sample.index].fov, this.points[sample.index + 1].fov, local);
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    return this.target;
  }
}
