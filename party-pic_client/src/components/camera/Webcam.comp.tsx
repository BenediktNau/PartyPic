import React, { useMemo } from 'react'
import Webcam from 'react-webcam';
import { useOrientation } from './hooks/useOrientation';

interface Props {
    ref: React.Ref<Webcam>;
    className?: string;
}


function WebcamCapture(Props: Props) {

    const orientation = useOrientation();

    //calculate video constraints based on screen orientation
    const videoConstraints = useMemo(() => {
        // Start with ideal resolution for 4K cameras
        const idealResolution = {
            width: { ideal: 4096 },
            height: { ideal: 4096 }
        };
        const commonConstraints = {
            frameRate: { ideal: 30 },
            facingMode: { ideal: "environment" }
            
        };

        //Setting on Portrait or Landscape (Setting Width and Height accordingly)
        const portraitConstraints = {
            width: idealResolution.height,
            height: idealResolution.width,
            ...commonConstraints
        };

        const landscapeConstraints = {
            width: idealResolution.width,
            height: idealResolution.height,
            ...commonConstraints

        };

        return orientation === 'portrait'
            ? portraitConstraints
            : landscapeConstraints;

    }, [orientation]);

    return (
        <Webcam
            audio={false}
            screenshotFormat="image/jpeg"
            ref={Props.ref}
            videoConstraints={videoConstraints}
            className={`w-full  ${Props.className || ''}`}
        >
        </Webcam>
    )
}

export default WebcamCapture