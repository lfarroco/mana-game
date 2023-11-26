import Modal from 'react-bootstrap/Modal';
import ListGroup from 'react-bootstrap/ListGroup';
import { Squad } from '../../../Models/Squad';
import { getState } from '../../../Scenes/Battleground/BGState';
import { useState } from 'react';
import { Button, Table } from 'react-bootstrap';
import { emit, index } from '../../../Models/Signals';

const dispatch = (squad: Squad) => () => {

	const state = getState()
	if (state.selectedEntity?.type === "city") {
		emit(index.DISPATCH_SQUAD, squad.id, state.selectedEntity?.id)
		emit(index.TOGGLE_DISPATCH_MODAL, false)
		emit(index.SQUAD_SELECTED, squad.id)
	} else {
		console.error("No selected entity")
	}
}
const onClose = () => {
	emit(index.TOGGLE_DISPATCH_MODAL, false)
}

function DispatchUnitModal({ visible, squads }: { visible: boolean, squads: Squad[] }) {

	const [selectedSquad, setSelectedSquad] = useState(squads[0].id)

	const selected = squads.find(u => u.id === selectedSquad)

	return <Modal
		show={visible && squads.length > 0}
		onHide={onClose}
		size={"xl"}
		id="squads-window"
	>
		<Modal.Header closeButton>
			<Modal.Title>Dispatch Squad</Modal.Title>
		</Modal.Header>
		<Modal.Body>
			<div
				className="row"
				id="squads-window">
				<div className="col col-sm-4 p-2">
					<ListGroup
						activeKey={selectedSquad}
					>
						{visible &&
							squads.map(squad =>

								<ListGroup.Item
									action
									key={squad.id}
									active={squad.id === selectedSquad}
									onClick={() => {
										setSelectedSquad(squad.id)
									}}
								>
									{squad.name}
								</ListGroup.Item>

							)
						}
					</ListGroup>
				</div>

				<div className='col col-sm-8'>
					<div className='card p-2'>
						{
							selected && selectedDetails(selected)
						}
					</div>
				</div>
			</div >
		</Modal.Body>
		<Modal.Footer>
			<Button
				className="btn btn-secondary"
				onClick={onClose}
			>
				Close
			</Button>
		</Modal.Footer>
	</Modal>
}

function selectedDetails(squad: Squad) {
	return <>

		<Table>
			<tbody>
				<tr>
					<th>Name</th>
					<td>{squad.name}</td>

				</tr>
				<tr>
					<th>Position</th>
					<td>{JSON.stringify(squad.position)}</td>
				</tr>

			</tbody>
		</Table>

		<button
			className="btn btn-sm btn-primary"
			onClick={dispatch(squad)}
		>
			Dispatch</button>
	</>
}

export default DispatchUnitModal;