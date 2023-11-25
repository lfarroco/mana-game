import Modal from 'react-bootstrap/Modal';
import ListGroup from 'react-bootstrap/ListGroup';
import { Squad } from '../../../Models/Squad';
import { getState } from '../../../Scenes/Battleground/BGState';
import { useState } from 'react';
import { Button, ListGroupItem, Table } from 'react-bootstrap';
import { emit, index } from '../../../Models/Signals';


const onClose = () => {
	emit(index.TOGGLE_SQUAD_DETAILS_MODAL, false)
}

function SquadDetailsModal({ visible, id }: { visible: boolean, id: string }) {

	const squad = getState().squads.find(s => s.id === id)
	if (!squad) return null

	const state = getState()

	const members = squad.members
		.map(id => state.units.find(u => u.id === id))
		.filter(u => u !== undefined)

	return <Modal
		show={visible}
		onHide={onClose}
		size={"xl"}
		id="squads-window"
	>
		<Modal.Header closeButton>
			<Modal.Title>Squad Details</Modal.Title>
		</Modal.Header>
		<Modal.Body>
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

export default SquadDetailsModal;