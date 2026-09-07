const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  if (req.method === "GET") {
    const filePath = path.join(
      __dirname,
      req.url === "/" ? "KhyeGPT.html" : req.url
    );

    if (fs.existsSync(filePath)) {
      const file = fs.readFileSync(filePath);

      res.writeHead(200, {
        "Content-Type": "text/html"
      });

      res.end(file);
      return;
    }
  }

  if (req.method === "POST" && req.url === "/api/chat") {
    let body = "";

    req.on("data", chunk => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const data = JSON.parse(body);

        const {
          message,
          subject,
          mode,
          image
        } = data;

        const content = [
          {
            type: "input_text",
            text: `
You are KhyeGPT, an AI schoolwork assistant.

Subject: ${subject || "General"}
Answer style: ${mode || "Clear"}

Rules:
- Use Australian spelling.
- Explain things clearly.
- Keep answers suitable for a student.
- For maths, show working when useful.
- For HASS and English, use clear paragraph structure.
- If a worksheet image is attached, read it carefully.
- Answer the actual question.
- Make writing sound natural rather than robotic.

Student question:

${message || "Please help me with this worksheet."}
            `
          }
        ];

        if (image) {
          content.push({
            type: "input_image",
            image_url: image
          });
        }

        const response = await fetch(
          "https://api.openai.com/v1/responses",
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
              "Authorization":
                `Bearer ${process.env.OPENAI_API_KEY}`
            },

            body: JSON.stringify({
              model: "gpt-5.6-luna",

              input: [
                {
                  role: "user",
                  content
                }
              ]
            })
          }
        );

        const result = await response.json();

        if (!response.ok) {
          console.error(result);

          res.writeHead(500, {
            "Content-Type": "application/json"
          });

          res.end(JSON.stringify({
            reply:
              "KhyeGPT couldn't connect to OpenAI. Check the server window."
          }));

          return;
        }

        let reply = "";

        for (const item of result.output || []) {
          for (const part of item.content || []) {
            if (part.type === "output_text") {
              reply += part.text;
            }
          }
        }

        res.writeHead(200, {
          "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
          reply:
            reply || "KhyeGPT didn't receive an answer."
        }));

      } catch (error) {
        console.error(error);

        res.writeHead(500, {
          "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
          reply: "Something went wrong with KhyeGPT."
        }));
      }
    });

    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log("");
  console.log("==============================");
  console.log("       ✦ KHYEGPT ✦");
  console.log("==============================");
  console.log("");
  console.log("Open:");
  console.log("http://localhost:3000");
  console.log("");

  if (process.env.OPENAI_API_KEY) {
    console.log("OpenAI API key: CONNECTED ✓");
  } else {
    console.log("OpenAI API key: NOT FOUND ✗");
  }
});