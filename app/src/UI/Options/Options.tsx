import { useEffect, useState } from "react";
import { Form, Modal } from "react-bootstrap";
import { emit, emit_, events, listeners } from "../../Models/Signals";
import { getState } from "../../Models/State";

export default function Options() {

  const [show, setShow] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);

  const state = getState();

  useEffect(() => {
    listeners([
      [
        events.TOGGLE_OPTIONS_MODAL,
        (value: boolean) => {
          setShow(value);
        },
      ],
    ]);
  }, []);

  return (
    <Modal
      show={show}
      onHide={emit_(events.TOGGLE_OPTIONS_MODAL, false)}
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
                emit(events.PLAY_MUSIC)
              else
                emit(events.STOP_MUSIC)
            }}
            checked={musicEnabled}
          />
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <button className="button" onClick={emit_(events.TOGGLE_OPTIONS_MODAL, false)}>
          Close
        </button>
      </Modal.Footer>
    </Modal>
  );
}
