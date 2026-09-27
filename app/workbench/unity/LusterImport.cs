using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.UI;

namespace Luster.Editor
{
    public static class LusterImport
    {
        [Serializable] private class Source { public int width; public int height; }
        [Serializable] private class Maps { public int width; public int height; }
        [Serializable] private class Recipe { public float strength; public float richness; public float light; }
        [Serializable] private class View { public float angle; }
        [Serializable] private class Manifest
        {
            public string format;
            public int version;
            public string target;
            public Source source;
            public Maps maps;
            public Recipe recipe;
            public View view;
        }

        private const string Root = "Assets/LusterExport";
        private const string Generated = Root + "/Generated";

        [MenuItem("Tools/Luster/Build Imported Material")]
        public static void Build()
        {
            if (GraphicsSettings.currentRenderPipeline != null || QualitySettings.activeColorSpace != ColorSpace.Gamma)
                throw new Exception("This Luster export targets Unity 6000.4 Built-in, Gamma color space only.");
            var manifestPath = Path.Combine(Application.dataPath, "LusterExport/manifest.json");
            if (!File.Exists(manifestPath)) throw new Exception("Luster manifest missing; extract the ZIP into the project root.");
            var info = JsonUtility.FromJson<Manifest>(File.ReadAllText(manifestPath));
            if (info == null || info.format != "luster-unity-export" || info.version != 1 || info.target != "builtin-gamma-ugui" ||
                info.source == null || info.maps == null || info.recipe == null || info.view == null ||
                info.source.width < 1 || info.source.height < 1 || info.maps.width < 32 || info.maps.height < 32 ||
                info.maps.width > 2048 || info.maps.height > 2048)
                throw new Exception("Unsupported or invalid Luster manifest");
            AssetDatabase.Refresh();
            if (!AssetDatabase.IsValidFolder(Generated)) AssetDatabase.CreateFolder(Root, "Generated");
            var shader = Shader.Find("Luster/LayeredUI");
            if (shader == null || !shader.isSupported) throw new Exception("Luster shader missing or unsupported");

            var artwork = LoadArtwork(Path.Combine(Application.dataPath, "LusterExport/Source/artwork.png"), info.source.width, info.source.height);
            var film = RawMap(Path.Combine(Application.dataPath, "LusterExport/Maps/film.rgba"), info.maps.width, info.maps.height, true);
            var substrate = RawMap(Path.Combine(Application.dataPath, "LusterExport/Maps/substrate.rgba"), info.maps.width, info.maps.height, false);
            var material = new Material(shader);
            material.SetTexture("_ArtTex", artwork);
            material.SetTexture("_NormalTex", film);
            material.SetTexture("_SurfaceTex", substrate);
            material.SetVector("_NormalSize", new Vector4(info.maps.width, info.maps.height, 0, 0));
            material.SetFloat("_Strength", info.recipe.strength);
            material.SetFloat("_Richness", info.recipe.richness);
            material.SetFloat("_LightAngle", info.recipe.light);
            material.SetFloat("_Angle", info.view.angle);

            ReplaceAsset(artwork, Generated + "/Artwork.asset");
            ReplaceAsset(film, Generated + "/Film.asset");
            ReplaceAsset(substrate, Generated + "/Substrate.asset");
            ReplaceAsset(material, Generated + "/Material.mat");
            AssetDatabase.SaveAssets();

            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var cameraObject = new GameObject("Camera", typeof(Camera));
            var camera = cameraObject.GetComponent<Camera>();
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.09f, 0.27f, 0.81f);
            camera.orthographic = true;
            camera.orthographicSize = 2;
            cameraObject.transform.position = new Vector3(0, 0, -10);
            var canvasObject = new GameObject("Luster UI Canvas", typeof(RectTransform), typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            var canvas = canvasObject.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceCamera;
            canvas.worldCamera = camera;
            canvas.planeDistance = 1;
            var imageObject = new GameObject("Luster Material", typeof(RectTransform), typeof(RawImage), typeof(LusterAngleDriver));
            imageObject.transform.SetParent(canvasObject.transform, false);
            var image = imageObject.GetComponent<RawImage>();
            image.texture = artwork;
            image.material = material;
            image.rectTransform.sizeDelta = new Vector2(info.source.width, info.source.height);
            var driver = imageObject.GetComponent<LusterAngleDriver>();
            driver.material = material;
            driver.angle = info.view.angle;
            Canvas.ForceUpdateCanvases();
            EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene(), Generated + "/Sample.unity");
            Debug.Log("LUSTER_IMPORT_OK " + info.source.width + "x" + info.source.height + " / " + info.maps.width + "x" + info.maps.height);
        }

        private static void ReplaceAsset(UnityEngine.Object asset, string path)
        {
            AssetDatabase.DeleteAsset(path);
            AssetDatabase.CreateAsset(asset, path);
        }

        private static Texture2D RawMap(string path, int width, int height, bool point)
        {
            var bytes = File.ReadAllBytes(path);
            if (bytes.Length != width * height * 4) throw new Exception("Invalid map length: " + path);
            var texture = new Texture2D(width, height, TextureFormat.RGBA32, false, true);
            texture.LoadRawTextureData(bytes);
            texture.Apply(false, false);
            texture.filterMode = point ? FilterMode.Point : FilterMode.Bilinear;
            texture.wrapMode = TextureWrapMode.Clamp;
            return texture;
        }

        private static Texture2D LoadArtwork(string path, int width, int height)
        {
            var texture = new Texture2D(2, 2, TextureFormat.RGBA32, false, false);
            if (!ImageConversion.LoadImage(texture, File.ReadAllBytes(path)) || texture.width != width || texture.height != height)
                throw new Exception("Artwork decode or dimension mismatch");
            texture.filterMode = FilterMode.Bilinear;
            texture.wrapMode = TextureWrapMode.Clamp;
            return texture;
        }
    }
}
