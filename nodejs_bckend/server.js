
const express = require("express");
const multer = require("multer");
const cors  = require("cors");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const chunkText = require("./chunking");
const embedText = require("./gemini_embedding");
const upsertEmbedding = require("./vectorStore");
const {GoogleGenAI} = require("@google/genai");
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./embeddings.db")
const jd_db = new sqlite3.Database("./jd_embeddings.db")


const app = express();
app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({apiKey: "your key"});

//storage settings
const storage =  multer.diskStorage({
    destination: (req,file,calback) => {
        calback(null,"uploads");
    },
    filename: (req, file, calback)=> {
        calback(null, Date.now()+ "_"+ file.originalname);
    }
});

//PDF file filter
const fileFilter = (req,file,calbck)=> {
    if(file.mimetype === "application/pdf")
    {
        calbck(null,true);
    }
    else
    {
        calbck(new Error("Only PDF files are allowed"),false);
    }
};

const upload = multer({storage,fileFilter});

function extractSections(text) {
    const sections = {};
    const patterns = {
        summary: /(summary|about me)/i,
        skills: /(skills|technical skills|expertise)/i,
        education: /(education|academic background)/i,
        experience: /(work experience|experience|employment historyprojects|personal projects|profile)/i,
    };

    const lines = text.split("\n").map(l=>l.trim()).filter(Boolean);
    let current_section = "other";
    sections[current_section] = [];
    for (const line of lines){
        for (const section in patterns){
            if(patterns[section].test(line))
            {
                current_section = section;
                if(!sections[current_section])
                {
                    sections[current_section] = [];
                }
            }
        }
        sections[current_section].push(line);
    }
    return sections;
}

// app.post("/uploadJD",upload.single("jobFile"),async(req,res)=> { dis works but not using since chunking isn't well
//     try {
//             const buf = fs.readFileSync(req.file.path);
//             const { text } = await pdfParse(buf);
//             const chunks = chunkText(text,50);
//             console.log("chunks is ")
//             console.log(chunks)
//             chunks.forEach(async (chunk,idx) => {
//             console.log("a chunk is ")
//             console.log(chunk)
//             const vector = await embedText(chunk);
//             jd_db.run(
//             `INSERT INTO job_embeddings (id, vector, text_chunk, chunkIndex)
//             VALUES (?,?,?,?)
//             ON CONFLICT(id) DO UPDATE SET
//             vector = excluded.vector,
//             text_chunk = excluded.text_chunk,
//             chunkIndex =  excluded.chunkIndex
//             `,
//             [`jd_${Date.now()}_${idx}`, JSON.stringify(vector), chunk, idx]
//         );
//         });

//         res.json({message:"Job description stored in SQLite"});
//     } catch(err) {
//         res.status(500).json({error: err.message});
//     }
// });


app.post("/uploadJD",upload.single("jobFile"),async(req,res)=> {
    try {
            const buf = fs.readFileSync(req.file.path);
            const { text } = await pdfParse(buf);
            const chunks = text.split(/\n+/) // new line split
            .map(s => s.trim())
            .filter(Boolean);
            console.log("chunks is ")
            console.log(chunks)
            chunks.forEach(async (chunk,idx) => {
            console.log("a chunk is ")
            console.log(chunk)
            const vector = await embedText(chunk);
            jd_db.run(
            `INSERT INTO job_embeddings (id, vector, text_chunk, chunkIndex)
            VALUES (?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET
            vector = excluded.vector,
            text_chunk = excluded.text_chunk,
            chunkIndex =  excluded.chunkIndex
            `,
            [`jd_${Date.now()}_${idx}`, JSON.stringify(vector), chunk, idx]
        );
        });

        res.json({message:"Job description stored in SQLite"});
    } catch(err) {
        res.status(500).json({error: err.message});
    }
});

function getTopKResumeEmbeddings(qVector, topK = 5) {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM embeddings", [], (err, rows) => {
        if (err) return reject(err);
  
        const ranked = rows.map((row) => ({
          ...row,
          similarity: cosineSimilarity(JSON.parse(row.vector), qVector),
        }));
  
        ranked.sort((a, b) => b.similarity - a.similarity);
        resolve(ranked.slice(0, topK));
      });
    });
  }

function getTopKJobEmbeddings(qVector, topK = 5) {
return new Promise((resolve, reject) => {
    jd_db.all("SELECT * FROM job_embeddings", [], (err, rows) => {
    if (err) return reject(err);

    const ranked = rows.map((row) => ({
        ...row,
        similarity: cosineSimilarity(JSON.parse(row.vector), qVector),
    }));

    ranked.sort((a, b) => b.similarity - a.similarity);
    resolve(ranked.slice(0, topK));
    });
});
}

