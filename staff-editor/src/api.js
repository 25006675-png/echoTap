/** Same-origin HTTP adapter. Staff sessions are managed by Builder 3. */
export function createHttpApi(base = "/api/staff") {
  async function request(path, { method = "GET", body } = {}) {
    const multipart = body instanceof FormData;
    const response = await fetch(base + path, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: multipart || !body ? undefined : { "Content-Type": "application/json" },
      body: multipart || !body ? body : JSON.stringify(body),
    });
    if (response.status === 401) {
      throw Object.assign(new Error("Sign in to continue."), { status: 401 });
    }
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(typeof detail.message === "string" ? detail.message : "Request failed. Try again.");
    }
    return response.status === 204 ? null : response.json();
  }

  return {
    getSession: () => request("/session").catch(error => {
      if (error.status === 401) return null;
      throw error;
    }),
    signIn: (email, password) => request("/session", { method: "POST", body: { email, password } }),
    signOut: () => request("/session", { method: "DELETE" }),
    getDraft: () => request("/draft"),
    saveCard(card, files) {
      const body = new FormData();
      body.set("card", JSON.stringify(card));
      for (const [key, file] of Object.entries(files)) body.set(key, file);
      return request("/cards/" + encodeURIComponent(card.id), { method: "PUT", body });
    },
    deleteCard: id => request("/cards/" + encodeURIComponent(id), { method: "DELETE" }),
    saveSettings: settings => request("/settings", { method: "PUT", body: settings }),
    publish: () => request("/publish", { method: "POST" }),
    getBackup: () => request("/backup"),
  };
}
