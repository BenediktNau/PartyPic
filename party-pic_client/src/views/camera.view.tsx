import React, { useCallback } from 'react'
import WebcamCapture from '../components/camera/Webcam.comp';

function cameraView() {
    const webcamRef = React.useRef<any>(null);


    const capturePic = useCallback(() => {
        const imageSrc = webcamRef.current.getScreenshot()
        console.log(imageSrc);
    }, [webcamRef]);


    return (
        <div className="p-4 flex flex-col w-screen h-screen items-center  justify-center ">
            <h1 >Camera View</h1>
            <WebcamCapture ref={webcamRef} className='flex-1'/>
            <button onClick={capturePic}>Capture photo</button>
        </div>
    )

}

export default cameraView