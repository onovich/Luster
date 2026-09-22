# Normal XY16 texture contract

RGBA 的四个字节不是颜色，也不是普通 RGB 法线。R/G 表示 X 的高/低字节，B/A 表示 Y 的高/低字节。A 是有效数据，不能作透明度。

```text
ux = (Rbyte * 256 + Gbyte) / 65535
uy = (Bbyte * 256 + Abyte) / 65535
X = ux * 2 - 1
Y = uy * 2 - 1
Z = sqrt(max(1 - X*X - Y*Y, .001))
N = normalize(X,Y,Z)
```

GLSL texture2D 返回归一化通道，所以对应式为 `(R*65280 + G*255)/65535`，Y 同理。

以 `p = clamp(uv*size-.5, 0, size-1)` 找到四个相邻 texel；四次 NEAREST 采样后先解码，再按 fract(p) 双线性混合 XY。不能先对打包通道线性过滤：低位字节进位会产生错误法线。禁止 mipmap、sRGB、颜色配置转换、预乘 alpha、有损压缩。

## Orientation

`demo/assets/normals/normal-N.rgba` 是没有文件头的 512×512×4 uint8 数组，第一行是 UV y=0（图像的底部）。上传 typed array 时 `UNPACK_FLIP_Y_WEBGL=false`。底图 PNG 正常从顶部开始，上传 HTMLImageElement 时 flipY=true。

冻结 `NormalXY16.png` 是 2048×1024，4 列 × 2 行。口袋编号按图像顶行 0,1,2,3，底行 4,5,6,7。每块先裁 512²，再垂直翻转，结果逐字节等于运行时 raw。注意先裁切再翻转，不能把整张 atlas 翻转后仍沿用原行号。

PNG alpha 存的是 Y 低字节；不要把 PNG 画进普通 2D canvas 再 getImageData 获取精确通道，这可能经过预乘而丢失数据。运行时 raw 绕过图像解码器。若自己加载 PNG，使用能保留四通道原字节的解码器。不要给它生成颜色 mip。

## Provenance / pocket map

| 口袋（左至右、上至下） | 固定高度估计来源 |
| --- | --- |
| 0 | 原估计 3，水平翻转 |
| 1 | 原估计 1，垂直翻转 |
| 2 | 原估计 4，旋转 180° |
| 3 | 原估计 0 |
| 4 | 原估计 1 |
| 5 | 原估计 2 |
| 6 | 原估计 3 |
| 7 | 原估计 4 |

法线在高度翻转之后生成，因此不要再额外翻转 X/Y 分量。五份独立估计来自原画辅助估计，并非实测扫描。公开仓库直接包含已认可 raw；不依赖原始工程，也不重新估算法线。
