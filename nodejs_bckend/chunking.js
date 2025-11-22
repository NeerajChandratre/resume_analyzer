function chunkText(text, maxLen = 500) {
    const words = text.split(" ");
    const chunks = [];
  
    let current = [];
  
    for (let w of words) {
      if ((current.join(" ").length + w.length) > maxLen) {
        chunks.push(current.join(" "));
        current = [];
      }
      current.push(w);
    }
  
    if (current.length > 0) chunks.push(current.join(" "));
  
    return chunks;
  }
  
  module.exports = chunkText;