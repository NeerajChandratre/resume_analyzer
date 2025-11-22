
const { GoogleGenAI } = require("@google/genai");




async function embed_wid_gemini(text) {
    const ai = new GoogleGenAI({apiKey: "your key"});

    const response = await ai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: [text]
    });


    return response.embeddings[0].values;
}


module.exports = embed_wid_gemini;