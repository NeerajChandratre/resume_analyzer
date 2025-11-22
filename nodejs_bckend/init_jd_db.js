const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./jd_embeddings.db")

db.serialize(() => {
    db.run(`
            CREATE TABLE IF NOT EXISTS job_embeddings (
                id TEXT PRIMARY KEY,
                vector TEXT,
                text_chunk TEXT,
                chunkIndex INTEGER
            );
    `);

    console.log("SQLite: jd_embeddings table ready.");
});

db.close();

