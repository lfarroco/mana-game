/// <reference types="jest" />

import * as F from "./Functional";

describe("Functional", () => {
	// -----------------------------------------------------------------------
	// Option
	// -----------------------------------------------------------------------

	describe("Option", () => {
		describe("some", () => {
			it("creates a Some with value", () => {
				const o = F.some(42);
				expect(o._tag).toBe("some");
				expect(F.isSome(o)).toBe(true);
				if (F.isSome(o)) expect(o.value).toBe(42);
			});
		});

		describe("none", () => {
			it("has _tag 'none'", () => {
				expect(F.none._tag).toBe("none");
			});
		});

		describe("isSome", () => {
			it("returns true for some", () => {
				expect(F.isSome(F.some(1))).toBe(true);
			});

			it("returns false for none", () => {
				expect(F.isSome(F.none)).toBe(false);
			});

			it("narrows the type in an if branch", () => {
				const o: F.Option<number> = F.some(7);
				if (F.isSome(o)) {
					const val: number = o.value;
					expect(val).toBe(7);
				}
			});
		});

		describe("isNone", () => {
			it("returns true for none", () => {
				expect(F.isNone(F.none)).toBe(true);
			});

			it("returns false for some", () => {
				expect(F.isNone(F.some(1))).toBe(false);
			});
		});

		describe("mapOption", () => {
			it("applies function to Some value", () => {
				const result = F.mapOption(F.some(5), (x) => x * 2);
				expect(result).toEqual(F.some(10));
			});

			it("passes through None unchanged", () => {
				const result = F.mapOption(F.none as F.Option<number>, (x) => x * 2);
				expect(result).toEqual(F.none);
			});
		});

		describe("getOrElse", () => {
			it("returns value for Some", () => {
				expect(F.getOrElse(F.some("hello"), "default")).toBe("hello");
			});

			it("returns default for None", () => {
				expect(F.getOrElse(F.none as F.Option<string>, "default")).toBe("default");
			});
		});

		describe("fromNullable", () => {
			it("wraps non-null value as Some", () => {
				expect(F.fromNullable(42)).toEqual(F.some(42));
			});

			it("returns None for null", () => {
				expect(F.fromNullable(null)).toEqual(F.none);
			});

			it("returns None for undefined", () => {
				expect(F.fromNullable(undefined)).toEqual(F.none);
			});
		});
	});

	// -----------------------------------------------------------------------
	// Result
	// -----------------------------------------------------------------------

	describe("Result", () => {
		describe("ok", () => {
			it("creates an Ok with value", () => {
				const r = F.ok("success");
				expect(r._tag).toBe("ok");
				expect(F.isOk(r)).toBe(true);
				if (F.isOk(r)) expect(r.value).toBe("success");
			});
		});

		describe("err", () => {
			it("creates an Err with error", () => {
				const r = F.err("something went wrong");
				expect(r._tag).toBe("err");
				expect(F.isErr(r)).toBe(true);
				if (F.isErr(r)) expect(r.error).toBe("something went wrong");
			});
		});

		describe("isOk", () => {
			it("returns true for ok", () => {
				expect(F.isOk(F.ok(1))).toBe(true);
			});

			it("returns false for err", () => {
				expect(F.isOk(F.err("fail"))).toBe(false);
			});

			it("narrows the type in an if branch", () => {
				const r: F.Result<number> = F.ok(42);
				if (F.isOk(r)) {
					const val: number = r.value;
					expect(val).toBe(42);
				}
			});
		});

		describe("isErr", () => {
			it("returns true for err", () => {
				expect(F.isErr(F.err("fail"))).toBe(true);
			});

			it("returns false for ok", () => {
				expect(F.isErr(F.ok(1))).toBe(false);
			});
		});

		describe("mapResult", () => {
			it("applies function to Ok value", () => {
				const result = F.mapResult(F.ok(5), (x) => x * 10);
				expect(result).toEqual(F.ok(50));
			});

			it("passes through Err unchanged", () => {
				const r: F.Result<number, string> = F.err("boom");
				expect(F.mapResult(r, (x) => x * 2)).toEqual(F.err("boom"));
			});
		});

		describe("unwrapOrThrow", () => {
			it("returns value for Ok", () => {
				expect(F.unwrapOrThrow(F.ok(99))).toBe(99);
			});

			it("throws for Err", () => {
				expect(() => F.unwrapOrThrow(F.err("fail"))).toThrow("fail");
			});
		});

		describe("unwrapOr", () => {
			it("returns value for Ok", () => {
				expect(F.unwrapOr(F.ok(10), 0)).toBe(10);
			});

			it("returns default for Err", () => {
				expect(F.unwrapOr(F.err("fail"), 0)).toBe(0);
			});
		});
	});
});
