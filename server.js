/* =========================================================
   Servidor do app "Fotos pelo Romaneio" — ART STILO
   1) Serve o index.html (o app inteiro)
   2) Rota /ler-romaneio: recebe a FOTO do romaneio e pede ao
      Claude (Anthropic) para ler a tabela e devolver os pares
      referência + cor. A chave fica na variável de ambiente
      ANTHROPIC_API_KEY (Railway → Variables) — nunca no site.
   Se a chave não estiver configurada ou a leitura falhar, o
   app usa o leitor local (OCR) como plano B, sem quebrar nada.
   ========================================================= */
const express = require("express");
const path = require("path");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
app.use(express.json({ limit: "14mb" }));

/* Modelo de leitura: Haiku 4.5 = rápido e barato (~US$0,005 por
   romaneio). Se um dia quiser mais capacidade, troque por
   "claude-opus-4-8" (~US$0,025 por romaneio).                */
const MODELO_LEITURA = "claude-haiku-4-5";

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

const ESQUEMA_RESPOSTA = {
  type: "object",
  properties: {
    produtos: {
      type: "array",
      items: {
        type: "object",
        properties: {
          referencia: { type: "string", description: "Código do produto: letras+números, ex.: F500, B074C, B467TR" },
          cor: { type: "string", description: "Código da cor como impresso, com zeros à esquerda: 207, 002, A07" },
        },
        required: ["referencia", "cor"],
        additionalProperties: false,
      },
    },
  },
  required: ["produtos"],
  additionalProperties: false,
};

const INSTRUCAO = `Esta é a foto de um romaneio (nota de despacho) da confecção ART STILO.
A tabela de produtos tem as colunas: Código | Cor | Referência | Produto (e às vezes preço).

Extraia APENAS os pares (referência, cor) das linhas de produto da tabela:
- referencia: o código da coluna "Referência" (letras+números, ex.: F500, B074C, B467TR). A coluna "Produto" repete a referência antes do hífen — use-a para confirmar a grafia.
- cor: o código da coluna "Cor" exatamente como impresso, preservando zeros à esquerda (ex.: 207, 002, 012, A07).
- IGNORE: preços, "Total Geral", "Numero do Romaneio", código de 4-6 dígitos da coluna "Código", dados do cliente e o texto de rodapé sobre trocas.
- Linhas repetidas (mesma referência e mesma cor, tamanhos diferentes) entram UMA vez só.
- Se a foto não tiver uma tabela de romaneio legível, devolva a lista vazia.`;

app.post("/ler-romaneio", async (req, res) => {
  try {
    if (!anthropic) {
      return res.status(503).json({ erro: "leitura inteligente nao configurada" });
    }
    const { imagem, tipo } = req.body || {};
    if (!imagem || typeof imagem !== "string" || imagem.length < 100 || imagem.length > 13_000_000) {
      return res.status(400).json({ erro: "imagem invalida" });
    }
    const mediaType = ["image/jpeg", "image/png", "image/webp"].includes(tipo) ? tipo : "image/jpeg";

    const resposta = await anthropic.messages.create({
      model: MODELO_LEITURA,
      max_tokens: 4096,
      output_config: { format: { type: "json_schema", schema: ESQUEMA_RESPOSTA } },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: imagem } },
            { type: "text", text: INSTRUCAO },
          ],
        },
      ],
    });

    if (resposta.stop_reason === "refusal") {
      return res.status(502).json({ erro: "leitura recusada" });
    }
    const textoBloco = resposta.content.find((b) => b.type === "text");
    const dados = JSON.parse(textoBloco.text);
    res.json({ pares: dados.produtos || [] });
  } catch (e) {
    console.error("ler-romaneio falhou:", e.message);
    res.status(502).json({ erro: "falha na leitura" });
  }
});

/* O site: qualquer outra rota devolve o app */
app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "index.html")));

const PORT = process.env.PORT || 8123;
app.listen(PORT, () => {
  console.log(`romaneio-fotos no ar na porta ${PORT} — leitura IA: ${anthropic ? "ATIVA (" + MODELO_LEITURA + ")" : "sem chave (so OCR local)"}`);
});
