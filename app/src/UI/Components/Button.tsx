import { CSSProperties } from "react";
import { Button } from "react-bootstrap";

const ManaButton = (
	props: { icon: string, css: string, label: string, style: CSSProperties | undefined, onClick: () => void }
) => {

	const { icon, css, label, style, onClick } = props
	return <Button
		style={style}
		className={css}
		variant="dark"
		onClick={() => {
			const audio = new Audio("assets/audio/button_click.ogg");
			audio.play();
			onClick();
		}}>
		{icon !== "" ?
			<img src={`assets/ui/${icon}.png`} alt={label}
				style={{
					width: 16,
					height: 16,
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
	icon: ""
}

export default ManaButton