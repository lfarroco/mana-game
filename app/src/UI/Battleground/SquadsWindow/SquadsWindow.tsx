import { useState } from 'react';
import './SquadsWindow.css';
import { Unit } from '../../../Models/Unit';
import { Squad } from '../../../Models/Squad';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';

function SquadsWindow({
	onToggle,
	opened }: {
		onToggle: () => void,
		opened: boolean
	}) {

	const squads: Squad[] = [
		{ id: 1, name: "weee", members: {} },
		{ id: 2, name: "blaaaa", members: {} },
	]

	const [selectedUnit, setSelectedUnit] = useState(1)


	const selected = squads.find(u => u.id === selectedUnit)

	return <Modal
		show={opened}
		onHide={onToggle}
		size={"lg"}
	>
		<Modal.Header closeButton>
			<Modal.Title>Squad List</Modal.Title>
		</Modal.Header>
		<Modal.Body>

			<div id="squads-window" className="row">
				<div className="col col-sm-4">

					<ListGroup activeKey={selectedUnit}>
						{
							squads.map(unit =>
								<ListGroup.Item
									action
									onClick={() => {
										setSelectedUnit(unit.id)
									}}
									key={unit.name}
								>
									{unit.name}
								</ListGroup.Item>)
						}
					</ListGroup>

				</div>

				<div className='col-sm-8'>

					<div className='details'>
						{
							selected && selectedDetails(selected)
						}
					</div>

				</div>

			</div>

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

function selectedDetails(squad: Squad) {

	return squad.name
}

export default SquadsWindow;