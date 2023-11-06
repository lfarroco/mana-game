import React, { useState } from 'react';
import './SquadsWindow.css';
import Modal from '../Components/Modal/Modal';
import { Unit } from '../Models/Unit';
import { Squad } from '../Models/Squad';


function SquadsWindow({
	onToggle }: {
		onToggle: () => void
	}) {

	const squads: Squad[] = [
		{ id: 1, name: "weee", members: {} },
		{ id: 2, name: "blaaaa", members: {} },
	]

	const [selectedUnit, setSelectedUnit] = useState(1)


	const selected = squads.find(u => u.id === selectedUnit)

	return <Modal
		title="Squads List"
		useFooter={false}
		onClose={() => onToggle()}
	>
		<div id="squads-window">
			<ul>
				{
					squads.map(unit =>
						<li
							className={selectedUnit === unit.id ? "selected" : ""}
							onClick={() => {
								setSelectedUnit(unit.id)
							}}
							key={unit.name}>{unit.name}
						</li>)
				}
			</ul>
			<div className='details'>
				{
					selected && selectedDetails(selected)
				}
			</div>

		</div>

	</Modal>



}

function selectedDetails(unit: Unit) {


	return unit.name


}

export default SquadsWindow;