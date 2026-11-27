# EchoTap — Accessible Learning & Communication App
 
## 1. Project Overview
 
| Item | Details |
| --- | --- |
| **Project** | EchoTap — Accessible Learning & Communication App |
| **Client** | Lovely Disabled Home |
| **Platform** | Mobile-first Progressive Web App (PWA) |
 
EchoTap is a simple picture-based learning and communication application designed for people with disabilities (OKUs), particularly non-verbal users and individuals with intellectual disabilities.
 
The application helps users learn familiar words and express basic needs or feelings by tapping large picture cards that play pre-recorded audio in Malay or Chinese.
 
The app should be extremely simple, accessible, visually friendly and suitable for use on shared tablets or smartphones. Teachers facilitate usage and manage the learning content.
 
> **Core design principle:** Prioritise accessibility and ease of use over feature complexity.
 
## 2. Proposed Architecture
 
EchoTap uses a **frontend-only, local-first PWA architecture**, without a backend server or cloud database.
 
### Recommended Technology Stack
 
| Technology | Purpose |
| --- | --- |
| React + TypeScript + Vite | Frontend application |
| Tailwind CSS | Styling |
| IndexedDB (Dexie.js) | Local data storage |
| Service Worker (`vite-plugin-pwa`) | Offline functionality |
| HTML5 Audio API | Audio playback |
| Static hosting (e.g. Cloudflare Pages) | Deployment |
 
### Architecture
 
```text
EchoTap PWA
│
├── Student Interface
│   ├── Home
│   ├── Learn Mode
│   └── Express Mode
│
├── Teacher Interface
│   ├── PIN Access
│   ├── Card Management
│   └── App Settings
│
├── Application Services
│   ├── Card Management
│   ├── Audio Playback
│   └── Backup / Restore
│
├── IndexedDB
│   ├── Cards and Media
│   └── Local Settings
│
└── Service Worker
    └── Offline App Caching
```
 
### Key Constraints
 
- All essential functionality should work without internet after initial installation.
- No separate teacher application or account-based authentication is required.
 
