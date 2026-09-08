const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {

  // =========================
  // LOAD KHYEGPT WEBSITE
  // =========================
  if (req.method === "GET") {

    let requestedFile =
      req.url === "/" ? "KhyeGPT.html" : req.url.split("?")[0];

    requestedFile = requestedFile.replace(/^\/+/, "");

    const filePath = path.join(__dirname, requestedFile);

    if (fs.existsSync(filePath)) {

      const ext = path.extname(filePath);

      const contentTypes = {
        ".html": "text/html",
        ".css": "text/css",
        ".js": "text/javascript",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp"
      };

      res.writeHead(200, {
        "Content-Type":
          contentTypes[ext] || "application/octet-stream"
      });

      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }


  // =========================
  // KHYEGPT AI
  // =========================
  if (req.method === "POST" && req.url === "/api/chat") {

    let body = "";

    req.on("data", chunk => {
      body += chunk.toString();
    });

    req.on("end", async () => {

      try {

        if (!process.env.OPENROUTER_API_KEY) {
          throw new Error(
            "OPENROUTER_API_KEY is missing from Render."
          );
        }

        const data = JSON.parse(body);

        const {
          message,
          subject,
          mode,
          image
        } = data;


        // =========================
        // BUILD USER MESSAGE
        // =========================

        const content = [
          {
            type: "text",

            text: `
You are KhyeGPT, an AI assistant designed to help students
understand and complete schoolwork.

Current subject:
${subject || "General"}

Answer style:
${mode || "Clear"}

RULES:

- Use Australian spelling.
- Give clear and useful answers.
- Keep explanations suitable for a school student.
- Answer the actual question directly.
- Do not use unnecessarily complicated language.
- For maths, show the working clearly.
- For science, explain concepts step by step.
- For English, help with wording, structure and evidence.
- For HASS, help create strong arguments and paragraphs.
- For Italian, help with grammar and vocabulary.
- If a worksheet or question image is attached,
  carefully read the image before answering.
- Make school writing sound natural.
- Do not claim you can see an image unless one was attached.

Student question:

${message || "Please help me with the attached worksheet."}
`
          }
        ];


        // =========================
        // ADD WORKSHEET IMAGE
        // =========================

        if (image) {

          content.push({
            type: "image_url",

            image_url: {
              url: image
            }
          });

        }


        // =========================
        // SEND TO OPENROUTER
        // =========================

        const response = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {

            method: "POST",

            headers: {

              "Content-Type": "application/json",

              "Authorization":
                `Bearer ${process.env.OPENROUTER_API_KEY}`,

              "HTTP-Referer":
                "https://khyegpt.onrender.com",

              "X-Title":
                "KhyeGPT"
            },

            body: JSON.stringify({

              model: "openrouter/free",

              messages: [
                {
                  role: "user",
                  content: content
                }
              ],

              max_tokens: 1200

            })

          }
        );


        const result = await response.json();


        // =========================
        // SHOW REAL API ERRORS
        // =========================

        if (!response.ok) {

          console.error(
            "OPENROUTER ERROR:",
            JSON.stringify(result, null, 2)
          );

          res.writeHead(response.status, {
            "Content-Type": "application/json"
          });

          res.end(JSON.stringify({

            reply:
              "OpenRouter error: " +
              (
                result?.error?.message ||
                "Unknown OpenRouter error"
              )

          }));

          return;
        }


        // =========================
        // GET AI ANSWER
        // =========================

        const reply =
          result?.choices?.[0]?.message?.content;


        res.writeHead(200, {
          "Content-Type": "application/json"
        });


        res.end(JSON.stringify({

          reply:
            reply ||
            "KhyeGPT didn't receive an answer. Try again."

        }));


      } catch (error) {

        console.error(
          "KHYEGPT SERVER ERROR:",
          error
        );


        res.writeHead(500, {
          "Content-Type": "application/json"
        });


        res.end(JSON.stringify({

          reply:
            "Server error: " + error.message

        }));

      }

    });

    return;
  }


  res.writeHead(404);

  res.end("Not found");

});


// =========================
// START SERVER
// =========================

server.listen(PORT, "0.0.0.0", () => {

  console.log("");
  console.log("==============================");
  console.log("         ✦ KHYEGPT ✦");
  console.log("==============================");
  console.log("");

  console.log(
    "Server running on port:",
    PORT
  );

  console.log("");

  if (process.env.OPENROUTER_API_KEY) {

    console.log(
      "OpenRouter API key: CONNECTED ✓"
    );

  } else {

    console.log(
      "OpenRouter API key: NOT FOUND ✗"
    );

  }

  console.log("");

});