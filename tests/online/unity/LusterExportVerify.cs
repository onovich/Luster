using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;

public static class LusterExportVerify
{
    [Serializable] private class Recipe { public float strength; public float richness; public float light; }
    [Serializable] private class View { public float angle; }
    [Serializable] private class Manifest { public Recipe recipe; public View view; }
    private static Texture2D CaptureUI(Camera camera, string output)
    {
        var target = new RenderTexture(640, 400, 24, RenderTextureFormat.ARGB32);
        target.Create();
        camera.targetTexture = target;
        Canvas.ForceUpdateCanvases();
        camera.Render();
        var old = RenderTexture.active;
        RenderTexture.active = target;
        var image = new Texture2D(640, 400, TextureFormat.RGBA32, false);
        image.ReadPixels(new Rect(0, 0, 640, 400), 0, 0);
        image.Apply();
        RenderTexture.active = old;
        camera.targetTexture = null;
        File.WriteAllBytes(output, image.EncodeToPNG());
        target.Release();
        UnityEngine.Object.DestroyImmediate(target);
        return image;
    }

    private static float ColorDistance(Color a, Color b)
    {
        return Mathf.Max(Mathf.Abs(a.r - b.r), Mathf.Abs(a.g - b.g), Mathf.Abs(a.b - b.b));
    }

    private static Color32[] Capture(Material material, Texture2D art, string output)
    {
        var target = new RenderTexture(320, 200, 0, RenderTextureFormat.ARGB32);
        target.Create();
        var old = RenderTexture.active;
        Graphics.Blit(art, target, material);
        RenderTexture.active = target;
        var image = new Texture2D(320, 200, TextureFormat.RGBA32, false);
        image.ReadPixels(new Rect(0, 0, 320, 200), 0, 0);
        image.Apply();
        RenderTexture.active = old;
        File.WriteAllBytes(output, image.EncodeToPNG());
        var pixels = image.GetPixels32();
        UnityEngine.Object.DestroyImmediate(image);
        target.Release();
        UnityEngine.Object.DestroyImmediate(target);
        return pixels;
    }

    public static void Run()
    {
        var basePath = "Assets/LusterExport/Generated/";
        var art = AssetDatabase.LoadAssetAtPath<Texture2D>(basePath + "Artwork.asset");
        var film = AssetDatabase.LoadAssetAtPath<Texture2D>(basePath + "Film.asset");
        var substrate = AssetDatabase.LoadAssetAtPath<Texture2D>(basePath + "Substrate.asset");
        var material = AssetDatabase.LoadAssetAtPath<Material>(basePath + "Material.mat");
        var info = JsonUtility.FromJson<Manifest>(File.ReadAllText(Path.Combine(Application.dataPath, "LusterExport/manifest.json")));
        if (art == null || film == null || substrate == null || material == null || material.shader == null || !material.shader.isSupported)
            throw new Exception("Unity export assets missing or unsupported");
        if (film.filterMode != FilterMode.Point || substrate.filterMode != FilterMode.Bilinear ||
            material.GetTexture("_NormalTex") != film || material.GetTexture("_SurfaceTex") != substrate ||
            Math.Abs(material.GetFloat("_Strength") - info.recipe.strength) > .0001f ||
            Math.Abs(material.GetFloat("_Richness") - info.recipe.richness) > .0001f ||
            Math.Abs(material.GetFloat("_LightAngle") - info.recipe.light) > .0001f ||
            Math.Abs(material.GetFloat("_Angle") - info.view.angle) > .0001f)
            throw new Exception("Unity export material settings mismatch");
        var log = Path.Combine(Path.GetDirectoryName(Application.dataPath), "Logs");
        Directory.CreateDirectory(log);
        material.SetFloat("_SurfaceAmount", 0);
        material.SetFloat("_FilmAmount", 0);
        Capture(material, art, Path.Combine(log, "export-original.png"));
        material.SetFloat("_SurfaceAmount", 1);
        Capture(material, art, Path.Combine(log, "export-substrate.png"));
        material.SetFloat("_FilmAmount", 1);
        Capture(material, art, Path.Combine(log, "export-combined.png"));
        EditorUtility.SetDirty(material);
        AssetDatabase.SaveAssets();
        EditorSceneManager.OpenScene(basePath + "Sample.unity");
        var image = UnityEngine.Object.FindFirstObjectByType<RawImage>();
        var driver = UnityEngine.Object.FindFirstObjectByType<Luster.LusterAngleDriver>();
        if (image == null || driver == null || image.material != material || image.texture != art || driver.material != material)
            throw new Exception("Unity export scene linkage broken");
        var camera = UnityEngine.Object.FindFirstObjectByType<Camera>();
        var before = CaptureUI(camera, Path.Combine(log, "export-ui-before-mask.png"));
        var canvas = UnityEngine.Object.FindFirstObjectByType<Canvas>();
        var maskObject = new GameObject("Test RectMask2D", typeof(RectTransform), typeof(RectMask2D));
        maskObject.transform.SetParent(canvas.transform, false);
        maskObject.GetComponent<RectTransform>().sizeDelta = new Vector2(160, 100);
        image.transform.SetParent(maskObject.transform, false);
        var after = CaptureUI(camera, Path.Combine(log, "export-ui-after-mask.png"));
        var outsideBefore = before.GetPixel(200, 200);
        var outsideAfter = after.GetPixel(200, 200);
        var insideAfter = after.GetPixel(340, 200);
        var background = camera.backgroundColor;
        if (ColorDistance(outsideBefore, background) < .05f ||
            ColorDistance(outsideAfter, background) > .03f ||
            ColorDistance(insideAfter, background) < .05f)
            throw new Exception("RectMask2D clipping or UI blend failed");
        UnityEngine.Object.DestroyImmediate(before);
        UnityEngine.Object.DestroyImmediate(after);
        Debug.Log("LUSTER_EXPORT_VERIFY_OK");
    }
}
