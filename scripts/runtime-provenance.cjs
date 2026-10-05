// Shared by both Vite builds and unpackaged Electron startup. No network calls.
const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const REPOS = {
  desktop: ["desktop", "coder-react", "multi-react", "boilersync-react"],
  console: ["console", "coder-react", "multi-react", "boilersync-react"],
  "desktop-main": ["desktop"],
};

function revision(repo) {
  if (!fs.existsSync(path.join(repo, ".git"))) return null;
  try {
    return execFileSync("git", ["-C", repo, "rev-parse", "--verify", "HEAD"], {
      encoding: "utf8", timeout: 3000, stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null; // Unknown must not masquerade as a current build.
  }
}

function capture(workspace, component) {
  const revisions = Object.fromEntries(REPOS[component].map((repo) => [repo, revision(path.join(workspace, repo))]));
  return {
    schema_version: 1,
    component,
    workspace_id: createHash("sha256").update(fs.realpathSync(workspace)).digest("hex"),
    revisions,
    verified: Object.values(revisions).every((value) => /^[0-9a-f]{40}$/.test(value || "")),
  };
}

function sameInputs(left, right) {
  return left?.verified && right?.verified && JSON.stringify(left) === JSON.stringify(right);
}

function electronFiles(desktop) {
  return Object.fromEntries(fs.readdirSync(path.join(desktop, "electron"))
    .filter((name) => /\.(cjs|json)$/.test(name))
    .sort()
    .map((name) => [name, createHash("sha256").update(fs.readFileSync(path.join(desktop, "electron", name))).digest("hex")]));
}

function provenancePlugin(workspace, component) {
  let initial = null;
  let main = null;
  let mainFiles = null;
  let enabled = false;
  return {
    name: "openbase-developer-provenance",
    config() {
      // CI/release builds carry no local workspace identity. Developer
      // dashboards also use `vite build`, so Vite's DEV flag is insufficient.
      enabled = !process.env.CI && fs.existsSync(path.join(workspace, "multi.json"));
      initial = enabled ? capture(workspace, component) : null;
      if (enabled && component === "desktop") {
        main = capture(workspace, "desktop-main");
        mainFiles = electronFiles(path.join(workspace, "desktop"));
      }
      return { define: { __OPENBASE_BUILD_PROVENANCE__: JSON.stringify(initial) } };
    },
    generateBundle() {
      if (!enabled) return;
      if (!sameInputs(initial, capture(workspace, component))) {
        this.error("Source commits changed during the build (or cannot be verified). Rebuild before using this developer bundle.");
      }
      this.emitFile({ type: "asset", fileName: "provenance.json", source: JSON.stringify(initial) });
      if (main) {
        if (!sameInputs(main, capture(workspace, "desktop-main")) || JSON.stringify(mainFiles) !== JSON.stringify(electronFiles(path.join(workspace, "desktop")))) {
          this.error("Desktop main/preload changed during the build. Rebuild before packaging.");
        }
        this.emitFile({ type: "asset", fileName: "desktop-main-provenance.json", source: JSON.stringify({ ...main, files: mainFiles }) });
      }
    },
    handleHotUpdate(context) {
      // A full reload provides a coherent new loaded manifest. Refresh the
      // define on the server through restart; don't label partial HMR current.
      if (enabled) void context.server.restart();
    },
  };
}

module.exports = { capture, sameInputs, provenancePlugin };
