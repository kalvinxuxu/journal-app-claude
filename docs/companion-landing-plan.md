# 女友注册入口设计方案

## 需求
在 App 入口处增加一个「领取专属女友」的 landing page，作为引导用户完成 Companion onboarding 的过渡页面。

## 现状分析

当前 `App.tsx` 的 onboarding 流程：
```
App 加载 → 检查 companionReady 状态
  ├── companionReady === null → return null (loading)
  ├── companionReady === false → 直接渲染 <CompanionOnboardingPage /> (intake 问卷)
  └── companionReady === true → 渲染主应用
```

用户打开 app 时，若从未完成 onboarding，直接看到「先从你开始」的问卷页面，缺乏前置引导。

## 方案设计

### 新增页面
- `src/pages/CompanionLandingPage.tsx`

### 页面结构
```
CompanionLandingPage
├── 装饰性浮动爱心动画（4颗）
├── 中央卡片
│   ├── Badge: "专属体验"
│   ├── 标题: "领取你的<br />专属女友"
│   ├── 副标题（3行说明）
│   ├── 功能亮点（3项，图标+文字）
│   ├── CTA 按钮: "立即领取 →"
│   └── 免责声明: "完全免费 · 随时可取消"
```

### App.tsx 修改
```
companionReady === false 时：
  旧: 渲染 <CompanionOnboardingPage />
  新: 渲染 <CompanionLandingPage onClaim={() => setShowLanding(false)} />

用户点击"立即领取" → setShowLanding(false) → 下一次 render 走原 CompanionOnboardingPage 流程
```

### CSS
在 `global.css` 末尾添加 `.companion-landing` 相关样式，风格与 onboarding 保持一致（粉色渐变背景、圆角卡片）。

### 路由/状态流
1. `companionReady === null` → loading null
2. `companionReady === false` → 渲染 Landing（用户未注册）
3. 用户点击"立即领取" → `setShowLanding(false)` → 下次 render 触发 `companionReady === false` → 走 onboarding
4. `companionReady === true` → 主应用

## 文件清单

| 操作 | 文件路径 |
|------|----------|
| 新增 | `src/pages/CompanionLandingPage.tsx` |
| 修改 | `src/styles/global.css`（追加 landing 样式） |
| 修改 | `src/App.tsx`（导入 + 条件渲染 + state） |

## 预览效果

```
┌─────────────────────────────────┐
│     ♡           ♡               │  ← 浮动爱心装饰
│          ♡                      │
│  ┌─────────────────────────┐    │
│  │      [专属体验]          │    │  ← 粉色圆角卡片
│  │                         │    │
│  │    领取你的              │    │
│  │    专属女友              │    │
│  │                         │    │
│  │  她会记住你的一切...     │    │
│  │                         │    │
│  │  🌸 懂你的  📖 为你写  ✨ 每日穿 │  ← 功能亮点
│  │                         │    │
│  │   [ 立即领取 → ]        │    │  ← 粉色渐变按钮
│  │                         │    │
│  │  完全免费 · 随时可取消   │    │
│  └─────────────────────────┘    │
└─────────────────────────────────┘
```

## 待确认
1. Landing 页面是否需要退出/返回按钮，还是用户必须"领取"才能继续？
2. Badge 文案是否合适？（目前写"专属体验"）
3. 功能亮点是否需要改为其他描述？