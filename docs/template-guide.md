# 女嘉宾介绍模板自定义指南

## 概述

你可以通过上传自定义的装饰元素 PNG 图片，让女嘉宾介绍页面的样式与你的 PPT/Google Slides 设计完全一致。

## 需要导出的元素

| 元素 | 说明 | 文件名 |
|------|------|--------|
| 背景框架 | 整个粉色背景 + 装饰边框 | `bg-frame.png` |
| 照片相框 | 左侧大照片的装饰相框 | `photo-frame.png` |
| 名字边框 | 右上角英文名的装饰框 | `name-frame.png` |
| 介绍卡片 | 自我介绍文字的背景卡片 | `intro-card.png` |
| 标签按钮 | 底部标签的按钮样式 | `tag-button.png` |
| 角落装饰 | 丝带/爱心等装饰（可选） | `corner-deco.png` |
| 圆形相框 | 右侧小照片的圆形边框（可选） | `circle-frame.png` |

## 从 Google Slides 导出步骤

### 方法 1：通过 Google Drawing（推荐）

1. 在 Google Slides 中选中要导出的元素
2. `Ctrl+C` 复制
3. 打开 [Google Drawing](https://docs.google.com/drawings) → 新建空白文档
4. `Ctrl+V` 粘贴元素
5. `文件` → `页面设置` → `自定义`，调整画布大小刚好包住元素
6. `文件` → `下载` → `PNG 图片 (.png)`

### 方法 2：截图 + 去背景

1. 把元素放在纯色背景上（如纯绿色）
2. 截图保存
3. 使用在线工具去除背景：
   - [remove.bg](https://www.remove.bg/)
   - [Canva Background Remover](https://www.canva.com/features/background-remover/)

## 文件格式

**必须使用 PNG 格式：**
- ✅ 支持透明背景
- ✅ 保留渐变和阴影细节
- ✅ Google Slides 原生支持导出

❌ 不要用 JPG（不支持透明）
❌ 不要用 SVG（Google Slides 无法导出）

## 上传位置

将导出的 PNG 文件上传到：

```
public/assets/images/template/
├── bg-frame.png
├── photo-frame.png
├── name-frame.png
├── intro-card.png
├── tag-button.png
├── corner-deco.png (可选)
└── circle-frame.png (可选)
```

## 导出技巧

1. **删除动态内容**：导出前删掉照片、文字，只保留装饰框
2. **单独导出**：每个元素单独导出，不要合并
3. **保留透明**：确保背景是透明的，不是白色
4. **适当留边**：画布比元素稍大一点，避免裁切

## 完成后

上传完成后告诉开发者，代码会自动使用这些自定义图片替换默认的 CSS 样式。
