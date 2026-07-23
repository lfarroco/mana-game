// Lightweight uuid stub for Jest tests.
// uuid v14 is pure ESM and ts-jest cannot transform its .js files.
// This stub provides the minimal API used by core/ (v4 only).

let counter = 0;

export const v4 = (): string => {
	counter += 1;
	return `test-uuid-${counter}`;
};

export default { v4 };
