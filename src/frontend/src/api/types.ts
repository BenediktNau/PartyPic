// Die Antwortformen der API. Spiegel von src/PartyPic.Api/Contracts.cs — ändert sich dort
// etwas, muss es hier mitgezogen werden.

export type Mission = {
  id: string
  description: string
}

export type Host = {
  id: string
  name: string
  email: string
}

export type Guest = {
  id: string
  name: string
  sessionId: string
}

export type AuthResponse = {
  token: string
  expiresAt: string
  host: Host | null
  guest: Guest | null
}

export type Session = {
  id: string
  name: string
  createdAt: string
  endsAt: string
  missions: Mission[]
  guestCount: number
  photoCount: number
}

export type SessionPreview = {
  id: string
  name: string
  endsAt: string
  hasEnded: boolean
  missionCount: number
}

export type UploadUrl = {
  uploadUrl: string
  objectKey: string
  expiresAt: string
}

export type Picture = {
  id: string
  createdAt: string
  userName: string
  missionId: string | null
  missionDescription: string | null
  contentType: string
  fileSizeBytes: number
  url: string
  canDelete: boolean
}

export type Gallery = {
  items: Picture[]
  total: number
}

export type SessionStats = {
  photoCount: number
  guestCount: number
  onlineGuests: number
}
