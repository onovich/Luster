# Luster

[English](README.md)

经过美术调校的 WebGL 光谱覆膜渲染。输入底图、固定褶皱法线与观察角度，生成连续的虹彩反光，无需彩虹贴图或端点图像交叉淡化。

![Luster 光谱覆膜材质](docs/social-preview.png)

Luster 意为表面光泽：这个名字强调可复用的材质能力，不绑定宿主或示例美术。[命名理由](docs/handoff.md)。

## 运行演示

需要 Python 3，以及支持 WebGL 1 和 `OES_standard_derivatives` 的浏览器。

```sh
python -m http.server 8798 --bind 127.0.0.1
```

打开 [localhost:8798](http://127.0.0.1:8798)。无需安装前端依赖、构建或连接运行时网络服务。必须通过 HTTP 访问，不能用 `file://` 直接打开 `index.html`。

在书本左右移动指针会产生倾斜，移出后归正；前三个样本支持悬停和键盘焦点。可以切换 B14/B11、卡册/独立材质视图和八份法线，调节光学参数，或查看纯反光和法线。

![Luster 卡册与光谱反光演示](docs/screenshots/book-b14.png)

## 接入材质

将 `src/` 随应用通过 HTTP 提供。底图和打包法线由调用方传入；渲染器不加载演示素材，也不接管动画循环。

```js
import { FoilRenderer } from './src/index.js';

const material = await FoilRenderer.create(canvas, {
  variant: 'B14',
  normal: { data: packedRGBABytes, width: 512, height: 512 },
  background: decodedImage,
});
material.render({ angle: -4 }); // degrees
material.setParameters({ strength: 0.3 });
material.render({ angle: 1.25 });
material.dispose();
```

`canvas`、`packedRGBABytes`（`Uint8Array`）与 `decodedImage` 由宿主准备。可选的 `PoseTween` 提供可中断的 0.38 秒姿态插值。`FoilRenderer` 保留已有 API 名称。

- **结构固定，反光变化：** 褶皱法线保持不动，角度驱动光谱变化。
- **两套美术预设：** 默认 B14，保留 B11 对照，支持完整恢复预设。
- **明确的生命周期：** 更换输入、调整尺寸、绘制和释放 GPU 资源，不依赖 UI 框架。

[接入与计算原理](docs/guide.md) · [法线编码](docs/textures.md) · [架构](docs/architecture.md)

## 开发验证

`src/` 是通用库，`demo/` 管理展示和可替换素材，`tests/fixtures/approved/` 保存仅含材质的参考基准。不需要原始游戏工程或本机私有目录。

契约测试需要 Node.js，素材测试需要 Pillow，浏览器测试需要 Playwright 和 Chrome。按需安装仅用于测试的依赖：

```sh
python -m pip install Pillow
npm install --no-save --package-lock=false playwright
node --test tests/core.test.js tests/privacy.test.js
python tests/assets.py
# Keep the static server above running for these:
node tests/browser.cjs
node tests/material.cjs
```

浏览器测试默认使用已安装的 Chrome；可通过 `CHROME_PATH` 指定其他可执行文件，通过 `PLAYWRIGHT_PATH` 使用现有 Playwright 模块。结果写入忽略目录 `.test-output/`。[验证结果与限制](docs/verification.md)。

## 范围与授权

当前版本 0.1.0 是视觉材质研究：采用美术调校的一阶衍射近似，不是实测、能量守恒的 BSDF，也不是完整薄膜仿真。输出为不透明合成图。尚未认证移动 GPU 性能及广泛浏览器兼容性；上下文丢失后需要重新创建。

卡册、图片和交互仅用于展示通用渲染能力，不包含游戏规则、成长系统、账号状态或存档。[素材与隐私边界](docs/assets.md)。

仓库目前没有附带开源许可证。允许在此展示示例美术，不等于授予通用的再分发许可。
