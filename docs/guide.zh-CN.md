# 接入指南

[English](guide.md)

Luster 使用 WebGL 在图片上绘制随角度变化的反光。提供图片、表面法线图和光照参数，即可按指定角度渲染。页面布局、交互和动画由接入方控制。

项目提供两种渲染器：

- `FoilRenderer` 为静态图片添加反光薄膜，输出不透明画布。
- `LayeredRenderer` 为薄膜下的卡面提供独立的动态材质，在一次绘制中合成两层效果，并支持卡片从膜套中滑出。其表面贴图和接口见[卡面材质说明](card-materials.md)。

演示中的卡册是一种展示形式，两种渲染器都可以用于其他布局。

## 绘制第一张图片

按照 [README](../README.zh-CN.md) 启动本地 HTTP 服务。浏览器需要支持 WebGL 1、高精度片元浮点数和 `OES_standard_derivatives` 扩展。

将下面的示例保存为仓库根目录下的 HTML 文件，通过本地服务打开。示例使用仓库自带的图片和法线图；替换资源地址即可使用自己的素材。

```html
<canvas id="material" style="width:244px;height:274px"></canvas>
<script type="module">
  import {FoilRenderer} from './src/index.js';

  const background = new Image();
  background.src = './demo/assets/images/art-orbit.webp';
  await background.decode();

  const response = await fetch('./demo/assets/normals/normal-0.rgba');
  if (!response.ok) throw new Error(`Normal map: HTTP ${response.status}`);
  const data = new Uint8Array(await response.arrayBuffer());

  const renderer = await FoilRenderer.create(
    document.querySelector('#material'),
    {
      variant: 'B14',
      background,
      normal: {data, width: 512, height: 512},
      width: 488,
      height: 548,
    },
  );

  renderer.render({angle: 0});

  // 输入变化后，更新参数并重新绘制。
  renderer.setParameters({light: 25, strength: 0.3});
  renderer.render({angle: 2});

  // 移除当前视图时，调用 renderer.dispose()。
</script>
```

法线图记录各像素处的表面朝向。Luster 使用 XY16 打包格式：四个字节存储两个 16 位法线分量。这些字节是数值数据，不能按图片颜色处理，alpha 字节也是法线的一部分。编码、朝向和过滤规则见[纹理格式说明](textures.md)。

底图应使用已解码的图片或画布元素。跨域图片需要 CORS 授权。建议传入 `HTMLImageElement` 或 `HTMLCanvasElement`，避免使用 `ImageBitmap`，以便翻转和预乘行为遵循渲染器的纹理上传设置。

## 参数与预设

`B11` 和 `B14` 是两种薄膜着色方案。B11 使用固定的光栅间距；B14 还会根据表面法线改变局部光栅方向和间距。这里的光栅指用于产生彩色反光的微观定向结构。

| 参数 | 含义 |
| --- | --- |
| `angle` | 表面绕局部 Y 轴的旋转角度，单位为度；传给 `render()` |
| `light` | 中心光源与观察方向共用的世界空间角度，单位为度 |
| `period` | 基础光栅间距，单位为微米（μm） |
| `spread` | 周围光源采样点的角度偏移，单位为度 |
| `strength` | 薄膜反光增益，默认 `0.3` |
| `enabled` | 是否启用薄膜反光；正常合成时，`false` 将反光增益设为零 |
| `flatFloor`、`localBoost` | 较平整区域与褶皱区域的彩色反光增益 |
| `threshold`、`softness` | 根据法线图识别褶皱区域时使用的阈值和过渡宽度 |
| `whiteGain` | 白色高光增益 |
| `richness` | B14 中表面高度与光栅相位的关联强度 |
| `bend` | B14 中跨光栅沟槽方向的角度接受宽度，用于控制反光响应 |

两种预设共用 `period=0.7`、`spread=0.4`、`strength=0.3`、`localBoost=4`、`softness=0.06`、`whiteGain=4` 和 `enabled=true`。

| 方案 | `light` | `flatFloor` | `threshold` | `richness` | 跨沟槽宽度 |
| --- | --- | --- | --- | --- | --- |
| B11 | 23° | 0.03 | 0.035 | — | 固定为 0.09 |
| B14 | 24.39° | 0.04 | 0.027 | 22 | `bend=0.45` |

完整数值见[预设定义](../src/core/presets.js)，数值范围见[参数校验代码](../src/core/parameters.js)。导入 `presets` 后，可通过 `renderer.setParameters(presets.B14)` 恢复参数。此操作不会改变当前角度，也不会切换着色方案。

## 更新、动画与资源释放

`create()` 加载着色器并创建 WebGL 上下文及相关资源。更新参数或纹理后，需要调用 `render()` 才会显示变化。

