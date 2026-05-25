import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { createOotdStore } from "./ootdStore";

describe("createOotdStore", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.exec("PRAGMA foreign_keys = OFF");
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS daily_ootd (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        image_url TEXT,
        title TEXT NOT NULL,
        caption TEXT,
        rationale TEXT,
        style_tags TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(user_id, date)
      );
    `);
    // Insert the test user before each test
    db.prepare("INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)").run(
      "user1",
      new Date().toISOString(),
      new Date().toISOString(),
    );
  });

  it("upsert and find by user+date", () => {
    const store = createOotdStore(db);
    const now = new Date().toISOString();
    const record = {
      id: "ootd_1",
      userId: "user1",
      date: "2026-05-23",
      imageUrl: "https://example.com/ootd.jpg",
      title: "今日穿搭",
      caption: "这是她今天想穿的",
      rationale: null,
      styleTags: ["温柔", "简约"],
      createdAt: now,
      updatedAt: now,
    };

    store.upsert(record);
    const found = store.findByUserIdAndDate("user1", "2026-05-23");

    expect(found).not.toBeUndefined();
    expect(found?.id).toBe("ootd_1");
    expect(found?.imageUrl).toBe("https://example.com/ootd.jpg");
    expect(found?.title).toBe("今日穿搭");
    expect(found?.caption).toBe("这是她今天想穿的");
    expect(found?.styleTags).toEqual(["温柔", "简约"]);
  });

  it("upsert updates existing record on conflict", () => {
    const store = createOotdStore(db);
    const now = new Date().toISOString();
    const record1 = {
      id: "ootd_1",
      userId: "user1",
      date: "2026-05-23",
      imageUrl: "https://example.com/ootd1.jpg",
      title: "今日穿搭",
      caption: "v1",
      rationale: null,
      styleTags: [],
      createdAt: now,
      updatedAt: now,
    };

    store.upsert(record1);
    const updatedNow = new Date().toISOString();
    const record2 = {
      ...record1,
      imageUrl: "https://example.com/ootd2.jpg",
      caption: "v2 updated",
      updatedAt: updatedNow,
    };

    store.upsert(record2);
    const found = store.findByUserIdAndDate("user1", "2026-05-23");

    expect(found).not.toBeUndefined();
    expect(found?.imageUrl).toBe("https://example.com/ootd2.jpg");
    expect(found?.caption).toBe("v2 updated");
  });

  it("findLatestByUserId returns most recent", () => {
    const store = createOotdStore(db);
    const now = new Date().toISOString();

    store.upsert({
      id: "ootd_1",
      userId: "user1",
      date: "2026-05-21",
      imageUrl: null,
      title: "今日穿搭",
      caption: "day1",
      rationale: null,
      styleTags: [],
      createdAt: now,
      updatedAt: now,
    });
    store.upsert({
      id: "ootd_2",
      userId: "user1",
      date: "2026-05-23",
      imageUrl: null,
      title: "今日穿搭",
      caption: "day3",
      rationale: null,
      styleTags: [],
      createdAt: now,
      updatedAt: now,
    });
    store.upsert({
      id: "ootd_3",
      userId: "user1",
      date: "2026-05-22",
      imageUrl: null,
      title: "今日穿搭",
      caption: "day2",
      rationale: null,
      styleTags: [],
      createdAt: now,
      updatedAt: now,
    });

    const latest = store.findLatestByUserId("user1");
    expect(latest).not.toBeUndefined();
    expect(latest?.date).toBe("2026-05-23");
    expect(latest?.caption).toBe("day3");
  });

  it("listByUserId returns all records for user", () => {
    const store = createOotdStore(db);
    const now = new Date().toISOString();

    for (const date of ["2026-05-20", "2026-05-21", "2026-05-22"]) {
      store.upsert({
        id: `ootd_${date}`,
        userId: "user1",
        date,
        imageUrl: null,
        title: "今日穿搭",
        caption: date,
        rationale: null,
        styleTags: [],
        createdAt: now,
        updatedAt: now,
      });
    }

    const list = store.listByUserId("user1");
    expect(list).toHaveLength(3);
  });

  it("persists dual ootd cards as json and restores them", () => {
    const store = createOotdStore(db);
    const now = new Date().toISOString();
    store.upsert({
      id: "ootd_1",
      userId: "user-1",
      date: "2026-05-25",
      title: "今日穿搭",
      rationale: null,
      styleTags: ["精致穿搭"],
      cards: [
        { id: "card_1", kind: "fullbody_selfie", imageUrl: "https://example.com/1.jpg", caption: "全身自拍" },
        { id: "card_2", kind: "makeup_closeup", imageUrl: "https://example.com/2.jpg", caption: "妆容自拍" },
      ],
      createdAt: now,
      updatedAt: now,
    });

    expect(store.findByUserIdAndDate("user-1", "2026-05-25")?.cards).toHaveLength(2);
  });
});