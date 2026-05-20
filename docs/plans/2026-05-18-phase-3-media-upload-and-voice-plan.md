# Phase 3 Media, Voice, And Upload Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add native mobile media capabilities to the Expo app: image selection, camera capture, audio recording/playback, and upload/persistence plumbing that integrates with the existing backend media endpoints.

**Architecture:** Keep backend media endpoints as the first integration target. Implement native media acquisition in `mobile-app/` using Expo modules, convert captured assets into uploadable payloads, persist them through the existing Express media APIs, and update the local journal store with returned media URLs.

**Tech Stack:** Expo, React Native, Expo Image Picker, Expo AV, Expo FileSystem, TypeScript, Zustand, existing Express backend media endpoints

---

## Scope

This plan covers only mobile media enablement:

- image picker integration
- camera capture integration
- mobile image preview and remove flow
- audio recording integration
- audio playback integration
- upload client for backend media endpoints
- journal media persistence into local mobile state

This plan intentionally excludes:

- push notifications
- background uploads
- full task orchestration migration
- AI selfie generation UX
- offline media sync conflict resolution

## File Structure

### Existing files to reuse as reference

- Read/Reference: `src/components/ImageUploader.tsx`
- Read/Reference: `src/components/VoicePlayer.tsx`
- Read/Reference: `src/services/api/mediaClient.ts`
- Read/Reference: `backend/src/index.ts`
- Read/Reference: `backend/src/storage/mediaStore.ts`

### New mobile files

- Create: `mobile-app/src/services/media/imagePicker.ts`
- Create: `mobile-app/src/services/media/audioRecorder.ts`
- Create: `mobile-app/src/services/media/audioPlayer.ts`
- Create: `mobile-app/src/services/api/mediaClient.ts`
- Create: `mobile-app/src/utils/file.ts`
- Create: `mobile-app/src/components/media/ImagePickerField.tsx`
- Create: `mobile-app/src/components/media/ImagePreviewGrid.tsx`
- Create: `mobile-app/src/components/media/AudioRecorderField.tsx`
- Create: `mobile-app/src/components/media/AudioPlayerCard.tsx`
- Create: `mobile-app/src/components/media/PermissionNotice.tsx`
- Modify: `mobile-app/app/write.tsx`
- Modify: `mobile-app/app/voice.tsx`
- Modify: `mobile-app/src/store/journalStore.ts`

### New tests

- Create: `mobile-app/src/services/api/mediaClient.test.ts`
- Create: `mobile-app/src/services/media/imagePicker.test.ts`
- Create: `mobile-app/src/services/media/audioRecorder.test.ts`

### New docs

- Create: `docs/mobile-phase-3-media.md`

## Task 1: Add a mobile media API client

**Files:**
- Create: `mobile-app/src/services/api/mediaClient.ts`
- Create: `mobile-app/src/utils/file.ts`
- Create: `mobile-app/src/services/api/mediaClient.test.ts`

- [ ] **Step 1: Write the media client test**

Create `mobile-app/src/services/api/mediaClient.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { uploadImageDataUrl } from "./mediaClient";

describe("uploadImageDataUrl", () => {
  it("returns the backend media url", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ url: "/media/images/demo.jpg" }),
      }),
    );

    await expect(uploadImageDataUrl("data:image/jpeg;base64,abcd")).resolves.toBe("/media/images/demo.jpg");
  });
});
```

- [ ] **Step 2: Add a lightweight file helper**

Create `mobile-app/src/utils/file.ts`:

```ts
export function ensureDataUrlPrefix(base64: string, mimeType: string) {
  if (base64.startsWith("data:")) return base64;
  return `data:${mimeType};base64,${base64}`;
}
```

- [ ] **Step 3: Add the mobile media client**

Create `mobile-app/src/services/api/mediaClient.ts`:

```ts
import { getApiBaseUrl } from "@/src/services/api/client";

export async function uploadImageDataUrl(imageData: string): Promise<string> {
  const response = await fetch(`${getApiBaseUrl()}/api/media/images`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ imageData }),
  });

  if (!response.ok) {
    throw new Error(`image upload failed: ${response.status}`);
  }

  const payload = await response.json();
  return payload.url;
}

export async function uploadAudioDataUrl(audioData: string): Promise<string> {
  const response = await fetch(`${getApiBaseUrl()}/api/media/audio`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ audioData }),
  });

  if (!response.ok) {
    throw new Error(`audio upload failed: ${response.status}`);
  }

  const payload = await response.json();
  return payload.url;
}
```

