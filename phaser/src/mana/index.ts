export type {
	ClickHandler,
	BaseElement,
	ImageElement,
	TextElement,
	ContainerElement,
	RectangleElement,
	RoundedRectangleElement,
	CircleElement,
	EllipseElement,
	Element,
	ComponentState,
} from './types';

export {
	createComponentState,
	enqueueMessages,
	subscribe,
	processMessages,
	getData,
} from './state';

export {
	setData,
	registerUpdateHandler,
} from './renderer';

// Simplified API
export {
	createComponent,
} from './api';

export {
	createImage,
	createText,
	createContainer,
	createGraphics,
	createRectangle,
	createRoundedRectangle,
	createCircle,
	createEllipse,
	registerComponentFactory,
} from './factories';

export {
	registerPropertySetter,
	applyBaseProps,
} from './properties';

export {
	destroy,
	registerCleanupHook,
	registerMountHook,
	registerUnmountHook,
} from './lifecycle';

export {
	shallowEqual,
	elementsEqual,
	ElementCache,
	debounce,
	throttle,
} from './utils';

export {
	setDevMode,
	validateElement,
	validateElements,
} from './validation';

// Built-in actions and message system
export type { ManaMsg, RedrawShapeAction, UpdateElementAction, TweenAction, StopTweenAction } from './actions';
export {
	handleManaMsg,
	redrawShape,
	updateElement,
	setFillColor,
	setVisible,
	moveTo,
	createTween,
	stopTween,
} from './actions';