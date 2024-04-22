import SwipeableViews from "react-swipeable-views";
import React from "react";
import Upload from "./Upload";
import Fotos from "./Fotos";
import FotosFree from "./FotosFree";

function UserView() {
  return (
    <SwipeableViews enableMouseEvents index="1">
      <FotosFree />
      <Upload />
      <Fotos />
    </SwipeableViews>
  );
}

export default UserView;
