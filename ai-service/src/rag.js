const fs = require('fs');
const path = require('path');

const KB_DIR = path.join(__dirname, '..', 'knowledge_base');

let docs = null;

function tokenize(text) {
  return text.toLowerCase().match(/[a-z]+/g) || [];
}

function loadDocs() {
  if (docs) return docs;
  docs = fs
    .readdirSync(KB_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const content = fs.readFileSync(path.join(KB_DIR, file), 'utf-8');
      return { file, content, tokens: new Set(tokenize(content)) };
    });
  return docs;
}

// Simple keyword-overlap retrieval — no embeddings/ML dependency needed.
function retrieve(query, k = 3) {
  const all = loadDocs();
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return [];

  const scored = all.map((doc) => {
    const score = queryTokens.reduce((sum, t) => sum + (doc.tokens.has(t) ? 1 : 0), 0);
    return { doc, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((s) => s.doc.content);
}

module.exports = { retrieve };
