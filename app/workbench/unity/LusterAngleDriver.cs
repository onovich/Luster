using UnityEngine;

namespace Luster
{
    public sealed class LusterAngleDriver : MonoBehaviour
    {
        public Material material;
        public bool autoRotate;
        [Range(-90f, 90f)] public float angle = 5f;
        [Range(0f, 90f)] public float amplitude = 18f;
        public float speed = 0.5f;

        public void SetAngle(float value)
        {
            angle = Mathf.Clamp(value, -90f, 90f);
            if (material != null) material.SetFloat("_Angle", angle);
        }

        private void Update()
        {
            if (autoRotate) SetAngle(Mathf.Sin(Time.time * speed) * amplitude);
        }
    }
}
