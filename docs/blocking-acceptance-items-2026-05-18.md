# 阻塞验收项任务清单

日期：2026-05-18

目的：整理当前实现中仍然阻塞验收的真实问题，作为后续修复的执行清单。

---

## P0 - 必须先修

- [ ] 修复 `media_generation` 前后端输入协议不一致
文件：
[src/pages/AskHerPage.tsx](</c:/Users/kalvi/Documents/claude application/journal-app-claude/src/pages/AskHerPage.tsx:69>)
[backend/src/index.ts](</c:/Users/kalvi/Documents/claude application/journal-app-claude/backend/src/index.ts:390>)
要求：
前端传给 `media_generation` 的 `input` 字段，必须和后端 runner 实际读取的字段一致。
任务系统主路径必须能真实生成 `images` 和 `voiceMessages`，不能返回空结果后仍被前端当作成功。

- [ ] 让 `sceneHint` 在任务系统主路径中也真正影响图片生成
文件：
[src/pages/AskHerPage.tsx](</c:/Users/kalvi/Documents/claude application/journal-app-claude/src/pages/AskHerPage.tsx:71>)
[src/services/minimax.ts](</c:/Users/kalvi/Documents/claude application/journal-app-claude/src/services/minimax.ts:304>)
要求：
无论走任务系统还是 fallback 直连，最终图片 prompt 都必须包含 `sceneHint`。
两条路径下的配图逻辑必须一致，不能只有 fallback 生效。

- [ ] 修复自动生成今日日记没有写入后端的问题
文件：
[src/App.tsx](</c:/Users/kalvi/Documents/claude application/journal-app-claude/src/App.tsx:290>)
[src/App.tsx](</c:/Users/kalvi/Documents/claude application/journal-app-claude/src/App.tsx:330>)
要求：
自动生成 today journal 后，文本、语音、图片相关数据必须持久化到后端。
刷新或重开应用后，这条自动生成的记录仍能从后端加载出来。

- [ ] 修复自拍和夜间加餐只更新前端状态、不写回后端的问题
文件：
[src/App.tsx](</c:/Users/kalvi/Documents/claude application/journal-app-claude/src/App.tsx:234>)
[src/App.tsx](</c:/Users/kalvi/Documents/claude application/journal-app-claude/src/App.tsx:371>)
要求：
晨间自拍、夜间自拍、后续媒体补全完成后，必须同步保存回后端。
刷新后这些字段不能丢失。

---

## P1 - 数据一致性

- [ ] 明确并实现 daily summary 的持久化策略
文件：
[src/App.tsx](</c:/Users/kalvi/Documents/claude application/journal-app-claude/src/App.tsx:384>)
[src/services/journalAggregation.ts](</c:/Users/kalvi/Documents/claude application/journal-app-claude/src/services/journalAggregation.ts:73>)
要求：
二选一并统一落地：
1. 后端只存 entry，前端每次加载后重建 summary
2. 后端同时存 entry 和 summary
不能出现前端内存里有 summary、后端实际没有 summary 的状态。

- [ ] 修复后端保存失败时 fallback 使用旧闭包数据的问题
文件：
[src/App.tsx](</c:/Users/kalvi/Documents/claude application/journal-app-claude/src/App.tsx:397>)
要求：
后端保存失败时，`saveJournals(...)` 必须写入“最新 merged 后”的 journals，而不是旧的 `journals` 快照。
避免用户以为保存成功，重开应用却丢记录。

- [ ] 移除真实运行时对 `mockJournals` 的产品回退依赖
文件：
[src/services/memory.ts](</c:/Users/kalvi/Documents/claude application/journal-app-claude/src/services/memory.ts:207>)
[src/services/memory.ts](</c:/Users/kalvi/Documents/claude application/journal-app-claude/src/services/memory.ts:224>)
要求：
后端无数据且本地无数据时，应返回空状态或引导页，而不是回退到 mock 数据。
mock 数据只能用于开发/测试，不应混入真实用户态。

---

## P2 - 媒体长期可用性

- [ ] 核实并补齐语音持久化主链路
文件：
[backend/src/index.ts](</c:/Users/kalvi/Documents/claude application/journal-app-claude/backend/src/index.ts:417>)
[src/services/minimax.ts](</c:/Users/kalvi/Documents/claude application/journal-app-claude/src/services/minimax.ts:246>)
要求：
语音无论来自任务系统还是 fallback，都要最终落为稳定后端 URL。
重开应用后仍可播放，不能依赖只在当前会话中存在的临时数据。

- [ ] 核实并补齐图片持久化主链路
文件：
[src/services/minimax.ts](</c:/Users/kalvi/Documents/claude application/journal-app-claude/src/services/minimax.ts:79>)
[backend/src/index.ts](</c:/Users/kalvi/Documents/claude application/journal-app-claude/backend/src/index.ts:483>)
要求：
图片无论来自哪条生成路径，都要转成稳定后端 URL。
不能因为任务路径或临时 URL 差异而导致刷新后失效。

---

## 验收标准

- [ ] “请她写”输入 `sceneHint` 后，生成的文案明显受场景影响
- [ ] “请她写”输入不同 `sceneHint` 后，配图随之变化
- [ ] Chrome 与 VS Code 内置浏览器打开同一地址时，看到同一份后端数据
- [ ] 重开应用后，前几天的手账仍然存在
- [ ] 重开应用后，语音仍可播放
- [ ] 重开应用后，图片仍可显示
- [ ] 自动生成的今日日记不会只存在于当前前端会话
- [ ] 自拍、夜间加餐、汇总数据刷新后不丢失

---

## 建议执行顺序

1. 修 `media_generation` 主路径协议
2. 补 `sceneHint` 在任务系统主路径中的传递
3. 补自动生成/自拍/夜间加餐的后端持久化
4. 明确并实现 summary 持久化策略
5. 修 fallback 保存旧数据问题
6. 去掉产品运行时 `mockJournals` 回退
7. 统一验证图片和语音长期可用性
