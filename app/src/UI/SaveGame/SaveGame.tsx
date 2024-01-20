import { useEffect, useState } from "react";
import { Form, ListGroup, Modal } from "react-bootstrap";
import { emit, emit_, events, listeners } from "../../Models/Signals";
import { getSavedGamesIndex } from "../../Models/SavedGame";
import { getState } from "../../Models/State";

export default function SaveGame() {

	const [show, setShow] = useState(false);
	const [savedGames, setSavedGames] = useState(["game1", "game2", "game3"]);
	const [selectedGame, setSelectedGame] = useState("");
	const [name, setName] = useState("");

	useEffect(() => {
		listeners([
			[
				events.TOGGLE_SAVE_GAME_MODAL,
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
			onHide={emit_(events.TOGGLE_SAVE_GAME_MODAL, false)}
		>
			<Modal.Header closeButton>
				<Modal.Title>Save Game</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<Form>
					<Form.Group>
						<Form.Label>Save Game</Form.Label>
						<Form.Control
							type="text"
							placeholder="Enter name"
							value={name}
							onChange={(e) => {
								setName(e.target.value);
							}}
						/>
					</Form.Group>
				</Form>
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
					disabled={name === ""}
					onClick={() => {
						emit(events.TOGGLE_SAVE_GAME_MODAL, false);
						emit(events.SAVE_GAME, getState().gameData, name);
					}}
				>
					Save Game
				</button>
				<button className="btn btn-primary" onClick={emit_(events.TOGGLE_SAVE_GAME_MODAL, false)}>
					Close
				</button>
			</Modal.Footer>
		</Modal>
	);
}
