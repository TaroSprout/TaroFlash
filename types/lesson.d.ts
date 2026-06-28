// Which Chinese script the transcript text is converted to after Whisper runs.
// 'original' keeps Whisper's own output (it tends to emit Traditional).
type TranscriptScript = 'original' | 'simplified' | 'traditional'

type TranscriptSegment = {
  start: number
  end: number
  text: string
  // Target-language translation of this sentence, added after transcription.
  translation?: string
}

type TranscriptWord = {
  word: string
  start: number
  end: number
  // Phonetic reading shown above the word in the reader (furigana, pinyin, …);
  // empty/absent when the word needs none or the lesson predates transliteration.
  reading?: string
}

// A chapter boundary detected over the finished transcript: a title plus the
// audio offset (seconds) where it begins. Derived in the 'chaptering' phase, so
// absent on lessons that predate chaptering or were too short to split.
type TranscriptChapter = {
  title: string
  // Audio offset (seconds) of the chapter's first segment.
  start: number
}

type LessonTranscript = {
  text: string
  segments: TranscriptSegment[]
  words?: TranscriptWord[]
  // Auto-detected chapters spanning the whole audio, in playback order. The
  // reader renders these as an in-lesson jump-list; empty/absent for a single
  // unchaptered lesson.
  chapters?: TranscriptChapter[]
}

// One Whisper-sized slice of the source audio. A long upload is split client-side
// into overlapping windows; the worker transcribes them in order and stitches the
// results back with `offset`. A short file is a single chunk pointing at
// audio_path itself.
type LessonChunk = {
  // Storage path of the chunk object in the audio-lessons bucket.
  path: string
  // Start time (seconds) of this chunk within the original audio — added to the
  // chunk's local timestamps when stitching.
  offset: number
}

// Lifecycle of the background transcription job. A lesson row exists from upload
// onward: 'processing' while the worker transcribes, 'ready' once the transcript
// is filled, 'failed' if the worker gave up (see error_code).
type LessonStatus = 'processing' | 'ready' | 'failed'

// The worker's current step while processing, surfaced as a progress label.
// 'transcribing' loops over the audio chunks before advancing; 'chaptering'
// splits the finished transcript into chapters.
type LessonPhase = 'transcribing' | 'chaptering' | 'translating' | 'transliterating'

type Lesson = {
  id: number
  member_id?: string
  collection_id: number
  title: string
  audio_path: string
  transcript: LessonTranscript
  lang?: string
  status: LessonStatus
  // Chapter order within the collection (numeric sort key, server-assigned).
  position: number
  // The step in flight while status is 'processing'; null/absent once settled.
  phase?: LessonPhase | null
  // Whisper-sized slices of the audio, in playback order. The worker transcribes
  // them one per invocation and stitches by offset. A short lesson has a single
  // chunk pointing at audio_path.
  chunks?: LessonChunk[]
  // Index of the next chunk the 'transcribing' phase will process. Advancing it
  // (like advancing phase) re-fires the processing chain.
  chunk_cursor?: number
  // Machine-readable failure reason when status is 'failed'.
  error_code?: string | null
  // Script the transcript was converted to; a retry reproduces it.
  script?: TranscriptScript
  created_at?: string
  updated_at?: string
}

// A deck-like grouping of lessons. Every lesson belongs to exactly one.
type LessonCollection = {
  id: number
  member_id?: string
  title: string
  // The last chapter the member opened — the dashboard reopens the book here.
  // null/absent until they open the collection for the first time.
  last_lesson_id?: number | null
  // Audio offset (seconds) within last_lesson_id where the member left off, so the
  // reader resumes mid-chapter. One resume point per book; defaults to 0.
  last_position_seconds?: number | null
  created_at?: string
  updated_at?: string
}

// Shape returned by the lesson_collections_with_counts view — the dashboard
// card reads the lesson count from here in a single query.
type LessonCollectionWithCount = LessonCollection & {
  lesson_count: number
}

// A term the reader tapped or selected, with the sentence it sits in (translator
// context), the rect to anchor the details popover against, and its first/last
// word indices so playback can seek there ("play from here") or play just the
// phrase ("play word").
type TermSelection = {
  term: string
  sentence: string
  rect: DOMRect
  word_index: number
  word_end_index: number
}
