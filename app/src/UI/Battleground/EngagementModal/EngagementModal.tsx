import { useEffect, useState } from 'react';
import { emit_, events, listeners } from '../../../Models/Signals';
import Modal from 'react-bootstrap/Modal';
import { Button, Tab, Table, Tabs } from 'react-bootstrap';
import { State, getState } from '../../../Models/State';
import { Engagement } from '../../../Systems/Engagement/Engagement';

function EngagementModal() {

	const [isVisible, setIsVisible] = useState(false);
	const [engagementId, setEngagementId] = useState("");


	useEffect(() => {
		listeners([
			[events.TOGGLE_ENGAGEMENT_WINDOW, (isVisible: boolean, id: string) => {
				setIsVisible(isVisible);
				setEngagementId(id)
			}]

		])
	}, []);

	return <Modal
		show={isVisible}
		onHide={() => { setIsVisible(false) }}
		size={"xl"}
		id="units-window"
	>
		<Modal.Header closeButton>
			<Modal.Title>Engagements</Modal.Title>
		</Modal.Header>
		<Modal.Body>{isVisible && renderContent(engagementId)}
		</Modal.Body>
		<Modal.Footer>
			<Button
				onClick={emit_(events.TOGGLE_ENGAGEMENT_WINDOW, false, "")}
				className="btn btn-secondary">
				Close
			</Button>
		</Modal.Footer>
	</Modal>

}

function renderContent(id: string) {

	const state = getState()

	if (id === "") return renderList(state)
	else return renderDetails(state, id)



}

function renderList(state: State) {

	return <Tabs defaultActiveKey={"ONGOING"}>
		<Tab eventKey={"ONGOING"} title="Ongoing">
			{engagementList(state, state.engagements.filter(engagement => !engagement.finished))}
		</Tab>
		<Tab eventKey={"ENDED"} title="Ended">
			{engagementList(state, state.engagements.filter(engagement => engagement.finished))}
		</Tab>
	</Tabs>

}

function renderDetails(state: State, id: string) {

	const engagement = state.engagements.find(engagement => engagement.id === id)
	if (!engagement) return null

	return <div className="row">
		<pre>
			{
				JSON.stringify(engagement, null, 2)
			}
		</pre>
	</div>

}

function engagementList(state: State, engagements: Engagement[]) {
	return <Table striped bordered hover>
		<thead>
			<tr>
				<th>Attacker</th>
				<th>Defender</th>
				<th>Start</th>
			</tr>
		</thead>
		<tbody>
			{
				engagements
					.sort((a, b) => b.startTick - a.startTick)
					.map(engagement => {
						const attacker = state.squads.find(squad => squad.id === engagement.attacker.id)
						const defender = state.squads.find(squad => squad.id === engagement.defender.id)

						if (!attacker || !defender) return null

						return <tr key={engagement.id}>
							<td>
								<img
									className={
										"img-fluid portrait-sm"
									}
									src={`assets/jobs/${state.units.find(u => u.id === attacker.leader)?.job}/portrait.png`}
									alt={attacker.name}
									onClick={emit_(events.TOGGLE_SQUAD_DETAILS_MODAL, attacker.id)}
								/>
							</td>
							<td>
								<img
									className={
										"img-fluid portrait-sm"
									}
									src={`assets/jobs/${state.units.find(u => u.id === defender.leader)?.job}/portrait.png`}
									alt={defender.name}
									onClick={emit_(events.TOGGLE_SQUAD_DETAILS_MODAL, defender.id)}
								/>

							</td>
							<td>{engagement.startTick}</td>
							<td><Button>Log</Button></td>
						</tr>
					})
			}
		</tbody>
	</Table>
}
export default EngagementModal;