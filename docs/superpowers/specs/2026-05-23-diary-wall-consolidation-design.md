# Diary Wall 收尾 — Rendering 层统一

**Date:** 2026-05-23
**Status:** Approved
**Approach:** Rendering-layer unification with lightweight view-model adapter

---

## Context

Diary wall雏形已跑起来，但存在三块残余分叉：

1. **残留分叉页面** — `WritePage.tsx` 已删，但 `AskHerPage.tsx` + `AskHerPage.test.tsx` 还在；`GreetingPage.tsx` + Header "今日问候" tab 是独立问候子系统
2. **Rendering 层未统一** — 三种内容（journal/OOTD/greeting）各自渲染，没有统一入口
3. **语音展示残留** — `InlineVoiceBar` 和 voice transcript 还在 diary wall 里展示

---

## Design: Rendering 层统一

### 1. 类型 — `DiaryWallRenderableItem`

在 `DiaryWallPage.tsx` 顶部（作为内部类型，或提到 `src/types/diaryWall.ts`）：

```ts
type DiaryWallRenderableItem =
  | { kind: "journal"; date: string; journal: Journal }
  | { kind: "ootd"; date: string; ootd: OotdItem | null; loading?: boolean; error?: string }
  | { kind: "greeting"; date: string; greeting: GreetingCard | null; pending?: boolean };
```

这个类型是**纯 rendering 适配层**：
- 不改变底层数据源（journalStore / ootdStore / greetingStore 各自独立）
- 只在 DiaryWallPage 内部把三种来源适配成统一渲染入口
- 未来如果要升级到完整 WallItem 数据模型，这个类型是自然的迁移起点

### 2. WallItemRenderer — 统一渲染入口

```tsx
function WallItemRenderer({ item }: { item: DiaryWallRenderableItem }) {
  switch (item.kind) {
    case "journal": return <JournalWallItem journal={item.journal} />;
    case "ootd": return <OotdWallItem ootd={item.ootd} loading={item.loading} error={item.error} onRefresh={...} />;
    case "greeting": return <GreetingWallItem greeting={item.greeting} pending={item.pending} />;
  }
}
```

每个 sub-renderer 是独立组件，放在 `src/components/diaryWall/` 目录：
- `JournalWallItem.tsx`
- `OotdWallItem.tsx`
- `GreetingWallItem.tsx`

### 3. 数据填充

在 `DiaryWallPage` mount 时，通过 `useEffect` 构建 `items` 数组：

```ts
const [items, setItems] = useState<DiaryWallRenderableItem[]>([]);

useEffect(() => {
  const journalItem: DiaryWallRenderableItem = { kind: "journal", date: today, journal: displayedJournal };
  const ootdItem: DiaryWallRenderableItem = { kind: "ootd", date: today, ootd, loading: ootdLoading, error: ootdError };
  const greetingItem: DiaryWallRenderableItem = { kind: "greeting", date: today, greeting, pending: !!pendingGreeting };
  setItems([journalItem, ootdItem, greetingItem]);
}, [displayedJournal, ootd, ootdLoading, ootdError, pendingGreeting, greeting]);
```

`items.map(item => <WallItemRenderer item={item} />)` 替代原来的三段独立渲染代码。

### 4. 轻量 WallItemRenderer 组件结构

每个 renderer 负责自己那块数据的渲染逻辑，props 接口和原来基本一致（只是收紧了入口）。

---

## 其他三件事

### 删除残留分叉页面

| 文件 | 操作 |
|------|------|
| `src/pages/AskHerPage.tsx` | 删除 |
| `src/pages/AskHerPage.test.tsx` | 删除 |
| `src/pages/GreetingPage.tsx` | 删除 |
| `src/components/Header.tsx` | 删除"今日问候" tab |
| `src/types/journal.ts` | 从 `AppPage` 中移除 `"greetings"` |

### 删除语音展示残留

- 删除 `DiaryWallPage.tsx` 中 voice transcript 的渲染代码（lines 286-293）
- `InlineVoiceBar` 和 `VoicePlayer` 在 DiaryWallPage 中不再被引用（这两个组件可以保留给其他页面如 HomePage/PhotoWallPage 用）
- 删除 `CompanionHintLine`（"你刚刚提到的那段心事，会让她更懂你一点"）— 这行是语音时代的残留，这次一起收掉
- 删除 `CompanionFeedbackBar`（反馈条）— 同样是旧的独立子系统残留

### 删除旧的 generation status 区域

DiaryWallPage 里 `genErrors` 和 `errorMessage` 的渲染区域（lines 337-358），是旧的"生成过程展示"，应该去掉。现在的 refresh 是 atomic 的，成功/失败状态已经在各 sub-renderer 里处理了。

---

## 文件结构

```
src/
  components/diaryWall/
    JournalWallItem.tsx    # 今日日记 renderer
    OotdWallItem.tsx       # 今日OOTD renderer
    GreetingWallItem.tsx   # 今日问候 renderer
  pages/
    DiaryWallPage.tsx     # 改为 items.map(WallItemRenderer)
```

---

## Success Criteria

1. `AskHerPage.tsx`、`AskHerPage.test.tsx`、`GreetingPage.tsx` 已删除
2. Header 没有"今日问候" tab
3. `AppPage` 类型中没有 `"greetings"`
4. DiaryWallPage 用 `items.map()` + `WallItemRenderer` 渲染三种内容
5. 语音 transcript 不再在 diary wall 里展示
6. `CompanionHintLine`、`CompanionFeedbackBar` 不再出现在 diary wall
7. 旧的 generation status 区域已删除
8. 所有相关测试通过

---

## 不在这个阶段做的事（给 B 留接口）

- Backend 数据模型不变（journalStore / ootdStore / greetingStore 保持独立）
- `Journal` 类型的 voiceMessages 字段保留（不删数据结构）
- `InlineVoiceBar`、`VoicePlayer` 组件保留（其他页面可能还用）