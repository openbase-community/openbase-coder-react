import { describe, expect, it } from "vitest";

import {
  availableInstallScopes,
  installRequest,
  type MarketplaceSkill,
} from "./marketplaceTypes";

const skill: MarketplaceSkill = {
  id: 1,
  slug: "safe-skill",
  name: "Safe Skill",
  tagline: "Pinned and reviewed",
  description: "A safe test fixture.",
  category: "Testing",
  kind: "skill",
  docs_url: "",
  install_notes: "",
  featured: false,
  featured_rank: null,
  install_count: 0,
  source: {
    repository_url: "https://github.com/openbase/safe-skill",
    commit: "a".repeat(40),
    path: ".",
    integrity: null,
  },
  installable: true,
  installed_targets: {
    home: "not_installed",
    normal_claude: "conflict",
    openbase_codex: "installed",
    openbase_claude: "not_installed",
  },
};

describe("marketplace install contract", () => {
  it("excludes conflicting targets from installation choices", () => {
    expect(availableInstallScopes(skill)).toEqual([
      "home",
      "openbase_codex",
      "openbase_claude",
    ]);
  });

  it("sends only the slug, pinned commit, targets, and explicit confirmation", () => {
    expect(installRequest(skill, ["home"])).toEqual({
      slug: "safe-skill",
      commit: "a".repeat(40),
      targets: ["home"],
      confirmed: true,
    });
  });
});
