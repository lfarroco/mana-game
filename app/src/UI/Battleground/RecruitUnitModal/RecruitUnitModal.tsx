import Modal from 'react-bootstrap/Modal';
import { State, getState } from '../../../Models/State';
import { useEffect, useState } from 'react';
import { Button, Table } from 'react-bootstrap';
import { emit, emit_, events, listeners } from '../../../Models/Signals';
import { Job, jobs } from '../../../Models/Job';
import * as uuid from 'uuid';
import { makeUnit } from '../../../Models/Unit';

const recruit = (state: State, job: Job) => () => {

	const [cityId] = state.gameData.selectedCities

	const city = state.gameData.cities.find(c => c.id === cityId)

	if (!city) throw new Error("No city selected")

	if (!city.force) throw new Error("City has no force");

	const unitId = uuid.v4();

	const unit = makeUnit(unitId, city.force, job.id, city.boardPosition)


	emit(events.RECRUIT_UNIT, unitId, city.force, job.id, city.boardPosition)
	emit(events.TOGGLE_DISPATCH_MODAL, false)

}

function DispatchSquadModal() {

	const state = getState()

	const [isVisible, setIsVisible] = useState(false);
	const [selectedJob, setSelectedJob] = useState<Job>(jobs[0]);

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
			{jobs.length > 0 && isVisible && <div
				className="row"
				id="squads-window">
				<Table striped bordered hover size="sm">
					<thead>
						<tr>
							<th></th>
							<th>Unit</th>
							<th>Cost</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{jobs.map(job => <tr
							key={job.id}
							onClick={() => setSelectedJob(job)}
							className={selectedJob === job ? "selected" : ""}
						>
							<td>
								<img
									className="portrait-sm"
									src={`assets/jobs/${job.id}/portrait.png`}
									alt={job.name} />
							</td>
							<td>{job.name}</td>
							<td>{job.stats.hp * 1000}</td>
							<td><Button
								className="float-end"
								onClick={recruit(state, job)}
							>
								Recruit
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
