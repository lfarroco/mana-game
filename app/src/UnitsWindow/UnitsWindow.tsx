import React, { useState } from 'react';
import './UnitsWindow.css';
import Modal from '../Components/Modal/Modal';
import { Unit } from '../Models/Unit';


function UnitsWindow({
	onToggle }: {
		onToggle: () => void
	}) {

	const units: Unit[] = [
		{ id: 1, name: "weee" },
		{ id: 2, name: "blaaaa" },
		{ id: 3, name: "blaaaa" },
		{ id: 4, name: "blaaaa" },
		{ id: 5, name: "blaaaa" },
		{ id: 7, name: "blaaaa" },
		{ id: 8, name: "blaaaa" },
		{ id: 9, name: "blaaaa" },
		{ id: 10, name: "blaaaa" },
		{ id: 11, name: "blaaaa" },
		{ id: 12, name: "blaaaa" },
		{ id: 13, name: "blaaaa" },
	]

	const [selectedUnit, setSelectedUnit] = useState(1)


	const selected = units.find(u => u.id === selectedUnit)

	return <Modal
		title="Unit List"
		useFooter={false}
		onClose={() => onToggle()}
	>
		<div id="units-window">
			<ul className="well">
				{
					units.map(unit =>
						<li
							className={selectedUnit === unit.id ? "selected" : ""}
							onClick={() => {
								setSelectedUnit(unit.id)
							}}
							key={unit.id}>
							<span>
								{unit.name}
							</span>
						</li>)
				}
			</ul>
			<div className='details block'>
				<div className='well'>
					{
						selected && selectedDetails(selected)
					}

				</div>
			</div>


		</div>

	</Modal >



}

function selectedDetails(unit: Unit) {


	return unit.name


}

export default UnitsWindow;