import Modal from 'react-bootstrap/Modal';
import { State, getState } from '../../../Models/State';
import { useEffect, useState } from 'react';
import { ListGroup } from 'react-bootstrap';
import { emit, emit_, signals, listeners } from '../../../Models/Signals';
import { Job, jobs } from '../../../Models/Job';
import ManaButton from '../../Components/Button';

const recruit = (state: State, job: Job) => () => {


	//emit(signals.RECRUIT_UNIT, city.force, job.id, city.boardPosition)
	emit(signals.TOGGLE_DISPATCH_MODAL, false)

}

function DispatchSquadModal() {

	const state = getState()

	const [isVisible, setIsVisible] = useState(false);
	const [selectedJob, setSelectedJob] = useState<Job>(jobs[0]);

	useEffect(() => {
		listeners([
			[signals.TOGGLE_DISPATCH_MODAL, (value: boolean) => { setIsVisible(value); }],
		])
	}, []);

	return <Modal
		show={isVisible}
		onHide={() => { setIsVisible(false) }}
		size={"xl"}
		id="squads-window"
		data-bs-theme="dark"
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
			<ManaButton
				css="btn-secondary"
				onClick={emit_(signals.TOGGLE_DISPATCH_MODAL, false)}
				label="Close"
			/>
			<ManaButton
				onClick={recruit(state, selectedJob)}
				label="Recruit"
			/>
		</Modal.Footer>
	</Modal>
}


export default DispatchSquadModal;
