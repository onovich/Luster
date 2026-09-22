# 原理与移植

## 不需要 Web 知识的输入输出模型

把 Luster 想成一个每次输入新角度就计算一次的材质函数：输入底图、固定法线、光源方向与参数，输出一张反光后的图像。底图可以是任何照片或图案；书本只是一种摆放方式。模型并不需要卡牌、收藏、账号、存档或游戏逻辑。

| 输入 | 含义 / 单位 |
| --- | --- |
| background | 已解码图片，显示颜色；当前使用约 2.2 gamma 转线性再合成 |
| normal | RGBA uint8 数据，RG 打包 16 位 X、BA 打包 16 位 Y；不是颜色 |
| angle | 绕局部 Y 轴旋转，度；演示固定端点 ±4°，核心允许其他有限角度 |
| light | 固定世界方向的角度，度；中心光源与正交视线共用方向 |
| period | 基础光栅间距，微米 μm |
| spread | 五点光源近似的偏移角，度 |
| strength | 底图合成时的反光增益，默认 0.3 |
| enabled | 关闭时令 strength=0 |
| flatFloor / localBoost | 平整区和褶皱区的彩光效率增益 |
| threshold / softness | 按法线 XY 长度选取褶皱区域的阈值和过渡宽度，无量纲 |
| whiteGain | 塑料白光增益 |
| richness | B14 固定相位中的高度关联 K，无量纲 |
| bend | B14 跨沟槽方向的高斯接受宽度，无量纲；不是弯曲动画 |

输出为不透明 RGB canvas。它将反光与调用方底图合成，不输出可直接盖在任意底图上的透明膜。检查模式 1 可取得纯反光，另一个引擎应在线性空间完成同一合成。

## 从法线到颜色

1. 解码固定 XY，得到 `N0 = normalize(X, Y, sqrt(max(1-X²-Y², .001)))`。这保留冻结版本的数值保护。
2. B11 将 X 轴投影到切平面：`T0 = normalize((1,0,0) - N0*N0.x)`，周期仍为 `period`。
3. B14 指定固定表面相位 `Phi(X)=X.x+K*X.z`。令 `G=(1,0,K)`，切平面梯度 `Gs=G-N0*dot(N0,G)`；`T0=normalize(Gs)`，`dLocal=period/max(length(Gs), .15)`。法线不随时间变，局部光栅方向和间距因此固定在塑料上。这是人为设计的关联，不是实测应变。
4. `B0=normalize(cross(N0,T0))`。将 N/T/B 共同绕 Y 旋转实际插值角度，光源 L 和视线 V 保持世界方向不动。向量均从表面朝外。
5. 只计算一阶峰值 `lambda = 1000*dLocal*abs(dot(T,L+V))`，单位 nm。B11 使用基础 period。平面中央点光特例是 `lambda=2000*d*abs(sin(light-angle))`。
6. 每个像素取五个光源样本；每个光源积分 64 个波长，采样中心为 `380+(k+.5)*400/64 nm`，覆盖 380–780nm。按峰值附近高斯能量乘解析 CIE XYZ 近似，累积后转换到线性 RGB。没有彩虹贴图。
7. 波长宽度基数为 18nm，加上屏幕导数过滤。B14 将导数幅度截到 60nm；B11 保留原式。跨沟槽因子为 `exp(-.5*(dot(B,L+V)/width)²)`；B11 width=.09，B14 width=bend=.45。
8. 用法线 XY 长度的 smoothstep 产生固定褶皱选择，混合 flatFloor 和 localBoost。白光由同一法线、半程向量、粗糙度 .07、Fresnel 近似得到。最终 `base*(1-.08*gain*min(efficiency,1))+reflected*gain`，限制到 0–1，再用 1/2.2 gamma 输出。

基础光栅相位匹配关系可参考 Jos Stam 的 [GPU Gems 第 8 章](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-8-simulating-diffraction)。本实现保留其方向投影思想，但使用上述可见波段与 CIE 近似，不沿用旧示例的波长区间或 RGB 色带。

