---
id: sound
domain: sfx
status: current
hazard: true
related: []
updated: 2026-08-08
---

# Sound

The taps, chimes, and clicks the interface makes — and why they go silent on a
phone when nothing looks wrong.

Every sound is a short clip, decoded once at startup and fired down a single
audio channel the browser hands out. The channel is not always open. A browser
keeps it shut until the person has actually touched the page, and a phone shuts
it again whenever the screen locks or another app takes the foreground.

So the interesting part of sound here isn't the playing. It's the reopening.

> [!HAZARD] [K:ios-audio-interruption] **On iPhone the audio channel doesn't merely pause — it lands in a broken state that asking it to resume cannot fix.**
> Locking the screen, taking a call, or switching apps drops the channel into a
> state WebKit invented and no other browser has: _interrupted_. It looks
> recoverable and isn't. The standard "carry on" call can hang forever without
> ever reporting that it failed, so code waiting on the answer waits for good.
> Two further edges make it worse. Only a **completed** touch counts as
> reactivating — the finger lifting, never the finger landing — so listening for
> the press instead of the release buys nothing at all. And asking to resume
> before the person has touched anything is exactly what autoplay blocking
> exists to reject; the browser refuses and logs a scolding of its own.
> The only cure is to throw the channel away and build a fresh one inside the
> gesture. [How the app recovers ↓](#reopening-the-channel)

## Reopening the channel

The app never assumes the channel survived anything. It watches for every
signal that the page has come back — the tab becoming visible, the window
regaining focus, the page being restored from the browser's back-forward
cache, the channel itself announcing a state change — and treats all of them
the same way: assume audio is dead, and get ready for the next touch.

That readiness is the actual repair. A listener waits for the next completed
gesture anywhere on the page, and when it fires, the old channel is discarded
and a new one built on the spot, inside that gesture. The decoded clips are not
tied to a channel, so nothing has to be downloaded again.

Two smaller precautions ride along:

- The listener runs on the way **down** the page rather than on the way back
  up, so a control that stops the event from travelling further can't swallow
  the one gesture that would have restored sound.
- If the repair doesn't confirm shortly after the touch, it arms itself again.
  Otherwise a single unlucky tap — one where heavy work elsewhere starved the
  confirmation — would leave the app mute for the rest of the visit.

> [!WATCH]
> Coming back from the background, the channel can report itself as perfectly
> healthy while the hardware is dead. Its own account of its state is not
> evidence, so the return-from-background path rebuilds regardless of what the
> channel claims.

## Volume is three settings, not one

Sounds are grouped into buses — interface, hover, and so on — and each bus has
its own level that the member controls. A clip's designed loudness is scaled by
its bus's setting, so turning hover sounds down doesn't touch anything else.

The settings exist twice over: a committed baseline that came from the member's
saved preferences, and a working copy. Dragging a volume slider moves the
working copy so the previewed sounds play at the new level immediately; leaving
without saving restores the baseline.

## What this isn't

Not lesson audio. A recorded lesson is a normal streamed audio element with its
own seeking and playback position — a different mechanism with different
constraints, sharing nothing with the effects channel described here.

Not music. There is no continuous background track, which is why the app is
careful to avoid touching the audio channel for a clip that would play at zero
volume anyway: doing so steals audio focus from whatever the person is actually
listening to and pauses it.
