import './SquadsWindow.css';
import Modal from 'react-bootstrap/Modal';
import { Squad, getMembers } from '../../../Models/Squad';
import { getState } from '../../../Models/State';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from '../../../Models/Force';
import { useEffect, useState } from 'react';
import { emit_, events, listeners } from '../../../Models/Signals';
import { Button, Table } from 'react-bootstrap';

function SquadsWindow() {

	let squads = getState().squads

	const [isVisible, setVisible] = useState(false);

	useEffect(() => {
		listeners([
			[events.TOGGLE_SQUADS_WINDOW, (value: boolean) => { setVisible(value); }],
		])
	}, []);

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
					{squadTable(squads, FORCE_ID_PLAYER)}
				</Tab>
				<Tab eventKey={FORCE_ID_CPU} title="Enemy">
					{squadTable(squads, FORCE_ID_CPU)}
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

const squadTable = (
	squads: Squad[],
	force: string,
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
							{squad.morale}
						</td>
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
										onClick={emit_(events.SET_UNIT_DETAILS_MODAL, unit.id)}
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