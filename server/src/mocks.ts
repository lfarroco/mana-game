
import Module from 'module';

const originalRequire = (Module.prototype as any).require;
(Module.prototype as any).require = function (id: string) {
	if (id === 'phaser3spectorjs') {
		return {};
	}
	return originalRequire.apply(this, arguments as any);
};

// Mock browser environment for Phaser
if (typeof (global as any).window === 'undefined') {
	(global as any).window = {
		addEventListener: () => { },
		removeEventListener: () => { },
		navigator: { userAgent: 'Node' },
		document: {
			createElement: (tag: string) => {
				const elem: any = { style: {} };
				if (tag === 'canvas') {
					elem.getContext = () => ({
						fillRect: () => { },
						getImageData: () => ({ data: new Uint8ClampedArray(4) }),
						putImageData: () => { },
						createImageData: () => ({ data: [] }),
						drawImage: () => { },
						save: () => { },
						restore: () => { },
						translate: () => { },
						rotate: () => { },
						scale: () => { },
					});
				}
				return elem;
			},
			documentElement: { style: {} },
		},
		location: { href: '' },
		ejecta: undefined,
		screen: { width: 1920, height: 1080 },
		focus: () => { },
		setTimeout: setTimeout,
		clearTimeout: clearTimeout,
	};
}
if (typeof (global as any).document === 'undefined') {
	(global as any).document = (global as any).window.document;
}
if (typeof (global as any).navigator === 'undefined') {
	(global as any).navigator = (global as any).window.navigator;
}
if (typeof (global as any).Image === 'undefined') {
	(global as any).Image = class { src = ''; onload = () => { }; };
}
if (typeof (global as any).HTMLElement === 'undefined') {
	(global as any).HTMLElement = class { };
}
if (typeof (global as any).HTMLCanvasElement === 'undefined') {
	(global as any).HTMLCanvasElement = class { };
}
if (typeof (global as any).HTMLVideoElement === 'undefined') {
	(global as any).HTMLVideoElement = class { };
}
if (typeof (global as any).requestAnimationFrame === 'undefined') {
	(global as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 16);
}
if (typeof (global as any).cancelAnimationFrame === 'undefined') {
	(global as any).cancelAnimationFrame = (id: any) => clearTimeout(id);
}
