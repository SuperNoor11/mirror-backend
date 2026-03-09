const express = require("express");

const app = express();
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ACTION_SECRET = process.env.ACTION_SECRET;
const PORT = process.env.PORT || 3000;

// Hard-pinned model
const PINNED_MODEL = "gpt-4o-2024-11-20";

app.get("/", (_req, res) => {
  res.send("Mirror backend is running.");
});

app.post("/chat", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    if (!ACTION_SECRET || auth !== `Bearer ${ACTION_SECRET}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY on server" });
    }

    const message = String(req.body?.message || "").trim();
    const history = Array.isArray(req.body?.history) ? req.body.history : [];

    if (!message) {
      return res.status(400).json({ error: "Missing message" });
    }

    const input = [
      ...history
        .filter((item) => item && (item.role === "user" || item.role === "assistant"))
        .map((item) => ({
          role: item.role,
          content: [
            {
              type: item.role === "assistant" ? "output_text" : "input_text",
              text: String(item.content || "")
            }
          ]
        })),
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: message
          }
        ]
      }
    ];

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: PINNED_MODEL,
        input
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: "OpenAI request failed",
        details: data
      });
    }

    const text =
      (data.output || [])
        .flatMap((item) => item.content || [])
        .filter((item) => item.type === "output_text")
        .map((item) => item.text || "")
        .join("") || "";

    return res.json({ text });
  } catch (error) {
    return res.status(500).json({
      error: "Server error",
      details: String(error)
    });
  }
});

app.listen(PORT, () => {
  console.log(`Mirror backend listening on port ${PORT}`);
});
