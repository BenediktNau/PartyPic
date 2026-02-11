// Counter für HTTP Requests (mit status Label für Dashboard-Queries)
export const METRIC_HTTP_REQUESTS_TOTAL = 'partypic_http_requests_total';

// Gauge für aktuell aktive Sessions (wird per CronJob aktualisiert)
export const METRIC_ACTIVE_SESSIONS = 'partypic_active_sessions';

// Gauge für aktuell online User (wird per CronJob aktualisiert)
export const METRIC_USERS_ONLINE = 'partypic_users_online';

// Counter für alle jemals erstellten Sessions
export const METRIC_SESSIONS_TOTAL = 'partypic_sessions_created_total';

// Gauge für GESAMTE Anzahl Fotos aus DB 
export const METRIC_PHOTOS_TOTAL = 'partypic_photos_total';

// Histogram für HTTP Request Dauer
export const METRIC_HTTP_DURATION = 'partypic_http_request_duration_seconds';