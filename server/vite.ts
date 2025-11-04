import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

/**
 * Configuração do Vite em modo desenvolvimento.
 * Aqui adicionamos uma verificação para evitar interceptar rotas de API.
 */
export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  /**
   * 🚫 Evita que o Vite intercepte as rotas da API
   * Se a requisição começar com /api, passamos direto para o próximo middleware
   */
  app.use((req, res, next) => {
    if (req.originalUrl.startsWith("/api")) {
      return next();
    }
    return vite.middlewares(req, res, next);
  });

  /**
   * 🌐 Rota "catch-all" que entrega o frontend (index.html)
   * Só é executada para rotas que não sejam /api
   */
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // Recarrega o template a cada requisição (útil no dev)
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );

      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

/**
 * 🔧 Modo produção — serve os arquivos já buildados.
 */
export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `❌ Não foi encontrado o diretório de build: ${distPath}. 
      Certifique-se de rodar o build do cliente antes (ex: npm run build).`,
    );
  }

  app.use("/assets", express.static(path.join(distPath, "assets")));

  // Serve index.html para qualquer rota que não exista no servidor
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
