type LogEntry = {
  level: string
  timestamp: string
  message: string
  callerTrace: string
  info: unknown[]
}

const LogTypes: { [key: number]: string } = {
  0: 'none',
  1: 'error',
  2: 'warn',
  3: 'info',
  4: 'debug'
}

class LoggerClass {
  logLevel = 0
  logs: LogEntry[] = []

  setLogLevel(level: number): void {
    if (level < 0 || level > 4) {
      this.error(`Invalid log level: ${level}`)
      return
    }

    this.logLevel = level
  }

  debug(message: string, ...info: unknown[]): void {
    this._log('debug', message, ...info)
  }

  info(message: string, ...info: unknown[]): void {
    this._log('info', message, ...info)
  }

  warn(message: string, ...info: unknown[]): void {
    this._log('warn', message, ...info)
  }

  error(message: string, ...info: unknown[]): void {
    this._log('error', message, ...info)
  }

  private _log(level: string, message: string, ...info: unknown[]) {
    if (!('logger' in window)) {
      ;(window as any).logger = this
    }

    const callerTrace = this._getCallerTrace()
    const formattedMessage = `${callerTrace} - ${message}`
    const timestamp = new Date().toISOString()

    this.logs = [
      ...this.logs,
      {
        level,
        timestamp,
        message,
        callerTrace,
        info
      }
    ]

    const index = Object.values(LogTypes).findIndex((l) => l === level)

    if (index <= this.logLevel) {
      ;(console as any)[level](`[${level.toUpperCase()}] ${formattedMessage}`, ...info)
    }
  }

  private _getCallerTrace(skipFile = 'logger.ts'): string {
    const stack = new Error().stack
    if (!stack) return 'unknown'

    const lines = stack.split('\n')

    for (const line of lines) {
      if (!line.includes(skipFile)) {
        const match = line.match(/\(?([^\s)]+:\d+:\d+)\)?$/)
        if (match?.[1]) {
          let url = match[1]

          url = url.replace(/^https?:\/\/[^/]+\/?/, '')
          url = url.replace(/\?.*?(?=:)/, '')
          url = url.replace(/^webpack:\/\/customer-flows\/\./, '')

          return url
        }
      }
    }

    return 'unknown'
  }
}

const Logger = new LoggerClass()
export default Logger
