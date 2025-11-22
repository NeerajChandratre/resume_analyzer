const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./embeddings.db")
function upsertEmbedding(id, vector,metadata){
    return new Promise((resolve,reject) => {
        const vectorJson = JSON.stringify(vector);
        const sql = `
        INSERT INTO embeddings (id, vector, section, text_chunk, chunkIndex)
        VALUES (?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET
            vector = excluded.vector,
            section = excluded.section,
            text_chunk = excluded.text_chunk,
            chunkIndex = excluded.chunkIndex
            `;
        
        db.run(
            sql,
            [
                id,
                vectorJson,
                metadata.section || null,
                metadata.text || null,
                metadata.chunkIndex || null
            ],
            function (err) {
                if (err) {
                    console.error("SQLite insert error:",err);
                    reject(err);
                }
                else {
                    resolve({insertedID: id})
                }
            }
        );
    });
}

module.exports = upsertEmbedding;
