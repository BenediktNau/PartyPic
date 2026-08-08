import type { mission } from "../../models/sessions/missions.model";

export const getRandomMission = (missions: mission[]) =>{
    const randomIndex = Math.floor(Math.random() * missions.length);
    return missions[randomIndex];
}