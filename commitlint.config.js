// Commit message rules. The human-readable version is .claude/skills/commit/SKILL.md.
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'refactor',
        'perf',
        'test',
        'docs',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    // Summary starts with a capitalised imperative verb: "Add NestJS 12 foundation".
    'subject-case': [2, 'always', 'sentence-case'],
    'header-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 72],
  },
};
