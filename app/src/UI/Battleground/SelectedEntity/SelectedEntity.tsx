import "./styles.css"
import { Row } from "react-bootstrap"
import ManaButton from "../../Components/Button"

const BUTTON_STYLE = {
	width: '100%',
	height: '100%',
	fontSize: 12,
	padding: 0,
	margin: 0,
	borderRadius: 0,
	border: 'none'
}
type ButtonGridAction = {
	icon: string,
	tooltipTitle: string,
	tooltipContent: string,
	active: boolean,
	onClick: () => void,
	enabled: boolean
}

export const makeButtonGridAction = (
	icon: string,
	tooltipTitle: string,
	tooltipContent: string,
	active: boolean,
	onClick: () => void,
	enabled: boolean,
): ButtonGridAction => {
	return {
		icon,
		tooltipTitle,
		tooltipContent,
		active,
		onClick,
		enabled
	}
}

const SelectedEntity = ({
	portraitSrc
	, portraitAlt,
	hp,
	maxHp,
	mana,
	maxMana,
	description,
	actions,
}: {
	portraitSrc: string,
	portraitAlt: string,
	hp: number,
	maxHp: number,
	mana: number,
	maxMana: number,
	description: JSX.Element,
	actions: ButtonGridAction[]
}) => {

	return <div
		id="selected-entity"
		className="container"
	>

		<Row>
			<div className="col col-3 mt-2"
				style={{
					borderRight: "1px solid white",
					textAlign: "center",
				}}
			>

				<img
					id={`selected-entity-portrait`}
					className="img-fluid portrait"
					src={portraitSrc}
					alt={portraitAlt}
				/>
				{maxHp && <div
					style={{
						color: "#13ec13",
					}}
				>
					{hp} / {maxHp}
				</div>}
				{maxMana && <div
					style={{
						color: "rgb(63 196 254)",
					}}
				>
					{mana} / {maxMana}
				</div>}
			</div>
			<div className="col-3 align-self-center" >
				{
					description
				}
			</div>
			<div className="col col-6" >
				<ButtonGrid actions={actions} />
			</div>

		</Row>

	</div >

}

export default SelectedEntity

function ButtonGrid(props: {
	actions: {
		icon: string,
		tooltipTitle: string,
		tooltipContent: string,
		active: boolean,
		onClick: () => void,
		enabled: boolean
	}[]
}) {

	const { actions } = props;

	const maybeButton = (index: number) => {
		const action = actions[index]
		if (action) {
			return <ManaButton
				style={BUTTON_STYLE}
				onClick={action.onClick}
				icon={action.icon}
				tooltipTitle={action.tooltipTitle}
				tooltipContent={action.tooltipContent}
				enabled={action.enabled}
			/>
		} else {
			return null
		}
	}
	const indices = Array.from({ length: 6 }, (v, k) => k)
	return <> {
		indices.map(index => {

			return <div

				id={`grid-cell-${index}`}
				className={"grid-cell" + (actions[index]?.active ? " active" : "")}
				key={index}
			>
				{maybeButton(index)}
			</div>
		})
	} </>

}

SelectedEntity.defaultProps = {
	mana: 0,
	maxMana: 0,
	hp: 0,
	maxHp: 0,
}
