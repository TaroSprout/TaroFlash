// Pre-launch: cap every bump at "minor". Breaking-change commits (`feat!:` /
// `BREAKING CHANGE:` footer) would normally trigger a major release, which we
// don't want before the official launch. Remove the `releaseRules` override
// below (and the `major` line disappears on its own) once we're ready to
// start cutting 1.0.0+.
const PRE_LAUNCH_RELEASE_RULES = [{ breaking: true, release: 'minor' }]

module.exports = {
  branches: ['master'],
  tagFormat: 'v${version}',
  plugins: [
    ['@semantic-release/commit-analyzer', { releaseRules: PRE_LAUNCH_RELEASE_RULES }],
    '@semantic-release/release-notes-generator',
    [
      '@semantic-release/github',
      {
        successComment: false,
        failComment: false,
        releasedLabels: false
      }
    ]
  ]
}
