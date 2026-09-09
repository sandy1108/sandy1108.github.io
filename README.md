# FEBIRDY Portal

FEBIRDY 的个人首页，同时也是技术博客的入口页。

## 本地预览

该站点是纯静态页面，不需要安装依赖或执行构建：

```bash
python3 -m http.server 4173
```

打开 `http://127.0.0.1:4173/`。

## 部署

推送到 `master` 后，GitHub Actions 会将仓库根目录部署到 GitHub Pages。正式域名由根目录的 `CNAME` 指定。

## 目录说明

- `index.html`：页面语义结构和文案。
- `styles.css`：响应式布局和视觉样式。
- `portal.js`：WebGL 深空背景与按钮微交互。
- `.ui-design/`：本地 Stitch 设计资料，已通过 `.gitignore` 排除，不参与版本管理和部署。
