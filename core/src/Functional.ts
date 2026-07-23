/**
 * Lightweight functional primitives for @mana/core.
 *
 * ## Conventions enforced by these types
 *
 * 1. **No null / undefined in return types** — use `Option<T>`.
 * 2. **No throw in pure functions** — use `Result<T, E>`.
 * 3. **Match exhaustively** — always handle both tags. The `never` trick
 *    in the default branch catches missing cases at compile time.
 * 4. **Prefer `readonly` on all shared data types** — mutable state is the
 *    single biggest source of bugs in game logic 
 */

// ---------------------------------------------------------------------------
// Option
// ---------------------------------------------------------------------------

export type Option<T> =
	| { readonly _tag: "some"; readonly value: T }
	| { readonly _tag: "none" };

export const some = <T>(value: T): Option<T> => ({ _tag: "some", value });
export const none: Option<never> = { _tag: "none" };

export const isSome = <T>(o: Option<T>): o is { _tag: "some"; value: T } =>
	o._tag === "some";

export const isNone = <T>(o: Option<T>): o is { _tag: "none" } =>
	o._tag === "none";

/** Map the value inside a Some, leaving None unchanged. */
export const mapOption = <T, U>(o: Option<T>, f: (value: T) => U): Option<U> =>
	o._tag === "some" ? some(f(o.value)) : none;

/** Extract the value with a default fallback. */
export const getOrElse = <T>(o: Option<T>, defaultValue: T): T =>
	o._tag === "some" ? o.value : defaultValue;

/** Convert a nullable value into an Option. */
export const fromNullable = <T>(value: T | null | undefined): Option<T> =>
	value != null ? some(value) : none;

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

export type Result<T, E = string> =
	| { readonly _tag: "ok"; readonly value: T }
	| { readonly _tag: "err"; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ _tag: "ok", value });
export const err = <E>(error: E): Result<never, E> => ({ _tag: "err", error });

export const isOk = <T, E>(r: Result<T, E>): r is { _tag: "ok"; value: T } =>
	r._tag === "ok";

export const isErr = <T, E>(r: Result<T, E>): r is { _tag: "err"; error: E } =>
	r._tag === "err";

/** Map the value inside an Ok, leaving Err unchanged. */
export const mapResult = <T, U, E>(
	r: Result<T, E>,
	f: (value: T) => U,
): Result<U, E> => (r._tag === "ok" ? ok(f(r.value)) : r);

/** Extract the value, throwing on Err. Only use at I/O boundaries. */
export const unwrapOrThrow = <T>(r: Result<T, unknown>): T => {
	if (r._tag === "ok") return r.value;
	throw r.error;
};

/** Extract the value with a default fallback. */
export const unwrapOr = <T>(r: Result<T, unknown>, defaultValue: T): T =>
	r._tag === "ok" ? r.value : defaultValue;

// ---------------------------------------------------------------------------
// match — exhaustive pattern matching
// ---------------------------------------------------------------------------

/**
 * Pattern-match an Option with exhaustive handling of both tags.
 * The `never` in onNone forces the compiler to reject missing cases.
 *
 * @example
 * matchOption(opt, {
 *   some: (value) => `Got ${value}`,
 *   none: () => "Nothing",
 * });
 */
export const matchOption = <T, U>(
	o: Option<T>,
	handlers: { some: (value: T) => U; none: () => U },
): U => (o._tag === "some" ? handlers.some(o.value) : handlers.none());

/**
 * Pattern-match a Result with exhaustive handling of both tags.
 *
 * @example
 * matchResult(res, {
 *   ok: (value) => `Success: ${value}`,
 *   err: (error) => `Failed: ${error}`,
 * });
 */
export const matchResult = <T, E, U>(
	r: Result<T, E>,
	handlers: { ok: (value: T) => U; err: (error: E) => U },
): U => (r._tag === "ok" ? handlers.ok(r.value) : handlers.err(r.error));

// ---------------------------------------------------------------------------
// chain / flatMap — monadic composition
// ---------------------------------------------------------------------------

/**
 * Chain an Option-producing function. Returns None if the input is None,
 * otherwise applies f to the wrapped value.
 *
 * @example
 * const userOpt = findUser(id);           // Option<User>
 * const emailOpt = chain(userOpt, getUserEmail); // Option<string>
 */
export const chainOption = <T, U>(
	o: Option<T>,
	f: (value: T) => Option<U>,
): Option<U> => (o._tag === "some" ? f(o.value) : none);

/** Alias for chainOption. */
export const flatMapOption = chainOption;

/**
 * Chain a Result-producing function. Returns Err if the input is Err,
 * otherwise applies f to the wrapped value.
 *
 * @example
 * const parsed = parse(input);              // Result<Data, string>
 * const validated = chainResult(parsed, validate); // Result<ValidData, string>
 */
export const chainResult = <T, U, E>(
	r: Result<T, E>,
	f: (value: T) => Result<U, E>,
): Result<U, E> => (r._tag === "ok" ? f(r.value) : r);

/** Alias for chainResult. */
export const flatMapResult = chainResult;
