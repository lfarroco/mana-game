import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './Battleground';
import events from 'events';

test('renders learn react link', () => {

  const emitter = new events.EventEmitter();
  render(<App events={emitter} />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
