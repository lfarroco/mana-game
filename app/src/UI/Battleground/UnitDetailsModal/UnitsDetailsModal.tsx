import { useEffect, useState } from "react";
import { Button, Col, Modal, Row, Table } from "react-bootstrap"
import { events, listeners } from "../../../Models/Signals";
import { getState } from "../../../Models/State";


export const UnitDetailsModal = () => {

	const state = getState();
	const [unitId, setUnitId] = useState(null as string | null);

	useEffect(() => {
		listeners([
			[events.SET_UNIT_DETAILS_MODAL, (value: string | null) => { setUnitId(value); }],
		])
	}, []);

	const unit = state.units.find(u => u.id === unitId)

	return <Modal
		show={unitId !== null}
		onHide={() => { setUnitId(null) }}
		size={"xl"}
	>

		<Modal.Header closeButton>
			<Modal.Title>Unit Details</Modal.Title>
		</Modal.Header>
		<Modal.Body>{
			unit &&
			(<>
				<Row>
					<Col xs={3}> {unit.name} </Col>
					<Col xs={2}> {unit.job} </Col>
					<Col xs={3}> lvl {unit.lvl} exp {unit.exp} </Col>
					<Col xs={4}> hp: {unit.currentHp}/{unit.maxHp} </Col>

				</Row>
				<hr />
				<Row>
					<Col sm={3} xs={4}>
						<img
							className="img-fluid portrait-lg"
							src={`assets/jobs/${unit.job}/portrait.png`}
							alt="job" />
					</Col>
					<Col xs={2}>
						<Table striped bordered hover size="sm">
							<tbody>
								<tr>
									<td>STR</td>
									<td>{unit.strength}</td>
								</tr>
								<tr>
									<td>CON</td>
									<td>{unit.constitution}</td>
								</tr>
								<tr>
									<td>INT</td>
									<td>{unit.intelligence}</td>
								</tr>
								<tr>
									<td>WIS</td>
									<td>{unit.wisdom}</td>
								</tr>
								<tr>
									<td>DEX</td>
									<td>{unit.dexterity}</td>
								</tr>
								<tr>
									<td>CHA</td>
									<td>{unit.charisma}</td>
								</tr>
								<tr>
									<td>LUK</td>
									<td>{unit.luck}</td>
								</tr>
							</tbody>
						</Table>
					</Col>
					<Col >
						<Table striped bordered hover size="sm">
							<tbody>
								<tr>
									<td>Slash</td>
									<td>12 - 22</td>
								</tr>
								<tr>
									<td>Taunt</td>
									<td>~</td>
								</tr>
							</tbody>
						</Table>



					</Col>
				</Row>
				<hr />
				<Row>
					<Col xs={3}>
						<img className="figure-img img-fluid rounded me-2" src="assets/icons/sword.jpeg" alt="sword" />
						Sword of Derp
					</Col>
					<Col xs={3}>
						<img className="figure-img img-fluid rounded me-2" src="assets/icons/sword.jpeg" alt="sword" />
						Sword of Derp
					</Col>
					<Col xs={3}>
						<img className="figure-img img-fluid rounded me-2" src="assets/icons/sword.jpeg" alt="sword" />
						Sword of Derp
					</Col>
					<Col xs={3}>
						<img className="figure-img img-fluid rounded me-2" src="assets/icons/sword.jpeg" alt="sword" />
						Sword of Derp
					</Col>

				</Row>
			</>
			)
		}
		</Modal.Body>
		<Modal.Footer>
			<Button
				className="btn btn-secondary"
				onClick={() => { setUnitId(null) }}
			>
				Close
			</Button>
		</Modal.Footer>
	</Modal>
}