app.post("/analyze",async(req,res)=> {
    try {
            const jdRows = await new Promise((resolve) =>
            jd_db.all("SELECT * FROM job_embeddings",[],(err,rows)=>
            resolve(rows)
            )
        );
        console.log("done 0")
        if(jdRows.length === 0)
            return res.status(400).json({error: "No job description uploaded"});
        const jdVectors = jdRows.map((r)=>JSON.parse(r.vector));

        console.log("done 0.2")
        const jdVector_avg = jdVectors[0].map((_, i) =>
            jdVectors.reduce((sum, v) => sum + v[i], 0) / jdVectors.length
          );

        console.log("done 0.4")
        const topResumeChunks = await getTopKResumeEmbeddings(jdVector_avg, 5);
        const topJDChunks = await getTopKJobEmbeddings(jdVector_avg,5);
        console.log("done 1")
        const resumeText = topResumeChunks.map((c)=>c.text_chunk).join(" ");
        const jdText = topJDChunks.map((c)=>c.text_chunk).join(" ");
        const prompt = `
            Compare and see how resume matches with Job Description. Return strictly in JSON with:

            {
            "match_score": number,
            "key_strengths": [string],
            "missing_skills": [string],
            "gaps": [string],
            "summary": string
            }

            ### RESUME:
            ${resumeText}

            ### JOB DESCRIPTION:
            ${jdText}
            `;
            console.log("done 2")
            const response = await ai.models.generateContent({
                model: "gemini-flash-latest", // or whichever model you want
                contents: prompt,
                config: {
                    thinkingConfig: {
                      thinkingBudget: 0, // Disables thinking
                    },
                  }
            });
            console.log("done 2.5")
            const analysis = response.text;
            res.json({analysis});
            console.log("done 3")
    }
    catch(err) {
        console.log("done error")
        res.status(500).json({error:err.message});
    }

});


//upload route
app.post("/upload",upload.single("pdfFile"),async (req,res) => {
    console.log("File received",req.file);
    try {
            if(!req.file)
            {
                return res.status(400).json({message: "No PDF file uploaded!"});
            }

            const pdfBuffer = fs.readFileSync(req.file.path);

            const pdfData = await pdfParse(pdfBuffer);

            const extracted_text = pdfData.text;

            //extract sections
            const resumeSections = extractSections(extracted_text);

            console.log("Extracted resume sections.",resumeSections);

            const allChunks = [];

            for (const sectionName in resumeSections){
                const joined_text = resumeSections[sectionName].join(" ");
                const sectionchunks = chunkText(joined_text,400);
                console.log("sectionchunks is ")
                console.log(sectionchunks)
                sectionchunks.forEach((chunk, index) => {
                    allChunks.push({
                        section: sectionName,
                        chunkIndex: index,
                        text: chunk
                    });                  
                });

            }

            for (const chunk of allChunks) {
                const vector = await embedText(chunk.text);
                await upsertEmbedding(
                    `resume_${Date.now()}_$(chunk.section)_$(chunk.chunkIndex)`,
                    vector,
                    {
                        section: chunk.section,
                        text: chunk.text,
                        chunkIndex:chunk.chunkIndex
                    }
                );
            }

            res.json({
                message: "Resume parsed and embedded successfully",
                chunks: allChunks.length,
                sections: Object.keys(resumeSections)
            });
            console.log("done")
    }
    catch(err)
    {
        console.error("PDF parsing error",err);
        res.status(500).json({error:err.message});
    }
});

function getTopKEmbeddings(questionVector, topK = 3) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM embeddings`, [], (err, rows) => {
            if (err) return reject(err);

            // Compute cosine similarity for each row
            const similarities = rows.map(row => {
                const vector = JSON.parse(row.vector);
                const similarity = cosineSimilarity(vector, questionVector);
                return { ...row, similarity };
            });

            // Sort by similarity descending
            similarities.sort((a, b) => b.similarity - a.similarity);

            resolve(similarities.slice(0, topK));
        });
    });
}


// Helper function to compute cosine similarity
function cosineSimilarity(a, b) {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magA * magB);
}


app.post("/ask",async(req,res) => {
    try {
        const {question} = req.body;
        if(!question || !question.trim()){
            return res.status(400).json({message: "No question provided"});
        }
        const questionVector = await embedText(question);
        const topChunks = await getTopKEmbeddings(questionVector, 3);

        const contextText = topChunks.map(c=>c.text_chunk).join(" ");

        const prompt = `You are an AI assistant. Use the following resume information to answer the question accurately.
                        Resume context:
                        ${contextText}

                        Question: ${question}

                        Answer in a concise, professional manner.
                        `;

        const response = await ai.models.generateContent({
            model: "gemini-flash-latest", // or whichever model you want
            contents: prompt,
            config: {
                thinkingConfig: {
                  thinkingBudget: 0, // Disables thinking
                },
              }
        });

        // 6. Send the AI answer
        res.json({
            answer: response.text
        });
 
    } catch (err) {
        console.error("Error answering question:", err);
        res.status(500).json({ error: err.message });
    }
})

app.listen(5000, () => {
    console.log("Server running on port 5000");
});