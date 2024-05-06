import 'dotenv/config'
import postgres from 'postgres'

// const { PGHOST, PGDATABASE, PGUSER, PGPASSWORD, ENDPOINT_ID } = process.env;
// const URL = `postgres://${PGUSER}:${PGPASSWORD}@${PGHOST}/${PGDATABASE}?options=project%3D${ENDPOINT_ID}`;

const { PGHOST, PGDATABASE, PGUSER, PGPASSWORD, PGPORT} = process.env;
const URL = `postgres://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}`;

export const sql = postgres(URL, { ssl: 'prefer' });