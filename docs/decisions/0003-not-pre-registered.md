# 0003: Not pre-registered; v1.0 tag kept, verdict re-scored to Functional

Date: 2026-11-08. Status: accepted. Decided by: Jesun Ahmad Ushno.

## Context

The portfolio standard v2 (METHOD section 7) caps a repo at Functional
unless git history proves a locked plan came before any result. Here
SPEC.md (f5172d3) came before code but has no hypotheses or pass
lines, and the study definition (DEEP-SPEC.md) arrived in the same
commit as its results (a073bd2). The repo also carries a v1.0 tag and
release from the old Learn / Build / Deep ladder.

## Decision

The repo is labelled "not pre-registered" and its verdict is
Functional. No proposal-v1 tag is created, because a lock placed after
results exist would be false. The existing tags v0.1, v0.5 and v1.0
and their releases are kept unchanged as history; under standard v2,
"v1.0 Released" is a verdict this repo has not earned.

## Consequences

The cap lifts only through a confirmatory cycle: lock a new
PROPOSAL.md with hypotheses, pass lines and the expected baselines,
tag it proposal-v1, then run. The tag name v1.0 may read as more than
the verdict; the README states the verdict explicitly.
