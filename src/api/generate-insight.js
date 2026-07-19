export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY — set it in Vercel project settings." });
  }

  const { stats } = req.body || {};
  if (!stats) {
    return res.status(400).json({ error: "Missing stats in request body." });
  }

  const prompt = `You are writing a short, warm, pastorally-minded analysis for a church's Soul Care leadership team, based on the following retention statistics for a period they've selected. Write 3-4 short paragraphs: (1) a plain-language summary of what the numbers show, (2) one or two areas worth celebrating, (3) one or two areas that may need attention, phrased constructively, not alarmingly. Avoid generic filler; be specific to the actual numbers given. Do not invent any statistics not present below.

STATISTICS:
${JSON.stringify(stats, null, 2)}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 700,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      return res.status(response.status).json({ error: `Anthropic API error: ${errBody}` });
    }

    const data = await response.json();
    const text = (data.content || [])
      .map(block => block.text || "")
      .filter(Boolean)
      .join("\n");

    return res.status(200).json({ summary: text });
  } catch (e) {
    return res.status(500).json({ error: `Request failed: ${e.message}` });
  }
}