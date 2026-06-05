import * as fs from 'fs';
import * as path from 'path';
import { AuditEvent } from './types.js';

/**
 * Audit logger for security events.
 *
 * Events are written eagerly (line-delimited JSON) so that consumers can read
 * the log back immediately after a call. Each persisted event is normalized to
 * always carry both `type`/`eventType` and `allowed`/`success` so downstream
 * tooling can rely on either field name.
 */
export class AuditLogger {
  private logPath?: string;
  private ready = false;

  constructor(logPath?: string) {
    this.logPath = logPath;
    if (logPath) {
      this.initLogFile();
    }
  }

  /**
   * Initialize log file
   */
  private initLogFile(): void {
    if (!this.logPath) return;

    try {
      const dir = path.dirname(this.logPath);
      if (dir && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.ready = true;
    } catch (error) {
      console.error('Failed to initialize audit log:', error);
    }
  }

  /**
   * Normalize an event so both naming styles are always present on disk.
   */
  private normalize(event: AuditEvent): Record<string, any> {
    const type = event.type ?? event.eventType;
    const success = event.success ?? event.allowed;
    return {
      ...event,
      type,
      eventType: event.eventType ?? type,
      success,
      allowed: event.allowed ?? success,
    };
  }

  /**
   * Log an audit event (written immediately and synchronously).
   */
  log(event: AuditEvent): void {
    const normalized = this.normalize(event);
    const line = JSON.stringify(normalized);

    if (this.ready && this.logPath) {
      try {
        fs.appendFileSync(this.logPath, line + '\n');
      } catch (error) {
        console.error('Failed to write audit log:', error);
      }
    } else {
      // No file configured - emit to console
      console.log('[AUDIT]', line);
    }
  }

  /**
   * Flush is a no-op now that writes are synchronous, kept for API compatibility.
   */
  flush(): void {
    // Writes are synchronous; nothing to flush.
  }

  /**
   * Read all persisted audit events back from disk.
   */
  async readLogs(): Promise<Array<Record<string, any>>> {
    if (!this.logPath || !fs.existsSync(this.logPath)) {
      return [];
    }

    const content = fs.readFileSync(this.logPath, 'utf-8');
    return content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter((e): e is Record<string, any> => e !== null);
  }

  /**
   * Close the logger. Writes are synchronous, so this only marks the logger
   * inactive; kept async for API compatibility.
   */
  async close(): Promise<void> {
    this.ready = false;
  }
}
