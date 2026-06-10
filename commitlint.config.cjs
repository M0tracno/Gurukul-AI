/**
 * Commitlint configuration.
 *
 * Extends the Conventional Commits ruleset (already installed via
 * `@commitlint/config-conventional`) so the Husky `commit-msg` hook can
 * validate commit messages. A `.cjs` extension is used because the package
 * is an ES module (`"type": "module"`).
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
};
