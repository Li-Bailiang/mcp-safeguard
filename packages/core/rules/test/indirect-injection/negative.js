// Test cases that should NOT be detected (false positives)

// URL is sanitized
const sanitizedUrl = sanitize(userInput);
const data1 = await fetch(sanitizedUrl);

// URL is validated
if (isValidUrl(userUrl)) {
  const data2 = await fetch(userUrl);
}

// External content is sanitized before prompt
const rawData = await fetch("https://example.com");
const cleanData = DOMPurify.sanitize(rawData);
const prompt = `User input: ${cleanData}`;

// Path is validated
const safePath = path.resolve(basePath, userPath);
const fs = require('fs');
fs.readFileSync(safePath);

// Using parameterized query (safe)
db.query("SELECT * FROM users WHERE id = ?", [userId]);

// SQL with escaped input
const escapedId = escape(userId);
const query = "SELECT * FROM users WHERE id = " + escapedId;
db.query(query);

// XML parser with safe config
const parser = new XMLParser({ processEntities: false });
