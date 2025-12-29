import React, { useCallback } from "react";
import WebcamCapture from "../components/camera/Webcam.comp";
import { useMutation } from "@tanstack/react-query";
import { postPicture } from "../api/pictures/pictures.api";
import { handlePhotoShoot } from "../components/camera/functions/handlePhoto.func";

interface CameraViewProps {
  sessionId: string;
  cameraOn?: boolean;
}

function cameraView({ sessionId, cameraOn }: CameraViewProps) {
  const webcamRef = React.useRef<any>(null);
  const [portraitMode, setPortraitMode] = React.useState<boolean>(true);

  const pictureUpload = useMutation({
    mutationFn: (formData: FormData) => postPicture(formData),
    onError: (error) => {
      console.log(error);
    },
  });

  const capturePic = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      const data = handlePhotoShoot(imageSrc, sessionId);
      console.log(data.get("file"));
      pictureUpload.mutate(data);
    }
  }, [webcamRef]);

  return (
    <div
      className={
        portraitMode
          ? "flex flex-col  w-screen h-dvh items-center justify-center "
          : "flex flex-row w-screen h-dvh items-center"
      }
    >
      <div className="p-4">
        {cameraOn? 
          <WebcamCapture
            Portraitmode={(e) => setPortraitMode(e)}
            ref={webcamRef}
            className=" min-h-0  max-h-5/6"
          /> : <div>Kamera ist aus</div>
        }
      </div>

      <button onClick={capturePic} className="p-4">
        Capture photo
      </button>
    </div>
  );
}

export default cameraView;
