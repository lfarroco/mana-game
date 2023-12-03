import './SquadsWindow.css';
import Modal from 'react-bootstrap/Modal';
import ListGroup from 'react-bootstrap/ListGroup';
import { Squad } from '../../../Models/Squad';
import { getState } from '../../../Models/State';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from '../../../Models/Force';
import { SetStateAction, useEffect, useState } from 'react';
import { events, listeners } from '../../../Models/Signals';
import { Button } from 'react-bootstrap';

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
				className="mb-3"
			>
				<Tab eventKey={FORCE_ID_PLAYER} title="Allied">
					{squadList(squads, selected, selectedSquadId, FORCE_ID_PLAYER, setSelectedSquadId)}
				</Tab>
				<Tab eventKey={FORCE_ID_CPU} title="Enemy">
					{squadList(squads, selected, selectedSquadId, FORCE_ID_CPU, setSelectedSquadId)}
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

const squadList = (
	squads: Squad[],
	selected: Squad | undefined, selectedSquad: string, force: string,
	setSelectedSquad: { (value: SetStateAction<string>): void; (value: SetStateAction<string>): void; (arg0: string): void; }
) => {
	return <div
		className="row"
		id="squads-window">
		<div className="col col-sm-4 p-2">

			<ListGroup
				activeKey={selectedSquad}
			>
				{
					squads
						.filter(s => s.force === force)
						.map(squad =>

							<ListGroup.Item
								action
								active={squad.id === selectedSquad}
								onClick={
									() => {
										setSelectedSquad(squad.id)
									}
								}
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
}

export default SquadsWindow;