import { art, cardTitle, escape, icon, mediaUrl, modal } from "./ui.js";

const feelings = new Set(["tired", "sad", "angry", "scared"]);
const choices = [
  ["learn", "book", "LEARN", "Learn words with pictures"],
  ["express", "bubbles", "EXPRESS", "Share needs and feelings"],
];

export function mountStudent(root, { getRelease, openStaff, demo = false }) {
  let screen = "home";
  let language = "ms";
  let category = "needs";
  let page = 0;
  let previous;
  let release;
  const audio = new Audio();

  function stop() {
    audio.pause();
    audio.removeAttribute("src");
    previous = undefined;
  }

  function cardsForScreen() {
    return (release?.cards ?? []).filter(card => card.mode === screen)
      .filter(card => screen !== "express" || (feelings.has(card.id) ? "feelings" : "needs") === category)
      .sort((a, b) => a.order - b.order);
  }

  function play(card) {
    const source = mediaUrl(card[language === "zh" ? "audioZh" : "audioMs"]);
    const message = root.querySelector('[role="status"]');
    if (!source) {
      message.textContent = "No recording added for this language.";
      return;
    }
    audio.src = source;
    audio.volume = Math.max(0, Math.min(100, release.settings?.volume ?? 100)) / 100;
    audio.play().catch(() => {
      if (message.isConnected) message.textContent = "The recording could not be played.";
    });
  }

  function segment(options, action, selected) {
    return '<div class="segments pair">' + options.map(([id, name]) =>
      '<button data-action="' + action + '" data-value="' + id + '" aria-pressed="' + (selected === id) + '">'
        + name + (selected === id ? " ✓" : "") + '</button>').join("") + '</div>';
  }

  function render() {
    if (screen === "home") {
      root.innerHTML = '<main class="student home"><header><img src="' + art("brand.svg")
        + '" alt=""><h1 tabindex="-1">EchoTap</h1></header><div class="home-choices">' + choices.map(([id, image, label, detail]) =>
          '<button class="home-choice ' + id + '" data-action="screen" data-value="' + id + '"><img src="'
          + art(image + ".svg") + '" alt=""><strong>' + label + '</strong><span>' + detail + '</span></button>').join("")
        + '</div><footer><button class="secondary" data-action="staff">Teacher Controls</button>'
        + (demo ? '<small>Prototype · Teacher review required</small>'
          + '<button class="simulation-link" data-action="simulation">Presentation simulation</button>' : '') + '</footer></main>';
      return;
    }
    const learn = screen === "learn";
    const title = learn ? "Learn" : "Express";
    const cards = cardsForScreen();
    const count = Math.max(1, Math.min(4, release?.settings?.visibleCardLimit ?? 4));
    const displayed = cards.slice(page * 4, page * 4 + 4).map((card, slot) => {
      if (slot >= count || card.visible === false) return '<span aria-hidden="true"></span>';
      const label = learn ? card[language === "zh" ? "labelZh" : "labelMs"] : cardTitle(card);
      return '<button class="student-card" data-action="play" data-value="' + escape(card.id)
        + '"><img class="pictogram" src="' + escape(mediaUrl(card.image)) + '" alt=""><span'
        + (learn ? ' lang="' + (language === "zh" ? "zh" : "ms") + '"' : '')
        + '>' + escape(label) + ' ' + icon(learn ? "speaker" : "speaker-blue") + '</span></button>';
    }).join("");
    root.innerHTML = '<main class="student ' + screen + '"><header><button class="secondary student-home" data-action="screen" data-value="home">'
      + icon(learn ? "home" : "home-blue") + ' Home</button><h1 tabindex="-1">' + title + '</h1></header>'
      + segment([["ms", "Malay"], ["zh", "Chinese"]], "language", language)
      + (learn ? '<p class="student-instruction">Tap a picture to hear the word</p>'
        : segment([["needs", "Needs"], ["feelings", "Feelings"]], "category", category))
      + (cards.length ? '<div class="student-grid">' + displayed + '</div>' : '<p class="student-instruction">No cards are available yet.</p>')
      + (cards.length > 4 ? '<nav class="pair pagination" aria-label="Card pages"><button class="secondary" data-action="page" data-value="-1"'
        + (page === 0 ? ' disabled' : '') + '>Previous</button><button class="secondary" data-action="page" data-value="1"'
        + ((page + 1) * 4 >= cards.length ? ' disabled' : '') + '>Next</button></nav>' : '')
      + '<footer><div role="status" class="student-status"></div><button class="primary" data-action="repeat"'
      + (previous ? '' : ' disabled') + '>' + icon("repeat") + (learn ? 'Repeat Sound' : 'Repeat Audio') + '</button>'
      + '<small>' + (learn ? 'Provisional pictures &amp; words<br>Teacher approval required'
        : 'Tap a picture to speak<br>Pictures &amp; translations need teacher approval') + '</small></footer></main>';
  }

  const listener = async event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const { action, value } = button.dataset;
    if (action === "staff") return openStaff();
    if (action === "simulation") {
      void modal(root, {
        title: "Presentation simulation",
        caption: '<p class="simulation-label">SIMULATED INTERACTION</p>',
        body: '<p>This interaction is simulated. No real files or recordings are used.</p>',
        buttons: [["done", "Done", "primary"]],
      });
      return;
    }
    if (action === "play") {
      previous = cardsForScreen().find(card => card.id === value);
      if (previous) {
        root.querySelector('[data-action="repeat"]').disabled = false;
        play(previous);
      }
      return;
    }
    if (action === "repeat") {
      if (previous) play(previous);
      return;
    }
    if (action === "screen") {
      if (value !== "home") {
        button.disabled = true;
        try { release = await getRelease?.(); }
        catch { release = null; }
      }
      stop();
      screen = value;
      language = release?.settings?.defaultLanguage ?? "ms";
      category = "needs";
      page = 0;
    }
    if (action === "language") {
      audio.pause();
      language = value;
    }
    if (action === "category" || action === "page") {
      stop();
      if (action === "category") {
        category = value;
        page = 0;
      } else page += Number(value);
    }
    render();
    if (action === "screen") root.querySelector("h1").focus();
    else for (const control of root.querySelectorAll("button[data-action]")) {
      if (control.dataset.action === action && control.dataset.value === value && !control.disabled) {
        control.focus();
        break;
      }
    }
  };
  root.addEventListener("click", listener);
  render();
  return () => {
    stop();
    root.removeEventListener("click", listener);
    root.replaceChildren();
  };
}
