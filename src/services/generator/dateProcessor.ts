export type DateFeature = {
  type: "weekday" | "weekend" | "holiday" | "anniversary" | "special";
  label: string;
  contentHint?: string;
};

type DateFeatureMap = Record<string, DateFeature>;

const dateFeatureMap: DateFeatureMap = {
  // 节日
  "2026-05-01": { type: "holiday", label: "劳动节", contentHint: "放假的轻松感" },
  "2026-05-20": { type: "anniversary", label: "520", contentHint: "甜蜜的暗示" },
  "2026-06-01": { type: "holiday", label: "儿童节", contentHint: "童心未泯" },
  "2026-07-07": { type: "anniversary", label: "七夕", contentHint: "浪漫的时刻" },
  "2027-01-01": { type: "holiday", label: "元旦", contentHint: "新年的开始" },
  "2027-02-14": { type: "anniversary", label: "情人节", contentHint: "爱意满满" },
};

function getDayOfWeek(dateStr: string): number {
  const date = new Date(dateStr);
  return date.getDay();
}

export function detectDateFeature(dateStr: string): DateFeature | null {
  // 检查固定节日/纪念日
  if (dateFeatureMap[dateStr]) {
    return dateFeatureMap[dateStr];
  }

  // 检查星期几
  const dayOfWeek = getDayOfWeek(dateStr);

  if (dayOfWeek === 0) {
    return { type: "weekend", label: "周日" };
  }
  if (dayOfWeek === 6) {
    return { type: "weekend", label: "周六" };
  }
  if (dayOfWeek === 1) {
    return { type: "weekday", label: "周一", contentHint: "新一周的开始" };
  }

  return null;
}

export function getDateLabel(dateStr: string): string {
  const feature = detectDateFeature(dateStr);
  return feature?.label ?? "";
}