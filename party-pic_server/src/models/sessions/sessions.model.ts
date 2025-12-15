export interface session {
    sessionId: string,
    sessionSettings: string,
    sessionMissions: {id: string, description: string}[]
    created_at: Date
    ends_at: Date
    user_id: string
}