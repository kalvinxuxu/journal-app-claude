# Phase 2 Core Pages Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the core user-facing pages of 女友手账 from the current web prototype into the new Expo mobile app: Home, Write, Voice, and Settings, with shared types, minimal backend wiring, and mobile-native navigation.

**Architecture:** Keep the existing web app untouched as a reference implementation. Rebuild the page layer in `mobile-app/` using React Native components and Expo Router, while reusing business contracts and selected pure logic from the current project. Persist mobile state locally first, then call the existing backend only where already stable.

**Tech Stack:** Expo, React Native, TypeScript, Expo Router, TanStack Query, Zustand, AsyncStorage, React Hook Form, existing Express backend

---

## Scope

This plan covers only the first core UX migration:

- Home page migration
- Write page migration
- Voice page migration
- Settings page migration
- shared mobile types and local persistence
- minimal backend health / content-generation connectivity where safe

This plan intentionally excludes:

- image picker and selfie generation migration
- voice recording implementation
- push notifications
- full media generation task orchestration
- authentication

## File Structure

### Existing files to reuse as reference

- Read/Reference: `src/types/journal.ts`
- Read/Reference: `src/pages/HomePage.tsx`
- Read/Reference: `src/pages/WritePage.tsx`
- Read/Reference: `src/pages/VoicePage.tsx`
- Read/Reference: `src/pages/SettingsPage.tsx`
- Read/Reference: `src/services/journalGeneration.ts`
- Read/Reference: `src/services/memory.ts`
- Read/Reference: `src/services/api/contentClient.ts`

### New mobile files

- Create: `mobile-app/src/types/journal.ts`
- Create: `mobile-app/src/utils/date.ts`
- Create: `mobile-app/src/store/journalStore.ts`
- Create: `mobile-app/src/services/storage/journalStorage.ts`
- Create: `mobile-app/src/services/api/contentClient.ts`
- Create: `mobile-app/src/hooks/useJournalBootstrap.ts`
- Create: `mobile-app/src/components/journal/JournalCard.tsx`
- Create: `mobile-app/src/components/journal/JournalList.tsx`
- Create: `mobile-app/src/components/journal/MoodChip.tsx`
- Create: `mobile-app/src/components/voice/VoiceTranscriptCard.tsx`
- Create: `mobile-app/app/journal/[id].tsx`
- Modify: `mobile-app/app/index.tsx`
- Modify: `mobile-app/app/write.tsx`
- Modify: `mobile-app/app/voice.tsx`
- Modify: `mobile-app/app/settings.tsx`

### New mobile tests

- Create: `mobile-app/src/store/journalStore.test.ts`
- Create: `mobile-app/src/services/storage/journalStorage.test.ts`
- Create: `mobile-app/src/services/api/contentClient.test.ts`

### New docs

- Create: `docs/mobile-phase-2-core-pages.md`

## Task 1: Mirror the shared journal contract into mobile-app

**Files:**
- Create: `mobile-app/src/types/journal.ts`
- Create: `mobile-app/src/utils/date.ts`

- [ ] **Step 1: Copy the journal domain types into the mobile workspace**

Create `mobile-app/src/types/journal.ts`:

```ts
export type Mood = "开心" | "想念" | "感动" | "平静" | "调皮";

export type VoiceTiming = "morning" | "afternoon" | "night";

export type VoiceMessage = {
  id: string;
  timing: VoiceTiming;
  transcript: string;
  duration: string;
  audioUrl?: string;
};

export type JournalSource = "user" | "girlfriend";

export type JournalStatus = "idle" | "loading" | "ready" | "error";

export type Journal = {
  id: string;
  date: string;
  weekday: string;
  mood: Mood;
  source: JournalSource;
  content: string;
  isDailySummary?: boolean;
  aggregateJournalId?: string;
  entryIds?: string[];
  createdAt?: string;
  updatedAt?: string;
  images?: string[];
  selfies?: string[];
  nightBonusSelfie?: string;
  referenceImage?: string;
  voiceMessages: VoiceMessage[];
  voiceStyle?: "soft" | "warm" | "playful";
  ttsStatus?: JournalStatus;
  selfieStatus?: JournalStatus;
};

export type Preferences = {
  reminderTime: string;
  voiceStyle: "soft" | "warm" | "playful";
  exportMode: "pdf" | "image" | "none";
};
```

