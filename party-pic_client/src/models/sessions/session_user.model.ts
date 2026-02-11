export interface session_User {
    id: string,
    user_name: string,
    session_id: string,
    created_at: Date,
    last_seen?: Date,
}