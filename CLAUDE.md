# Projeto: Fotos pelo Romaneio — ART STILO (Praia & Fitness)

## Contexto para o Claude (leia antes de qualquer mudança)

Este projeto foi desenvolvido em uma conversa anterior do Claude (Cowork, iniciada no celular).
Este arquivo é o handoff completo. O dono do projeto é o Helio (junior@artstilopraia.com.br),
não-programador — explique as coisas em linguagem simples, sem jargão, sempre em português.

## O que é o app

Um app web de **um único arquivo** (`index.html`, sem backend) para as revendedoras da ART STILO:

1. A revendedora envia a **foto ou o PDF do romaneio** (ou digita os códigos manualmente).
2. O app lê o documento no navegador (PDF com texto via pdf.js; foto/PDF escaneado via
   Tesseract OCR em português) e extrai os pares **referência + código da cor**.
3. Monta os links das fotos do acervo e testa a sequência 1, 2, 3…, **parando na primeira
   que não existir** (regra do dono — não verificar as seguintes).
4. Mostra a galeria e permite: **salvar na fototeca do celular** (Web Share API com arquivos,
   botões dourados), **baixar todas em .zip** (um clique, JSZip) ou baixar por produto.

## Padrão dos links das fotos (regra central)

```
https://artstilo-ecommerce-production.up.railway.app/fotos/{REFERENCIA}_{COR}-{SEQ}.jpg
```
Exemplos reais: `F500_207-1.jpg`, `B074C_337-2.jpg`, `F518_A07-1.jpg`
- Referência: letras + números + letras opcionais (F500, B074C, B461)
- Cor: 3 dígitos com zeros à esquerda (207, 002) OU letra + dígitos (A07)
- SEQ: 1, 2, 3… até a primeira que não existir (teto MAX_SEQ=30)
- Constantes no topo do `<script>` em index.html: FOTO_BASE, FOTO_EXT, MAX_SEQ,
  COR_DIGITOS, LOGO_URL

## Layouts de romaneio conhecidos (função extractPairs)

- **PASSO 1 (principal)** — linha começa com: `Código(4-6 díg.) Cor(2-4, pode ter letra) Referência`
  Ex.: `00219 337 B074C B074C - CALCINHA...` e `03121 207 F500 F500- SHORT SAIA...`
- **PASSO 2 (complemento, só nas linhas que o passo 1 não reconheceu)** — acha a referência e
  usa como cor o token imediatamente ANTES dela; se não servir, o token DEPOIS.
- Produto repetido (vários tamanhos) conta **uma vez só** (dedupe por ref_cor).
- Correções de OCR: O→0 e I/l→1 na parte numérica; bordas de tabela (|, !, etc.) viram espaço.
- Testado com 2 romaneios reais: PDF do Getúlio (24 pares únicos, ref B074C etc.) e foto do
  romaneio da Karen (6 pares, incluindo cor A07). Não quebrar esses casos ao mexer no parser.

## Deploy

- GitHub: repositório `romaneio-fotos` do dono (index.html + package.json).
- Railway: serviço conectado ao repositório, redeploya sozinho a cada push.
  Domínio gerado pelo Railway (tipo `romaneio-fotos-production.up.railway.app`).
- O servidor de fotos é OUTRO app do Railway (o e-commerce). Como são domínios diferentes,
  o zip/galeria dependem de CORS liberado na rota `/fotos` do e-commerce:
  `res.setHeader("Access-Control-Allow-Origin","*")` — a visualização funciona sem isso.
  Solução definitiva sugerida: servir este index.html numa rota do próprio e-commerce
  (ex.: `/romaneio`), aí não existe CORS.

## Estado atual / pendências

- [x] Pasta local conectada ao GitHub: clone em `~/Desktop/romaneio-fotos`
      (repositório `marianojunior94/romaneio-fotos`). Commit + push publica via Railway.
- [x] Versão nova do index.html (cor antes da referência, cor A07, salvar na galeria,
      visual novo) publicada em 16/07/2026.
- [x] CORS da rota `/fotos` do e-commerce: JÁ ESTÁ LIBERADO (testado em 16/07/2026 com
      fetch de outro domínio — funcionou). O zip funciona no domínio separado.
- [x] Decisão do dono (16/07/2026): manter como serviço SEPARADO no Railway, para não
      trazer risco ao e-commerce. NÃO integrar na rota /romaneio do e-commerce.
- [ ] Testar no celular real: botões dourados "Salvar na galeria" (Web Share API) e o zip.
- [ ] Logo oficial: quando o dono mandar o arquivo, colocar a URL na constante LOGO_URL
      (hoje usa um emblema SVG desenhado: sol, onda e areia).

## Decisões de design

- Marca: ART STILO · Praia & Fitness (nome como aparece em revendaartstilo.com.br).
- Paleta: petróleo #0a5f68 / oceano #0e8691 / turquesa #15b5c2 / coral #ff6f5e /
  dourado #ffd166 / areia #faf3e7. Fonte Poppins. Botões arredondados (pill).
- Tudo processado no navegador da revendedora; nenhum dado sai do aparelho
  (privacidade e custo zero de servidor).

## Como trabalhar neste projeto

- Sempre manter TUDO em um único index.html (CSS e JS inline) — decisão do dono.
- Depois de qualquer mudança no parser, testar mentalmente (ou com script) contra os dois
  layouts reais descritos acima.
- Após editar, commitar e dar push — o Railway publica sozinho. Confirmar com o dono
  antes do primeiro push se o git desta pasta acabou de ser configurado.