- [ ] **Step 2: Add minimal mobile date helpers**

Create `mobile-app/src/utils/date.ts`:

```ts
export function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

export function getWeekday(dateStr: string) {
  const date = new Date(`${dateStr}T12:00:00`);
  return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][date.getDay()];
}

export function formatDisplayDate(dateStr: string) {
  const date = new Date(`${dateStr}T12:00:00`);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}
```

- [ ] **Step 3: Typecheck the mobile workspace**

Run:

```bash
cd "c:\Users\kalvi\Documents\claude application\journal-app-claude\mobile-app"
npm run typecheck
```

Expected:

```text
TypeScript exits with code 0
```

- [ ] **Step 4: Commit**

```bash
git add mobile-app/src/types/journal.ts mobile-app/src/utils/date.ts
git commit -m "feat: add mobile journal domain contract"
```

## Task 2: Add local journal persistence and bootstrap state

**Files:**
- Create: `mobile-app/src/services/storage/journalStorage.ts`
- Create: `mobile-app/src/store/journalStore.ts`
- Create: `mobile-app/src/hooks/useJournalBootstrap.ts`
- Create: `mobile-app/src/store/journalStore.test.ts`
- Create: `mobile-app/src/services/storage/journalStorage.test.ts`

- [ ] **Step 1: Write the storage test**

Create `mobile-app/src/services/storage/journalStorage.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { emptyJournalState } from "./journalStorage";

describe("emptyJournalState", () => {
  it("returns a stable initial state", () => {
    expect(emptyJournalState()).toEqual({
      journals: [],
      selectedJournalId: null,
      preferences: {
        reminderTime: "21:30",
        voiceStyle: "soft",
        exportMode: "pdf",
      },
    });
  });
});
```

- [ ] **Step 2: Write the store test**

Create `mobile-app/src/store/journalStore.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createJournalDraft } from "./journalStore";

describe("createJournalDraft", () => {
  it("creates a user journal with empty media arrays", () => {
    const journal = createJournalDraft("2026-05-18", "开心", "测试内容");

    expect(journal.source).toBe("user");
    expect(journal.images).toEqual([]);
    expect(journal.voiceMessages).toEqual([]);
  });
});
```

- [ ] **Step 3: Add the storage implementation**

Create `mobile-app/src/services/storage/journalStorage.ts`:

```ts
import type { Journal, Preferences } from "@/src/types/journal";

export type JournalStateSnapshot = {
  journals: Journal[];
  selectedJournalId: string | null;
  preferences: Preferences;
};

export function emptyJournalState(): JournalStateSnapshot {
  return {
    journals: [],
    selectedJournalId: null,
    preferences: {
      reminderTime: "21:30",
      voiceStyle: "soft",
      exportMode: "pdf",
    },
  };
}
```

- [ ] **Step 4: Add the store implementation**

Create `mobile-app/src/store/journalStore.ts`:

```ts
import { create } from "zustand";
import type { Journal, Mood, Preferences } from "@/src/types/journal";
import { getWeekday } from "@/src/utils/date";

type JournalStore = {
  journals: Journal[];
  selectedJournalId: string | null;
  preferences: Preferences;
  setJournals: (journals: Journal[]) => void;
  selectJournal: (id: string | null) => void;
  setPreferences: (preferences: Preferences) => void;
  saveJournal: (journal: Journal) => void;
};

export function createJournalDraft(date: string, mood: Mood, content: string): Journal {
  return {
    id: `journal-${date}`,
    date,
    weekday: getWeekday(date),
    mood,
    source: "user",
    content,
    images: [],
    voiceMessages: [],
  };
}

export const useJournalStore = create<JournalStore>((set) => ({
  journals: [],
  selectedJournalId: null,
  preferences: {
    reminderTime: "21:30",
    voiceStyle: "soft",
    exportMode: "pdf",
  },
  setJournals: (journals) => set({ journals }),
  selectJournal: (selectedJournalId) => set({ selectedJournalId }),
  setPreferences: (preferences) => set({ preferences }),
  saveJournal: (journal) =>
    set((state) => {
      const existing = state.journals.findIndex((item) => item.id === journal.id);
      if (existing === -1) {
        return {
          journals: [journal, ...state.journals],
          selectedJournalId: journal.id,
        };
      }
      const next = [...state.journals];
      next[existing] = journal;
      return {
        journals: next,
        selectedJournalId: journal.id,
      };
    }),
}));
```

