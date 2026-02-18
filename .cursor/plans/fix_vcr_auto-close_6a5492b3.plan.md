---
name: Fix VCR Auto-Close
overview: Add fallback mechanism for VCR auto-close when video ends, using timeupdate event as backup.
todos:
  - id: fix-vcr-close
    content: Add fallback timeupdate check for VCR auto-close
    status: pending
---

# 修复 VCR 播放完毕无法退出

## 问题分析

当前 VCRPlayer 组件使用 `onEnded` 事件来检测视频结束，但某些视频格式可能不触发此事件。

## 修复方案

在 [`app/stage/page.tsx`](app/stage/page.tsx) 的 VCRPlayer 组件中：

1. 保留现有 `onEnded` 处理
2. 添加 `useRef` 追踪视频元素
3. 添加 `onTimeUpdate` 作为备用检测机制（当播放时间接近总时长时触发关闭）
```tsx
function VCRPlayer({ url, playing, onClose }: { ... }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video && video.duration && video.currentTime >= video.duration - 0.5) {
      onClose();
    }
  };
  
  // ... video element with ref and onTimeUpdate
}
```