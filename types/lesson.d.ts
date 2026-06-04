type TranscriptSegment = {
  start: number
  end: number
  text: string
}

type TranscriptWord = {
  word: string
  start: number
  end: number
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
