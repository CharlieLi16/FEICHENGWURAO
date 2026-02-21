# 数据保存架构文档

## 概述

本系统使用 **Vercel Blob** 作为持久化存储，配合内存缓存实现快速读取。

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   API Route │────▶│ Event Store │
│  (Browser)  │     │  (Next.js)  │     │  (Memory)   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │ Vercel Blob │
                                        │  (JSON)     │
                                        └─────────────┘
```

---

## 数据结构

### 存储位置
- **Blob 路径**: `event-data/state.json`
- **格式**: JSON

### 数据内容 (`PersistedData`)
```typescript
interface PersistedData {
  femaleGuests: FemaleGuest[];   // 女嘉宾数据
  maleGuests: MaleGuest[];       // 男嘉宾数据 (包含 VCR URLs)
  slides: SlideSlot[];           // 幻灯片
  eventState: {                  // 运行时状态
    phase: EventPhase;           // 当前阶段
    currentMaleGuest: number;    // 当前男嘉宾
    currentRound: number;        // 当前轮次
    lights: Record<number, 'on'|'off'|'burst'>;  // 灯光状态
    heartChoice: number | null;  // 心动选择
    stageBackground: string;     // 舞台背景
    backgroundBlur: number;      // 背景模糊
    useGoogleSlides: boolean;    // 是否用 Google Slides
  };
  savedAt: number;               // 保存时间戳
}
```

---

## 文件职责

### 1. `lib/event-persist.ts` - Blob 读写层

```typescript
// 保存到 Blob
saveEventData(data) → put(BLOB_PATH, json, { allowOverwrite: true })

// 从 Blob 读取
loadEventData() → list({ prefix }) → fetch(blob.url) → JSON.parse()

// 防抖保存 (用于非关键数据)
debouncedSave(data) → 2秒后执行 saveEventData
```

**关键配置**:
```typescript
put(BLOB_PATH, json, {
  access: 'public',
  contentType: 'application/json',
  addRandomSuffix: false,    // 固定文件名
  allowOverwrite: true,      // 允许覆盖 ⚠️ 必须有这个！
});
```

### 2. `lib/event-store.ts` - 状态管理层

```typescript
// 全局内存状态
let eventState: EventState;
let femaleGuests: FemaleGuest[];
let maleGuests: MaleGuest[];
let slides: SlideSlot[];

// 初始化 (从 Blob 加载)
ensureInitialized() → loadEventData() → 填充内存

// 获取数据
getEventData()      → 返回内存数据 (快)
getEventDataFresh() → 从 Blob 读取 (准确)

// 更新并保存
updateEventState()  → 更新内存 → triggerSaveImmediate()
setLight()          → 更新内存 → triggerSaveImmediate()
setFemaleGuests()   → 更新内存 → triggerSaveImmediate()
setMaleGuests()     → 更新内存 → triggerSaveImmediate()
setSlides()         → 更新内存 → triggerSaveDebounced()
```

**立即保存 vs 防抖保存**:
| 数据类型 | 保存方式 | 原因 |
|---------|---------|------|
| phase, lights, currentRound | 立即保存 | 关键运行时状态 |
| femaleGuests, maleGuests | 立即保存 | 包含 VCR URLs |
| slides | 防抖保存 | 频繁编辑，非关键 |

### 3. `app/api/event/state/route.ts` - API 层

```typescript
// GET - 获取状态 (从 Blob 读取保证一致性)
GET → getEventDataFresh() → { state, femaleGuests, maleGuests, slides }

// POST - 更新状态
POST { action: 'updateState', ... }   → await updateEventState()
POST { action: 'setLight', ... }      → await setLight()
POST { action: 'setFemaleGuests', ... } → await setFemaleGuests()
POST { action: 'setMaleGuests', ... }   → await setMaleGuests()
```

**重要**: 所有 POST 都 `await` 保存完成后才返回响应！

### 4. `app/api/event/stream/route.ts` - SSE 实时推送

```typescript
// 每 500ms 从 Blob 读取最新数据并推送
setInterval(async () => {
  const data = await getEventDataFresh();  // ← 从 Blob 读
  encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}, 500);
```

---

## 客户端保存逻辑

### Setup 页面 (`app/director/setup/page.tsx`)

**使用 useRef 避免闭包陷阱**:
```typescript
// Ref 始终保存最新数据
const maleGuestsRef = useRef<MaleGuest[]>(maleGuests);
useEffect(() => {
  maleGuestsRef.current = maleGuests;
}, [maleGuests]);

// 自动保存 (VCR 上传后)
const autoSaveMaleGuests = async () => {
  const guests = maleGuestsRef.current;  // ← 用 ref
  await fetch('/api/event/state', {
    body: JSON.stringify({ action: 'setMaleGuests', guests }),
  });
};

