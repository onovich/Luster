# Luster

[English](README.md)

基于 WebGL 的交互式卡面与薄膜材质，呈现随角度和光照变化的镭射反光。

![Luster — 交互式镭射材质](docs/social-preview.png)

[材质展厅](https://luster.onovich.com/) · [接入指南](docs/guide.zh-CN.md) · [卡面材质](docs/card-materials.md)

线上目前只开放展示首页，产品页、价格页和编辑器仅供本地测试。Trial 支持上传作品、使用示例并下载最长边 512px 的免费无水印 PNG。参见[网页版工作台状态](docs/online-workbench.md)。

在卡册或单卡视图中体验八种卡面，开关薄膜，调节角度、光向与反光强度。

## 本地运行

需要 Node.js、Python 3，以及支持 WebGL 1 和 `OES_standard_derivatives` 的浏览器。

```sh
npm ci
npm run build
npm start
```

打开[本地完整预览](http://127.0.0.1:8798/dist/)，可测试全部四个页面。`npm run build:public` 生成仅含展示首页的 `dist-public/` 发布目录；`npm run test:published` 验证隐藏页面与编辑器资源未被发布。

面向视觉表现的实验项目。仓库尚未提供开源许可证；复用美术前，请查阅[素材授权说明](docs/assets.md)。
