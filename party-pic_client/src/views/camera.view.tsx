import React, { useCallback } from 'react'
import WebcamCapture from '../components/camera/Webcam.comp';

function cameraView() {
    const webcamRef = React.useRef<any>(null);


    const capturePic = useCallback(() => {
        const imageSrc = webcamRef.current.getScreenshot()
        console.log(imageSrc);
    }, [webcamRef]);


    return (
        <div className="flex flex-col w-full h-dvh items-center justify-center">

            <div className="p-4">
                <WebcamCapture ref={webcamRef} className='flex-1 min-h-0 w-screen' />
            </div>

            <button onClick={capturePic} className="p-4">
                Capture photo
            </button>
        </div>
    )

}

export default cameraView