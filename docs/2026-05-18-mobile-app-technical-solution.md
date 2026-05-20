# 女友手账 Mobile App 技术方案

## 1. 目标

将 `journal-app-claude` 从当前的 Web 原型，演进为一个以手机端为主、可长期维护的正式 App。

核心目标：

- 保留当前产品能力：写日记、语音、自拍/图片、回忆生成、手账列表
- 让手机成为主入口，而不是网页的附属入口
- 尽量复用现有业务逻辑和后端接口
- 为后续相册、录音、通知、分享、离线缓存留好空间

结论：

- 推荐路线：`Expo + React Native`
- 保留当前 `Vite + React` Web 端作为辅助端/运营预览端
- 保留当前 `Express` 后端作为移动端 API 服务

---

## 2. 当前项目基础

### 前端现状

当前前端：

- `Vite + React 18`
- 页面结构已经较完整：`HomePage`、`WritePage`、`VoicePage`、`SettingsPage`、`AskHerPage`
- 已经有较多业务服务层：内容生成、图片/语音、记忆、任务轮询、本地存储

这说明：

- 产品交互和业务流程已经有雏形
- 但当前 UI 是浏览器导向，不是原生移动端导向

### 后端现状

当前后端：

- `Express`
- `better-sqlite3`
- 已有内容生成、图片生成等 API 代理能力

这说明：

- 后端足够作为第一代移动端 API 服务
- 不需要为了做 App 先重写后端

---

## 3. 为什么选 Expo / React Native

这是最适合“女友手账”这类产品的路线，原因如下：

- 产品核心场景天然是手机：拍照、相册、语音、通知、随手记录
- React Native 比 WebView 封装更适合做长期产品
- 你当前前端团队如果熟悉 React，迁移成本最低
- Expo 能显著降低 iOS/Android 工程复杂度
- 后续接入相机、麦克风、通知、文件、分享都更顺手

不推荐作为长期方案的路线：

- `Capacitor` 直接包现有 Web：适合快速验证，不适合长期主产品
- 继续只做移动 Web：短期可行，但会被原生能力限制

---

## 4. 推荐总体架构

采用“三层结构”：

### 4.1 Mobile App

新建移动端项目：

- `mobile-app/`
- `Expo + React Native + TypeScript`

职责：

- 原生 UI
- 导航
- 本地缓存
- 文件/图片/录音采集
- 调用后端 API
- 上传进度、任务轮询、失败重试

### 4.2 Web 端

保留现有 Web 项目：

- 当前 `Vite + React` 继续存在

职责：

- 内部演示
- 运营/调试
- 桌面浏览器预览
- 快速验证新业务流程

### 4.3 Backend

保留并演进当前后端：

- `backend/` 继续使用 `Express + SQLite`

职责：

- 内容生成 API
- 图片/语音生成代理
- 手账存储
- 媒体上传
- 任务状态管理

---

## 5. 建议的目录结构

建议最终结构：

```text
journal-app-claude/
  backend/
  web/
  mobile-app/
  docs/
```

其中：

- `web/`：现有 Vite React 前端迁入
- `backend/`：保留现有 Express 服务
- `mobile-app/`：新增 Expo 项目

如果短期不想迁目录，也可以先这样：

```text
journal-app-claude/
  backend/
  src/                # 现有 web
  mobile-app/         # 新增 Expo
  docs/
```

建议第一阶段先用第二种，改动最小。

---

## 6. 移动端技术栈

推荐栈如下：

- 框架：`Expo`
- UI：`React Native`
- 语言：`TypeScript`
- 路由：`Expo Router`
- 服务状态：`@tanstack/react-query`
- 本地 UI 状态：`Zustand`
- 本地持久化：`AsyncStorage`
- 表单：`react-hook-form`
- 媒体选择：`expo-image-picker`
- 音频录制/播放：`expo-av`
- 通知：`expo-notifications`
- 网络：原生 `fetch` 或 `axios`
- 环境变量：`expo-constants` / Expo env

这套组合足够支撑第一代产品，不会过重。

---

## 7. 业务能力映射

### 7.1 写手账

移动端页面：

- 今日记录页
- 编辑页
- 历史列表页
- 详情页

复用思路：

- 文案生成逻辑保留在后端
- 前端只负责输入、展示、保存、编辑

### 7.2 语音

移动端能力：

- 录音
- 播放
- 上传音频
- 展示转写/生成内容

说明：

- Web 里现有 `VoicePage` 的交互思路可复用
- 录音实现要改成 `expo-av`

### 7.3 自拍 / 图片

移动端能力：

