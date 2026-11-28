import { createHttpApi } from "./api.js";
import { createDemoApi, getDemoRelease } from "./demo.js";
import { mountStaffEditor } from "./editor.js";
import { mountStudent } from "./student.js";

const options = new URLSearchParams(location.search);
const demo = options.get("demo") === "1";
const api = demo ? createDemoApi() : createHttpApi();
const root = document.querySelector("#app");
let unmount = () => {};

function showHome() {
  unmount();
  unmount = mountStudent(root, { demo, getRelease: demo ? getDemoRelease : undefined, openStaff });
}

function openStaff() {
  unmount();
  unmount = mountStaffEditor(root, { api, demo, onHome: showHome });
}

if (options.get("staff") === "1") openStaff();
else showHome();