- [ ] **Step 4: Run the test**

Run:

```bash
cd "c:\Users\kalvi\Documents\claude application\journal-app-claude\mobile-app"
npm run test
```

Expected:

```text
The media client test passes
```

- [ ] **Step 5: Commit**

```bash
git add mobile-app/src/services/api/mediaClient.ts mobile-app/src/services/api/mediaClient.test.ts mobile-app/src/utils/file.ts
git commit -m "feat: add mobile media api client"
```

## Task 2: Add image picker and camera integration

**Files:**
- Create: `mobile-app/src/services/media/imagePicker.ts`
- Create: `mobile-app/src/components/media/ImagePickerField.tsx`
- Create: `mobile-app/src/components/media/ImagePreviewGrid.tsx`
- Create: `mobile-app/src/components/media/PermissionNotice.tsx`
- Create: `mobile-app/src/services/media/imagePicker.test.ts`

- [ ] **Step 1: Write the image picker contract test**

Create `mobile-app/src/services/media/imagePicker.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizeImageAsset } from "./imagePicker";

describe("normalizeImageAsset", () => {
  it("maps image metadata into a stable shape", () => {
    expect(
      normalizeImageAsset({
        uri: "file:///tmp/demo.jpg",
        mimeType: "image/jpeg",
        fileName: "demo.jpg",
      }),
    ).toEqual({
      uri: "file:///tmp/demo.jpg",
      mimeType: "image/jpeg",
      fileName: "demo.jpg",
    });
  });
});
```

- [ ] **Step 2: Add the image picker service**

Create `mobile-app/src/services/media/imagePicker.ts`:

```ts
export type MobileImageAsset = {
  uri: string;
  mimeType: string;
  fileName: string;
};

export function normalizeImageAsset(asset: {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
}): MobileImageAsset {
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? "image/jpeg",
    fileName: asset.fileName ?? "image.jpg",
  };
}
```

- [ ] **Step 3: Add image picker UI components**

Create `mobile-app/src/components/media/PermissionNotice.tsx`:

```tsx
import { StyleSheet, Text, View } from "react-native";

export function PermissionNotice({ text }: { text: string }) {
  return (
    <View style={styles.box}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fff2e8",
    marginBottom: 12,
  },
  text: {
    color: "#8c5a2b",
  },
});
```

Create `mobile-app/src/components/media/ImagePreviewGrid.tsx`:

```tsx
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

export function ImagePreviewGrid({
  images,
  onRemove,
}: {
  images: string[];
  onRemove: (index: number) => void;
}) {
  return (
    <View style={styles.grid}>
      {images.map((image, index) => (
        <View key={`${image}-${index}`} style={styles.tile}>
          <Image source={{ uri: image }} style={styles.image} />
          <Pressable onPress={() => onRemove(index)}>
            <Text style={styles.remove}>删除</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  tile: {
    width: 100,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginBottom: 6,
  },
  remove: {
    color: "#b86479",
    textAlign: "center",
  },
});
```

Create `mobile-app/src/components/media/ImagePickerField.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ImagePreviewGrid } from "./ImagePreviewGrid";

export function ImagePickerField({
  images,
  onAddFromLibrary,
  onAddFromCamera,
  onRemove,
}: {
  images: string[];
  onAddFromLibrary: () => void;
  onAddFromCamera: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <View>
      <View style={styles.actions}>
        <Pressable style={styles.button} onPress={onAddFromLibrary}>
          <Text style={styles.buttonText}>从相册选择</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={onAddFromCamera}>
          <Text style={styles.buttonText}>拍照</Text>
        </Pressable>
      </View>
      <ImagePreviewGrid images={images} onRemove={onRemove} />
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#fce5ea",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: "#b86479",
    fontWeight: "600",
  },
});
```

- [ ] **Step 4: Run the tests**

Run:

```bash
cd "c:\Users\kalvi\Documents\claude application\journal-app-claude\mobile-app"
npm run test
```

Expected:

```text
The image picker test passes
```

- [ ] **Step 5: Commit**

```bash
git add mobile-app/src/services/media/imagePicker.ts mobile-app/src/services/media/imagePicker.test.ts mobile-app/src/components/media/ImagePickerField.tsx mobile-app/src/components/media/ImagePreviewGrid.tsx mobile-app/src/components/media/PermissionNotice.tsx
git commit -m "feat: add mobile image picker components"
```

