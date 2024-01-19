import './SquadsWindow.css';
import Modal from 'react-bootstrap/Modal';
import { Unit } from '../../../Models/Squad';
import { getState } from '../../../Models/State';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from '../../../Models/Force';
import { useEffect, useState } from 'react';
import { events, listeners } from '../../../Models/Signals';
import { Offcanvas, Table } from 'react-bootstrap';

function SquadsWindow() {

	let squads = getState().squads

	const [isVisible, setVisible] = useState(false);

	useEffect(() => {
		listeners([
			[events.TOGGLE_SQUADS_WINDOW, (value: boolean) => { setVisible(value); }],
		])
	}, []);

	return <Offcanvas
		show={isVisible}
		onHide={() => { setVisible(false) }}
		size={"xl"}
		id="squads-window"
		backdrop={false}
	>
		<Offcanvas.Header closeButton>
			<Modal.Title>Squads List</Modal.Title>
		</Offcanvas.Header>
		<Offcanvas.Body>
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

		</Offcanvas.Body>
	</Offcanvas>
}

const squadTable = (
	squads: Unit[],
	force: string,
) => {
	return <Table striped bordered hover size="sm">
		<thead>
			<tr>
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

						<td className="col-12">
							<img
								key={`squad-${squad.id}`}
								className={
									"img-fluid portrait portrait-sm"
								}
								src={`assets/jobs/${squad.job}/portrait.png`}
								alt={squad.name}
							/>
						</td>
					</tr>)
			}
		</tbody>

	</Table>
}

export default SquadsWindow;
