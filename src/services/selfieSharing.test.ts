import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  shouldTriggerMorningSelfie,
  shouldTriggerNightBonus,
  shouldTriggerThoughtOfYou,
  getSelfieShareType,
  type SelfieShareType,
} from "./selfieSharing";

describe("主动分享自拍规则", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-14T08:00:00")); // 早上8点
  });

  describe("shouldTriggerMorningSelfie", () => {
    it("早上6-10点且当天日记无自拍时应该触发", () => {
      vi.setSystemTime(new Date("2026-05-14T07:30:00")); // 7:30
      expect(shouldTriggerMorningSelfie({
        hour: 7,
        hasMorningSelfie: false,
      })).toBe(true);

      vi.setSystemTime(new Date("2026-05-14T09:59:00")); // 9:59
      expect(shouldTriggerMorningSelfie({
        hour: 9,
        hasMorningSelfie: false,
      })).toBe(true);
    });

    it("早上6-10点但已有早晨自拍时不应触发", () => {
      expect(shouldTriggerMorningSelfie({
        hour: 8,
        hasMorningSelfie: true,
      })).toBe(false);
    });

    it("不在早上6-10点范围内不应触发", () => {
      vi.setSystemTime(new Date("2026-05-14T05:59:00")); // 5:59
      expect(shouldTriggerMorningSelfie({
        hour: 5,
        hasMorningSelfie: false,
      })).toBe(false);

      vi.setSystemTime(new Date("2026-05-14T10:01:00")); // 10:01
      expect(shouldTriggerMorningSelfie({
        hour: 10,
        hasMorningSelfie: false,
      })).toBe(false);

      vi.setSystemTime(new Date("2026-05-14T14:00:00")); // 下午2点
      expect(shouldTriggerMorningSelfie({
        hour: 14,
        hasMorningSelfie: false,
      })).toBe(false);
    });
  });

  describe("shouldTriggerNightBonus", () => {
    it("21点后且无夜间加餐自拍时应触发", () => {
      vi.setSystemTime(new Date("2026-05-14T21:00:00"));
      expect(shouldTriggerNightBonus({
        hour: 21,
        hasNightBonusSelfie: false,
      })).toBe(true);

      vi.setSystemTime(new Date("2026-05-14T22:30:00"));
      expect(shouldTriggerNightBonus({
        hour: 22,
        hasNightBonusSelfie: false,
      })).toBe(true);
    });

    it("21点后但已有夜间加餐自拍时不应触发", () => {
      expect(shouldTriggerNightBonus({
        hour: 22,
        hasNightBonusSelfie: true,
      })).toBe(false);
    });

    it("21点前不应触发夜间加餐", () => {
      vi.setSystemTime(new Date("2026-05-14T20:59:00"));
      expect(shouldTriggerNightBonus({
        hour: 20,
        hasNightBonusSelfie: false,
      })).toBe(false);
    });
  });

  describe("shouldTriggerThoughtOfYou", () => {
    it("白天时段、阅读超过30秒、无今日自拍时应该触发", () => {
      vi.setSystemTime(new Date("2026-05-14T14:00:00")); // 下午2点
      expect(shouldTriggerThoughtOfYou({
        hour: 14,
        hasSelfieToday: false,
        thoughtOfYouSentToday: false,
      })).toBe(true);
    });

    it("已经有今日自拍时不应触发", () => {
      expect(shouldTriggerThoughtOfYou({
        hour: 14,
        hasSelfieToday: true,
        thoughtOfYouSentToday: false,
      })).toBe(false);
    });

    it("今天已发送过想你了自拍时不应触发", () => {
      expect(shouldTriggerThoughtOfYou({
        hour: 14,
        hasSelfieToday: false,
        thoughtOfYouSentToday: true,
      })).toBe(false);
    });

    it("不在白天时段（6-23点）不应触发", () => {
      vi.setSystemTime(new Date("2026-05-14T05:00:00")); // 凌晨5点
      expect(shouldTriggerThoughtOfYou({
        hour: 5,
        hasSelfieToday: false,
        thoughtOfYouSentToday: false,
      })).toBe(false);
    });
  });

  describe("getSelfieShareType", () => {
    it("返回正确的分享类型", () => {
      expect(getSelfieShareType("morning")).toBe("morning");
      expect(getSelfieShareType("night-bonus")).toBe("night-bonus");
      expect(getSelfieShareType("thought-of-you")).toBe("thought-of-you");
    });
  });
});