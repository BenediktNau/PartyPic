import React, { useCallback, useState } from "react";
import WebcamCapture from "../components/camera/Webcam.comp";
import { initUpload, uploadToPresignedUrl, finalizeUpload } from "../api/pictures/pictures.api";
import { handlePhotoShoot } from "../components/camera/functions/handlePhoto.func";

interface CameraViewProps {
  sessionId: string;
  cameraOn?: boolean;
  userName?: string;
}

function cameraView({ sessionId, cameraOn, userName }: CameraViewProps) {
  const webcamRef = React.useRef<any>(null);
  const [portraitMode, setPortraitMode] = React.useState<boolean>(true);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [showFlash, setShowFlash] = useState(false);

  const capturePic = useCallback(() => {
    (async () => {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) return;

      // Flash-Effekt für visuelles Feedback
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 150);

      const { blob, fileName } = handlePhotoShoot(imageSrc, sessionId);
      
      setUploadStatus('uploading');
      
      try {
        // 1) Ask server for presigned URL
        const presigned = await initUpload({ session_id: sessionId, mimetype: blob.type });

        // 2) Upload directly to S3 using the presigned URL
        await uploadToPresignedUrl(presigned.uploadUrl, blob, blob.type);

        // 3) Notify backend that upload is complete
        await finalizeUpload({
          u_name: userName || "anonymous",
          session_id: sessionId,
          s3_key: presigned.key,
          original_filename: fileName,
          filesize_bytes: blob.size,
          mimetype: blob.type,
        });

        setUploadStatus('success');
        
        // Nach 2 Sekunden wieder auf idle
        setTimeout(() => setUploadStatus('idle'), 2000);
      } catch (err) {
        console.error("Picture upload failed", err);
        setUploadStatus('error');
        setTimeout(() => setUploadStatus('idle'), 3000);
      }
    })();
  }, [webcamRef, sessionId, userName]);

  return (
    <div
      className={
        portraitMode
          ? "flex flex-col w-screen h-dvh items-center justify-center relative"
          : "flex flex-row w-screen h-dvh items-center relative"
      }
    >
      {/* Flash-Overlay beim Foto */}
      {showFlash && (
        <div className="absolute inset-0 bg-white z-50 animate-pulse" />
      )}

      {/* Status-Anzeige */}
      {uploadStatus !== 'idle' && (
        <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 z-40 px-4 py-2 rounded-full text-white font-semibold shadow-lg ${
          uploadStatus === 'uploading' ? 'bg-blue-500' :
          uploadStatus === 'success' ? 'bg-green-500' :
          'bg-red-500'
        }`}>
          {uploadStatus === 'uploading' && '📤 Wird hochgeladen...'}
          {uploadStatus === 'success' && '✅ Foto gespeichert!'}
          {uploadStatus === 'error' && '❌ Upload fehlgeschlagen'}
        </div>
      )}

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

      <button 
        onClick={capturePic} 
        disabled={uploadStatus === 'uploading'}
        className={`p-4 rounded-full w-20 h-20 flex items-center justify-center text-3xl shadow-lg transition-all ${
          uploadStatus === 'uploading' 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-red-500 hover:bg-red-600 active:scale-95'
        }`}
      >
        📷
      </button>
    </div>
  );
}

export default cameraView;