## Task 3: Add audio recording and playback services

**Files:**
- Create: `mobile-app/src/services/media/audioRecorder.ts`
- Create: `mobile-app/src/services/media/audioPlayer.ts`
- Create: `mobile-app/src/services/media/audioRecorder.test.ts`
- Create: `mobile-app/src/components/media/AudioRecorderField.tsx`
- Create: `mobile-app/src/components/media/AudioPlayerCard.tsx`

- [ ] **Step 1: Write the audio recorder contract test**

Create `mobile-app/src/services/media/audioRecorder.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizeAudioRecording } from "./audioRecorder";

describe("normalizeAudioRecording", () => {
  it("keeps the file uri and default mime type", () => {
    expect(normalizeAudioRecording("file:///tmp/demo.m4a")).toEqual({
      uri: "file:///tmp/demo.m4a",
      mimeType: "audio/m4a",
    });
  });
});
```

- [ ] **Step 2: Add audio services**

Create `mobile-app/src/services/media/audioRecorder.ts`:

```ts
export function normalizeAudioRecording(uri: string) {
  return {
    uri,
    mimeType: "audio/m4a",
  };
}
```

Create `mobile-app/src/services/media/audioPlayer.ts`:

```ts
export type MobileAudioTrack = {
  url: string;
  transcript: string;
  duration: string;
};
```

- [ ] **Step 3: Add audio UI components**

Create `mobile-app/src/components/media/AudioRecorderField.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from "react-native";

export function AudioRecorderField({
  isRecording,
  onStart,
  onStop,
}: {
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  return (
    <View>
      <Pressable style={styles.button} onPress={isRecording ? onStop : onStart}>
        <Text style={styles.text}>{isRecording ? "停止录音" : "开始录音"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#e89cae",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  text: {
    color: "#ffffff",
    fontWeight: "600",
  },
});
```

Create `mobile-app/src/components/media/AudioPlayerCard.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { MobileAudioTrack } from "@/src/services/media/audioPlayer";

export function AudioPlayerCard({
  track,
  onPlay,
}: {
  track: MobileAudioTrack;
  onPlay: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.transcript}>{track.transcript || "暂无语音稿"}</Text>
      <Text style={styles.duration}>{track.duration}</Text>
      <Pressable style={styles.button} onPress={onPlay}>
        <Text style={styles.buttonText}>播放</Text>
      </Pressable>
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
  transcript: {
    color: "#2e2a27",
    lineHeight: 22,
  },
  duration: {
    color: "#7a7067",
    marginTop: 8,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#fce5ea",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#b86479",
    fontWeight: "600",
  },
});
```

- [ ] **Step 4: Run the tests**

Run:

```bash
cd "c:\Users\kalvi\Documents\claude application\journal-app-claude\mobile-app"
npm run test
```

Expected:

```text
The audio recorder test passes
```

- [ ] **Step 5: Commit**

```bash
git add mobile-app/src/services/media/audioRecorder.ts mobile-app/src/services/media/audioRecorder.test.ts mobile-app/src/services/media/audioPlayer.ts mobile-app/src/components/media/AudioRecorderField.tsx mobile-app/src/components/media/AudioPlayerCard.tsx
git commit -m "feat: add mobile audio recorder and player contracts"
```

## Task 4: Wire image and audio into the Write page

**Files:**
- Modify: `mobile-app/app/write.tsx`
- Modify: `mobile-app/src/store/journalStore.ts`

- [ ] **Step 1: Extend the journal store save path to preserve media**

Update `mobile-app/src/store/journalStore.ts` so `createJournalDraft(...)` accepts optional media:

```ts
export function createJournalDraft(
  date: string,
  mood: Mood,
  content: string,
  options?: { images?: string[]; voiceMessages?: Journal["voiceMessages"] },
): Journal {
  return {
    id: `journal-${date}`,
    date,
    weekday: getWeekday(date),
    mood,
    source: "user",
    content,
    images: options?.images ?? [],
    voiceMessages: options?.voiceMessages ?? [],
  };
}
```

- [ ] **Step 2: Add temporary local image/audio state to the write page**

Update `mobile-app/app/write.tsx` with these state additions:

```tsx
const [images, setImages] = useState<string[]>([]);
const [voiceMessages, setVoiceMessages] = useState<Journal["voiceMessages"]>([]);
const [isRecording, setIsRecording] = useState(false);
```

