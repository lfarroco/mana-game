import Modal from 'react-bootstrap/Modal';
import ListGroup from 'react-bootstrap/ListGroup';
import { Squad, getMembers } from '../../../Models/Squad';
import { getState } from '../../../Models/State';
import { useEffect, useState } from 'react';
import { Button, Table } from 'react-bootstrap';
import { emit, emit_, events, listeners } from '../../../Models/Signals';

const dispatch = (squad: Squad) => () => {

	const state = getState()
	if (state.selectedEntity?.type === "city") {
		emit(events.DISPATCH_SQUAD, squad.id, state.selectedEntity?.id)
		emit(events.TOGGLE_DISPATCH_MODAL, false)
		emit(events.SQUAD_SELECTED, squad.id)
	} else {
		console.error("No selected entity")
	}
}

function DispatchUnitModal() {

	const squads = getState().squads.filter(s => !s.dispatched)

	const [isVisible, setIsVisible] = useState(false);
	const [selectedSquad, setSelectedSquad] = useState(squads[0].id)

	useEffect(() => {
		listeners([
			[events.TOGGLE_DISPATCH_MODAL, (value: boolean) => { setIsVisible(value); }],
		])
	}, []);

	const selected = squads.find(u => u.id === selectedSquad)

	return <Modal
		show={isVisible && squads.length > 0}
		onHide={() => { setIsVisible(false) }}
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
				<div className="col col-sm-8 p-2">
					<ListGroup
						activeKey={selectedSquad}
					>
						{isVisible &&
							squads.map(squad => {

								const members = getMembers(squad)

								return <ListGroup.Item
									action
									key={squad.id}
									active={squad.id === selectedSquad}
									onClick={() => {
										setSelectedSquad(squad.id)
									}}
								>
									{
										members.map(member => <img
											className="img-fluid"
											alt={member.name}
											style={{ width: "100px" }}
											src={`assets/jobs/${member.job}/portrait.png`}
											key={member.id} />)
									}
								</ListGroup.Item>
							}

							)
						}
					</ListGroup>
				</div>

				<div className='col col-sm-4'>
					{
						selected && selectedDetails(selected)
					}
				</div>
			</div >
		</Modal.Body>
		<Modal.Footer>
			<Button
				className="btn btn-secondary"
				onClick={emit_(events.TOGGLE_DISPATCH_MODAL, false)}
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