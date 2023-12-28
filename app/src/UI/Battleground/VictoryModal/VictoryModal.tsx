import { FORCE_ID_PLAYER } from '../../../Models/Force';
import { useEffect, useState } from 'react';
import { events, listeners } from '../../../Models/Signals';
import Modal from 'react-bootstrap/Modal';
import { Button } from 'react-bootstrap';

function VictoryModal() {

	const [isVisible, setIsVisible] = useState(false);
	const [playerWon, setPlayerWon] = useState(false);

	useEffect(() => {
		listeners([
			[events.FORCE_VICTORY, (force: string) => {
				setIsVisible(true);
				setPlayerWon(force === FORCE_ID_PLAYER);
			}],
		])
	}, []);

	const message = playerWon ? "You won!" : "You lost!";

	return <Modal
		show={isVisible}
		onHide={() => { setIsVisible(false) }}
		size={"xl"}
		id="units-window"
	>
		<Modal.Header closeButton>
			<Modal.Title>Game Over</Modal.Title>
		</Modal.Header>
		<Modal.Body>{isVisible && message}
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

export default VictoryModal;