没有端点图叠化、色相循环、时间噪声或纹理漂移。停稳后参数不变，输出也不变，演示不再请求动画帧。

## 两套冻结参数

共享：period=.7μm、spread=.4°、strength=.3、localBoost=4、softness=.06、whiteGain=4、enabled=true、左右 ±4°、tween=.38s。

| 方案 | light | flatFloor | threshold | richness | 跨沟槽宽度 |
| --- | --- | --- | --- | --- | --- |
| B11 | 23° | .03 | .035 | 不使用 | .09 固定 |
| B14 | 24.39° | .04 | .027 | 22 | .45 |

权威数据在 `src/core/presets.js`，测试与冻结 JSON 逐字段比较。恢复预设恢复全部材质参数；不会擅自改变当前姿态。

## 接入和生命周期

ES module 使用实例见根 README。`FoilRenderer.create` 读取本地 shader，一次创建独立 WebGL 上下文及 GPU 资源。公开方法：

- `setParameters(patch)`：合并参数；越界或 NaN 抛错。调用后再 render。
- `render({angle, inspect, kind})`：立即绘制，无全局时钟；kind=2 是底图合成，0 是平面诊断，1 是固定褶皱暗底诊断。诊断 kind 0/1 延续基准的固定 .8 gain，仅用于校验。
- `setNormal({data,width,height})`：替换已打包字节，尺寸可变化；先验证再上传。
- `setBackground(image)`：替换已解码 HTMLImageElement/HTMLCanvasElement 等 WebGL 图片源；跨域图片需 CORS。不要传 ImageBitmap，避免宿主对翻转/预乘选项的差异。
- `resize(width,height)`：设置正整数实际像素尺寸；CSS 尺寸由宿主决定。
- `setVariantSource('B11'|'B14', source)`：编译并替换方案；失败保留原 program；成功恢复该方案参数。`loadShader` 可读取随包 shader。
- `dispose()`：释放 program、buffer、两张 texture，可重复调用。已释放实例不可复用。

正常运行需要 WebGL 1、高精度 fragment float 和 OES_standard_derivatives。上下文丢失时演示显示刷新提示；嵌入应用应销毁并重新创建实例。八袋示例用八个上下文以便和基准逐像素比较；大量实例应改为单上下文共享 program/atlas/viewport。不要将示例上下文数量当作生产性能建议。

`PoseTween.to(next)` 从当前角度重启五次平滑曲线 `6t⁵−15t⁴+10t³`。中途反向时角度连续；速度会重置，不承诺速度一阶连续。`advance(deltaSeconds)` 输入非负秒数。按真实动画帧推进，将输出角度同时给材质和可选的几何变换。左右区域选择和 hover 只在 demo 实现。

## 移植到任意渲染栈

按纹理文档逐字节解码，先让“法线检查”与这里一致，再迁移光栅计算。将角度转换成弧度只做一次。保留 L/V 朝外约定和 T/B 手性。不要对 packed bytes 做 sRGB 转换、预乘、硬件双线性或 mipmap。

迁移 CIE 矩阵时检查目标语言的矩阵行列顺序。导数依赖实际渲染分辨率；改分辨率、精度或 gamma 会改变结果。目标栈若已有线性输出流程，去掉最终 gamma，避免二次编码。独立校验 ±4°、0°、中间角度与纯反光；不要拿变过底图的整页做相等性标准。

可以降低波长/光源采样数提高速度，但那是新质量档，不再声称与冻结方案逐像素一致。当前未做移动 GPU 性能认证。

## 近似的边界

这是美术调校的实时光谱近似：只有一阶衍射、固定同向正交光/视线、经验效率与白光合成。没有完整能量守恒、偏振、折射、多层薄膜干涉或测量校准。五份褶皱为图像估计，另外三份是翻转变体。颜色漂亮并不证明物理准确；Luster 名称不表示它是通用薄膜干涉 BSDF。
