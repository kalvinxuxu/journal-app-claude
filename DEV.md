# 女友手账 - 开发说明

## 目标

先做一个可在浏览器中运行的第一版网页交互应用，验证核心体验是否成立。

第一版重点不是完整接入 LLM，而是先把产品结构、页面流转和手账氛围做出来，保证后续可以平滑接入：

- AI 日记生成
- 语音留言生成
- 记忆系统
- iOS 版本

## 产品判断

这个项目的核心是“日记内容 + 语音留言 + 记忆感 + 情感氛围”。

网页端完全可以先承载这些能力，因为：

- 首页卡片流、写日记页、语音播放器、设置页都适合先做成 Web
- 生成逻辑可以先用假数据或本地模板模拟
- 后续无论接后端还是做 iOS，都可以复用同一套页面结构和数据结构

## 第一版范围

### 必做

- 首页卡片流
- 单条日记卡片展示
- 心情标签
- 语音留言卡片展示
- 写日记页
- 语音留言页
- 设置页
- 本地假数据
- 基础状态切换

### 可先不做

- 真正的 LLM 调用
- 真正的语音合成
- 云端同步
- 登录注册
- 推送提醒
- iOS 原生适配

## 页面结构

### 1. 首页

- 顶部月份信息
- 卡片流展示历史日记
- 点击卡片展开详情
- 右下角写日记按钮

### 2. 写日记页

- 日期选择
- 文本输入
- 心情标签选择
- 图片占位区
- 语音留言生成区
- 保存按钮

### 3. 语音页

- 播放器
- 文字稿展示
- 上一条 / 下一条切换

### 4. 设置页

- 提醒时间
- 语音风格
- 导出手账
- 关于

## 数据结构草案

### Journal

```ts
type Journal = {
  id: string;
  date: string;
  weekday: string;
  mood: "开心" | "想念" | "感动" | "平静" | "调皮";
  content: string;
  images?: string[];
  voiceMessages: VoiceMessage[];
};
```

### VoiceMessage

```ts
type VoiceMessage = {
  id: string;
  timing: "morning" | "afternoon" | "night";
  transcript: string;
  duration: string;
};
```

## 第一版技术思路

- 先用前端静态页面把体验做出来
- 数据先放在本地 mock 文件
- 页面状态先用简单 store 管理
- 组件拆成可复用的小块
- 视觉风格先统一成奶油手账风

## 后续升级路径

### 第二阶段

- 接入真实生成接口
- 接入记忆存储
- 接入 TTS

### 第三阶段

- 沿用同一套数据结构
- 基于成熟接口开发 iOS 版本

## 文件预期

第一版建议先有这些文件：

- `index.html`
- `package.json`
- `tsconfig.json`
- `vite.config.ts`
- `src/main.tsx`
- `src/App.tsx`
- `src/styles/global.css`
- `src/styles/theme.css`
- `src/data/mockJournals.ts`
- `src/types/journal.ts`
- `src/components/*`
- `src/pages/*`
- `src/services/*`

## 结论

第一版完全可行，适合先做网页交互版。
真正的难点不在前端，而在后续的生成质量、记忆管理和语音能力。

