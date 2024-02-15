import { FORCE_ID_PLAYER } from '../../../Models/Force';
import { useEffect, useState } from 'react';
import { signals, listeners } from '../../../Models/Signals';
import Modal from 'react-bootstrap/Modal';
import ManaButton from '../../Components/Button';

function VictoryModal() {

	const [isVisible, setIsVisible] = useState(false);
	const [playerWon, setPlayerWon] = useState(false);

	useEffect(() => {
		listeners([
			[signals.FORCE_VICTORY, (force: string) => {
				setIsVisible(true);
				setPlayerWon(force === FORCE_ID_PLAYER);
			}],
		])
	}, []);

	const message = playerWon ? "Victory!" : "Defeat!";

	return <Modal
		show={isVisible}
		onHide={() => { setIsVisible(false) }}
		size={"xl"}
		id="units-window"
		centered
		className="text-center"
	>
		<Modal.Body>
			{isVisible && message}

		</Modal.Body>
		<Modal.Footer>
			<ManaButton
				onClick={() => setIsVisible(false)}
				label='Continue'
			/>
			<ManaButton
				onClick={() => setIsVisible(false)}
				label='Quit'

			/>
		</Modal.Footer>
	</Modal>

}

export default VictoryModal;