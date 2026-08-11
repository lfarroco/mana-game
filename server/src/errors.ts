/**
 * Typed API error — carries an HTTP status and a stable machine-readable code.
 *
 * Thrown by DTO validation and services; mapped to JSON by the global
 * error-handling middleware. Keeps the API contract explicit instead of
 * leaking raw `Error` messages with a generic 500.
 */

export type ApiErrorCode =
  | "invalid_request"
  | "invalid_player_id"
  | "invalid_crystal_id"
  | "invalid_queue_type"
  | "invalid_action"
  | "invalid_action_type"
  | "session_already_exists"
  | "no_active_session"
  | "session_finished"
  | "action_rejected"
  | "internal_error";

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;

  constructor(status: number, code: ApiErrorCode, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}
