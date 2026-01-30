# 纽约非诚勿扰 2026

NYU Tandon CSSA 非诚勿扰活动网站 - 报名系统 + 活动控制系统

## 功能

### 1. 嘉宾报名系统
- 男/女嘉宾在线报名
- 照片/视频上传（Vercel Blob 存储）
- 数据存储至 Google Sheets

### 2. 管理后台 (`/admin`)
- 统计概览 - 性别、年龄、学校分布图表
- 嘉宾列表 - 筛选、查看详情、删除
- 照片集 - 瀑布流展示所有上传的媒体

### 3. 活动控制系统 (`/event`)
- 主舞台展示 (`/stage`) - 用于投影
- 导演控制台 (`/director`) - 环节控制、灯光、音效
- 女嘉宾控制页 (`/guest/[id]`) - 手机端控制灯光
- 实时同步 - 基于 Server-Sent Events (SSE)

---

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build
```

访问 http://localhost:3000

---

## 环境变量

复制 `.env.example` 为 `.env.local` 并填写：

```env
# Google Sheets API
GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@xxx.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID_MALE=your_male_sheet_id
GOOGLE_SHEET_ID_FEMALE=your_female_sheet_id

# Vercel Blob (文件上传)
BLOB_READ_WRITE_TOKEN=vercel_blob_xxx

# Admin 密码
ADMIN_PASSWORD=your_admin_password
```

---

## 素材 Skeleton 模式

本项目采用 **Skeleton 模式** 管理素材文件 - 代码已预设好所有触发点，你只需上传对应文件名的素材即可自动生效！

### 音效素材

放入 `public/assets/sounds/` 目录：

| 文件名 | 触发时机 |
|--------|----------|
| `male-enter.mp3` | 男嘉宾入场（自动） |
| `light-off.mp3` | 女嘉宾灭灯（自动） |
| `burst.mp3` | 女嘉宾爆灯（自动） |
| `success.mp3` | 牵手成功（自动） |
| `fail.mp3` | 牵手失败（自动） |
| `vcr-start.mp3` | VCR 播放（自动） |
| `applause.mp3` | 掌声（手动） |
| `countdown.mp3` | 倒计时（手动） |

详见 [`public/assets/sounds/README.md`](public/assets/sounds/README.md)

### VCR 视频

放入 `public/assets/videos/` 目录：

| 文件名 | 说明 |
|--------|------|
| `1-vcr1.mp4` | 1号男嘉宾 VCR1 |
| `1-vcr2.mp4` | 1号男嘉宾 VCR2 |
| `2-vcr1.mp4` | 2号男嘉宾 VCR1 |
| ... | ... |

详见 [`public/assets/videos/README.md`](public/assets/videos/README.md)

---

## 部署

推荐使用 [Vercel](https://vercel.com) 部署：

1. 连接 GitHub 仓库
2. 配置环境变量
3. 部署完成

---

## 技术栈

- **框架**: Next.js 14 (App Router)
- **样式**: Tailwind CSS
- **数据存储**: Google Sheets API
- **文件存储**: Vercel Blob
- **图表**: Recharts
- **实时通信**: Server-Sent Events (SSE)

---

© 2026 NYU Tandon CSSA
