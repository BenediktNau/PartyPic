import { type FormEvent, type ChangeEvent, useRef } from "react";
import { useGetSession, useSetMissions } from "../api/session/session.hooks";
import type { mission } from "../models/sessions/missions.model";

function AdminPage() {
  const { data: Session, isLoading, error } = useGetSession();
  const { mutate: saveMissions } = useSetMissions();

  // Ref to trigger the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Manual Add
  const handleAddMission = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const missionText = formData.get("mission") as string;

    if (!missionText) return;

    const newMission: mission = {
      id: crypto.randomUUID(),
      description: missionText,
    }; 

    const currentMissions = Session?.sessionMissions || {data: []};
    saveMissions({data: [...currentMissions.data, newMission]});
    e.currentTarget.reset();
  };

  // 2. Remove
  const handleRemoveMission = (id: string) => {
    if (!!Session?.sessionMissions) {
      const updatedMissions = Session.sessionMissions.data.filter(
        (e) => e.id !== id,
      );
      saveMissions({data: updatedMissions});
    }
  };

  // 3. File Upload Handler
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Split lines, trim, filter empty
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length === 0) return;

      const newMissions: mission[] = lines.map((line) => ({
        id: crypto.randomUUID(),
        description: line,
      }));

      const currentMissions = Session?.sessionMissions || {data: []};
      saveMissions({data: [...currentMissions.data, ...newMissions]});
    };

    reader.readAsText(file);

    // Reset input so the same file can be uploaded again if needed
    e.target.value = "";
  };

  // Helper to click the hidden input
  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  if (isLoading) return <div className="p-6">Lade Aufgaben...</div>;
  if (error)
    return <div className="p-6 text-red-500">Fehler: {error.message}</div>;

  return (
    <div className="flex justify-center items-center h-full">
      <div className="w-10/10 lg:w-2/3  p-6">
        <div>
          <h1 className="text-2xl font-bold mb-4">Aufgaben:</h1>

          {/* Mission List */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto overflow-x-clip rounded">
            {Session?.sessionMissions && Session?.sessionMissions.data.length > 0 ? (
              Session.sessionMissions.data.map((element: mission) => (
                <div
                  key={element.id}
                  className="border p-4 rounded bg-white shadow-sm flex justify-between text-black flex-row w-full"
                >
                  <p className="w-5/6 flex items-center wrap-break-words">
                    {element.description}
                  </p>
                  <div className="flex items-center">
                    <button
                      onClick={() => handleRemoveMission(element.id)}
                      className="text-red-600 h-12 font-bold px-2 hover:bg-red-50 rounded"
                    >
                      X
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 italic">Keine Aufgaben vorhanden.</p>
            )}
          </div>

          {/* Input Area */}
          <form
            onSubmit={handleAddMission}
            className="border p-4 my-4 rounded w-full flex justify-between flex-row gap-2 bg-gray-50 items-center"
          >
            <input
              type="text"
              name="mission"
              placeholder="Neue Aufgabe eingeben..."
              className="border-none text-[1.2em] max-w-48 md:max-w-none rounded flex-1 text-black outline-0"
              autoComplete="off"
            />
            <div className="flex">
              <div className="flex flex-row gap-2">
                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt"
                  className="hidden"
                />

                {/* Upload Button (Triggers Hidden Input) */}
                <button
                  type="button"
                  onClick={triggerFileSelect}
                  title="Upload .txt Datei"
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 font-bold border border-gray-300 flex items-center justify-center"
                >
                  {/* Simple Upload SVG Icon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                    />
                  </svg>
                </button>

                {/* Add Button */}
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 font-bold min-w-12"
                >
                  +
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AdminPage;
