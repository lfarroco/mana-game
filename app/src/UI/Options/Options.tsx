import { useEffect, useState } from "react";
import { Form, Modal } from "react-bootstrap";
import { emit, emit_, signals, listeners } from "../../Models/Signals";
import { getState } from "../../Models/State";

export default function Options() {

  const state = getState();

  const [show, setShow] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [gameSpeed, setGameSpeed] = useState(state.options.speed);


  useEffect(() => {
    listeners([
      [
        signals.TOGGLE_OPTIONS_MODAL,
        (value: boolean) => {
          setShow(value);
        },
      ],
    ]);
  }, []);

  return (
    <Modal
      show={show}
      onHide={emit_(signals.TOGGLE_OPTIONS_MODAL, false)}
    >
      <Modal.Header closeButton>
        <Modal.Title>Options</Modal.Title>
      </Modal.Header>
      <Modal.Body>

        <Form>
          <Form.Check
            id="toggle-sound"
            type="switch"
            label="Sound"
            onChange={() => {
              state.options.sound = !state.options.sound;
              setSoundEnabled(!soundEnabled);
            }}
            checked={soundEnabled}
          />
          <Form.Check
            id="toggle-music"
            type="switch"
            label="Music"
            onChange={() => {
              state.options.music = !state.options.music;
              setMusicEnabled(!musicEnabled);
              if (state.options.music)
                emit(signals.PLAY_MUSIC)
              else
                emit(signals.STOP_MUSIC)
            }}
            checked={musicEnabled}
          />
          <Form.Label>Game speed: {gameSpeed}</Form.Label>

          <Form.Range // game speed
            id="game-speed"
            min={1}
            max={8}
            step={1}
            value={state.options.speed}
            onChange={(e) => {
              const speed = parseInt(e.target.value);
              state.options.speed = speed;
              setGameSpeed(speed)
            }}
          />
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <button className="button" onClick={emit_(signals.TOGGLE_OPTIONS_MODAL, false)}>
          Close
        </button>
      </Modal.Footer>
    </Modal>
  );
}
