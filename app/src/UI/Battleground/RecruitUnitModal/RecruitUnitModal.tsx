import Modal from 'react-bootstrap/Modal';
import { State, getState } from '../../../Models/State';
import { useEffect, useState } from 'react';
import { Button, ListGroup } from 'react-bootstrap';
import { emit, emit_, events, listeners } from '../../../Models/Signals';
import { Job, jobs } from '../../../Models/Job';
import * as uuid from 'uuid';

const recruit = (state: State, job: Job) => () => {

	const [cityId] = state.gameData.selectedCities

	const city = state.gameData.cities.find(c => c.id === cityId)

	if (!city) throw new Error("No city selected")

	if (!city.force) throw new Error("City has no force");

	// TODO: ui should not generate unit id
	const unitId = uuid.v4();

	emit(events.RECRUIT_UNIT, unitId, city.force, job.id, city.boardPosition)
	emit(events.TOGGLE_DISPATCH_MODAL, false)
	emit(events.CITIES_SELECTED, [])
	emit(events.UNITS_SELECTED, [unitId])

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
			<Modal.Title>Recruit Unit</Modal.Title>
		</Modal.Header>
		<Modal.Body>
			{jobs.length > 0 && isVisible &&
				<ListGroup>
					{jobs.map(job =>

						<ListGroup.Item
							key={job.id}
							onClick={() => setSelectedJob(job)}
							active={selectedJob === job}
						>

							<div className="row">
								<div className="col col-2">
									<img
										className="portrait-sm"
										src={`assets/jobs/${job.id}/portrait.png`}
										alt={job.name} />
								</div>
								<div className="col col-2 pt-3">
									{job.name}
								</div>
								<div className="col col-2 pt-3">
									{job.gold}
								</div>

							</div>


						</ListGroup.Item>
					)}
				</ListGroup>
			}
		</Modal.Body>
		<Modal.Footer>
			<button
				className="button"
				onClick={emit_(events.TOGGLE_DISPATCH_MODAL, false)}
			>
				Close
			</button>
			<button
				className="button"
				onClick={recruit(state, selectedJob)}
			>
				Recruit
			</button>
		</Modal.Footer>
	</Modal>
}


export default DispatchSquadModal;
