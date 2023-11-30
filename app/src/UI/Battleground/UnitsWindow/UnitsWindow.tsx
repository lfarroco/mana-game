import './UnitsWindow.css';
import { Unit } from '../../../Models/Unit';
import Modal from 'react-bootstrap/Modal';
import ListGroup from 'react-bootstrap/ListGroup';
import { Link, useParams } from 'react-router-dom';
import { Table } from 'react-bootstrap';
import { getState } from '../../../Models/BGState';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from '../../../Models/Force';

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
			<Tabs
				defaultActiveKey="player"
				className="mb-3"
			>
				<Tab eventKey="player" title="Allied">
					{unitList(units, selected, selectedUnit, FORCE_ID_PLAYER)}
				</Tab>
				<Tab eventKey="cpu" title="Enemy">
					{unitList(units, selected, selectedUnit, FORCE_ID_CPU)}
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

const unitList = (units: Unit[], selected: Unit | undefined, selectedUnit: string, force: string) => <div
	className="row"
>
	<div className="col col-sm-4">

		<ListGroup
			activeKey={selectedUnit}
		>
			{
				units
					.filter(u => u.force === force)
					.map(unit =>

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
										src={`/assets/jobs/${unit.job}/portrait.png`}
										alt="job"
									/>
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