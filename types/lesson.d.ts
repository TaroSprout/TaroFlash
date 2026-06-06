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

type LessonTranscript = {
  text: string
  segments: TranscriptSegment[]
  words?: TranscriptWord[]
}

// Lifecycle of the background transcription job. A lesson row exists from upload
// onward: 'processing' while the worker transcribes, 'ready' once the transcript
// is filled, 'failed' if the worker gave up (see error_code).
type LessonStatus = 'processing' | 'ready' | 'failed'

// The worker's current step while processing, surfaced as a progress label.
type LessonPhase = 'transcribing' | 'translating' | 'transliterating'

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
  created_at?: string
  updated_at?: string
}

// Shape returned by the lesson_collections_with_counts view — the dashboard
// card reads the lesson count from here in a single query.
type LessonCollectionWithCount = LessonCollection & {
  lesson_count: number
}

// A term the reader tapped or selected, with the sentence it sits in (translator
// context) and the rect to anchor the details popover against.
type TermSelection = {
  term: string
  sentence: string
  rect: DOMRect
}
