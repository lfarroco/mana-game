import './UnitsWindow.css';
import { Unit } from '../../../Models/Unit';
import Modal from 'react-bootstrap/Modal';
import ListGroup from 'react-bootstrap/ListGroup';
import { Link, useParams } from 'react-router-dom';
import { Table } from 'react-bootstrap';
import { getState } from '../../../Scenes/Battleground/BGState';

function UnitsWindow() {

	const units = getState().units

	const { unitId } = useParams()

	const selectedUnit = unitId || units[0].id

	const selected = units.find(u => u.id === selectedUnit)

	return <Modal show={true} size={"xl"}

		id="units-window"
	>
		<Modal.Header closeButton>
			<Modal.Title>Units List</Modal.Title>
		</Modal.Header>
		<Modal.Body>
			{
				unitList(units, selected, selectedUnit)
			}
		</Modal.Body>
		<Modal.Footer>
			<Link to="/battleground" className="btn btn-secondary">
				Close
			</Link>
		</Modal.Footer>
	</Modal>

}
function selectedDetails(unit: Unit) {
	return <Table striped bordered hover size="sm">
		<tbody>
			<tr>
				<td>id</td>
				<td>{unit.id}</td>
			</tr>
			<tr>
				<td>name</td>
				<td>{unit.name}</td>
			</tr>
		</tbody>
	</Table>
}

const unitList = (units: Unit[], selected: Unit | undefined, selectedUnit: string) => <div

	className="row"
>
	<div className="col col-sm-4">

		<ListGroup
			activeKey={selectedUnit}
		>
			{
				units.map(unit =>

					<Link to={`/battleground/units/${unit.id}`}

						key={unit.id}
					>
						<ListGroup.Item
							action
							active={unit.id === selectedUnit}
						>
							<div className="row">

								<img
									className="portrait col-sm-3"
									src={`/assets/jobs/${unit.job}/portrait.png`} />
								{unit.name}

							</div>

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


export default UnitsWindow;