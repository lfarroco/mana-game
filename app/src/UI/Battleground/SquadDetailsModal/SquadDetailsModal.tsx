import Modal from 'react-bootstrap/Modal';
import ListGroup from 'react-bootstrap/ListGroup';
import { getState } from '../../../Models/State';
import { Button, ListGroupItem } from 'react-bootstrap';
import { emit_, events, listeners } from '../../../Models/Signals';
import { useEffect, useState } from 'react';

function SquadDetailsModal() {

	const state = getState();

	const [isVisible, setIsVisible] = useState(false);

	const squad = state.squads.find(s => s.id === state.selectedEntity?.id)

	const members = squad?.members
		.map(id => state.units.find(u => u.id === id))
		.filter(u => u !== undefined) || []

	useEffect(() => {
		listeners([
			[events.TOGGLE_SQUAD_DETAILS_MODAL, (value: boolean) => { setIsVisible(value); }],
		])
	}, [])

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
					{

						members.map(member =>
							member && <ListGroupItem
								action
								key={member.id}
							>
								<img
									style={{ width: "100px" }}
									src={`assets/jobs/${member.job}/portrait.png`}
									alt="job" />
								<span>
									{member.name}
								</span>

							</ListGroupItem>)
					}

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