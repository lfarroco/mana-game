import "bootstrap/dist/css/bootstrap.min.css";
import "../index.css";
import Battleground from "./Battleground/Battleground";
import { useState } from "react";
import { listeners, signals } from "../Models/Signals";
import Title from "./Title/Title";
import Options from "./Options/Options";
import LoadGame from "./LoadGame/LoadGame";

export const UI = () => {
  const [route, setRoute] = useState("menu");

  listeners([
    [
      signals.SET_ROUTE,
      (route: string) => {
        setRoute(route);
      },
    ],
  ]);

  return (
    <>
      {route === "menu" && <Title />}
      {route === "battleground" && <Battleground />}
      <Options />
      <LoadGame />
    </>
  );
};



