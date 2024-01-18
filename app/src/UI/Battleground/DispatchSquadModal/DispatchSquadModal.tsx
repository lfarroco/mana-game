import Modal from 'react-bootstrap/Modal';
import { Squad } from '../../../Models/Squad';
import { getState } from '../../../Models/State';
import { useEffect, useState } from 'react';
import { Button, Table } from 'react-bootstrap';
import { emit, emit_, events, listeners } from '../../../Models/Signals';

const dispatch = (squad: Squad) => () => {

	const state = getState()
	if (state.selectedEntity?.type === "city") {
		emit(events.DISPATCH_SQUAD, squad.id)
		emit(events.TOGGLE_DISPATCH_MODAL, false)
		emit(events.SQUAD_SELECTED, squad.id)
	} else {
		console.error("No selected city")
	}
}

function DispatchSquadModal() {

	const state = getState()

	const [isVisible, setIsVisible] = useState(false);
	// TODO: use unit templates
	const dispatchableSquads = state.squads

	useEffect(() => {
		listeners([
			[events.TOGGLE_DISPATCH_MODAL, (value: boolean) => { setIsVisible(value); }],
		])
	}, []);

	return <Modal
		show={isVisible}
		onHide={() => { setIsVisible(false) }}
		size={"xl"}
		id="squads-window"
	>
		<Modal.Header closeButton>
			<Modal.Title>Dispatch Squad</Modal.Title>
		</Modal.Header>
		<Modal.Body>
			{dispatchableSquads.length > 0 && isVisible && <div
				className="row"
				id="squads-window">
				<Table striped bordered hover size="sm">
					<thead>
						<tr>
							<th>Available Squads</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{dispatchableSquads.map(squad => <tr
							key={squad.id}
						>
							<td>{squad.name}</td>
							<td><Button
								className="float-end"
								size={"sm"}
								onClick={dispatch(squad)}
							>
								Dispatch
							</Button></td>
						</tr>)}
					</tbody>
				</Table>
			</div >}
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


export default DispatchSquadModal;