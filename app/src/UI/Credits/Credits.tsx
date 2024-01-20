import { Modal } from "react-bootstrap";

export default function Credits({ visible, onHide }: { visible: boolean, onHide: () => void }) {

	return (
		<Modal
			show={visible}
			onHide={onHide}
		>
			<Modal.Header closeButton>
				<Modal.Title>Credits</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<div className="text-center">
					<em>== Game Design and Programming ==</em>
					<div>Leonardo de Oliveira Farroco</div>
					<br />

					<em>== Music ==</em>
					<div>??? </div>
					<br />

					<em>== Sound Effects ==</em>
					<div>???</div>
					<br />

					<em>== Special Thanks ==</em>
					<div>My daughter, Laura</div>
					<div>My wife, Ercilia</div>
					<br />

					<em>== Open Source Libraries ==</em>
					<div>Phaser</div>
					<div>React</div>
					<div>Bootstrap</div>
					<div>React Bootstrap</div>
					<br />
				</div>
			</Modal.Body>

			<Modal.Footer>
				<button className="btn btn-primary" onClick={onHide}>
					Close
				</button>
			</Modal.Footer>
		</Modal>
	);
}
