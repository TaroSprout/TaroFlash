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

type Lesson = {
  id: number
  member_id?: string
  title: string
  audio_path: string
  transcript: LessonTranscript
  lang?: string
  created_at?: string
  updated_at?: string
}

// A term the reader tapped or selected, with the sentence it sits in (translator
// context) and the rect to anchor the details popover against.
type TermSelection = {
  term: string
  sentence: string
  rect: DOMRect
}
