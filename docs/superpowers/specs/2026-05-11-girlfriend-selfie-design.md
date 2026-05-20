# 女友自拍生成功能设计

## 日期
2026-05-11

## 状态
已确认

## 功能概述

女友每天自动生成 2 张自拍（早晚各 1 张），整理到手账日记中。

## 技术方案

| 项目 | 内容 |
|------|------|
| 模型 | MiniMax image-01 |
| 人物一致性 | 首次生成返回 `character_id`，保存到 `localStorage`，后续复用 |
| 生成数量 | 每天 2 张（早 + 晚） |
| 触发时机 | App 打开时检查，若当天无日记则自动生成 |
| 形象描述 | 黑色长发、温柔气质、浅色休闲上衣、日系生活感 |

## 女友形象描述

```
亚洲年轻女性，黑色长发（及肩或更长），自然散发，
柔和的面部轮廓，温柔带笑的眼眸，
浅色休闲上衣（白色或淡粉色系），
整体气质：清新温柔、亲切邻家、略带俏皮感。
风格参考：日系、生活化、非精修照片感。
```

## 数据结构

### Journal 类型变更

```ts
type Journal = {
  id: string;
  date: string;
  weekday: string;
  mood: Mood;
  content: string;
  images?: string[];        // 场景配图（现有）
  selfies?: string[];       // 女友自拍（新增）
  characterId?: string;    // 人物一致性 ID（新增）
  voiceMessages: VoiceMessage[];
};
```

### localStorage 存储

```
character_id: string  // 人物一致性 ID
```

## 生成流程

```
App 打开
  → 检查当天是否有日记
  → 若无：
      1. 检查 localStorage 是否有 character_id
      2. 若无 → 首次生成，获取 character_id 并保存
      3. 携带 character_id 生成早晚 2 张自拍
      4. 自动写入日记（不需要用户操作）
```

### 首次生成
```ts
POST /v1/image_generation
{
  model: "image-01",
  prompt: "<女友形象描述>，自拍视角，今日心情：<mood>",
  character_id: undefined,  // 首次无 ID
  n: 1
}
// 返回 character_id
```

### 后续生成
```ts
POST /v1/image_generation
{
  model: "image-01",
  prompt: "<女友形象描述>，自拍视角，今日心情：<mood>",
  character_id: "<saved_character_id>",  // 携带保存的 ID
  n: 1
}
```

## 设置页功能

| 功能 | 说明 |
|------|------|
| 查看形象 | 显示当前已生成的女友形象图 |
| 重新生成 | 清空 character_id，重新生成（会换人） |
| 手动触发 | 可手动触发"今日自动生成" |

## 错误处理

| 情况 | 处理 |
|------|------|
| API Key 未配置 | 显示红色警告，提示用户在 .env.local 配置 |
| 生成失败 | 使用占位图，记录错误日志 |
| character_id 获取失败 | 降级为无 ID 生成（可能不一致） |

## MiniMax API 端点

```
POST https://api.minimaxi.com/v1/image_generation
```

## 依赖

- MiniMax API Key 配置在 `.env.local`
- `VITE_MINIMAX_BASE_URL=https://api.minimaxi.com/v1`