import './UnitsWindow.css';
import { Unit } from '../../../Models/Unit';
import Modal from 'react-bootstrap/Modal';
import ListGroup from 'react-bootstrap/ListGroup';
import { Link, useParams } from 'react-router-dom';
import { Table } from 'react-bootstrap';

function UnitsWindow() {

	const units: Unit[] = [
		{ id: "1", name: "weee" },
		{ id: "2", name: "blaaaa" },
		{ id: "3", name: "blaaaa" },
		{ id: "4", name: "blaaaa" },
		{ id: "5", name: "blaaaa" },
		{ id: "7", name: "blaaaa" },
		{ id: "8", name: "blaaaa" },
		{ id: "9", name: "blaaaa" },
		{ id: "10", name: "blaaaa" },
		{ id: "11", name: "blaaaa" },
		{ id: "12", name: "blaaaa" },
		{ id: "13", name: "blaaaa" },
	]

	const { unitId } = useParams()

	let selectedUnit = unitId || "1"

	const selected = units.find(u => u.id === selectedUnit)

	return <Modal show={true} size={"xl"}>
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
							{unit.name}

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