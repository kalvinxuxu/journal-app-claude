const weekdayMap = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export function formatDate(dateInput: string) {
  const date = new Date(dateInput);
  const month = `${date.getMonth() + 1}月`;
  const day = `${date.getDate()}日`;
  const weekday = weekdayMap[date.getDay()];

  return {
    month,
    day,
    weekday,
    display: `${month}${day} ${weekday}`,
  };
}
