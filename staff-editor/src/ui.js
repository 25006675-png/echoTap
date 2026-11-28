export const escape = value => String(value ?? "").replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);

export const art = filename => new URL("../assets/figma/" + filename, import.meta.url).href;

export function icon(name) {
  return '<img class="icon icon-' + name + '" src="' + art(name + ".svg") + '" alt="">';
}

export const starter = [
  ["apple", "Apple", "Epal", "苹果"], ["water", "Water", "Air", "水"],
  ["banana", "Banana", "Pisang", "香蕉"], ["ball", "Ball", "Bola", "球"],
  ["hungry", "Hungry", "Saya lapar", "我饿了"], ["drink", "Drink", "Saya mahu minum", "我想喝水"],
  ["toilet", "Toilet", "Saya mahu ke tandas", "我想上厕所"], ["help", "Help", "Tolong saya", "请帮帮我"],
  ["tired", "Tired", "Saya penat", "我累了"], ["sad", "Sad", "Saya sedih", "我很难过"],
  ["angry", "Angry", "Saya marah", "我生气了"], ["scared", "Scared", "Saya takut", "我害怕"],
].map(([id, title, labelMs, labelZh], order) => ({
  id, title, labelMs, labelZh, order: order + 1, mode: order < 4 ? "learn" : "express",
  image: art(id + ".png"), visible: true, audioMs: "", audioZh: "",
}));

const titles = new Map(starter.map(card => [card.id, card]));
export function cardTitle(card) {
  const original = titles.get(card.id);
  return original?.labelMs === card.labelMs ? original.title : card.labelMs;
}

export function header(title, back, extra = "") {
  return '<header><button class="back secondary" data-action="' + back + '" aria-label="Back">'
    + icon("back") + '</button><h1 tabindex="-1">' + title + '</h1>' + extra + '</header>';
}

export function modal(container, { title, body, buttons, sideBySide = false, onChoose, caption = "" }) {
  const box = document.createElement("dialog");
  box.setAttribute("aria-labelledby", "dialog-title");
  box.innerHTML = caption + '<h2 id="dialog-title">' + title + '</h2>' + body
    + '<form method="dialog" class="' + (sideBySide ? 'action-pair' : '') + '">' + buttons.map(([value, label, style]) =>
      '<button value="' + value + '" class="' + style + '">' + label + '</button>').join("") + '</form>';
  container.append(box);
  box.addEventListener("submit", event => {
    event.stopPropagation();
    onChoose?.(event.submitter.value);
  });
  box.showModal();
  return new Promise(resolve => box.addEventListener("close", () => {
    box.remove();
    resolve(box.returnValue);
  }, { once: true }));
}

export function mediaUrl(value) {
  if (!value) return "";
  if (/^data:(?:image\/(?:png|jpeg|webp)|audio\/[\w.+-]+);base64,/i.test(value)) return value;
  try {
    const url = new URL(value, location.href);
    if (["http:", "https:"].includes(url.protocol)) return url.href;
  } catch {
    // Invalid media references have no preview.
  }
  return "";
}

