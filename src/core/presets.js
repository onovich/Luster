const data = {
  "B11": {
    "period": 0.7,
    "spread": 0.4,
    "strength": 0.3,
    "localBoost": 4,
    "softness": 0.06,
    "whiteGain": 4,
    "enabled": true,
    "poseEndpoints": [
      -4,
      4
    ],
    "tweenSeconds": 0.38,
    "light": 23,
    "flatFloor": 0.03,
    "threshold": 0.035
  },
  "B14": {
    "period": 0.7,
    "spread": 0.4,
    "strength": 0.3,
    "localBoost": 4,
    "softness": 0.06,
    "whiteGain": 4,
    "enabled": true,
    "poseEndpoints": [
      -4,
      4
    ],
    "tweenSeconds": 0.38,
    "light": 24.39,
    "flatFloor": 0.04,
    "threshold": 0.027,
    "richness": 22,
    "bend": 0.45
  }
};
for (const p of Object.values(data)) { Object.freeze(p.poseEndpoints); Object.freeze(p); }
export const presets = Object.freeze(data);
