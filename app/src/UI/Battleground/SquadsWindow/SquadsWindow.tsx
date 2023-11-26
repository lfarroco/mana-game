import './SquadsWindow.css';
import Modal from 'react-bootstrap/Modal';
import ListGroup from 'react-bootstrap/ListGroup';
import { Link, useParams } from 'react-router-dom';
import { Squad } from '../../../Models/Squad';
import { getState } from '../../../Scenes/Battleground/BGState';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from '../../../Models/Force';

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
			<Tabs
				defaultActiveKey={FORCE_ID_PLAYER}
				className="mb-3"
			>
				<Tab eventKey={FORCE_ID_PLAYER} title="Allied">
					{squadList(squads, selected, selectedSquad, FORCE_ID_PLAYER)}
				</Tab>
				<Tab eventKey={FORCE_ID_CPU} title="Enemy">
					{squadList(squads, selected, selectedSquad, FORCE_ID_CPU)}
				</Tab>
			</Tabs>

		</Modal.Body>
		<Modal.Footer>
			<Link to="/battleground" className="btn btn-secondary">
				Close
			</Link>
		</Modal.Footer>
	</Modal>
}

function selectedDetails(squad: Squad) {
	return <pre>
		{JSON.stringify(squad, null, 2)}
	</pre>
}

const squadList = (squads: Squad[], selected: Squad | undefined, selectedSquad: string, force: string) => <div
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