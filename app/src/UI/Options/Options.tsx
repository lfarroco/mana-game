import { useState } from "react";
import { Form, Modal } from "react-bootstrap";
import { emit_, events, listeners } from "../../Models/Signals";

export default function Options() {
  const [show, setShow] = useState(false);

  listeners([
    [
      events.TOGGLE_OPTIONS_MODAL,
      (value: boolean) => {
        setShow(value);
      },
    ],
  ]);

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
          />
          <Form.Check
            id="toggle-music"
            type="switch"
            label="Music"
            disabled
          />
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <button className="btn btn-primary" onClick={emit_(events.TOGGLE_OPTIONS_MODAL, false)}>
          Close
        </button>
      </Modal.Footer>
    </Modal>
  );
}
