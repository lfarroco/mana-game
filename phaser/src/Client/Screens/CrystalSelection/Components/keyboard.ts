import { getSeed, setSeed } from "@Utils/Random";
import * as Phaser from "phaser";
import * as parent from "../CrystalSelectionScreen";

export function create(targetText: Phaser.GameObjects.Text) {
	if (document.getElementById("virtual-keyboard")) return;

	const keyboardContainer = document.createElement("div");
	keyboardContainer.id = "virtual-keyboard";
	keyboardContainer.style.position = "absolute";
	keyboardContainer.style.bottom = "80px";
	keyboardContainer.style.right = "20px";
	keyboardContainer.style.backgroundColor = "rgba(30, 30, 30, 0.95)";
	keyboardContainer.style.padding = "10px";
	keyboardContainer.style.borderRadius = "8px";
	keyboardContainer.style.border = "1px solid #555";
	keyboardContainer.style.display = "flex";
	keyboardContainer.style.flexDirection = "column";
	keyboardContainer.style.gap = "5px";
	keyboardContainer.style.zIndex = "1001";
	keyboardContainer.style.boxShadow = "0 4px 6px rgba(0,0,0,0.3)";

	// Numpad Layout
	const rows = [["7", "8", "9"], ["4", "5", "6"], ["1", "2", "3"], ["0"]];

	// Styles
	const btnStyle = "width: 40px; height: 40px; background: #444; color: white; border: 1px solid #666; border-radius: 4px; cursor: pointer; display: flex; justify-content: center; align-items: center; font-family: monospace; font-size: 18px;";
	const actionBtnStyle = "height: 30px; padding: 0 10px; background: #555; color: white; border: 1px solid #777; border-radius: 4px; cursor: pointer; font-size: 12px; font-family: sans-serif;";

	// Key rows
	rows.forEach((row) => {
		const rowDiv = document.createElement("div");
		rowDiv.style.display = "flex";
		rowDiv.style.justifyContent = "center";
		rowDiv.style.gap = "4px";

		row.forEach((char) => {
			const btn = document.createElement("button");
			btn.innerText = char;
			btn.style.cssText = btnStyle;
			if (char === "0") {
				btn.style.width = "40px"; // Keep uniform size
			}
			btn.onmousedown = (e) => {
				e.preventDefault(); // Prevent focus loss
				if (targetText.text.length < 12) {
					targetText.setText(targetText.text + char);
				}
			};
			rowDiv.appendChild(btn);
		});
		keyboardContainer.appendChild(rowDiv);
	});

	// Helper to create buttons
	const createActionBtn = (text: string, onClick: () => void, color: string = "#555") => {
		const btn = document.createElement("button");
		btn.innerText = text;
		btn.style.cssText = actionBtnStyle + `background: ${color};`;
		btn.onclick = onClick;
		return btn;
	};

	const backBtn = createActionBtn(
		"Back",
		() => {
			targetText.setText(`${getSeed()}`);
			parent.state.seedWarningText.setVisible(false);
			if (document.body.contains(keyboardContainer)) {
				document.body.removeChild(keyboardContainer);
			}
		},
		"#d32f2f"
	);

	const clearBtn = createActionBtn(
		"Clear",
		() => {
			targetText.setText("");
		},
		"#c62828"
	);

	const copyBtn = createActionBtn(
		"Copy",
		() => {
			navigator.clipboard.writeText(targetText.text);
		},
		"#1976d2"
	);

	const pasteBtn = createActionBtn(
		"Paste",
		async () => {
			const text = await navigator.clipboard.readText();
			const numeric = text.replace(/\D/g, "").slice(0, 12);
			targetText.setText(numeric);
		},
		"#1976d2"
	);

	const backspaceBtn = createActionBtn("⌫", () => {
		const c = targetText.text;
		if (c.length > 0) {
			targetText.setText(c.slice(0, -1));
		}
	});

	const enterBtn = createActionBtn(
		"Enter",
		() => {
			if (targetText.text === "") {
				const newSeed = Date.now();
				setSeed(newSeed);
				targetText.setText(`${newSeed}`);
				parent.state.seedWarningText.setVisible(false);
			} else {
				const val = parseInt(targetText.text, 10);
				if (!isNaN(val)) {
					setSeed(val);
					targetText.setText(`${val}`);
					parent.state.seedWarningText.setVisible(true);
				} else {
					// Fallback if parsing fails for some reason (shouldn't with numberpad)
					const newSeed = Date.now();
					setSeed(newSeed);
					targetText.setText(`${newSeed}`);
					parent.state.seedWarningText.setVisible(false);
				}
			}

			if (document.body.contains(keyboardContainer)) {
				document.body.removeChild(keyboardContainer);
			}
		},
		"#388e3c"
	);
	enterBtn.style.flexGrow = "1";

	// Arrange actions
	const actionsContainer = document.createElement("div");
	actionsContainer.style.display = "grid";
	actionsContainer.style.gridTemplateColumns = "1fr 1fr 1fr";
	actionsContainer.style.gap = "5px";
	actionsContainer.style.marginTop = "5px";

	// Row 1
	actionsContainer.appendChild(copyBtn);
	actionsContainer.appendChild(pasteBtn);
	actionsContainer.appendChild(clearBtn);

	// Row 2
	actionsContainer.appendChild(backBtn);
	actionsContainer.appendChild(backspaceBtn);
	actionsContainer.appendChild(enterBtn);
	enterBtn.style.gridColumn = "span 1";

	keyboardContainer.appendChild(actionsContainer);

	document.body.appendChild(keyboardContainer);

	// Global click listener to close if clicking outside
	const outsideClickListener = (e: MouseEvent) => {
		if (!keyboardContainer.contains(e.target as Node)) {
			if (document.body.contains(keyboardContainer)) {
				document.body.removeChild(keyboardContainer);
			}
			const currentVal = parseInt(targetText.text, 10);
			if (isNaN(currentVal) && targetText.text !== `${getSeed()}`) {
				targetText.setText(`${getSeed()}`);
				parent.state.seedWarningText.setVisible(false);
			}

			document.removeEventListener("mousedown", outsideClickListener);
		}
	};

	setTimeout(() => {
		document.addEventListener("mousedown", outsideClickListener);
	}, 0);
}
