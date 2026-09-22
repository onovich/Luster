# Luster

[English](README.md)

基于 WebGL 的通用覆膜材质，让图片呈现随角度变化的镭射反光。

![Luster 镭射覆膜材质](docs/social-preview.png)

## 运行演示

需要 Python 3，以及支持 WebGL 1 和 `OES_standard_derivatives` 的浏览器。在仓库根目录运行：

```sh
python -m http.server 8798 --bind 127.0.0.1
```

打开 [localhost:8798](http://127.0.0.1:8798)。移动指针倾斜卡册，切换 B14/B11 预设，或在独立材质视图中调节光学参数。

![Luster 卡册演示](docs/screenshots/book-b14.png)

## 接入

将 `src/` 随应用通过 HTTP 提供，准备画布、已解码底图和打包法线字节（`Uint8Array`）：

```js
import { FoilRenderer } from './src/index.js';

const material = await FoilRenderer.create(canvas, {
  normal: { data: packedRGBABytes, width: 512, height: 512 },
  background: decodedImage,
});
material.render({ angle: -4 }); // 角度单位为度；角度变化后再次调用
material.dispose(); // 使用结束后释放资源
```

[接入指南](docs/guide.md) · [法线格式](docs/textures.md) · [架构](docs/architecture.md) · [测试与兼容性](docs/verification.md)

## 状态与授权

采用面向视觉表现的光谱近似，适合材质实验与交互展示。兼容性与性能范围见验证记录。

仓库尚未提供开源许可证。复用示例美术前，请查阅[素材授权说明](docs/assets.md)。
