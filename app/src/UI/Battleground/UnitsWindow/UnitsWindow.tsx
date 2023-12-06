import './UnitsWindow.css';
import { Unit } from '../../../Models/Unit';
import Modal from 'react-bootstrap/Modal';
import { Button, Table } from 'react-bootstrap';
import { getState } from '../../../Models/State';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from '../../../Models/Force';
import { useEffect, useState } from 'react';
import { emit_, events, listeners } from '../../../Models/Signals';

function UnitsWindow() {

	const units = getState().units

	const [isVisible, setIsVisible] = useState(false);
	const [selectedUnit, setSelectedUnit] = useState(units[0].id)

	useEffect(() => {
		listeners([
			[events.TOGGLE_UNITS_WINDOW, (value: boolean) => { setIsVisible(value); }],
		])
	}, []);

	return <Modal
		show={isVisible}
		onHide={() => { setIsVisible(false) }}
		size={"xl"}
		id="units-window"
	>
		<Modal.Header closeButton>
			<Modal.Title>Units List</Modal.Title>
		</Modal.Header>
		<Modal.Body>{isVisible &&
			<Tabs
				defaultActiveKey="player"
			>
				<Tab eventKey="player" title="Allied">
					{unitList(units, selectedUnit, FORCE_ID_PLAYER, setSelectedUnit)}
				</Tab>
				<Tab eventKey="cpu" title="Enemy">
					{unitList(units, selectedUnit, FORCE_ID_CPU, setSelectedUnit)}
				</Tab>
			</Tabs>}
		</Modal.Body>
		<Modal.Footer>
			<Button
				onClick={() => setIsVisible(false)}
				className="btn btn-secondary">
				Close
			</Button>
		</Modal.Footer>
	</Modal>

}

const unitList = (
	units: Unit[],
	selectedUnit: string,
	force: string,
	setSelectedUnit: (id: string) => void = () => { }
) => <div
	className="row"
>
		<div className="col col-sm-12">
			<Table striped bordered hover size="sm">
				<thead>
					<tr>
						<th style={{ width: 60 }} ></th>
						<th>Name</th>
						<th>Job</th>
						<th>STR</th>
						<th>CON</th>
						<th>INT</th>
						<th>WIS</th>
						<th>DEX</th>
						<th>CHA</th>
						<th>HP</th>
						<th>Max HP</th>

					</tr>
				</thead>
				<tbody>
					{
						units
							.filter(u => u.force === force)
							.map(unit =>
								<tr
									key={unit.id}
									className={unit.id === selectedUnit ? "selected" : ""}
									onClick={() => setSelectedUnit(unit.id)}
								>
									<td

									>
										<img
											style={{ width: 50 }}
											className="col-sm-3"
											src={`/assets/jobs/${unit.job}/portrait.png`}
											alt="job"
										/>
									</td>
									<td>{unit.name}</td>
									<td>{unit.job}</td>
									<td>{unit.strength}</td>
									<td>{unit.constitution}</td>
									<td>{unit.intelligence}</td>
									<td>{unit.wisdom}</td>
									<td>{unit.dexterity}</td>
									<td>{unit.charisma}</td>
									<td>{unit.currentHp}</td>
									<td>{unit.maxHp}</td>
									<td>

										<Button
											size="sm"
											onClick={emit_(events.SET_UNIT_DETAILS_MODAL, unit.id)}
										>
											Details

										</Button>

									</td>
								</tr>
							)
					}
				</tbody>
			</Table>
		</div>
	</div >


export default UnitsWindow;