const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { capture, sameInputs, provenancePlugin } = require("./runtime-provenance.cjs");

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "provenance-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "multi.json"), "{}");
  for (const name of ["desktop", "coder-react", "multi-react", "boilersync-react"]) {
    const dir = path.join(root, name);
    fs.mkdirSync(dir);
    execFileSync("git", ["init", "-q", dir]);
    fs.writeFileSync(path.join(dir, "code"), "a");
    commit(dir);
  }
  fs.mkdirSync(path.join(root, "desktop/electron"));
  fs.writeFileSync(path.join(root, "desktop/electron/main.cjs"), "module.exports = 1");
  return root;
}
function commit(dir) {
  execFileSync("git", ["-C", dir, "add", "."]);
  execFileSync("git", ["-C", dir, "-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "-qm", "source"]);
}

test("shared dependency commits invalidate the frozen loaded build", (t) => {
  const root = fixture(t);
  const loaded = capture(root, "desktop");
  fs.writeFileSync(path.join(root, "coder-react/code"), "b");
  commit(path.join(root, "coder-react"));
  const rebuilt = capture(root, "desktop");
  assert.equal(sameInputs(loaded, rebuilt), false);
  assert.equal(sameInputs(rebuilt, capture(root, "desktop")), true);
  assert.equal(JSON.stringify(loaded).includes(root), false);
});

test("builds reject a commit change during compilation", (t) => {
  const root = fixture(t);
  const saved = process.env.CI;
  delete process.env.CI;
  t.after(() => saved === undefined ? delete process.env.CI : process.env.CI = saved);
  const plugin = provenancePlugin(root, "desktop");
  plugin.config();
  fs.writeFileSync(path.join(root, "multi-react/code"), "b");
  commit(path.join(root, "multi-react"));
  assert.throws(() => plugin.generateBundle.call({ error: (m) => { throw new Error(m); } }), /changed during/);
});

test("release CI emits no developer stamp", (t) => {
  const saved = process.env.CI;
  process.env.CI = "true";
  t.after(() => saved === undefined ? delete process.env.CI : process.env.CI = saved);
  const plugin = provenancePlugin("/does-not-exist", "desktop");
  assert.equal(plugin.config().define.__OPENBASE_BUILD_PROVENANCE__, "null");
  plugin.generateBundle.call({ emitFile: () => assert.fail("production emitted provenance") });
});
