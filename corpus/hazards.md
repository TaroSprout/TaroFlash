# Hazards

The roll-call of every known **system hole** — somewhere the obvious assumption
is quietly wrong and it costs you. One line each, ordered roughly by blast
radius: data loss and silent corruption first, design ceilings and footguns last.

> **A roll-call, not a store.** Each trap's full text lives in its topic, at the
> slug named here — `grep -rn '\[K:<slug>\]' corpus/` lands on it. This file
> restates nothing, so it cannot drift. To add or change a trap, edit the topic —
> →[K:corpus-hazard-authoring].

You don't read this list to work. Each trap is echoed as a `→[K:<slug>]` pointer
in the directory it bites, so it reaches you when you're standing on it.

| Trap                                          | Topic                  | Echoed at                                                                                                                |
| --------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| →[K:unconfirmed-review-loss]                  | [[study]]              | `src/views/study-session/composables/`                                                                                   |
| →[K:deleted-account-token-outlives-deletion]  | [[sessions]]           | `src/api/session.ts`, `src/stores/`                                                                                      |
| →[K:return-destination-open-redirect]         | [[return-destination]] | `src/composables/auth/`                                                                                                  |
| →[K:oauth-popup-loses-its-opener]             | [[sessions]]           | `src/api/session.ts`                                                                                                     |
| →[K:stall-reaper-strands-slow-jobs]           | [[audio-generation]]   | `supabase/functions/transcribe-lesson/`                                                                                  |
| →[K:card-rank-byte-collation]                 | [[cards]]              | `supabase/schemas/40_cards/`                                                                                             |
| →[K:ownership-stamp-empty-under-service-role] | [[members]]            | `supabase/schemas/` (`set_member_id`)                                                                                    |
| →[K:permission-widening-ripples]              | [[permissions]]        | `supabase/schemas/` (the `can_` functions)                                                                               |
| →[K:media-lifetime-follows-notes]             | [[media]]              | `src/api/media/`                                                                                                         |
| →[K:client-owns-the-schedule]                 | [[scheduling]]         | `src/views/study-session/`                                                                                               |
| →[K:silent-stale-cache]                       | [[data-flow]]          | `src/api/reviews/mutations/`                                                                                             |
| →[K:postgrest-max-rows-truncates-silently]    | [[data-flow]]          | `src/api/**`                                                                                                             |
| →[K:pin-is-presence-not-difference]           | [[pacing]]             | `src/api/review-pacing/`                                                                                                 |
| →[K:closed-color-set-fails-bare]              | [[theming]]            | `src/utils/palette/`                                                                                                     |
| →[K:public-is-read-only]                      | [[decks]]              | `src/api/decks/`                                                                                                         |
| →[K:posts-hidden-until-published]             | [[feedback]]           | `src/api/feedback/`                                                                                                      |
| →[K:text-editor-ghost-click-guard]            | [[cards]]              | `src/components/card/`                                                                                                   |
| →[K:settled-transform-traps-overlays]         | [[layering]]           | `src/utils/animations/`                                                                                                  |
| →[K:ios-audio-interruption]                   | [[sound]]              | `src/sfx/`                                                                                                               |
| →[K:dock-height-single-owner]                 | [[mobile-dock]]        | `src/components/mobile-dock/`, `src/composables/ui/animated-height.ts`, `src/components/layout-kit/crossfade-resize.vue` |
| →[K:fixed-roles-skip-the-station]             | [[surface-stations]]   | `src/styles/main.css`                                                                                                    |
| →[K:app-window-fills-full-width]              | [[layout-kit]]         | `src/components/layout-kit/app-window/`                                                                                  |

A trap with no directory to echo it into is listed in `CLAUDE.md` instead, so it
is paid for in every session. There are none today.