- [ ] **Step 5: Add a bootstrap hook**

Create `mobile-app/src/hooks/useJournalBootstrap.ts`:

```ts
import { useEffect } from "react";
import { useJournalStore } from "@/src/store/journalStore";

export function useJournalBootstrap() {
  const journals = useJournalStore((state) => state.journals);

  useEffect(() => {
    void journals;
  }, [journals]);
}
```

- [ ] **Step 6: Run the tests**

Run:

```bash
cd "c:\Users\kalvi\Documents\claude application\journal-app-claude\mobile-app"
npm run test
```

Expected:

```text
The new store and storage tests pass
```

- [ ] **Step 7: Commit**

```bash
git add mobile-app/src/services/storage/journalStorage.ts mobile-app/src/store/journalStore.ts mobile-app/src/hooks/useJournalBootstrap.ts mobile-app/src/store/journalStore.test.ts mobile-app/src/services/storage/journalStorage.test.ts
git commit -m "feat: add mobile journal local state foundation"
```

## Task 3: Migrate the Home page into a mobile-native list flow

**Files:**
- Create: `mobile-app/src/components/journal/JournalCard.tsx`
- Create: `mobile-app/src/components/journal/JournalList.tsx`
- Modify: `mobile-app/app/index.tsx`
- Create: `mobile-app/app/journal/[id].tsx`

- [ ] **Step 1: Create the journal card**

Create `mobile-app/src/components/journal/JournalCard.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Journal } from "@/src/types/journal";
import { formatDisplayDate } from "@/src/utils/date";

type JournalCardProps = {
  journal: Journal;
  selected?: boolean;
  onPress: () => void;
};

export function JournalCard({ journal, selected, onPress }: JournalCardProps) {
  return (
    <Pressable onPress={onPress} style={[styles.card, selected && styles.selected]}>
      <View style={styles.row}>
        <Text style={styles.date}>{formatDisplayDate(journal.date)}</Text>
        <Text style={styles.mood}>{journal.mood}</Text>
      </View>
      <Text numberOfLines={3} style={styles.content}>
        {journal.content}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f0dfd9",
  },
  selected: {
    borderColor: "#e89cae",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  date: {
    fontSize: 13,
    color: "#7a7067",
  },
  mood: {
    fontSize: 13,
    color: "#b86479",
  },
  content: {
    fontSize: 15,
    color: "#2e2a27",
    lineHeight: 22,
  },
});
```

- [ ] **Step 2: Create the list component**

Create `mobile-app/src/components/journal/JournalList.tsx`:

```tsx
import { FlatList } from "react-native";
import { JournalCard } from "./JournalCard";
import type { Journal } from "@/src/types/journal";

type JournalListProps = {
  journals: Journal[];
  selectedJournalId: string | null;
  onPressJournal: (id: string) => void;
};

export function JournalList({ journals, selectedJournalId, onPressJournal }: JournalListProps) {
  return (
    <FlatList
      data={journals}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <JournalCard
          journal={item}
          selected={item.id === selectedJournalId}
          onPress={() => onPressJournal(item.id)}
        />
      )}
    />
  );
}
```

- [ ] **Step 3: Replace the placeholder home screen**

Update `mobile-app/app/index.tsx` to:

