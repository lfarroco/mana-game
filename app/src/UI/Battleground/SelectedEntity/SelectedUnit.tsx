import { Unit } from "../../../Models/Unit"
import "./styles.css"
import { FORCE_ID_PLAYER } from "../../../Models/Force"
import { getJob } from "../../../Models/Job"
import { getSkill } from "../../../Models/Skill"
import SelectedEntity, { ButtonGridAction } from "./SelectedEntity"

const SelectedUnit = ({
	unit,
	isSelectingMoveTarget,
	isSelectingSkillTarget,
}: {
	unit: Unit,
	isSelectingMoveTarget: boolean,
	isSelectingSkillTarget: boolean
}) => {

	const job = getJob(unit.job)

	const actionsGrid = UnitActions(unit)

	return <SelectedEntity

		portraitSrc={`assets/jobs/${unit.job}/portrait.png`}
		portraitAlt={unit.name}
		hp={unit.hp}
		maxHp={unit.maxHp}
		actions={actionsGrid}
		description={<>
			<div> <span className="attr"></span> {job.name} </div>
		</>
		}
	/>

}

export default SelectedUnit




function UnitActions(unit: Unit): ButtonGridAction[] {

	const job = getJob(unit.job)
	const skills = [job.skill].map(skillId => {

		const skill = getSkill(skillId)
		return {
			id: skillId,
			icon: `assets/ui/icon-${skillId}.png`,
			tooltipTitle: skill.name,
			tooltipContent: skill.tooltip,
			active: true,
			enabled: true,
			onClick: () => {
				console.log("clicked", skillId)
			},
		}
	});

	return [
		...skills

	]
}
