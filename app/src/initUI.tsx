import { UI } from "./UI/UI";
import ReactDOM from "react-dom/client";

export function initUI() {
	const root = ReactDOM.createRoot(document.getElementById("ui") as HTMLElement);

	root.render(<UI />);
}
