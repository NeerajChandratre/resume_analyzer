import React, { useState } from 'react';

const PDFUpload = () => {
  const [pdfFile,setPdfFile] = useState(null);
  const [error,setError] = useState("");
  const [question,setQuestion] = useState("");
  const [answer,setAnswer] = useState("");
  const [loading,setLoading] = useState(false);
  const [analysis,setAnalysis] = useState("");
  const [jobFile,setjobFile] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    console.log("file is")
    console.log(file)
    if (!file) return;
    if (file.type !== "application/pdf")
    {
      setError("Please upload a valid PDF file.");
      setPdfFile(null);
      return;
    }
    setError("");
    setPdfFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(!pdfFile)
    {
      alert("Please upload a PDF");
      return;
    }
    const formData = new FormData();
    formData.append("pdfFile",pdfFile);

    const response = await fetch("http://localhost:5000/upload", {
    method: "POST",
    body: formData,
  });
    const result = await response.json();
    console.log(result);
    console.log("PDF file ready to be uploaded",pdfFile);
  };

  const handleJobChange = (e) => {
    setjobFile(e.target.files[0]);
  };

  const uploadJD = async()=> {
    const fd = new FormData();
    fd.append("jobFile",jobFile);
    const res = await fetch("http://localhost:5000/uploadJD", {
      method: "POST",
      body: fd,
    });
    alert("Job description uploaded")



  }

  const analyze = async() => {
    setLoading(true);
    const res = await fetch("http://localhost:5000/analyze", {
      method: "POST",
    });
    const data  = await res.json();
    setAnalysis(data.analysis);
    setLoading(false);
  }


  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    if(!question.trim()) {
      alert("Please enter a question");
      return;
    }
    setLoading(true);
    setAnswer("");
    try{

    const response = await fetch("http://localhost:5000/ask", {
      method: "POST",
      headers: {
        "Content-Type":"application/json"
      },
      body: JSON.stringify({question})
    });

    const result = await response.json();
    setAnswer(result.answer || "No answer found");
  }
  catch(err){
    console.error("Error fetching answer",err);
    setAnswer("Error occured while fetching ans");
  }
  finally {
    setLoading(false);
  }
}


  return (
    <div style={{ margin: "20px", padding: "20px", border: "1px solid #ccc" }}>
      <h2>Upload PDF Document</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
        />

        {error && <p style={{ color: "red" }}>{error}</p>}

        {pdfFile && (
          <p>
            <strong>Selected file:</strong> {pdfFile.name}
          </p>
        )}

        <button type="submit" style={{ marginTop: "10px" }}>
          Upload
        </button>
      </form>
        <hr />

          <h2>Upload Job Description</h2>
          <input type="file" accept="application/pdf" onChange={handleJobChange} />
          <button onClick={uploadJD}>Upload Job Description</button>

        <hr />
        <h2>Analyze Resume vs Job Description</h2>
            <button onClick={analyze}>Run Analysis</button>

            {loading && <p>Analyzing...</p>}

            {analysis && (
              <pre
                style={{
                  marginTop: 20,
                  padding: 10,
                  border: "1px solid #aaa",
                  whiteSpace: "pre-wrap",
                }}
              >
                {analysis}
              </pre>
          )}
      <hr style={{margin:"20px 0"}}/>
      <h2>Ask a Question about Resume</h2>
      <form onSubmit={handleQuestionSubmit}>
        <input
          type="text"
          placeholder="Enter your question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          style={{ width: "70%", padding: "5px" }}
        />
        <button type="submit" style={{ marginLeft: "10px" }}>Ask</button>
      </form>

      {loading && <p>Loading answer...</p>}
        {answer && !loading && (
        <div style={{ marginTop: "20px", padding: "10px", border: "1px solid #aaa" }}>
          <strong>Answer:</strong> {answer}
        </div>
      )}
    </div>
  )
};
export default PDFUpload;
