import Modal from 'react-bootstrap/Modal';
import ListGroup from 'react-bootstrap/ListGroup';
import { getState } from '../../../Models/State';
import { Button, ListGroupItem } from 'react-bootstrap';
import { emit_, events, listeners } from '../../../Models/Signals';
import { useEffect, useState } from 'react';

function SquadDetailsModal() {

	const state = getState();

	const [isVisible, setIsVisible] = useState(false);

	// TODO: use a listener to update the selected entity
	const squad = state.squads.find(s => s.id === state.selectedEntity?.id)

	useEffect(() => {
		listeners([
			[events.TOGGLE_SQUAD_DETAILS_MODAL, (value: boolean) => { setIsVisible(value); }],
		])
	}, [])

	if (!squad) return null;

	return <Modal
		show={isVisible}
		onHide={() => { setIsVisible(false) }}
		size={"xl"}
		id="squads-window"
	>
		<Modal.Header closeButton>
			<Modal.Title>Squad Details</Modal.Title>
		</Modal.Header>
		<Modal.Body>{isVisible &&
			<div
				className="row"
				id="squads-detail">
				<ListGroup>

					<ListGroupItem
						action
						key={squad.id}
					>
						<img
							style={{ width: "100px" }}
							src={`assets/jobs/${squad.job}/portrait.png`}
							alt="job" />
						<span>
							{squad.name}
						</span>

					</ListGroupItem>)

				</ListGroup>
			</div >}
		</Modal.Body>
		<Modal.Footer>
			<Button
				className="btn btn-secondary"
				onClick={emit_(events.TOGGLE_SQUAD_DETAILS_MODAL, false)}
			>
				Close
			</Button>
		</Modal.Footer>
	</Modal>
}

export default SquadDetailsModal;