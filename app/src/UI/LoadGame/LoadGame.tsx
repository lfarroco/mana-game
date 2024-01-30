import { useEffect, useState } from "react";
import { ListGroup, Modal } from "react-bootstrap";
import { emit, emit_, signals, listeners } from "../../Models/Signals";
import { SavedGamesIndex, getSavedGamesIndex } from "../../Models/SavedGame";

export default function LoadGame() {

	const [show, setShow] = useState(false);
	const [savedGames, setSavedGames] = useState([] as SavedGamesIndex);
	const [selectedGame, setSelectedGame] = useState("");

	const fetchSavedGames = () => {
		const saves = getSavedGamesIndex();
		setSavedGames(saves);
	}

	useEffect(() => {
		listeners([
			[
				signals.TOGGLE_LOAD_GAME_MODAL,
				(value: boolean) => {
					setShow(value);

					if (value) {
						fetchSavedGames();
					}
				},
			],
		]);

		fetchSavedGames();

	}, []);

	return (
		<Modal
			show={show}
			onHide={emit_(signals.TOGGLE_LOAD_GAME_MODAL, false)}
		>
			<Modal.Header closeButton>
				<Modal.Title>Load Game</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<ListGroup>
					{
						savedGames.map((save, index) => {
							return <ListGroup.Item
								onClick={() => {
									setSelectedGame(save);
								}}
								active={selectedGame === save}
								key={index}>
								<span>{save}</span>
								<button

									onClick={() => {
										emit(signals.DELETE_GAME, save);
										fetchSavedGames();
									}}
									className="float-end">Delete</button>
							</ListGroup.Item>

						})
					}
				</ListGroup>
			</Modal.Body>

			<Modal.Footer>
				<button
					className="button"
					disabled={selectedGame === ""}
					onClick={() => {
						emit(signals.TOGGLE_LOAD_GAME_MODAL, false);
						emit(signals.LOAD_GAME, selectedGame);
					}}
				>
					Load Game
				</button>
				<button className="button" onClick={emit_(signals.TOGGLE_LOAD_GAME_MODAL, false)}>
					Close
				</button>
			</Modal.Footer>
		</Modal>
	);

}
