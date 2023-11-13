import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import reportWebVitals from './reportWebVitals';
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import Title from './UI/Title/Title';
import 'bootstrap/dist/css/bootstrap.min.css';
import Battleground from './UI/Battleground/Battleground';
import * as Phaser from "phaser"
import events from 'events';

const eventEmitter = new events.EventEmitter();

const root = ReactDOM.createRoot(
  document.getElementById('ui') as HTMLElement
);

const router = createBrowserRouter([
  {
    path: "/",
    element: <Title />,
  },
  {
    path: "/battleground",
    element: <Battleground events={eventEmitter} />,
  },
]);

root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

const game = new Phaser.Game({
  // keep fullscreen for now
  type: Phaser.AUTO,
  mode: Phaser.Scale.FIT,
  autoCenter: Phaser.Scale.CENTER_BOTH,
  parent: 'game',
  width: window.innerWidth,
  height: window.innerHeight,
  scene: {
    preload: preload,
    create: create,
    update: update
  }
});

//window resize event
window.addEventListener('resize', () => {

  game.scale.resize(window.innerWidth, window.innerHeight);

});

function preload(this: Phaser.Scene) {

  this.load.image('tilesets/pipoya', 'assets/tilesets/pipoya.png');
  this.load.tilemapTiledJSON('maps/map1', 'assets/maps/map1/mapdata.json');

}
function create(this: Phaser.Scene) {
  console.log("hello there")

  const map = this.make.tilemap({ key: 'maps/map1' });

  const tiles = map.addTilesetImage('tilesets/pipoya', 'tilesets/pipoya');

  if (!tiles) {
    console.error("tiles is null")
    return
  }

  map.createLayer(0, tiles);
  map.createLayer(1, tiles);
  map.createLayer(2, tiles);


}
function update() { }