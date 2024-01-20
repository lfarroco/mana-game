import { useEffect, useState } from "react";
import { ListGroup, Modal } from "react-bootstrap";
import { emit_, events, listeners } from "../../Models/Signals";
import { getSavedGamesIndex } from "../../Models/SavedGame";

export default function LoadGame() {

	const [show, setShow] = useState(false);
	const [savedGames, setSavedGames] = useState(["game1", "game2", "game3"]);
	const [selectedGame, setSelectedGame] = useState("");

	useEffect(() => {
		listeners([
			[
				events.TOGGLE_LOAD_GAME_MODAL,
				(value: boolean) => {
					setShow(value);
				},
			],
		]);

		const savedGames = getSavedGamesIndex();
		if (savedGames.length > 0) {
			setSavedGames(savedGames);
		}

	}, []);

	return (
		<Modal
			show={show}
			onHide={emit_(events.TOGGLE_LOAD_GAME_MODAL, false)}
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
								{save}
							</ListGroup.Item>

						})
					}
				</ListGroup>


			</Modal.Body>

			<Modal.Footer>
				<button
					className="btn btn-primary"
					disabled={selectedGame === ""}
					onClick={() => {
						emit_(events.TOGGLE_LOAD_GAME_MODAL, false);
						emit_(events.LOAD_GAME, selectedGame);
					}}
				>
					Load Game
				</button>
				<button className="btn btn-primary" onClick={emit_(events.TOGGLE_LOAD_GAME_MODAL, false)}>
					Close
				</button>
			</Modal.Footer>
		</Modal>
	);
}