```tsx
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@/src/components/Screen";
import { JournalList } from "@/src/components/journal/JournalList";
import { useJournalStore } from "@/src/store/journalStore";

export default function HomeScreen() {
  const journals = useJournalStore((state) => state.journals);
  const selectedJournalId = useJournalStore((state) => state.selectedJournalId);
  const selectJournal = useJournalStore((state) => state.selectJournal);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>女友手账</Text>
        <Text style={styles.subtitle}>今天也记录一点温柔吧</Text>
      </View>
      <JournalList
        journals={journals}
        selectedJournalId={selectedJournalId}
        onPressJournal={(id) => {
          selectJournal(id);
          router.push(`/journal/${id}`);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2e2a27",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#7a7067",
  },
});
```

- [ ] **Step 4: Add the journal detail page**

Create `mobile-app/app/journal/[id].tsx`:

```tsx
import { useLocalSearchParams, router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import { Screen } from "@/src/components/Screen";
import { useJournalStore } from "@/src/store/journalStore";

export default function JournalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const journal = useJournalStore((state) => state.journals.find((item) => item.id === id));

  if (!journal) {
    return (
      <Screen>
        <Text>Journal not found</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>返回</Text>
      </Pressable>
      <Text style={styles.title}>{journal.mood}</Text>
      <Text style={styles.date}>{journal.date}</Text>
      <Text style={styles.content}>{journal.content}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    color: "#b86479",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2e2a27",
  },
  date: {
    marginTop: 8,
    marginBottom: 16,
    color: "#7a7067",
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    color: "#2e2a27",
  },
});
```

- [ ] **Step 5: Verify the home flow**

Run:

```bash
cd "c:\Users\kalvi\Documents\claude application\journal-app-claude\mobile-app"
npm run start
```

Expected:

```text
Home screen loads, can tap a journal card, and detail page opens
```

- [ ] **Step 6: Commit**

```bash
git add mobile-app/src/components/journal mobile-app/app/index.tsx mobile-app/app/journal/[id].tsx
git commit -m "feat: migrate mobile home and journal detail flow"
```

## Task 4: Migrate the Write page into a native compose flow

**Files:**
- Create: `mobile-app/src/components/journal/MoodChip.tsx`
- Create: `mobile-app/src/services/api/contentClient.ts`
- Create: `mobile-app/src/services/api/contentClient.test.ts`
- Modify: `mobile-app/app/write.tsx`

- [ ] **Step 1: Write the content client test**

Create `mobile-app/src/services/api/contentClient.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { requestJournalDraft } from "./contentClient";

describe("requestJournalDraft", () => {
  it("maps backend output into the mobile draft shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          journalContent: "今天很开心",
          voiceScripts: [],
        }),
      }),
    );

    await expect(
      requestJournalDraft({
        mood: "开心",
        date: "2026-05-18",
      }),
    ).resolves.toEqual({
      content: "今天很开心",
      voiceMessages: [],
    });
  });
});
```

- [ ] **Step 2: Add the API client**

Create `mobile-app/src/services/api/contentClient.ts`:

```ts
import { getApiBaseUrl } from "./client";
import type { Mood, VoiceMessage } from "@/src/types/journal";

export async function requestJournalDraft(input: {
  mood: Mood;
  date: string;
  voiceStyle?: "soft" | "warm" | "playful";
}): Promise<{ content: string; voiceMessages: VoiceMessage[] }> {
  const response = await fetch(`${getApiBaseUrl()}/api/content-generation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`content-generation failed: ${response.status}`);
  }

  const payload = await response.json();
  return {
    content: payload.journalContent,
    voiceMessages: payload.voiceScripts ?? [],
  };
}
```

- [ ] **Step 3: Add the mood chip component**

Create `mobile-app/src/components/journal/MoodChip.tsx`:

```tsx
import { Pressable, StyleSheet, Text } from "react-native";
import type { Mood } from "@/src/types/journal";

type MoodChipProps = {
  mood: Mood;
  active: boolean;
  onPress: () => void;
};

