# 38 — Upload failure taxonomy + reasons on the tile (5a)

**What to build:** The data model behind 5a/5c/5d. Today exactly one error class exists
(`FileTooLargeError` vs everything) and it is discarded before rendering.

**Status:** done

- [x] Classify failures: network / server / too-large / not-an-image, plain-language
      strings ×4 both locales (Веза је прекинута, Сервер није одговорио, Превелика
      датотека, Није фотографија); server currently accepts any content type
      (`api/uploads/route.ts:40`)
- [x] `reason` on `UploadTile` + failure records — error class is dropped today
      (`upload-queue.tsx:31`, `upload-button.tsx:383`); bulk failures are bare `File[]`
      (`upload-button.tsx:274`)
- [x] Failed tile states its reason above **Пробај поново** (`upload-tile.tsx:69` renders
      retry only)
- [x] Unretryable tiles show **Изостави** instead; stop destroying too-large tiles
      (`upload-button.tsx:490` drops the tile and moves it to the rejected card)

Refs: ALIGN §2 5a/5d; drift-audit.md §2.