- 拍照
- 相册选择
- 图片预览
- 图片上传

说明：

- Web 里的图片上传和预览逻辑可以复用业务规则
- 文件接入方式改成原生媒体选择器

### 7.4 任务轮询

当前项目已经有任务相关服务层，适合继续沿用“异步生成 + 轮询状态”的模式。

移动端需要补强：

- 弱网重试
- 页面返回后继续查看任务状态
- 前后台切换后的任务恢复

---

## 8. 后端需要补齐的 API

当前后端能作为基础，但要正式支撑手机 App，建议补齐以下接口：

### 手账数据

- `GET /api/journals`
- `GET /api/journals/:id`
- `POST /api/journals`
- `PATCH /api/journals/:id`
- `DELETE /api/journals/:id`

### 媒体上传

- `POST /api/uploads/image`
- `POST /api/uploads/audio`

返回统一媒体对象：

```json
{
  "id": "media_xxx",
  "url": "https://...",
  "type": "image",
  "width": 1080,
  "height": 1440
}
```

### 内容生成

- `POST /api/content-generation`
- `POST /api/image-generation`
- `POST /api/voice-generation`

### 异步任务

- `POST /api/tasks`
- `GET /api/tasks/:id`
- `GET /api/tasks/:id/status`
- `POST /api/tasks/:id/retry`

### 用户与设置

第一阶段可以先不做完整账号体系，但至少需要：

- `GET /api/preferences`
- `PUT /api/preferences`

---

## 9. 数据与状态策略

### 第一阶段

采用“本地优先 + 服务端同步”简化方案：

- 本地缓存最近手账、草稿、设置
- 服务端保存正式内容
- 网络失败时允许本地保留草稿

### 第二阶段

如果产品验证通过，再升级为：

- 用户账号体系
- 云端多端同步
- 冲突处理

不建议第一阶段就做复杂同步系统。

---

## 10. Web 代码复用策略

可以复用的：

- 类型定义
- 日期/日历/格式化工具
- 纯业务服务逻辑
- 提示词生成、内容拼接、规则引擎

不适合直接复用的：

- DOM 组件
- CSS
- 浏览器文件上传逻辑
- 浏览器音频录制/播放逻辑
- 依赖 `localStorage`、`window`、`document` 的代码

建议做法：

- 抽出 `shared/` 放纯 TypeScript 业务逻辑
- `web/` 和 `mobile-app/` 各自维护 UI 层

---

## 11. 推荐的分阶段实施路线

### Phase 1：移动端基础壳

目标：

- 建 Expo 项目
- 跑通导航
- 建立 API 层
- 接上后端健康检查

产出：

- `mobile-app/`
- 首页、写页、设置页基础结构

### Phase 2：核心记录链路

目标：

- 手账列表
- 新建/编辑手账
- 本地草稿
- 后端保存

产出：

- 第一条完整“写 -> 存 -> 看”的用户路径

### Phase 3：图片与语音

目标：

- 相册/拍照
- 录音/播放
- 媒体上传

产出：

- 手机端最关键的原生体验能力

### Phase 4：生成与轮询

目标：

- 内容生成任务
- 状态轮询
- 失败重试

产出：

- AI 生成链路在手机端闭环

### Phase 5：通知与产品打磨

目标：

- 提醒
- 夜间消息
- 性能与离线体验优化

---

## 12. 风险与注意点

### 风险 1：后端接口当前更偏原型

影响：

- 移动端接入时会暴露出数据结构不稳定的问题

对策：

- 先定义统一 API contract
- 移动端只依赖 contract，不直接绑定当前页面实现细节

### 风险 2：Web 逻辑与移动端 UI 耦合

影响：

- 如果直接照搬 `src/pages`，后续会很难维护

对策：

- 提前拆分 `shared business logic` 和 `platform UI`

### 风险 3：SQLite 适合作为第一阶段，但不一定适合作为长期云端方案

影响：

- 多用户、跨设备同步时会受限

对策：

- 第一阶段继续用 SQLite
- 第二阶段再评估迁到 Postgres / Supabase

---

## 13. 最终建议

正式路线建议：

1. 保留当前 `backend/`
2. 保留当前 Web 原型
3. 新建 `mobile-app/`，使用 `Expo + React Native`
4. 抽取一层 `shared/` 复用纯业务逻辑
5. 先完成“写手账 + 图片 + 语音 + 生成任务”的移动闭环

一句话结论：

`女友手账` 这个项目非常适合做手机 App，而且应该直接走 `Expo / React Native` 的正式路线，而不是继续把 Web 当主产品。