export function MoodChip({ mood, active, onPress }: MoodChipProps) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.active]}>
      <Text style={[styles.label, active && styles.activeLabel]}>{mood}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#f0dfd9",
    marginRight: 10,
    marginBottom: 10,
  },
  active: {
    backgroundColor: "#fce5ea",
    borderColor: "#e89cae",
  },
  label: {
    color: "#7a7067",
  },
  activeLabel: {
    color: "#b86479",
    fontWeight: "600",
  },
});
```

- [ ] **Step 4: Replace the write placeholder**

Update `mobile-app/app/write.tsx` to:

```tsx
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/src/components/Screen";
import { MoodChip } from "@/src/components/journal/MoodChip";
import { createJournalDraft, useJournalStore } from "@/src/store/journalStore";
import { getTodayString } from "@/src/utils/date";
import type { Mood } from "@/src/types/journal";

const moods: Mood[] = ["开心", "想念", "感动", "平静", "调皮"];

export default function WriteScreen() {
  const [date] = useState(getTodayString());
  const [mood, setMood] = useState<Mood>("开心");
  const [content, setContent] = useState("");
  const saveJournal = useJournalStore((state) => state.saveJournal);

  return (
    <Screen>
      <ScrollView>
        <Text style={styles.title}>写一篇新的手账</Text>
        <View style={styles.moodRow}>
          {moods.map((item) => (
            <MoodChip key={item} mood={item} active={item === mood} onPress={() => setMood(item)} />
          ))}
        </View>
        <TextInput
          multiline
          value={content}
          onChangeText={setContent}
          placeholder="把今天的心情写下来"
          style={styles.input}
        />
        <Pressable
          style={styles.button}
          onPress={() => {
            const journal = createJournalDraft(date, mood, content);
            saveJournal(journal);
            router.replace(`/journal/${journal.id}`);
          }}
        >
          <Text style={styles.buttonText}>保存手账</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2e2a27",
    marginBottom: 16,
  },
  moodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  input: {
    minHeight: 220,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f0dfd9",
    padding: 16,
    backgroundColor: "#ffffff",
    textAlignVertical: "top",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#e89cae",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
});
```

- [ ] **Step 5: Run the tests**

Run:

```bash
cd "c:\Users\kalvi\Documents\claude application\journal-app-claude\mobile-app"
npm run test
```

Expected:

```text
The content client test passes
```

- [ ] **Step 6: Commit**

```bash
git add mobile-app/src/components/journal/MoodChip.tsx mobile-app/src/services/api/contentClient.ts mobile-app/src/services/api/contentClient.test.ts mobile-app/app/write.tsx
git commit -m "feat: migrate mobile write page"
```

## Task 5: Migrate the Voice and Settings pages

**Files:**
- Create: `mobile-app/src/components/voice/VoiceTranscriptCard.tsx`
- Modify: `mobile-app/app/voice.tsx`
- Modify: `mobile-app/app/settings.tsx`

- [ ] **Step 1: Create the voice transcript card**

Create `mobile-app/src/components/voice/VoiceTranscriptCard.tsx`:

```tsx
import { StyleSheet, Text, View } from "react-native";
import type { VoiceMessage } from "@/src/types/journal";

export function VoiceTranscriptCard({ message }: { message: VoiceMessage }) {
  return (
    <View style={styles.card}>
      <Text style={styles.timing}>{message.timing}</Text>
      <Text style={styles.transcript}>{message.transcript || "暂无语音稿"}</Text>
      <Text style={styles.duration}>{message.duration}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#f0dfd9",
    padding: 16,
    marginBottom: 12,
  },
  timing: {
    fontWeight: "600",
    color: "#b86479",
    marginBottom: 8,
  },
  transcript: {
    color: "#2e2a27",
    lineHeight: 22,
  },
  duration: {
    marginTop: 8,
    color: "#7a7067",
    fontSize: 12,
  },
});
```

- [ ] **Step 2: Replace the voice placeholder**

Update `mobile-app/app/voice.tsx` to:

```tsx
import { ScrollView, StyleSheet, Text } from "react-native";
import { Screen } from "@/src/components/Screen";
import { VoiceTranscriptCard } from "@/src/components/voice/VoiceTranscriptCard";
import { useJournalStore } from "@/src/store/journalStore";

