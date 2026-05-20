/**
 * 自拍分享规则服务
 *
 * 定义"主动分享自拍"的触发时机和条件：
 * - morning: 早晨 6-10 点，当日无自拍时生成并附加到日记
 * - night-bonus: 夜间 21 点后，无夜间加餐自拍时生成
 * - thought-of-you: 用户阅读日记时主动推送"想你了"自拍（每天最多1次）
 */

export type SelfieShareType = "morning" | "night-bonus" | "thought-of-you";

const MORNING_START_HOUR = 6;
const MORNING_END_HOUR = 10;
const NIGHT_BONUS_HOUR = 21;
const THOUGHT_OF_YOU_START_HOUR = 6;
const THOUGHT_OF_YOU_END_HOUR = 23;

/**
 * 判断是否应触发早晨自拍
 * 条件：早上 6-10 点 + 当天日记无自拍
 */
export function shouldTriggerMorningSelfie({
  hour,
  hasMorningSelfie,
}: {
  hour: number;
  hasMorningSelfie: boolean;
}): boolean {
  return hour >= MORNING_START_HOUR && hour < MORNING_END_HOUR && !hasMorningSelfie;
}

/**
 * 判断是否应触发夜间加餐自拍
 * 条件：21 点后 + 无夜间加餐自拍
 */
export function shouldTriggerNightBonus({
  hour,
  hasNightBonusSelfie,
}: {
  hour: number;
  hasNightBonusSelfie: boolean;
}): boolean {
  return hour >= NIGHT_BONUS_HOUR && !hasNightBonusSelfie;
}

/**
 * 判断是否应触发"想你了"自拍推送
 * 条件：白天 6-23 点 + 无今日自拍 + 今日未发送过"想你了"
 */
export function shouldTriggerThoughtOfYou({
  hour,
  hasSelfieToday,
  thoughtOfYouSentToday,
}: {
  hour: number;
  hasSelfieToday: boolean;
  thoughtOfYouSentToday: boolean;
}): boolean {
  return (
    hour >= THOUGHT_OF_YOU_START_HOUR &&
    hour < THOUGHT_OF_YOU_END_HOUR &&
    !hasSelfieToday &&
    !thoughtOfYouSentToday
  );
}

/**
 * 获取自拍分享类型标签
 */
export function getSelfieShareType(type: SelfieShareType): SelfieShareType {
  return type;
}

/**
 * 判断给定小时是否在早晨时段
 */
export function isMorningHours(hour: number): boolean {
  return hour >= MORNING_START_HOUR && hour < MORNING_END_HOUR;
}

/**
 * 判断给定小时是否在夜间时段
 */
export function isNightHours(hour: number): boolean {
  return hour >= NIGHT_BONUS_HOUR;
}

/**
 * 判断给定小时是否在"想你了"推送时段
 */
export function isThoughtOfYouHours(hour: number): boolean {
  return hour >= THOUGHT_OF_YOU_START_HOUR && hour < THOUGHT_OF_YOU_END_HOUR;
}