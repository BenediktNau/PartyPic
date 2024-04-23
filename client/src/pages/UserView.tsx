import SwipeableViews from "react-swipeable-views";
import React from "react";
import Upload from "./Upload";
import Fotos from "./Fotos";
import FotosFree from "./UploadFotos";

function UserView() {
  return (
    <div>
      
      <SwipeableViews enableMouseEvents index="1">
        <FotosFree />
        <Upload />
        <Fotos />
      </SwipeableViews>
    </div>
  );
}

export default UserView;
