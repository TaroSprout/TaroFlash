# Hazards

Every known **system hole** across the corpus, gathered in one place. A hazard is
somewhere the obvious assumption is quietly wrong and it costs you.

> **Generated — do not hand-edit.** This list is built from every topic with
> `hazard: true` in its frontmatter. To add or change an entry, edit the topic;
> to review before touching an area, read this. See
> [CONTRIBUTING → Hazards](./CONTRIBUTING.md#hazards).

Check this before planning or verifying work in an area — an agent about to touch
a domain reads its hazards first.

---

### Widening a permission ripples everywhere

**[[permissions]]** · authz

Loosen one `can_` rule and every query that was leaning on the old, tighter rule
silently widens too — including ordinary screens you forgot were trusting it. The
flip side of the "change it in one place" convenience. A screen that must stay
narrow has to scope itself; the permission can't.

### A file lives or dies by its notes, not the bucket

**[[media]]** · media

The hourly cleanup treats any file with no live note pointing at it as garbage.
That makes the note the file's lifeline: delete a shared file directly and you
break every other card using it; leave a file in a media bucket untracked and the
next sweep eats it. Touch these buckets only through the notes.
