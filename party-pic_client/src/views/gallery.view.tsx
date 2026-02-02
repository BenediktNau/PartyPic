import { useState, useEffect } from "react";
import { getSessionPictures, type Picture } from "../api/pictures/pictures.api";

interface GalleryViewProps {
  sessionId: string;
}

function GalleryView({ sessionId }: GalleryViewProps) {
  const [pictures, setPictures] = useState<Picture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPicture, setSelectedPicture] = useState<Picture | null>(null);

  // Bilder laden
  const loadPictures = async () => {
    try {
      setLoading(true);
      setError(null);
      const pics = await getSessionPictures(sessionId);
      setPictures(pics);
    } catch (err) {
      console.error("Failed to load pictures:", err);
      setError("Bilder konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPictures();
    // Auto-Refresh alle 30 Sekunden
    const interval = setInterval(loadPictures, 30000);
    return () => clearInterval(interval);
  }, [sessionId]);

  if (loading && pictures.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-xl text-gray-500">📷 Lade Bilder...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 gap-4">
        <div className="text-xl text-red-500">❌ {error}</div>
        <button 
          onClick={loadPictures}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  if (pictures.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 gap-4">
        <div className="text-6xl">📸</div>
        <div className="text-xl text-gray-600">Noch keine Bilder in dieser Session</div>
        <div className="text-gray-400">Mach das erste Foto!</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-100 overflow-y-auto p-4">
      {/* Header mit Refresh-Button */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          📷 Galerie ({pictures.length} Bilder)
        </h2>
        <button 
          onClick={loadPictures}
          className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
        >
          🔄 Aktualisieren
        </button>
      </div>

      {/* Bilder-Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {pictures.map((pic) => (
          <div
            key={pic.id}
            onClick={() => setSelectedPicture(pic)}
            className="aspect-square bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
          >
            <img
              src={pic.url}
              alt={pic.original_filename}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedPicture && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPicture(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={selectedPicture.url}
              alt={selectedPicture.original_filename}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-3 rounded-b-lg">
              <p className="text-sm">📷 {selectedPicture.u_name}</p>
              <p className="text-xs text-gray-300">
                {new Date(selectedPicture.created_at).toLocaleString('de-DE')}
              </p>
            </div>
            <button 
              onClick={() => setSelectedPicture(null)}
              className="absolute top-2 right-2 w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full text-white text-xl"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default GalleryView;