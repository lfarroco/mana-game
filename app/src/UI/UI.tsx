import ReactDOM from 'react-dom/client';

import 'bootstrap/dist/css/bootstrap.min.css';
import '../index.css';
import Battleground from './Battleground/Battleground';

export const UI = () => {
	const root = ReactDOM.createRoot(
		document.getElementById('ui') as HTMLElement
	);

	root.render(
		<Battleground />
	);
}