export default function VoiceScreen() {
  const selectedJournalId = useJournalStore((state) => state.selectedJournalId);
  const journal = useJournalStore((state) =>
    state.journals.find((item) => item.id === selectedJournalId) ?? state.journals[0],
  );

  if (!journal || journal.voiceMessages.length === 0) {
    return (
      <Screen>
        <Text>暂无语音内容，后续可在这里播放和查看语音稿。</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView>
        <Text style={styles.title}>语音页</Text>
        {journal.voiceMessages.map((message) => (
          <VoiceTranscriptCard key={message.id} message={message} />
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2e2a27",
    marginBottom: 16,
  },
});
```

- [ ] **Step 3: Replace the settings placeholder**

Update `mobile-app/app/settings.tsx` to:

```tsx
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/src/components/Screen";
import { useJournalStore } from "@/src/store/journalStore";

export default function SettingsScreen() {
  const preferences = useJournalStore((state) => state.preferences);
  const setPreferences = useJournalStore((state) => state.setPreferences);

  return (
    <Screen>
      <Text style={styles.title}>设置</Text>
      <View style={styles.card}>
        <Text style={styles.label}>语音风格</Text>
        <Text style={styles.value}>{preferences.voiceStyle}</Text>
        <Pressable
          style={styles.button}
          onPress={() =>
            setPreferences({
              ...preferences,
              voiceStyle: preferences.voiceStyle === "soft" ? "warm" : "soft",
            })
          }
        >
          <Text style={styles.buttonText}>切换语音风格</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2e2a27",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#f0dfd9",
    padding: 16,
  },
  label: {
    color: "#7a7067",
    marginBottom: 6,
  },
  value: {
    color: "#2e2a27",
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#e89cae",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
});
```

- [ ] **Step 4: Verify the pages**

Run:

```bash
cd "c:\Users\kalvi\Documents\claude application\journal-app-claude\mobile-app"
npm run start
```

Expected:

```text
Voice and Settings screens render without crashing
```

- [ ] **Step 5: Commit**

```bash
git add mobile-app/src/components/voice/VoiceTranscriptCard.tsx mobile-app/app/voice.tsx mobile-app/app/settings.tsx
git commit -m "feat: migrate mobile voice and settings pages"
```

## Task 6: Document Phase 2 behavior and constraints

**Files:**
- Create: `docs/mobile-phase-2-core-pages.md`

- [ ] **Step 1: Write the phase note**

Create `docs/mobile-phase-2-core-pages.md`:

````md
# Mobile Phase 2 Core Pages

This phase migrates the core mobile shell pages:

- Home
- Journal detail
- Write
- Voice
- Settings

## Included

- local journal state
- native navigation
- simple journal save flow
- settings state

## Not yet included

- image picker
- audio recording
- task orchestration
- push notifications
- backend persistence sync
````

- [ ] **Step 2: Commit**

```bash
git add docs/mobile-phase-2-core-pages.md
git commit -m "docs: add mobile phase 2 page migration notes"
```

## Final Verification

- [ ] **Step 1: Run backend tests**

```bash
cd "c:\Users\kalvi\Documents\claude application\journal-app-claude\backend"
npm run test
```

Expected:

```text
Existing backend tests pass
```

- [ ] **Step 2: Run mobile tests**

```bash
cd "c:\Users\kalvi\Documents\claude application\journal-app-claude\mobile-app"
npm run test
```

Expected:

```text
Mobile tests pass
```

- [ ] **Step 3: Run mobile typecheck**

```bash
cd "c:\Users\kalvi\Documents\claude application\journal-app-claude\mobile-app"
npm run typecheck
```

Expected:

```text
TypeScript exits with code 0
```

- [ ] **Step 4: Boot the Expo app**

```bash
cd "c:\Users\kalvi\Documents\claude application\journal-app-claude\mobile-app"
npm run start
```

Expected:

```text
Home, Write, Voice, Settings, and Journal detail flows all render in Expo
```
