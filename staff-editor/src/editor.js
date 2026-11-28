import { art, cardTitle, escape, header, icon, mediaUrl, modal } from "./ui.js";
const stylesheet = new URL("./editor.css", import.meta.url).href;
const mediaFields = [
  ["image", "Picture", "image/png,image/jpeg,image/webp", "image"],
  ["audioMs", "Malay Audio", "audio/mpeg,audio/mp4,audio/wav,audio/x-wav,audio/webm,audio/ogg", "audio"],
  ["audioZh", "Chinese Audio", "audio/mpeg,audio/mp4,audio/wav,audio/x-wav,audio/webm,audio/ogg", "audio"],
];

function cardPicture(card, slot) {
  return card.image === art("apple.png") ? art("apple-" + slot + ".png") : card.image;
}

function mediaPreview(key, value) {
  const url = mediaUrl(value);
  if (!url) return '<small>' + (key === "image" ? "No picture added" : "No audio added") + '</small>';
  return key === "image" ? '<img class="preview" alt="Current card picture" src="' + escape(url) + '">'
    : '<audio controls preload="none" src="' + escape(url) + '"></audio>';
}

export function mountStaffEditor(root, { api, demo = false, onHome = () => location.assign("./") }) {
  const host = document.createElement("div");
  root.append(host);
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("link");
  style.rel = "stylesheet";
  style.href = stylesheet;
  const app = document.createElement("div");
  app.className = "editor";
  shadow.append(style, app);

  let staff;
  let draft;
  let view = "controls";
  let category = "learn";
  let busy = false;
  let disposed = false;
  const previews = new Map();

  function clearPreviews() {
    for (const url of previews.values()) URL.revokeObjectURL(url);
    previews.clear();
  }

  function frame(content) {
    if (disposed) return;
    clearPreviews();
    app.innerHTML = '<p id="message" role="status" aria-live="polite"></p>' + content;
  }

  function notify(message, error = false) {
    const output = app.querySelector("#message");
    if (!output) return;
    output.textContent = message;
    output.className = error ? "error" : "notice";
  }

  function render() {
    if (!staff) {
      frame(header("Staff sign-in", "home")
        + (demo ? '<p class="note">Demo login: demo@echotap.example / echotap-demo</p>' : "")
        + '<form data-form="login"><label>Email<input name="email" type="email" autocomplete="username" required></label>'
        + '<label>Password<input name="password" type="password" autocomplete="current-password" required></label>'
        + '<button class="primary">Sign in</button></form>');
      return;
    }
    if (!draft) {
      frame('<h1>Cards unavailable</h1><button data-action="retry">Retry</button>');
      return;
    }
    if (view === "cards") {
      const cards = draft.cards.filter(card => card.mode === category).sort((a, b) => a.order - b.order);
      const tab = (mode, name, limit) => '<button class="tab" data-action="category" data-id="' + mode
        + '" aria-pressed="' + (category === mode) + '">' + name + (category === mode ? ' ✓' : '') + '<small>'
        + draft.cards.filter(card => card.mode === mode).length + ' / ' + limit + ' cards</small></button>';
      frame(header("Manage Cards", "controls") + '<p class="intro library-intro">Choose, edit and organize your picture and audio cards.</p>'
        + '<div class="note count">Library total <strong>' + draft.cards.length + ' / 20 cards</strong></div>'
        + '<div class="pair">' + tab("learn", "Learn", 12) + tab("express", "Express", 8) + '</div>'
        + '<ul class="cards">' + cards.map(card => {
          const url = mediaUrl(cardPicture(card, "thumb"));
          return '<li><button class="thumbnail" data-action="review" data-id="' + escape(card.id)
            + '" aria-label="Review ' + escape(card.labelMs) + '">' + (url ? '<img alt="" src="' + escape(url) + '">' : '—') + '</button>'
            + '<div><strong>' + escape(cardTitle(card)) + '</strong><small>Malay + Chinese<br>'
            + (card.audioMs && card.audioZh ? 'Audio added' : 'Audio not added') + (card.visible ? '' : ' · Hidden')
            + '</small></div><button class="secondary" data-action="edit" data-id="' + escape(card.id) + '">Edit<span class="sr-only"> '
            + escape(card.labelMs) + '</span></button></li>';
        }).join("") + '</ul>'
        + '<footer><button class="primary" data-action="add"' + (cards.length >= (category === "learn" ? 12 : 8) ? ' disabled' : '')
        + '>＋ &nbsp;Add ' + (category === "learn" ? 'Learning' : 'Express') + ' Card</button>'
        + '<small>Provisional content · Teacher approval required</small></footer>');
      return;
    }
    if (view === "backup") {
      frame(header("Backup & Restore", "controls") + '<div class="note backup-note">' + icon("info")
        + '<div><strong>' + (demo ? 'Stored on this device' : 'Shared content backup') + '</strong><p>'
        + (demo ? 'Content is stored in this browser.' : 'Back up the content managed by your centre.') + '</p></div></div>'
        + '<section class="box backup-box"><h2>' + icon("export") + 'Export Backup</h2><p>Includes pictures, Malay and Chinese labels, and pre-recorded audio.</p>'
        + '<p>Keep a copy in a safe place.</p><button class="primary" data-action="backup">Export Backup</button></section>'
        + '<section class="box backup-box"><h2>' + icon("restore") + 'Restore Backup</h2>'
        + '<input type="file" id="backup-file" hidden accept=".json,application/json">'
        + '<button class="secondary wide" data-action="choose-backup"' + (!api.restoreBackup ? ' disabled' : '') + '>Choose Backup File</button>'
        + (!api.restoreBackup ? '<p>Restore requires backend support.</p>' : '')
        + '<div class="warning"><strong>Restoring may replace existing content.</strong><br>Export first if you need to keep a copy.</div></section>'
        + '<footer><button class="secondary wide" data-action="controls">Done — Return to Teacher Controls</button></footer>');
      return;
    }
    if (view === "settings") {
      frame(header("Shared Settings", "controls") + '<p>Save your changes, then publish from Teacher Controls.</p>'
        + '<form data-form="settings"><label>Default volume (%)<input name="volume" type="number" min="0" max="100" required value="'
        + escape(draft.settings.volume) + '"></label><label>Support contact<input name="supportContact" maxlength="200" value="'
        + escape(draft.settings.supportContact) + '"></label><button class="primary">Save Settings</button></form>'
        + '<button class="secondary" data-action="logout">Sign out</button>');
      return;
    }
    const chosen = draft.settings.defaultLanguage;
    const count = draft.settings.visibleCardLimit;
    const link = (action, image, title, detail) => '<button class="link-card" data-action="' + action + '">' + icon(image)
      + '<span><strong>' + title + '</strong><small>' + detail + '</small></span>' + icon("next") + '</button>';
    frame(header("Teacher Controls", "home") + '<div class="note teacher-note">' + icon("info")
      + '<div><strong>For teachers</strong><p>Set up audio and picture choices.</p></div></div>'
      + '<section><h2>Audio Language</h2><div class="pair">' + [["ms", "Malay"], ["zh", "Chinese"]].map(([id, name]) =>
        '<button class="tab language" data-action="language" data-id="' + id + '" aria-pressed="' + (chosen === id) + '">'
        + name + (chosen === id ? ' ✓' : '') + '</button>').join("") + '</div></section>'
      + '<section><h2>Picture Choices Per Screen</h2><p>Choose 1–4 pictures per screen.<br>Fewer choices can make selection easier.</p>'
      + '<div class="stepper"><button class="secondary" data-action="count" data-id="-1" aria-label="Decrease picture count"'
      + (count <= 1 ? ' disabled' : '') + '>−</button><span><strong>' + escape(count) + '</strong> shown</span>'
      + '<button class="secondary" data-action="count" data-id="1" aria-label="Increase picture count"'
      + (count >= 4 ? ' disabled' : '') + '>＋</button></div></section>'
      + '<section><h2>Content &amp; Maintenance</h2>' + link("cards", "manage", "Manage Cards", "Choose, add, edit &amp; organize<br>picture and audio cards.")
      + link("backup-view", "backup", "Backup / Restore", demo ? "Export or import content<br>stored in this browser." : "Export a copy of shared content.") + '</section>'
      + '<footer><button class="primary" data-action="home">' + icon("home-white") + 'Done - Return Home</button></footer>'
      + '<details class="operations"><summary>Publishing &amp; account settings</summary><div class="note"><p>'
      + (draft.dirty ? 'Unpublished changes. ' : '') + (draft.latestRelease ? 'Published version ' + escape(draft.latestRelease.version) : 'Nothing published yet')
      + '.</p><button class="primary" data-action="publish"' + (!draft.dirty ? ' disabled' : '') + '>Publish Changes</button>'
      + '<button class="secondary wide" data-action="settings">Shared Settings</button></div></details>');
  }

  function option(value, label, selected) {
    return '<option value="' + value + '"' + (selected === value ? ' selected' : '') + '>' + label + '</option>';
  }

  function review(card) {
    frame(header("Edit Card", "cards") + '<p class="intro library-intro">Review the picture and audio before using this card.</p>'
      + '<div class="review-picture note">' + mediaPreview("image", cardPicture(card, "review")) + '<small>' + (card.mode === "learn" ? "Learn" : "Express") + ' card</small></div>'
      + '<section><h2>Card name</h2><div class="box name-box">' + escape(cardTitle(card)) + '</div></section>'
      + '<section><h2>Audio recordings</h2>' + [["Malay", "audioMs"], ["Chinese", "audioZh"]].map(([name, key]) =>
        '<div class="box audio-row"><div><strong>' + name + '</strong><small>' + (card[key] ? 'Recording added' : 'No recording added')
        + '</small>' + (card[key] ? mediaPreview(key, card[key]) : '') + '</div><button class="secondary" data-action="edit" data-id="'
        + escape(card.id) + '">Choose<span class="sr-only"> ' + name + ' audio</span></button></div>').join("") + '</section>'
      + '<footer><div class="note"><strong>Teacher approval required</strong><br><small>Review content before publishing.</small></div>'
      + '<button class="primary" data-action="cards">' + icon("back") + 'Done - Return to Library</button></footer>');
  }

  function edit(card) {
    const existing = Boolean(card);
    card ??= { id: crypto.randomUUID(), mode: category, order: draft.cards.length + 1, visible: true };
    const fileControl = (key, accept, label) => '<input hidden type="file" name="' + key
      + '" accept="' + accept + '"><button type="button" class="secondary" data-action="file-dialog" data-id="'
      + key + '">' + label + '</button>';
    frame(header(existing ? "Edit Card" : "Add Card", "cancel", '<span class="badge">' + (card.mode === "learn" ? "Learn" : "Express") + '</span>')
      + '<form data-form="card"><section><h2>Card Picture</h2><div class="box picture-row"><div class="picture-preview" data-preview="image">'
      + mediaPreview("image", cardPicture(card, "editor")) + '</div><div>' + fileControl("image", mediaFields[0][2], "Change Picture")
      + '<small>' + (card.image ? escape(cardTitle(card)) + ' picture' : 'No picture added') + '</small></div></div></section>'
      + '<label>Malay Label<input name="labelMs" maxlength="80" required value="' + escape(card.labelMs) + '"></label>'
      + '<label>Chinese Label<input name="labelZh" maxlength="80" required value="' + escape(card.labelZh) + '"></label>'
      + '<section><h2>Pre-recorded Audio</h2>' + mediaFields.slice(1).map(([key, title, accept]) =>
        '<div class="box audio-row"><div class="audio-description">' + icon("play") + '<div><strong>' + title
        + '</strong><div data-preview="' + key + '">' + mediaPreview(key, card[key]) + '</div></div></div>'
        + fileControl(key, accept, "Replace Audio") + '</div>').join("") + '</section>'
      + '<details class="operations"><summary>Card visibility and order</summary><label>Mode<select name="mode">'
      + option("learn", "Learn", card.mode) + option("express", "Express", card.mode)
      + '</select></label><label>Display order<input name="order" type="number" min="1" max="999" required value="' + escape(card.order)
      + '"></label><label class="check"><input name="visible" type="checkbox"' + (card.visible ? ' checked' : '') + '> Show this card</label>'
      + (existing ? '<button type="button" class="danger" data-action="delete" data-id="' + escape(card.id) + '">Delete card</button>' : '')
      + '</details><footer><small>Review labels and recordings before saving.</small><div class="action-pair"><button type="button" class="secondary" data-action="cancel">Cancel</button>'
      + '<button class="primary">Save Changes</button></div></footer></form>');
    const form = app.querySelector("form");
    form.card = card;
    form.initial = [...new FormData(form)];
  }

  function validMedia(file, accept) {
    return file.size > 0 && accept.split(",").includes(file.type) && file.size <= 2 * 1024 * 1024;
  }

  app.addEventListener("change", event => {
    const input = event.target;
    if (input.id === "backup-file" && input.files[0]) {
      const file = input.files[0];
      input.value = "";
      run(async () => {
        let backup;
        try { backup = JSON.parse(await file.text()); }
        catch { throw new Error("Choose a valid EchoTap backup file."); }
        const choice = await modal(app, {
          title: "Restore this backup?",
          body: '<p>Restore pictures, bilingual labels and audio from the selected backup.</p>'
            + '<div class="warning"><strong>This may replace existing content.</strong></div>'
            + '<p>Export a backup first if you need to keep your current content.</p>',
          buttons: [["cancel", "Cancel", "secondary"], ["restore", "Confirm Restore", "danger"]],
          sideBySide: true,
        });
        if (choice !== "restore") return;
        draft = await api.restoreBackup(backup);
        render();
        notify("Backup restored as a draft.");
      });
      return;
    }
    const field = mediaFields.find(([key]) => key === input.name);
    if (input.type !== "file" || !field) return;
    const [key, label, accept, kind] = field;
    const target = app.querySelector('[data-preview="' + key + '"]');
    const file = input.files[0];
    if (!file) return;
    if (!validMedia(file, accept)) {
      const prior = input.form.selectedFiles?.[key];
      if (prior) {
        const files = new DataTransfer();
        files.items.add(prior);
        input.files = files.files;
      } else input.value = "";
      void modal(app, {
        title: "File couldn’t be used",
        body: '<p>Choose a supported file within the size limit. Your current picture or audio is unchanged.</p>',
        buttons: [["choose", "Choose Another File", "primary"], ["cancel", "Keep Current", "secondary"]],
        onChoose: choice => { if (choice === "choose") input.click(); },
      });
      return;
    }
    input.form.selectedFiles ??= {};
    input.form.selectedFiles[key] = file;
    const old = previews.get(key);
    if (old) URL.revokeObjectURL(old);
    const url = URL.createObjectURL(file);
    previews.set(key, url);
    const preview = document.createElement(kind === "image" ? "img" : "audio");
    if (kind === "image") {
      preview.alt = "Selected card picture";
      preview.className = "preview";
    } else {
      preview.controls = true;
      preview.preload = "none";
    }
    preview.src = url;
    target.replaceChildren(preview);
    notify("");
  });

  async function run(action) {
    if (busy) return;
    busy = true;
    const enabled = [...app.querySelectorAll("button:not(:disabled)")];
    enabled.forEach(button => { button.disabled = true; });
    try {
      await action();
    } catch (error) {
      if (error.status === 401) {
        staff = null;
        draft = null;
        view = "controls";
        render();
      }
      notify(error.message || "Something went wrong. Try again.", true);
    } finally {
      busy = false;
      enabled.forEach(button => { button.disabled = false; });
    }
  }

  app.addEventListener("submit", event => {
    event.preventDefault();
    const form = event.target;
    const values = new FormData(form);
    run(async () => {
      if (form.dataset.form === "login") {
        staff = await api.signIn(values.get("email").trim(), values.get("password"));
        await fetchDraft();
        return;
      }
      if (form.dataset.form === "settings") {
        draft = await api.saveSettings({
          ...draft.settings,
          volume: Number(values.get("volume")),
          supportContact: values.get("supportContact").trim(),
        });
        render();
        notify("Settings saved. Publish to update devices.");
        return;
      }
      if (form.dataset.form !== "card") return;
      const card = { ...form.card };
      for (const key of ["labelMs", "labelZh"]) card[key] = values.get(key).trim();
      if (!card.labelMs || !card.labelZh) throw new Error("Enter both card labels.");
      card.mode = values.get("mode");
      card.visible = values.has("visible");
      card.order = Number(values.get("order"));
      const files = {};
      for (const [key, label, accept] of mediaFields) {
        const file = values.get(key);
        if (!file?.name) continue;
        if (!validMedia(file, accept)) {
          throw new Error(label + " must be a supported file and no larger than 2 MB.");
        }
        files[key] = file;
      }
      draft = await api.saveCard(card, files);
      view = "cards";
      category = card.mode;
      render();
      notify("Card saved. Publish to update devices.");
    });
  });

  async function fetchDraft() {
    draft = null;
    render();
    draft = await api.getDraft();
    render();
  }

  app.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button || busy) return;
    const { action, id } = button.dataset;
    if (action === "home") return onHome();
    if (["cards", "settings", "controls", "backup-view", "category"].includes(action)) {
      if (action === "category") category = id;
      else view = action === "backup-view" ? "backup" : action;
      render();
      app.querySelector("h1")?.focus();
      return;
    }
    if (action === "add") return edit();
    if (action === "edit" || action === "review") {
      const card = draft.cards.find(card => card.id === id);
      return action === "edit" ? edit(card) : review(card);
    }
    if (action === "choose-backup") return app.querySelector("#backup-file").click();
    if (action === "file-dialog") {
      const input = app.querySelector('[name="' + id + '"]');
      const selected = input.files[0];
      const image = id === "image";
      void modal(app, {
        title: image ? "Change Picture" : "Replace Audio",
        body: '<p>' + (image ? 'Choose a clear picture' : 'Choose a recording') + ' from this device.</p>'
          + '<div class="box file-state">' + icon("file") + '<div><strong>' + escape(selected?.name ?? "No file selected")
          + '</strong><br><small>Choose a file from this device.</small></div></div>'
          + '<p><small>' + (image ? 'JPG, PNG or WebP' : 'MP3, M4A, WAV, WebM or Ogg') + ' · Maximum 2 MB</small></p>'
          + '<p>Invalid files never replace the current file.</p>',
        buttons: [["cancel", "Cancel", "secondary"], ["choose", "Choose File", "primary"]],
        sideBySide: true,
        onChoose: choice => { if (choice === "choose") input.click(); },
      });
      return;
    }
    if (action === "cancel") {
      const form = app.querySelector("form");
      const changed = [...new FormData(form)].some(([key, value], index) =>
        value instanceof File ? Boolean(value.name) : value !== form.initial[index]?.[1] || key !== form.initial[index]?.[0]);
      if (!changed) return render();
      void modal(app, {
        title: "Save your changes?",
        body: '<p>You have unsaved edits to this card. Save them or discard this draft.</p>',
        buttons: [["save", "Save Changes", "primary"], ["keep", "Keep Editing", "secondary"],
          ["discard", "Discard Changes", "secondary danger-text"]],
      }).then(choice => {
        if (choice === "save") form.requestSubmit();
        if (choice === "discard") render();
      });
      return;
    }
    if (action === "retry") return run(fetchDraft);
    if (action === "restart") return run(start);
    if (action === "delete" && !confirm("Delete this card from the draft?")) return;
    if (action === "publish" && !confirm("Publish these changes to EchoTap devices?")) return;

    run(async () => {
      if (action === "language" || action === "count") {
        const settings = { ...draft.settings };
        if (action === "language") settings.defaultLanguage = id;
        else settings.visibleCardLimit = Math.min(4, Math.max(1, settings.visibleCardLimit + Number(id)));
        draft = await api.saveSettings(settings);
        render();
      }
      if (action === "logout") {
        await api.signOut();
        staff = null;
        draft = null;
        view = "controls";
        render();
      }
      if (action === "delete") {
        draft = await api.deleteCard(id);
        render();
        notify("Card removed from the draft.");
      }
      if (action === "publish") {
        draft = await api.publish();
        render();
        notify("Published version " + draft.latestRelease.version + ".");
      }
      if (action === "backup") {
        const data = await api.getBackup();
        const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = "echotap-content-backup.json";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    });
  });

  async function start() {
    frame('<section class="panel"><h1>Staff editor</h1><p>Connecting…</p></section>');
    try {
      staff = await api.getSession();
    } catch (error) {
      frame('<section class="panel"><h1>Could not connect</h1><button data-action="restart">Retry</button></section>');
      throw error;
    }
    if (staff) await fetchDraft();
    else render();
  }

  run(start);
  return () => {
    disposed = true;
    clearPreviews();
    host.remove();
  };
}
