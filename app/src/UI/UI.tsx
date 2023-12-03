import ReactDOM from 'react-dom/client';

import '../index.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import Battleground from './Battleground/Battleground';

export const UI = () => {
	const root = ReactDOM.createRoot(
		document.getElementById('ui') as HTMLElement
	);

	root.render(
		<Battleground />
	);
}