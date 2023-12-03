import './SquadsWindow.css';
import Modal from 'react-bootstrap/Modal';
import ListGroup from 'react-bootstrap/ListGroup';
import { Squad, getMembers } from '../../../Models/Squad';
import { getState } from '../../../Models/State';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from '../../../Models/Force';
import { SetStateAction, useEffect, useState } from 'react';
import { events, listeners } from '../../../Models/Signals';
import { Button, Table } from 'react-bootstrap';

function SquadsWindow() {

	let squads = getState().squads

	const [isVisible, setVisible] = useState(false);
	const [selectedSquadId, setSelectedSquadId] = useState(squads[0].id)
	useEffect(() => {
		listeners([
			[events.TOGGLE_SQUADS_WINDOW, (value: boolean) => { setVisible(value); }],
		])
	}, []);

	const selected = squads.find(u => u.id === selectedSquadId)

	return <Modal
		show={isVisible}
		onHide={() => { setVisible(false) }}
		size={"xl"}
		id="squads-window"
	>
		<Modal.Header closeButton>
			<Modal.Title>Squads List</Modal.Title>
		</Modal.Header>
		<Modal.Body>
			{isVisible && <Tabs
				defaultActiveKey={FORCE_ID_PLAYER}
			>
				<Tab eventKey={FORCE_ID_PLAYER} title="Allied">
					{squadTable(squads, selected, selectedSquadId, FORCE_ID_PLAYER, setSelectedSquadId)}
				</Tab>
				<Tab eventKey={FORCE_ID_CPU} title="Enemy">
					{squadTable(squads, selected, selectedSquadId, FORCE_ID_CPU, setSelectedSquadId)}
				</Tab>
			</Tabs>}

		</Modal.Body>
		<Modal.Footer>
			<Button
				onClick={() => { setVisible(false) }}
				className="btn btn-secondary">
				Close
			</Button>
		</Modal.Footer>
	</Modal>
}

function selectedDetails(squad: Squad) {
	return <pre>
		{JSON.stringify(squad, null, 2)}
	</pre>
}

const squadTable = (
	squads: Squad[],
	selected: Squad | undefined, selectedSquad: string, force: string,
	setSelectedSquad: { (value: SetStateAction<string>): void; (value: SetStateAction<string>): void; (arg0: string): void; }
) => {
	return <Table striped bordered hover size="sm">
		<thead>
			<tr>
				<th>Morale</th>
				<th>Members</th>
			</tr>
		</thead>
		<tbody>
			{
				squads
					.filter(s => s.force === force)
					.map(squad => <tr
						key={squad.id}
					>
						<td className="col-1">
							{squad.morale}</td>
						<td className="col-11">
							{
								getMembers(squad).map(unit =>
									<img
										key={`squad-member-${unit.id}`}
										className={
											"img-fluid portrait-sm"
											+ (unit.id === squad.leader ? " leader" : "")
										}
										src={`assets/jobs/${unit.job}/portrait.png`}
										alt={unit.name}
										onClick={
											() => {

											}
										}
									/>
								)
							}
						</td>
					</tr>)
			}
		</tbody>

	</Table>
}

export default SquadsWindow;