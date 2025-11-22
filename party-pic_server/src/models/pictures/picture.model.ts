export interface picture {
    id: string,
    u_name: string,
    session_id: string,
    s3_key: string,
    s3_bucket: string,
    filename: string,
    mimetype: string,
    created_at: Date
}
export interface IpictureData {
    u_name: string;
    session_id: string;
    original_filename: string;
    s3_key: string;
    s3_bucket: string;
    mimetype: string;
    filesize_bytes: number;
}
