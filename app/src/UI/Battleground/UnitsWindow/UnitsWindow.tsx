import { useState } from 'react';
import './UnitsWindow.css';
import { Unit } from '../../../Models/Unit';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';

function UnitsWindow({
	onToggle,
	opened
}: {
	onToggle: () => void,
	opened: boolean
}) {

	const units: Unit[] = [
		{ id: "1", name: "weee" },
		{ id: "2", name: "blaaaa" },
		{ id: "3", name: "blaaaa" },
		{ id: "4", name: "blaaaa" },
		{ id: "5", name: "blaaaa" },
		{ id: "7", name: "blaaaa" },
		{ id: "8", name: "blaaaa" },
		{ id: "9", name: "blaaaa" },
		{ id: "10", name: "blaaaa" },
		{ id: "11", name: "blaaaa" },
		{ id: "12", name: "blaaaa" },
		{ id: "13", name: "blaaaa" },
	]

	const [selectedUnit, setSelectedUnit] = useState("1")


	const selected = units.find(u => u.id === selectedUnit)

	return <Modal show={opened} onHide={onToggle} size={'lg'}>
		<Modal.Header closeButton>
			<Modal.Title>Units List</Modal.Title>
		</Modal.Header>
		<Modal.Body>

			{
				unitList(units, selected, selectedUnit, setSelectedUnit)
			}

		</Modal.Body>
		<Modal.Footer>
			<Button variant="secondary" onClick={onToggle}>
				Close
			</Button>
			<Button variant="primary" onClick={onToggle}>
				Save Changes
			</Button>
		</Modal.Footer>
	</Modal>




}
function selectedDetails(unit: Unit) {
	return unit.name
}

const unitList = (units: Unit[], selected: Unit | undefined, selectedUnit: string, setSelectedUnit: (id: string) => void) => <div id="units-window">
	<div className="col col-sm-4">

		<ListGroup
			activeKey={selectedUnit}
		>
			{
				units.map(unit =>
					<ListGroup.Item
						action
						onClick={() => {
							setSelectedUnit(unit.id)
						}}
						key={unit.id}>
						<span>
							{unit.name}
						</span>
					</ListGroup.Item>)
			}
		</ListGroup>
	</div>

	<div className='col col-sm-8'>
		<div className='details block'>
			<div className='well'>
				{
					selected && selectedDetails(selected)
				}

			</div>

		</div>
	</div>
</div >


export default UnitsWindow;