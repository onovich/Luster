export const limits = Object.freeze({light:[3,35], period:[0.1,3], spread:[0,1.2], strength:[0,0.8], flatFloor:[0,1], localBoost:[0,4], threshold:[0.001,0.06], softness:[0.002,0.06], whiteGain:[0,4], richness:[0,35], bend:[0.09,0.8]});
export function validateParameters(parameters) {
  for (const [key, [min,max]] of Object.entries(limits)) {
    if (parameters[key] !== undefined && (!Number.isFinite(parameters[key]) || parameters[key]<min || parameters[key]>max)) throw new RangeError(`${key} must be ${min}…${max}`);
  }
  return {...parameters};
}
export function validatePose(angle) {
  if (!Number.isFinite(angle)) throw new TypeError('angle must be finite degrees');
  return angle;
}
/** Pure pose input helper. Retargeting starts at the current angle, including mid-tween. */
export class PoseTween {
  constructor(angle=-4, seconds=0.38) {
    if (!(seconds>0) || !Number.isFinite(seconds)) throw new RangeError('seconds must be positive');
    this.angle=validatePose(angle); this.from=angle; this.target=angle; this.seconds=seconds; this.elapsed=seconds;
  }
  set(angle) { this.angle=validatePose(angle); this.from=angle; this.target=angle; this.elapsed=this.seconds; }
  to(angle) { this.from=this.angle; this.target=validatePose(angle); this.elapsed=0; }
  get active() { return this.elapsed<this.seconds; }
  advance(seconds) {
    if (!Number.isFinite(seconds) || seconds<0) throw new RangeError('delta must be nonnegative seconds');
    this.elapsed=Math.min(this.seconds,this.elapsed+seconds);
    const t=this.elapsed/this.seconds, q=t*t*t*(t*(t*6-15)+10);
    this.angle=this.from+(this.target-this.from)*q;
    return this.angle;
  }
}
