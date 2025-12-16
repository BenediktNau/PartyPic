import type { FormEvent } from "react";
import { useGetSession, useSetMissions } from "../api/session/session.hooks";
import type { mission } from "../models/sessions/missions.model";

function AdminPage() {
  const { data: Session, isLoading, error } = useGetSession();

  const { mutate: saveMissions } = useSetMissions();
  console.log(Session)

  const handleAddMission = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Verhindert Seite-Neuladen

    const formData = new FormData(e.currentTarget);
    const missionText = formData.get("mission") as string;

    if (!missionText) return;

    // Neues Mission-Objekt erstellen
    const newMission: mission = {
      id: crypto.randomUUID(),
      description: missionText,
    };

    console.log(Session?.sessionMissions)
    const currentMissions = Session?.sessionMissions || [];
    const updatedMissions = [...currentMissions, newMission];

    saveMissions(updatedMissions);

    // Input leeren
    e.currentTarget.reset();
  };

  const handleRemoveMission = (id: string) => {
    if(!!Session?.sessionMissions){
    const updatedMissions = Session.sessionMissions
    saveMissions(updatedMissions);}
  };

  // 4. Lade- und Fehlerzustände behandeln
  if (isLoading) return <div className="p-6">Lade Aufgaben...</div>;
  if (error)
    return <div className="p-6 text-red-500">Fehler: {error.message}</div>;

  return (
    <div className="flex justify-center items-center h-full">
      <div className="w-5/6 lg:w-2/3 p-6">
        <div>
          <h1 className="text-2xl font-bold mb-4">Aufgaben:</h1>

          <div className="space-y-2 max-h-[400px] overflow-y-auto overflow-x-clip rounded">
            {Session?.sessionMissions && Session?.sessionMissions.length > 0 ? (
              Session.sessionMissions.map((element: mission) => (
                <div
                  key={element.id}
                  className="border p-4 rounded bg-white shadow-sm  flex justify-between text-black flex-row w-full "
                >
                  <p className="w-5/6 wrap-break-word">{element.description}</p>
                  <div className="flex items-center">
                    <button
                      onClick={() => handleRemoveMission(element.id)}
                      className="text-red-600 h-12"
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

          <form
            onSubmit={handleAddMission}
            className="border p-4 my-4 rounded w-full flex flex-row gap-2 bg-gray-50"
          >
            <input
              type="text"
              name="mission"
              placeholder="Neue Aufgabe eingeben..."
              className="border-none focus:outline-none p-2 rounded w-full text-black"
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
