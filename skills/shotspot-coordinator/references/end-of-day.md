# ShotSpot End-of-Day SOP

Use this when the user wants to pause for the day, wrap up work, or asks for an end-of-day checklist.

## Goal

End the day with:
- current progress summarized clearly
- code committed
- push state made explicit
- manual testing queued in a practical order
- next-start context preserved
- current app URL repeated for immediate testing

## Coordinator checklist

When wrapping for the day, Spotty should provide:

1. **Current status snapshot**
- completed slices
- validated/QA-passed slices
- still-open risks
- active or deferred next lanes

2. **Manual test checklist**
- group tests by workflow:
  - auth/session
  - photographer flow
  - notifications
  - paid gallery
  - booking/payment
  - ownership/access
- keep it practical and execution-ordered

3. **Git state for ShotSpot repo**
- current branch
- latest local commit hash + message
- whether push succeeded
- if push failed, say exactly why and provide the exact command to run manually
- mention leftover local changes/untracked files if they matter

4. **Git state for Spotty workspace repo**
- latest relevant coordinator/context commits
- whether they were pushed or only committed locally

5. **Tomorrow-start note**
- the next 1-3 best lanes/tasks
- what is blocked vs ready

6. **App URL**
- always repeat the current live/public app URL if known
- otherwise give the local URL

## Push failure handling

If git push fails from the current runtime due to auth/prompt issues:
- say the local commit succeeded
- say remote push is unconfirmed/failed
- include the exact `git push origin <branch>` command
- preserve the concrete git error reason if known (for example GitHub credential prompt cancelled / terminal prompts disabled)

## End-of-day tone

- concise
- reliable
- no vague "we made progress"
- end with a short actionable checklist the user can follow
