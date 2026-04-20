import express from "express";
import cors from "cors";
import { ZodError } from "zod";
import { env } from "./config/env.js";
import { router } from "./routes/index.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(router);

app.use((error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      message: "Payload invalido.",
      issues: error.issues
    });
    return;
  }

  response.status(500).json({
    message: error.message || "Erro interno no servidor."
  });
});

app.listen(env.backendPort, env.backendHost, () => {
  console.log(`Backend ativo em ${env.backendPublicUrl}`);
});