// 手动保存
const saveData = async () => {
  const currentMale = maleGuestsRef.current;  // ← 也用 ref
  await fetch('/api/event/state', { ... });
};
```

**VCR 自动保存触发**:
```typescript
const updateMaleGuest = (id, field, value) => {
  setMaleGuests(prev => {
    const updated = prev.map(...);
    
    // VCR 字段变化时自动保存
    if (field === 'vcr1Url' || field === 'vcr2Url') {
      setTimeout(() => autoSaveMaleGuests(), 1000);
    }
    
    return updated;
  });
};
```

### Director 页面 (`hooks/useEventStream.ts`)

**乐观更新 + 回滚**:
```typescript
const updateState = async (updates) => {
  // 1. 乐观更新 UI
  const previousState = state;
  setState(prev => ({ ...prev, ...updates }));
  
  // 2. 发送到服务器
  try {
    await fetchWithRetry('/api/event/state', { ... });
  } catch (error) {
    // 3. 失败则回滚
    setState(previousState);
    toast.error('操作失败');
  }
};
```

---

## 数据保护机制

### 服务端保护 (`lib/event-store.ts`)
```typescript
// 防止空数据覆盖有内容的数据
function maleGuestHasContent(g: MaleGuest): boolean {
  return !!(g.name?.trim() || g.vcr1Url || g.vcr2Url || g.photo);
}

export async function setMaleGuests(guests: MaleGuest[]) {
  const newHasContent = guests.some(maleGuestHasContent);
  const currentHasContent = maleGuests.some(maleGuestHasContent);
  
  if (currentHasContent && !newHasContent) {
    console.error('[BLOCKED] Refusing to overwrite with empty data');
    return;  // 阻止保存
  }
  
  maleGuests = guests;
  await triggerSaveImmediate();
}
```

### 客户端保护 (`app/director/setup/page.tsx`)
```typescript
const saveData = async () => {
  const hasAnyMale = currentMale.some(g => 
    g.name?.trim() || g.vcr1Url || g.vcr2Url || g.photo
  );
  
  if (!hasAnyFemale && !hasAnyMale) {
    const confirmed = window.confirm('⚠️ 数据为空，确定保存？');
    if (!confirmed) return;
  }
  // ...
};
```

---

## 常见问题排查

### 1. 数据丢失
**可能原因**:
- Blob 保存失败 (检查 `allowOverwrite: true`)
- 空数据覆盖了有效数据
- 闭包问题导致保存了旧数据

**排查方法**:
```bash
# 查看 Blob 内容
curl https://你的域名/api/blob/list

# 查看服务端日志
# 搜索 "[Persist]" 和 "[setMaleGuests]"
```

### 2. 多实例不一致
**原因**: Vercel Serverless 函数有多个实例，内存不共享

**解决**: 
- SSE 轮询从 Blob 读取 (`getEventDataFresh`)
- GET 请求也从 Blob 读取

### 3. 保存慢/超时
**原因**: Blob 写入需要网络请求

**优化**:
- 关键数据立即保存
- 非关键数据防抖保存 (2秒)

---

## 数据流总结

```
┌─────────────────────────────────────────────────────────────┐
│                        保存流程                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  用户操作 (上传VCR/点击保存)                                  │
│       │                                                     │
│       ▼                                                     │
│  updateMaleGuest() ─────────────────┐                       │
│       │                             │                       │
│       ▼                             ▼                       │
│  setState(...)              setTimeout(1s)                  │
│       │                             │                       │
│       ▼                             ▼                       │
│  useEffect → ref.current    autoSaveMaleGuests()            │
│                                     │                       │
│                                     ▼                       │
│                          fetch('/api/event/state')          │
│                                     │                       │
│                                     ▼                       │
│                            setMaleGuests()                  │
│                                     │                       │
│                                     ▼                       │
│                          triggerSaveImmediate()             │
│                                     │                       │
│                                     ▼                       │
│                            saveEventData()                  │
│                                     │                       │
│                                     ▼                       │
│                          put() → Vercel Blob                │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        读取流程                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  页面加载 / SSE 轮询                                         │
│       │                                                     │
│       ▼                                                     │
│  fetch('/api/event/state') 或 SSE                           │
│       │                                                     │
│       ▼                                                     │
│  getEventDataFresh()                                        │
│       │                                                     │
│       ▼                                                     │
│  loadEventData()                                            │
│       │                                                     │
│       ▼                                                     │
│  list() + fetch() → Vercel Blob                             │
│       │                                                     │
│       ▼                                                     │
│  返回最新数据到客户端                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
