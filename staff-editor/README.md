# EchoTap staff editor

Builder 2's Figma-aligned EchoTap frontend for Lovely Disabled Home. The standalone demo includes the Home, Learn and Express student views and the teacher controls, card library, card review, bilingual editor, file and discard dialogs, backup and restore, and presentation simulation. Figma reference frames are on Page 1 of [the EchoTap design](https://www.figma.com/design/CloYEHLmVyHhnUfjlCxweS/Untitled?node-id=0-1).

## Run in the cloud workspace

Serve this folder with `python3 -m http.server 4173 --bind 127.0.0.1`, then open `http://127.0.0.1:4173/?demo=1`. Choose **Teacher Controls** and sign in with `demo@echotap.example` and `echotap-demo`. Add teacher-approved recordings, save cards, then choose **Publishing & account settings → Publish Changes**. Demo data stays in the browser. The sample cards have no recordings. Recordings are required on both languages for all visible cards before publishing.

Without `?demo=1`, the standalone staff view uses the same-origin staff API. Open it directly with `?staff=1`, or mount it from the app shell:

```js
import { mountStaffEditor } from "./staff-editor/src/editor.js";
import { createHttpApi } from "./staff-editor/src/api.js";

const unmount = mountStaffEditor(container, { api: createHttpApi(), onHome: showHome });
```

The student views are exported separately from `src/student.js`. Pass `getRelease` (returns `{cards, settings}`) and `openStaff` to `mountStudent(container, { getRelease, openStaff })`, and load `src/editor.css` in the app shell. The unmount functions remove their view. Wire `getRelease` to the team's published-content service for live use. The standalone production view leaves the student boards empty until a provider is supplied.

Use **Shared Settings** for volume, support contact, and sign-out. Backup export uses the existing HTTP contract. Restore works in demo mode and requires an injected `restoreBackup(backup)` adapter method in the live app. The staff editor retains the 2 MB upload limit pending the backend's confirmed limit.

## Staff API contract for Builder 3

| Request | Body | Result |
| --- | --- | --- |
| GET /api/staff/session | — | `{email}` or 401 |
| POST /api/staff/session | `{email,password}` | `{email}` and server session cookie |
| DELETE /api/staff/session | — | 204 |
| GET /api/staff/draft | — | Draft |
| PUT /api/staff/cards/:id | Multipart `card` JSON plus optional `image`, `audioMs`, `audioZh` files | Updated draft |
| DELETE /api/staff/cards/:id | — | Updated draft |
| PUT /api/staff/settings | Settings JSON | Updated draft |
| POST /api/staff/publish | — | Updated draft with new release |
| GET /api/staff/backup | — | Backup JSON |

A draft has `cards`, `settings`, `latestRelease` (null or a release summary with a `version`), and `dirty` (boolean). Each card has `id`, `mode` (`learn` or `express`), `labelMs`, `labelZh`, `order` (integer), `visible` (boolean), and the picture and recording URL fields named above. New drafts may omit media fields. Existing media stay attached when replacement files are omitted. Settings are `defaultLanguage` (`ms` or `zh`), `visibleCardLimit` (1–20), `volume` (0–100), and `supportContact` (text).

Builder 3 owns authentication, access checks, request and upload validation, same-origin session protections and publication. The backend must return a JSON `{message}` on recoverable errors and reject publication when there are no visible cards or a visible card lacks a picture or either recording. Use immutable media references for published releases so saving a draft cannot change existing releases. Builder 4 reads the published release using the team’s download contract. Agree on the backup format with Builder 3 and include recoverable media, not only expiring links. The demo supports local backup restore and reads its own published releases. Live sharing and offline device updates require the team’s published-content service.
