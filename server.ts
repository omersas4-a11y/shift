import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";

const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId || "(default)");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route for Google Forms webhook
  app.post("/api/webhook/forms", async (req, res) => {
    try {
      const { formResponseId, answers } = req.body;
      
      console.log("Received form webhook:", req.body);

      if (!answers) {
        return res.status(400).json({ error: "No answers provided" });
      }

      // Get answers as an array of values just in case keys don't match perfectly
      const answerValues = Object.values(answers);
      const answerKeys = Object.keys(answers);

      // Map the Hebrew form answers to Candidate fields
      // Fallbacks are provided if the exact question titles differ
      let name = answers["שם מלא"] || answers["שם"] || answers["שם:"] || answers["שם המועמד"];
      let major = answers["מגמה"] || answers["מגמה/תפקיד"] || answers["תפקיד"] || answers["לאיזו מגמה אתה מועמד?"];
      let joinReason = answers["למה תרצה להצטרף?"] || answers["למה תרצו להצטרף?"] || answers["סיבה"] || answers["מדוע אתה רוצה להצטרף?"] || answers["ספר לנו למה אתה מתאים"];

      // If we couldn't find them by name, try to guess by order (assuming Name is 1st, Major is 2nd, Reason is 3rd)
      if (!name && answerValues.length > 0) name = answerValues[0];
      if (!major && answerValues.length > 1) major = answerValues[1];
      if (!joinReason && answerValues.length > 2) joinReason = answerValues[2];

      name = name || "מועמד חדש";
      major = major || "";
      joinReason = joinReason || "";

      // Also save the raw answers in case we need to debug
      const candidateData = {
        name,
        major,
        joinReason,
        status: "pending",
        level: 1,
        formResponseId: formResponseId || Date.now().toString(),
        messages: [],
        rawAnswers: answers // save the original questions and answers
      };

      const docId = formResponseId || Date.now().toString();
      
      await setDoc(doc(db, "candidates", docId), candidateData);
      
      console.log("Candidate added to Firestore:", docId);
      res.status(200).json({ success: true, id: docId });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
