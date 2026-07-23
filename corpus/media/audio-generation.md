---
id: audio-generation
domain: media
status: current
hazard: true
related: [media]
updated: 2026-07-23
---

# Audio generation

Turning a recorded lesson — a talk, a chapter of a book — into a readable,
follow-along transcript: the words, their timings, chapter breaks, translations,
and pronunciation readings.

Upload an hour of audio and the work can't happen in one go. It's too much for a
single machine to finish before it's cut off.

So the job is broken into small steps, and the lesson itself remembers where it
is between them:

1. Each step does **one small piece** of work and writes the result back onto
   the lesson.
2. That write **wakes the next step**, which reads where things stand and does
   the next piece.

The lesson carries a status through this — _processing_ while the chain runs,
_ready_ when it finishes, _failed_ if a step gives up. A reader only sees the
finished thing.

> [!HAZARD] **A stuck job and a slow-but-healthy job look identical — so the safety net that rescues the first will strangle the second.**
> Nothing watches a step from the inside. The only sign a lesson is still alive
> is that it wrote something recently; go quiet for ten minutes and a background
> sweep declares it dead and marks it failed. That's what rescues a job whose
> chain truly broke — but it's the same clock, and a step that legitimately runs
> long trips it while still working. Worse, that step's late result lands on a
> row already marked failed, where nothing will pick the chain back up: real work
> completed, then stranded.
> [See how the sweep decides ↓](#the-sweep-is-the-backstop)

## The chain moves one step at a time

The steps run in a fixed order: transcribe the words, find the chapters,
translate the sentences, add the readings, done.

No single machine holds the whole job. Each step wakes, reads the lesson to see
which step is due, does exactly that one piece, and writes it back. That write is
what fires the next step. The last step marks the lesson _ready_ and the chain
stops.

The long steps are split finer still. A big upload is cut into overlapping
slices before it's ever sent, and transcribing chews through **one slice per
wake**. Translating and adding readings work through the sentences a batch at a
time the same way. So no single wake ever tries to swallow the whole lesson.

> [!NOTE]
> The split happens on the uploader's own device before anything is sent — the
> audio arrives already carved into ordered slices with a map of where each one
> belongs in the timeline. A short file skips this and travels as one slice.

## The sweep is the backstop

If a step is lost — the machine dies, the wake-up never arrives — the lesson
would otherwise sit in _processing_ forever. A sweep runs every minute, finds
lessons that have been quiet too long, and marks them failed so the reader stops
waiting on a ghost.

"Quiet too long" is the whole judgment: the sweep can't see inside a running
step, only when the lesson last wrote. Every step writes as it finishes its
slice, and that write doubles as a heartbeat. The entire arrangement leans on one
unstated promise — **that one slice always finishes well inside the deadline.**
Size the slices wrong, or hand a step an unusually heavy one, and a perfectly
healthy job gets reaped mid-breath.

## Restarting means starting from scratch

A failed lesson can be retried. The audio is still stored, so a retry doesn't
re-upload — it resets the lesson to the very first step and lets the chain run
again.

The reset has to wipe the half-built transcript first, and this is not optional.
Transcribing **appends** each slice onto what's already there. Point it at a
lesson that already holds half a transcript and it stitches the new work onto the
old — silently doubling content instead of resuming cleanly.

> [!WATCH]
> There's no "resume from where it died." The only safe restart is a full reset
> to step one with the transcript cleared. A reaped lesson still carries its
> half-finished transcript; whatever restarts it owns clearing that first, or the
> next run builds on garbage.

## Enrichment is allowed to come up short

Only the transcript is load-bearing. Chapters, translations, and readings are
enrichments — each step tries, and if it can't, it moves on rather than failing
the whole lesson. A book with no clear chapter breaks simply gets one chapter; a
sentence the translator chokes on is left untranslated. The reader still opens.

The words themselves are the exception. If transcription fails, there's nothing
to read, and the lesson fails outright.

## What this isn't

- **Not storage or cleanup.** Where the audio file lives, how it's shared, and
  when it's swept away is [[media]]'s job — this is only how the transcript is
  produced.
- **Not who may run it.** Whether a member is allowed to generate or read lesson
  audio is a permission check, a separate concern.
- **Not the model wiring.** Which model does which step, the slice sizes, the
  deadline, and how the steps signal each other are code detail — the reference
  docs cover those.

## Related

[[media]]
