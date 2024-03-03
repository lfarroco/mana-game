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
		tooltipTitle?: string,
		tooltipContent?: string

	}
) => {

	const { icon, css, label, style, onClick,
		tooltipTitle,
		tooltipContent

	} = props


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
					width: '100%',
					height: '100%',
				}} /> : null
		}<div>
			{label}

		</div>
		{tooltipTitle || tooltipContent ?
			(<div
				className="btn-tooltip"

			>
				<div>{tooltipTitle}</div>
				<div> {tooltipContent} </div>

			</div>) : null

		}

	</Button>
}


ManaButton.defaultProps = {
	css: "",
	label: "",
	style: undefined,
	onClick: () => { },
	icon: "",
	tooltipTitle: "",
	tooltipContent: ""
}

export default ManaButton