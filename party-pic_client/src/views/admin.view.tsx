
import type { FormEvent } from "react";
import { useGetMissions, useSetMissions } from "../api/session/session.hooks";
import type { mission } from "../models/sessions/missions.model";

function AdminPage() {
  // 1. Daten direkt vom Hook holen (Server State)
  const { data: serverMissions, isLoading, error } = useGetMissions();
  
  // 2. Mutation Hook initialisieren
  const { mutate: saveMissions } = useSetMissions();

  // 3. Funktion zum Hinzufügen einer Mission
  const handleAddMission = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Verhindert Seite-Neuladen
    
    const formData = new FormData(e.currentTarget);
    const missionText = formData.get("mission") as string;

    if (!missionText) return;

    // Neues Mission-Objekt erstellen
    const newMission: mission = {
      id: crypto.randomUUID(), // Erzeugt eine eindeutige ID (oder Date.now().toString())
      description: missionText,
      // Füge hier weitere Felder hinzu, falls dein Model sie braucht (z.B. status: 'OPEN')
    };

    // Aktuelle Liste kopieren (oder leeres Array, falls null) und neue Mission anhängen
    const currentMissions = serverMissions || [];
    const updatedMissions = [...currentMissions, newMission];

    // An Backend senden
    saveMissions(updatedMissions);

    // Input leeren
    e.currentTarget.reset();
  };

  // 4. Lade- und Fehlerzustände behandeln
  if (isLoading) return <div className="p-6">Lade Aufgaben...</div>;
  if (error) return <div className="p-6 text-red-500">Fehler: {error.message}</div>;

  return (
    <div className="flex justify-center items-center h-full">
      <div className="w-5/6 lg:w-2/3 p-6">
        <div>
          <h1 className="text-2xl font-bold mb-4">Aufgaben:</h1>
          
          <div className="space-y-2">
            {serverMissions && serverMissions.length > 0 ? (
              serverMissions.map((element: mission) => (
                <div key={element.id} className="border p-4 rounded bg-white shadow-sm flex justify-between">
                  <p>{element.description}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 italic">Keine Aufgaben vorhanden.</p>
            )}
          </div>

          <form
            onSubmit={handleAddMission}
            className="border p-4 my-4 rounded w-full flex flex-row gap-2 bg-gray-50"
          >
            <input
              type="text"
              name="mission"
              placeholder="Neue Aufgabe eingeben..."
              className="border p-2 rounded w-full"
              autoComplete="off"
            />
            <button 
              type="submit" 
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 font-bold"
            >
              +
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AdminPage;