// Jest setup for Mana framework tests
// This file mocks Phaser globally so components can be tested without a full Phaser scene

// Mock Phaser.Geom
const mockGeom = {
	Rectangle: class MockRectangle {
		constructor(x: number, y: number, width: number, height: number) {
			return { x, y, width, height, type: 'rectangle' };
		}
		static Contains = jest.fn(() => true);
	},
	Circle: class MockCircle {
		constructor(x: number, y: number, radius: number) {
			return { x, y, radius, type: 'circle' };
		}
	},
	Polygon: class MockPolygon {
		constructor(points: any[]) {
			return { points, type: 'polygon' };
		}
	},
};

// Mock Phaser.Input
const mockInput = {
	Pointer: class MockPointer { },
};

// Mock Phaser.Types
const mockTypes = {
	GameObjects: {
		Text: {
			TextStyle: {},
		},
	},
	Input: {
		HitAreaCallback: jest.fn(),
	},
};

// Global Phaser mock
global.Phaser = {
	Geom: mockGeom,
	Input: mockInput,
	Types: mockTypes,
} as any;