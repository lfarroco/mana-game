import './SquadsWindow.css';
import Modal from 'react-bootstrap/Modal';
import ListGroup from 'react-bootstrap/ListGroup';
import { Link, useParams } from 'react-router-dom';
import { Squad } from '../../../Models/Squad';
import { getState } from '../../../Scenes/Battleground/BGState';

function SquadsWindow() {

	let squads = getState().squads

	const { squadId } = useParams()

	let selectedSquad = squadId || squads[0].id

	const selected = squads.find(u => u.id === selectedSquad)

	return <Modal
		show={true}
		size={"xl"}
		id="squads-window"
	>
		<Modal.Header closeButton>
			<Modal.Title>Squads List</Modal.Title>
		</Modal.Header>
		<Modal.Body>
			{
				squadList(squads, selected, selectedSquad)
			}
		</Modal.Body>
		<Modal.Footer>
			<Link to="/battleground" className="btn btn-secondary">
				Close
			</Link>
		</Modal.Footer>
	</Modal>
}

function selectedDetails(squad: Squad) {
	return squad.name
}

const squadList = (squads: Squad[], selected: Squad | undefined, selectedSquad: string) => <div
	className="row"
	id="squads-window">
	<div className="col col-sm-4 p-2">

		<ListGroup
			activeKey={selectedSquad}
		>
			{
				squads.map(squad =>

					<Link
						to={`/battleground/squads/${squad.id}`}
						key={squad.id}
					>
						<ListGroup.Item
							action
							active={squad.id === selectedSquad}
						>

							{squad.name}
						</ListGroup.Item>

					</Link>
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


export default SquadsWindow;