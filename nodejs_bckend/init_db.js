const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./embeddings.db")

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS embeddings (
            id TEXT PRIMARY KEY,
            vector TEXT NOT NULL,
            section TEXT,
            text_chunk TEXT,
            chunkIndex INTEGER
        )
    `);

    console.log("SQLite: embeddings table ready.");
});

db.close();

