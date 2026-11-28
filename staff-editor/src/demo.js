import { starter } from "./ui.js";

const storageKey = "echotap-staff-demo-v1";
const sessionKey = storageKey + "-session";
const staff = { email: "demo@echotap.example" };

function readDraft() {
  const saved = localStorage.getItem(storageKey);
  if (saved) return JSON.parse(saved);
  return {
    cards: starter,
    settings: { defaultLanguage: "ms", visibleCardLimit: 4, volume: 100, supportContact: "" },
    latestRelease: null,
    dirty: true,
  };
}

function persist(draft) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(draft));
  } catch {
    throw new Error("Demo storage is full. Use smaller files or remove unused demo cards.");
  }
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

function requireSession() {
  if (!sessionStorage.getItem(sessionKey)) {
    throw Object.assign(new Error("Sign in to continue."), { status: 401 });
  }
}

export function getDemoRelease() {
  const { latestRelease, settings } = readDraft();
  return latestRelease ?? { cards: starter, settings: { ...settings, visibleCardLimit: 4, defaultLanguage: "ms" } };
}

export function createDemoApi() {
  return {
    async getSession() {
      return sessionStorage.getItem(sessionKey) ? staff : null;
    },
    async signIn(email, password) {
      if (email !== staff.email || password !== "echotap-demo") {
        throw new Error("Use the sample email and password shown above.");
      }
      sessionStorage.setItem(sessionKey, "yes");
      return staff;
    },
    async signOut() {
      sessionStorage.removeItem(sessionKey);
    },
    async getDraft() {
      requireSession();
      return readDraft();
    },
    async saveCard(card, files) {
      requireSession();
      for (const [key, file] of Object.entries(files)) card[key] = await readFile(file);
      const draft = readDraft();
      const index = draft.cards.findIndex(item => item.id === card.id);
      if (index < 0) draft.cards.push(card);
      else draft.cards[index] = card;
      draft.dirty = true;
      persist(draft);
      return draft;
    },
    async deleteCard(id) {
      requireSession();
      const draft = readDraft();
      draft.cards = draft.cards.filter(card => card.id !== id);
      draft.dirty = true;
      persist(draft);
      return draft;
    },
    async saveSettings(settings) {
      requireSession();
      const draft = readDraft();
      draft.settings = settings;
      draft.dirty = true;
      persist(draft);
      return draft;
    },
    async publish() {
      requireSession();
      const draft = readDraft();
      const cards = draft.cards.filter(card => card.visible).sort((a, b) => a.order - b.order);
      if (!cards.length) throw new Error("Make at least one card visible before publishing.");
      const incomplete = cards.find(card => !card.image || !card.audioMs || !card.audioZh);
      if (incomplete) throw new Error("Add a picture and both recordings for “" + incomplete.labelMs + "”, or hide it.");
      draft.latestRelease = {
        version: (draft.latestRelease?.version ?? 0) + 1,
        publishedAt: new Date().toISOString(),
        cards,
        settings: draft.settings,
      };
      draft.dirty = false;
      persist(draft);
      return draft;
    },
    async restoreBackup(backup) {
      requireSession();
      const settings = backup?.settings;
      const valid = backup?.schemaVersion === 1 && Array.isArray(backup.cards)
        && settings && ["ms", "zh"].includes(settings.defaultLanguage)
        && Number.isInteger(settings.visibleCardLimit) && settings.visibleCardLimit >= 1 && settings.visibleCardLimit <= 20
        && Number.isFinite(settings.volume) && settings.volume >= 0 && settings.volume <= 100
        && typeof settings.supportContact === "string"
        && new Set(backup.cards.map(card => card?.id)).size === backup.cards.length
        && backup.cards.every(card => card && typeof card.id === "string" && ["learn", "express"].includes(card.mode)
          && typeof card.labelMs === "string" && typeof card.labelZh === "string" && typeof card.visible === "boolean"
          && Number.isInteger(card.order) && ["image", "audioMs", "audioZh"].every(key => !card[key] || typeof card[key] === "string"));
      if (!valid) throw new Error("This file is not a supported EchoTap backup.");
      const draft = { cards: backup.cards, settings, latestRelease: readDraft().latestRelease, dirty: true };
      persist(draft);
      return draft;
    },
    async getBackup() {
      requireSession();
      return { schemaVersion: 1, ...readDraft() };
    },
  };
}
