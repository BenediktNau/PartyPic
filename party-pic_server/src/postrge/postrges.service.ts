import { picture } from "src/models/pictures/picture.model"

const Pool = require('pg-pool')
const url = require('url')

const params = url.parse(process.env.DATABASE_URL)
const auth = params.auth.split(':')

console.log(auth[1]);
console.log(test);
const config = {
    user: auth[0],
    password: auth[1],
    host: params.hostname,
    port: params.port,
    database: params.pathname.split('/')[1],
    ssl: true,
}

const pool = new Pool(config)

export const postPictureToDB = async (picture: picture) => {

    const { u_name, session_id, filename, s3_key, s3_bucket } = picture;
    const queryText = `
        INSERT INTO pictures (u_name, session_id, original_filename, s3_key, s3_bucket)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id; 
        `;

    const values = [u_name, session_id, filename, s3_key, s3_bucket];


    try {
        const result = await pool.query(queryText, values);
        console.log('Neues Bild gespeichert mit ID:', result.rows[0].id);

    } catch (err) {
        console.error('Fehler beim Einfügen in die Datenbank', err);
    }
}