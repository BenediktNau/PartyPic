import React, { useCallback } from "react";
import WebcamCapture from "../components/camera/Webcam.comp";
import { initUpload, uploadToPresignedUrl, finalizeUpload } from "../api/pictures/pictures.api";
import { handlePhotoShoot } from "../components/camera/functions/handlePhoto.func";

interface CameraViewProps {
  sessionId: string;
  cameraOn?: boolean;
}

function cameraView({ sessionId, cameraOn }: CameraViewProps) {
  const webcamRef = React.useRef<any>(null);
  const [portraitMode, setPortraitMode] = React.useState<boolean>(true);

  const capturePic = useCallback(() => {
    (async () => {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) return;

      const { blob, fileName } = handlePhotoShoot(imageSrc, sessionId);
      try {
        // 1) Ask server for presigned URL
        const presigned = await initUpload({ session_id: sessionId, mimetype: blob.type });

        // 2) Upload directly to S3 using the presigned URL
        await uploadToPresignedUrl(presigned.uploadUrl, blob, blob.type);

        // 3) Notify backend that upload is complete
        await finalizeUpload({
          u_name: "test_user",
          session_id: sessionId,
          s3_key: presigned.key,
          original_filename: fileName,
          filesize_bytes: blob.size,
          mimetype: blob.type,
        });
      } catch (err) {
        console.error("Picture upload failed", err);
      }
    })();
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
        {cameraOn ? (
          <WebcamCapture
            Portraitmode={(e) => setPortraitMode(e)}
            ref={webcamRef}
            className=" min-h-0  max-h-5/6"
          />
        ) : (
          <div>Kamera ist aus</div>
        )}
      </div>

      <button onClick={capturePic} className="p-4">
        Capture photo
      </button>
    </div>
  );
}

export default cameraView;
