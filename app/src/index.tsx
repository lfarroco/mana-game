import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
//import reportWebVitals from './reportWebVitals';
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import Title from './UI/Title/Title';
import 'bootstrap/dist/css/bootstrap.min.css';
import Battleground from './UI/Battleground/Battleground';
import events from 'events';
import BattlegroundScene from './Scenes/Battleground/BattlegroundScene';

const eventEmitter = new events.EventEmitter();

//@ts-ignore
window.emitter = eventEmitter;

const root = ReactDOM.createRoot(
  document.getElementById('ui') as HTMLElement
);

const router = createBrowserRouter([
  {
    path: "/",
    element: <Title />,
  },
  {
    path: "/battleground/*",
    element: <Battleground />,
  }
]);

root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
//reportWebVitals();
const game = new Phaser.Game({
  // keep fullscreen for now
  type: Phaser.AUTO,
  mode: Phaser.Scale.FIT,
  autoCenter: Phaser.Scale.CENTER_BOTH,
  parent: 'game',
  width: window.innerWidth,
  height: window.innerHeight,
  physics: {
    default: 'arcade',
  },
  scene: [
    new BattlegroundScene(eventEmitter)
  ],
  plugins: {
    scene: [
      //@ts-ignore
      { key: "spine.SpinePlugin", plugin: spine.SpinePlugin, mapping: "spine" }
    ]
  }
});

//window resize event
window.addEventListener('resize', () => {

  game.scale.resize(window.innerWidth, window.innerHeight);

});