| 方法 | 用途 |
| --- | --- |
| `setParameters(patch)` | 合并材质参数；数值参数超出范围或不是有限数时抛错 |
| `render({angle, inspect, kind})` | 立即绘制；默认值为 `angle=0`、`inspect=0`、`kind=2` |
| `setNormal({data, width, height})` | 校验并上传新的 XY16 法线图 |
| `setBackground(image)` | 上传已解码的底图 |
| `resize(width, height)` | 以正整数像素设置画布分辨率；显示尺寸由 CSS 控制 |
| `setVariantSource(variant, source)` | 编译 B11 或 B14 着色器源码并恢复对应预设；编译失败时保留原程序 |
| `dispose()` | 释放 GPU 资源，可重复调用 |

如需在运行时切换方案，可用 `src/webgl/resources.js` 中的 `loadShader` 加载源码，再传给 `setVariantSource()`。切换后重新调用 `render()`。如果 WebGL 上下文丢失，应释放原实例并创建新实例。

渲染器自身不运行动画循环。输入改变时绘制，过渡动画进行时才请求下一帧。可选的 `PoseTween` 工具使用五次缓动曲线插值角度，默认起始角度为 −4°，时长为 0.38 秒。调用 `to(targetAngle)` 指定目标，再用 `advance(deltaSeconds)` 推进，并将返回角度传给 `render()`。中途修改目标会保留当前角度，但会重新开始缓动，因此速度可能发生突变。演示采用 ±4° 的范围，核心接口接受任意有限角度。

排查渲染结果时，`inspect=1` 显示纯反光，`inspect=3` 显示解码后的法线。`kind=0` 用于检查平面，`kind=1` 使用法线图和深色底图；这两种诊断模式固定使用 0.8 的反光增益。正常图片合成使用 `kind=2` 和配置中的反光强度。

## 薄膜反光的计算过程

法线图确定表面的结构。旋转表面时，光源和观察方向保持在固定的世界空间方向，朝向观察者反射的波长随之变化。

1. 解码法线分量 X 和 Y，以 `sqrt(max(1-X²-Y², 0.001))` 重建 Z，再归一化得到法线 N。
2. 构建局部光栅方向 T，以及与其垂直的切向量 B。B11 将 X 轴投影到表面；B14 将 `G=(1,0,richness)` 投影到表面，并令局部间距为 `period / max(length(G-N*dot(N,G)), 0.15)`。
3. 将 N、T、B 绕 Y 轴旋转 `angle`。光源向量 L 和观察向量 V 均朝表面外侧，一阶峰值波长为 `1000 * localPeriod * abs(dot(T,L+V))`，单位为纳米。
4. 计算五个光源样本，每个样本采集 380–780 nm 范围内的 64 个波长。通过解析形式的 CIE 配色函数近似，将累积光谱转换为线性 RGB。屏幕空间导数用于拓宽光谱峰，减少锯齿。
5. 应用随褶皱分布变化的反光增益和白色高光，在近似线性颜色空间中与底图合成，最后以 1/2.2 gamma 编码输出。

薄膜合成公式为 `base*(1-0.08*gain*min(efficiency,1)) + reflected*gain`，结果限制在显示范围内。其中 `efficiency` 是随褶皱分布变化的增益；正常合成时，`gain` 取 `strength`。`LayeredRenderer` 会先计算动态卡面，再应用薄膜合成。

具体公式见 [B11.frag](../src/shaders/B11.frag) 和 [B14.frag](../src/shaders/B14.frag)。输入保持不变时，材质输出也保持不变。

## 移植与性能

移植时先核对解码后的法线，再迁移反光计算和颜色合成。保持纹理字节布局、光源与观察向量朝外的约定，以及切向量的方向一致。角度只转换一次弧度。迁移 CIE 到 RGB 的矩阵时，检查目标语言的行列顺序。

`FoilRenderer` 输出的是不透明合成图，不能直接作为透明图层盖在其他画面上。如需将薄膜反光与其他渲染器的表面合成，应在线性颜色空间中处理。如果目标渲染器已负责将线性颜色编码为显示颜色，应省去 Luster 最后的 gamma 编码。

使用相同输入，在 −4°、0°、+4° 和中间角度比较移植结果。纯反光和法线诊断模式可以帮助定位差异。仓库中的回归测试基准保存了特定着色器的输出；改变分辨率、精度、gamma 或采样方式，都可能影响比较结果。

减少波长或光源采样数可以提高速度，但也可能改变颜色和高光的平滑程度。应在目标设备上评估取舍，并为各个画质档分别保存视觉参考。项目尚未完成移动 GPU 性能验证。

演示为每张卡片使用独立的 WebGL 上下文。需要展示大量材质时，可评估共享上下文、着色程序，以及纹理图集或视口的方案。动画期间避免重复上传未变化的纹理，并只绘制可见材质。

## 模型适用范围

Luster 是面向视觉表现调校的光谱近似。薄膜模型采用一阶衍射、与中心光源同向的正交视线，以及经验性的反光增益。它不模拟偏振、折射或多层薄膜干涉，也没有经过实测材质校准。随附的薄膜法线包含五份基于图像的估计，以及三份变换后的变体。

它适合交互式视觉效果。需要准确复现实测光学行为的应用，应使用经过校准的材质模型和相应数据。
