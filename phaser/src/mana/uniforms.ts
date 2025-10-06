export type UniformConfig = {
	type: string;
	value: any;
};

const COMPONENT_KEYS = ['x', 'y', 'z', 'w'] as const;

type MaybeUniformConfig = {
	type?: string;
	value?: any;
};

const isUniformConfig = (value: unknown): value is UniformConfig => {
	return Boolean(
		value &&
		typeof value === 'object' &&
		'type' in (value as Record<string, unknown>) &&
		'value' in (value as Record<string, unknown>)
	);
};

const isArrayLikeNumber = (value: unknown): value is ArrayLike<number> => {
	return Array.isArray(value) || ArrayBuffer.isView(value as ArrayBufferView);
};

const toArray = (value: unknown): number[] => {
	if (Array.isArray(value)) {
		return value.slice();
	}
	if (ArrayBuffer.isView(value as ArrayBufferView)) {
		return Array.from(value as ArrayLike<number>);
	}
	return [];
};

const cloneVectorLike = (value: Record<string, any>): Record<string, number> => {
	const result: Record<string, number> = {};
	let copied = false;
	for (const key of COMPONENT_KEYS) {
		if (key in value) {
			result[key] = Number(value[key]);
			copied = true;
		}
	}
	return copied ? result : { ...value };
};

const toVectorValue = (value: unknown): any => {
	if (isArrayLikeNumber(value)) {
		const arr = toArray(value);
		switch (arr.length) {
			case 0:
				return value;
			case 1:
				return Number(arr[0]);
			case 2:
				return { x: Number(arr[0]), y: Number(arr[1]) };
			case 3:
				return { x: Number(arr[0]), y: Number(arr[1]), z: Number(arr[2]) };
			case 4:
				return { x: Number(arr[0]), y: Number(arr[1]), z: Number(arr[2]), w: Number(arr[3]) };
			default:
				return arr.map((n) => Number(n));
		}
	}

	if (value && typeof value === 'object') {
		return cloneVectorLike(value as Record<string, any>);
	}

	return value;
};

const countVectorComponents = (value: unknown): number => {
	if (!value || typeof value !== 'object') {
		return 0;
	}
	let count = 0;
	for (const key of COMPONENT_KEYS) {
		if (key in (value as Record<string, unknown>)) {
			count++;
		}
	}
	return count;
};

const inferTypeFromValue = (value: unknown): string => {
	if (typeof value === 'number') {
		return '1f';
	}
	if (isArrayLikeNumber(value)) {
		const arr = toArray(value);
		switch (arr.length) {
			case 0:
				return '1f';
			case 1:
				return '1f';
			case 2:
				return '2f';
			case 3:
				return '3f';
			case 4:
				return '4f';
			default:
				return `${arr.length}f`;
		}
	}
	if (value && typeof value === 'object') {
		const componentCount = countVectorComponents(value);
		switch (componentCount) {
			case 2:
				return '2f';
			case 3:
				return '3f';
			case 4:
				return '4f';
			default:
				return '1f';
		}
	}
	return '1f';
};

export const normalizeUniformEntry = (
	raw: unknown,
	fallbackType?: string
): UniformConfig => {
	if (isUniformConfig(raw)) {
		return {
			type: raw.type || fallbackType || inferTypeFromValue(raw.value),
			value: toVectorValue(raw.value)
		};
	}

	const value = toVectorValue(raw);
	return {
		type: fallbackType || inferTypeFromValue(raw),
		value
	};
};

export const normalizeUniformValue = (raw: unknown): any => toVectorValue(raw);

export const normalizeUniformMap = (
	uniforms: Record<string, unknown> | undefined,
	defaults: Record<string, MaybeUniformConfig> = {}
): Record<string, UniformConfig> => {
	const result: Record<string, UniformConfig> = {};

	for (const [key, config] of Object.entries(defaults)) {
		result[key] = normalizeUniformEntry(config.value, config.type);
	}

	if (!uniforms) {
		return result;
	}

	for (const [key, value] of Object.entries(uniforms)) {
		result[key] = normalizeUniformEntry(value);
	}

	return result;
};
