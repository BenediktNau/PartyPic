import React, { useCallback, useRef, useState } from "react";
import Webcam from "react-webcam";

const videoConstraints = {
  aspectRatio: 1.666667,
  width: { min: 480 },
  height: { min: 960 },
};

const CameraModule = () => {
  const webcamRef = useRef(null);
  const [imgSrc, setImgSrc] = useState(null);

  const capture = useCallback(() => {
    if (webcamRef.current) {
      //Fix getScreenshot Error!!!!!!!!!!!!!!!!!
      // Dont do @ts-ignore
      // @ts-ignore
      const imageSrc = webcamRef.current.getScreenshot();
      setImgSrc(imageSrc);
    } else setImgSrc(null);
  }, [webcamRef, setImgSrc]);
  console.log(imgSrc);
  return (
    <div className="text-text">
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        videoConstraints={videoConstraints}
        className="w-full h-full rounded-3xl border-4 border-borders"
      />
      <button onClick={capture}>Capture photo</button>
    </div>
  );
};

export default CameraModule;
