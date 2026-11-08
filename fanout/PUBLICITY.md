# PUBLICITY: tokenizer-lab (P02)

Publicity log for the written fan-out set. Drafts were prepared by
the loop; actual social posting follows the standing platform rules
and gates, and the loop never posts to social. Grades for these
pieces are kept internally, outside the public repo.

Fan-out set date: 2026-11-04. Project state at the time: Learn,
Build, and compressed Deep done 2026-11-04, 36 tests passing.

## The fan-out set (moved from README.md, 2026-11-08)

- fanout/blog-post.md: the build story and the measured results,
  with the main results claim and the honest limits.
- fanout/tutorial.md: course module P02-tokenizer-lab. Every
  command in it was run and verified at v1.0 (three runners, three
  per-level test discoveries, full suite at 36 tests).
- fanout/website-page.md: project page copy only. Nothing was
  published to any website by this set.
- fanout/linkedin-post.md: LinkedIn draft, marked DRAFT NOT
  POSTED, link carried as the first-comment line per the platform
  rule.
- fanout/paper-candidate.md: brief for the tokenizer choice cost
  and quality study on held-out text. Submission is Jesun's tap;
  nothing submitted, no venue contacted.
- fanout/release-notes.md: draft notes for the existing releases
  v0.1, v0.5, and v1.0 only. No new release was created.

These drafts are dated 2026-11-04. They refer to the file names of
that time: SPEC.md, NOVELTY.md, DOSSIER.md and level-3-deep/DEEP-SPEC.md
are now in PROPOSAL.md; ROADMAP.md is now REPORT.md, section Future work.

Jev claim_check on the blog main results claim, 2026-11-04: model
jev-1.13.0, question id supported (noul), noul 0.87, route CLEAR
(clear at 0.85 or above, review between 0.10 and 0.85, block at
0.10 or below), usage 1,946 input tokens and 20 output tokens.
Spec: hidden_files/jev-p02-fanout-claim-spec-2026-11-04.json and
results: hidden_files/jev-p02-fanout-claim-results-2026-11-04.json
in the owning goal workspace.

## Channel log (2026-11-04)

| Channel | Outcome on 2026-11-04 |
| --- | --- |
| GitHub releases | Live: v0.1 https://github.com/JesunAhmadUshno/tokenizer-lab/releases/tag/v0.1 , v0.5 https://github.com/JesunAhmadUshno/tokenizer-lab/releases/tag/v0.5 , v1.0 https://github.com/JesunAhmadUshno/tokenizer-lab/releases/tag/v1.0 (verified with gh release list, 2026-11-04). Draft release notes for all three are in fanout/release-notes.md. No new release was created for the fan-out. |
| Portfolio index | Held: fan-out links are ready, the index update is a coordinator step outside this cycle. Named reason: held for index refresh. |
| Website page | Draft in fanout/website-page.md. Held: not published to jesunahmadushno.com. |
| Blog | Draft in fanout/blog-post.md. Held: not posted. |
| Tutorial | In repo: fanout/tutorial.md. Every command in it was run and verified on 2026-11-04 (three runners, three per-level test discoveries, full suite at 36 tests). |
| LinkedIn post | Draft in fanout/linkedin-post.md, marked DRAFT NOT POSTED, link carried as the first-comment line per the LinkedIn rule. Held: not posted, loop never posts. |
| X | Draft held: no X copy is shipped in this set beyond the LinkedIn draft source text. Held under the standing social rules; posting is outside the loop. |
| Facebook | Draft held: no Facebook copy posted. Standing rule applies (no link in body or comments, keyword call to action fulfilled by DM). Held: not posted, loop never posts. |
| Instagram | Draft held: no Instagram copy posted. Standing rule applies (no clickable link in caption, link in bio). Held: not posted, loop never posts. |
| Threads | Draft held: no Threads copy posted. Threads waits for Jesun's tap per post, hash-locked on exact text and media. Held: awaiting Jesun's tap. |
| Video | Held: engine queue, January production for lab projects per the December Compression Protocol. No video was produced in this cycle. |
| Book chapter | Draft angle in fanout/blog-post.md and SPEC.md ("Words Into Numbers"). Held: chapter draft follows the finished project set; not a published chapter. |
| Paper candidate | Draft brief in fanout/paper-candidate.md (tokenizer choice cost and quality study on held-out text). Submission is Jesun's tap. Nothing submitted, no venue contacted. Tracker finding on 2026-11-04: no P02 row exists in the publications pipeline tracker; adding one is a coordinator step outside this cycle. |

Applied through a pull request on 2026-11-05, following the Actions
polish pack standard. The pack adds: CI on a Python 3.11 and 3.12
matrix with a ruff lint step (all pre-existing P02 CI steps
preserved: smoke test, Learn tests and training run, Build tests
and run, Deep tests and run), CodeQL scanning, Dependabot for pip
and GitHub Actions, a release workflow that attaches a source
tarball named tokenizer-lab-<tag>.tar.gz to v* tag releases,
Labeler, Greetings (snake_case inputs for
actions/first-interaction@v3: repo_token, issue_message,
pr_message), Stale in comment-only mode (days-before-close: -1,
never closes), and a docs summary page at docs/index.md for
GitHub Pages. Ruff scope is recorded in ruff.toml (E, F, I,
line-length 120). Ruff fixes in this pull request were style
only: 9 initial errors (5 import order, 3 module import not at
top from the sys.path pattern, 1 unused local import), fixed by
ruff fix output, noqa E402 markers on the path-insert imports,
and removal of one unused local import, with no change to
behaviour. requirements.txt records the standard-library-only
fact so Dependabot pip has a manifest to watch.

| Channel | Outcome on 2026-11-05 |
| --- | --- |
| GitHub Pages | Docs page added at docs/index.md in this pull request. Pages enablement and live build status are verified after merge and recorded in the batch ledger; no live claim is made in this file before that check. |
| PyPI publishing | Held: needs a PyPI token, a new credential. Jesun's tap only. Not set up. |
| Social channels (LinkedIn, X, Facebook, Instagram, Threads) | Held: no posts made. The loop never posts to social; Threads waits for Jesun's tap per post under the standing gates. |

Note, 2026-11-08: docs/index.md was removed in the move to the portfolio
standard v2. GitHub Pages now builds the live dashboard from site/ (see
.github/workflows/pages.yml); the summary it carried is in README.md and REPORT.md.
