class MockImage {
	constructor() {
		this.width = 0;
		this.height = 0;
	}
}

class MockCanvas {
	getContext() {
		return {
			drawImage: () => { },
			getImageData: () => ({ data: new Uint8ClampedArray(4) }),
			createImageData: () => ({ data: new Uint8ClampedArray(4) }),
			putImageData: () => { },
			fillRect: () => { },
			clearRect: () => { },
			strokeRect: () => { },
			fillText: () => { },
			measureText: () => ({ width: 0 }),
			save: () => { },
			restore: () => { },
			scale: () => { },
			rotate: () => { },
			translate: () => { },
			transform: () => { },
			setTransform: () => { },
			globalCompositeOperation: 'source-over'
		};
	}
}

Object.defineProperty(global, 'Image', {
	value: MockImage,
	writable: true,
	configurable: true
});

Object.defineProperty(global, 'window', {
	value: {
		cordova: undefined,
		navigator: { userAgent: 'node' },
		location: { href: '' },
		document: {
			createElement: (tag) => {
				if (tag === 'canvas') return new MockCanvas();
				return {};
			},
			documentElement: { style: {} },
			body: {}
		},
		addEventListener: () => { },
		removeEventListener: () => { },
		getComputedStyle: () => ({}),
		matchMedia: () => ({ matches: false, addListener: () => { }, removeListener: () => { } }),
		devicePixelRatio: 1,
		innerWidth: 1920,
		innerHeight: 1080
	},
	writable: true,
	configurable: true
});

Object.defineProperty(global, 'document', {
	value: global.window.document,
	writable: true,
	configurable: true
});

Object.defineProperty(global, 'navigator', {
	value: global.window.navigator,
	writable: true,
	configurable: true
});

import('./src/Scenes/Battleground/serverCombatDemo.js').catch(err => {
	console.error('Error running demo:', err);
	process.exit(1);
});
