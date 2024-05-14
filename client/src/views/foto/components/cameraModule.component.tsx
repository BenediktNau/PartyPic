import React from 'react'
import Webcam from 'react-webcam';


const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "user"
  };
  
  const WebcamCapture = () => (
    <Webcam
      audio={false}
      height={720}
      screenshotFormat="image/jpeg"
      width={1280}
      videoConstraints={videoConstraints}
    >
    </Webcam>
  );

function CameraModule() {
  return (
    <div><div><WebcamCapture/></div></div>
  )
}

export default CameraModule