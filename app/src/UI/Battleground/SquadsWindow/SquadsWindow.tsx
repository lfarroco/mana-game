import './SquadsWindow.css';
import Modal from 'react-bootstrap/Modal';
import ListGroup from 'react-bootstrap/ListGroup';
import { Link, useParams } from 'react-router-dom';
import { Squad } from '../../../Models/Squad';

function SquadsWindow() {

	const squads: Squad[] = [
		{ id: "1", name: "weeeee", members: {} },
		{ id: "2", name: "blaaaa", members: {} },
		{ id: "3", name: "blaaaa", members: {} },
		{ id: "4", name: "blaaaa", members: {} },
		{ id: "5", name: "blaaaa", members: {} },
		{ id: "7", name: "blaaaa", members: {} },
		{ id: "8", name: "blaaaa", members: {} },
		{ id: "9", name: "blaaaa", members: {} },
	]

	const { squadId } = useParams()

	let selectedSquad = squadId || "1"

	const selected = squads.find(u => u.id === selectedSquad)

	return <Modal show={true} size={"xl"}>
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