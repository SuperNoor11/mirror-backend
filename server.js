const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ACTION_SECRET = process.env.ACTION_SECRET;
const PORT = process.env.PORT || 10000;

const MODEL = "gpt-4o-2024-11-20";

// Load the master prompt file
function loadMasterPrompt() {
  const filePath = path.join(__dirname, "master_prompt.txt");
  return fs.readFileSync(filePath, "utf8");
}

app.post("/chat", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";

    if (auth !== `Bearer ${ACTION_SECRET}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userMessage = req.body.message;

    const masterPrompt = loadMasterPrompt();

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        input: [
          {
            role: "system",
            content: masterPrompt,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
      }),
    });

    const data = await response.json();

    const text =
      data.output?.[0]?.content?.[0]?.text ||
      "No response returned from model.";

    res.json({ text });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/", (req, res) => {
  res.send("Mirror backend running.");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});