- [ ] **Step 3: Render the media controls in the write page**

Inside `mobile-app/app/write.tsx`, render:

```tsx
<ImagePickerField
  images={images}
  onAddFromLibrary={() => {}}
  onAddFromCamera={() => {}}
  onRemove={(index) => setImages((current) => current.filter((_, i) => i !== index))}
/>

<AudioRecorderField
  isRecording={isRecording}
  onStart={() => setIsRecording(true)}
  onStop={() => setIsRecording(false)}
/>
```

This step is allowed to keep acquisition handlers as no-op placeholders until Expo module wiring is added in the next step.

- [ ] **Step 4: Save journals with attached media**

Change the save action to:

```tsx
const journal = createJournalDraft(date, mood, content, {
  images,
  voiceMessages,
});
```

- [ ] **Step 5: Verify the write flow**

Run:

```bash
cd "c:\Users\kalvi\Documents\claude application\journal-app-claude\mobile-app"
npm run start
```

Expected:

```text
Write page renders image and audio sections without crashing and saves media arrays into journal state
```

- [ ] **Step 6: Commit**

```bash
git add mobile-app/app/write.tsx mobile-app/src/store/journalStore.ts
git commit -m "feat: wire media sections into mobile write page"
```

## Task 5: Wire media presentation into the Voice page and journal detail flow

**Files:**
- Modify: `mobile-app/app/voice.tsx`
- Modify: `mobile-app/app/journal/[id].tsx`

- [ ] **Step 1: Replace the temporary voice transcript rendering**

Update `mobile-app/app/voice.tsx` to render `AudioPlayerCard` per voice entry:

```tsx
<AudioPlayerCard
  key={message.id}
  track={{
    url: message.audioUrl ?? "",
    transcript: message.transcript,
    duration: message.duration,
  }}
  onPlay={() => {}}
/>
```

- [ ] **Step 2: Add image previews to journal detail**

In `mobile-app/app/journal/[id].tsx`, after the journal content, render:

```tsx
{journal.images?.map((image, index) => (
  <Text key={`${image}-${index}`}>{image}</Text>
))}
```

This placeholder rendering is enough for this phase; image gallery polish belongs to a later pass.

- [ ] **Step 3: Verify mobile media display**

Run:

```bash
cd "c:\Users\kalvi\Documents\claude application\journal-app-claude\mobile-app"
npm run start
```

Expected:

```text
Voice page shows audio cards and journal detail displays attached image references
```

- [ ] **Step 4: Commit**

```bash
git add mobile-app/app/voice.tsx mobile-app/app/journal/[id].tsx
git commit -m "feat: render mobile media in voice and detail views"
```

## Task 6: Document Phase 3 behavior and follow-up boundaries

**Files:**
- Create: `docs/mobile-phase-3-media.md`

- [ ] **Step 1: Write the phase note**

Create `docs/mobile-phase-3-media.md`:

````md
# Mobile Phase 3 Media

This phase adds:

- image picker scaffolding
- camera entry point scaffolding
- audio recording scaffolding
- backend media upload client
- media display in write / voice / detail flows

## Included

- native media UI structure
- backend upload client
- media-aware journal state

## Not yet included

- background upload
- robust permission recovery UX
- waveform playback UI
- selfie generation orchestration
- offline upload queue
````

- [ ] **Step 2: Commit**

```bash
git add docs/mobile-phase-3-media.md
git commit -m "docs: add mobile phase 3 media notes"
```

## Final Verification

- [ ] **Step 1: Run backend tests**

Run:

```bash
cd "c:\Users\kalvi\Documents\claude application\journal-app-claude\backend"
npm run test
```

Expected:

```text
Existing backend tests pass
```

- [ ] **Step 2: Run mobile tests**

Run:

```bash
cd "c:\Users\kalvi\Documents\claude application\journal-app-claude\mobile-app"
npm run test
```

Expected:

```text
Media-related mobile tests pass
```

- [ ] **Step 3: Run mobile typecheck**

Run:

```bash
cd "c:\Users\kalvi\Documents\claude application\journal-app-claude\mobile-app"
npm run typecheck
```

Expected:

```text
TypeScript exits with code 0
```

- [ ] **Step 4: Verify Expo media screens boot**

Run:

```bash
cd "c:\Users\kalvi\Documents\claude application\journal-app-claude\mobile-app"
npm run start
```

Expected:

```text
Write, Voice, and Detail pages render their media sections in Expo
```
