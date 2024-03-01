import { CSSProperties } from "react";
import { Button } from "react-bootstrap";
import { getState } from "../../Models/State";

const ManaButton = (
	props: {
		icon: string,
		css: string,
		label: string,
		style: CSSProperties | undefined,
		onClick: () => void,
		iconSize: number | undefined
	}
) => {

	const { icon, css, label, style, onClick, iconSize } = props


	return <Button
		style={style}
		className={css}
		variant="dark"
		onClick={() => {
			const state = getState()
			const audio = new Audio("assets/audio/button_click.ogg");
			audio.volume = state.options.soundVolume;
			audio.play();
			onClick();
		}}>
		{icon !== "" ?
			<img src={icon} alt={label}
				style={{
					width: iconSize,
					height: iconSize,
				}} /> : null
		}<div>

			{label}

		</div>
	</Button>
}


ManaButton.defaultProps = {
	css: "",
	label: "",
	style: undefined,
	onClick: () => { },
	icon: "",
	iconSize: 16
}

export default ManaButton