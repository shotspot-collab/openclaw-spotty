# Spotty Parallel Feature Lanes SOP

Use this when the user explicitly wants multiple ShotSpot tasks advanced in parallel.

## Goal

Increase throughput without causing file collisions, broken handoffs, or unclear ownership.

Parallel execution is the default preference when ShotSpot has multiple high-value tasks that can move simultaneously without unsafe overlap.

## Preconditions

Before opening parallel lanes:
- confirm the work is in `C:\Users\nbobb\shotspotwork\ShotSpotMainApp`
- keep one canonical task file as the source of truth unless tasks are clearly separable enough to warrant split task files
- identify whether each candidate lane is:
  - implementation
  - test/QA
  - docs/SOP
  - infra/deploy-readiness
- check for likely file overlap before spawning more than one Developer

## Safe parallelization rules

Prefer parallel lanes only when the work touches mostly separate files or layers.

Good parallel pairings:
- worker runtime task + API/auth task
- implementation lane + QA/docs lane
- architecture/design lane + implementation lane for a different file area
- backend task + frontend task with minimal shared contract churn

Avoid parallel lanes when:
- both lanes edit the same route, schema, or shared repository file
- one lane depends on schema/API contracts the other lane is still changing
- the repo is already in a red state and root cause is unknown
- deploy steps would be required to validate either lane

## Lane sizing

Default to at most:
- 2 active Developer lanes
- 1 active QA lane
- 1 active Architect lane

Expand beyond that only if the user explicitly asks and file boundaries are very clear.

## Lane types

### Lane A: Primary feature lane
Use for the highest-priority unfinished implementation item.

### Lane B: Secondary low-overlap lane
Use for one of:
- unrelated typecheck/test debt blocking validation
- integration coverage in a separate test surface
- workflow/SOP/doc improvements
- an adjacent feature in a separate module

## Coordinator responsibilities

For each lane, Spotty should record:
- lane name
- owning role/subagent
- task objective
- expected files/modules
- dependency/blocker status
- merge/handoff order

Spotty should tell the user:
- which role is active in each lane
- why the lanes are safe to run in parallel
- what the rejoin point is

## Handoff / rejoin order

Recommended rejoin order:
1. finish the lane with shared dependency impact first
2. hand completed implementation lanes to QA independently when possible
3. synthesize both lanes into one Coordinator update
4. only propose deploy/readiness after all selected lanes are green enough

## Conflict handling

If parallel lanes drift into the same files:
- stop opening new lanes
- keep the more critical lane active
- re-scope the secondary lane to docs/tests/another surface
- tell the user exactly why the fan-out was reduced

## Suggested task mix for current ShotSpot state

Given the current repo state, prefer:
- Lane A: highest-priority unfinished product/runtime work
- Lane B: repo validation hardening or workflow/SOP improvement with low overlap

Do not parallelize two schema-heavy lanes at the same time unless an Architect explicitly split the contracts first.
lit the contracts first.
