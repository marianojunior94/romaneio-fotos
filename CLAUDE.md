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

Nome do arquivo: `{REFERENCIA}_{COR}-{SEQ}.jpg` — ex.: `F500_207-1.jpg`, `B074C_337-2.jpg`,
`F518_A07-1.jpg`. DOIS servidores com as MESMAS fotos (decisão de 16/07/2026, a pedido
do dono, para tirar peso do e-commerce):

```
VER (sondar/exibir):  https://artstilorevenda1.websiteseguro.com/fotosartstilo/{ARQUIVO}
BAIXAR (zip/galeria): https://artstilo-ecommerce-production.up.railway.app/fotos/{ARQUIVO}
```
- O servidor de VER é a hospedagem Locaweb `artstilorevenda1.hospedagemdesites.ws`
  acessada pelo apelido `websiteseguro.com` — é o MESMO servidor, mas só o apelido tem
  certificado https válido (o app roda em https e o navegador bloquearia http).
  Rápido (~0,4s, cache de borda), 404 em ~0,2s, MAS SEM CORS → o site não consegue
  baixar arquivos de lá (só exibir).
- O servidor de BAIXAR é o e-commerce no Railway, único com CORS liberado em /fotos.
  A função urlParaBaixar() converte o link de um servidor para o outro pelo nome
  do arquivo. Se um dia a Locaweb ganhar CORS (ex.: .htaccess com
  Header set Access-Control-Allow-Origin "*"), dá para baixar tudo de lá também.
- Referência: letras + números + letras opcionais (F500, B074C, B461)
- Cor: 3 dígitos com zeros à esquerda (207, 002) OU letra + dígitos (A07)
- SEQ: 1, 2, 3… até a primeira que não existir (teto MAX_SEQ=30)
- Sondagem (existeFoto): pergunta ao e-commerce com pedido HEAD (poucos bytes,
  resposta definitiva 200/404, 2 tentativas com timeout de 8s); só se a rede/servidor
  falharem cai no plano B probeImage (carregar a imagem da Locaweb, 3 tentativas).
  Motivo: em 16/07/2026 buscas repetidas no celular ora achavam tudo, ora nada —
  carregar a imagem inteira para sondar era pesado no 4G e falha de rede virava
  "não existe". Verifica 3 sequências por vez (descobrirProduto) e 6 produtos em
  paralelo (discoverFotos) — busca de 5 produtos caiu de ~30s para ~2s.
- Fluxo progressivo (renderBusca): ao ler o romaneio mostra NA HORA um cartão
  "Procurando fotos…" por produto e vai preenchendo em segundo plano (pedido do dono
  em 17/07/2026 para segurar o cliente sem sensação de espera). "Enviar outro" ou
  nova busca cancela a anterior (token buscaAtual).
- Outras cores do mesmo produto (17/07/2026): um produto costuma ter foto em POUCAS
  cores (F500 só tem em 002, 207, A40 e A71 — verificado por varredura completa).
  Duas defesas: (1) expandirCores() testa automaticamente códigos "irmãos" com o
  mesmo nome (PRETO = 002 e 0002) para pares vindos do romaneio; (2) produto sem
  foto ganha cartão com botão "Procurar outras cores" (procurarOutrasCores), que
  varre as ~1.265 cores do catálogo por HEAD (~25-30s, 16 em paralelo) e insere
  cartões das cores com foto. Essas cores extras NÃO entram no zip/salvar-todas —
  têm botões próprios no cartão.
- Constantes no topo do `<script>` em index.html: FOTO_BASE_VER, FOTO_BASE_BAIXAR,
  FOTO_EXT, MAX_SEQ, COR_DIGITOS, LOGO_URL, LOTE_MAX

## Layouts de romaneio conhecidos (função extractPairs)

- **PASSO 0 (leitura POR COLUNAS, 17/07/2026 — pedido do dono: "entender o romaneio
  de verdade")** — readPdf e ocrCanvas devolvem {texto, linhas}, onde linhas traz a
  POSIÇÃO X de cada palavra. O passo 0 procura o cabeçalho da tabela (um token "COR"
  e um "REF..." na mesma linha); achando, lê cada linha seguinte pelo ALINHAMENTO:
  cor = token mais próximo da coluna Cor (e que existe na tabela CORES), referência =
  token mais próximo da coluna Referência (tolerância: 0,8x a distância entre as duas
  colunas — preços à direita ficam fora do alcance). Linhas não resolvidas caem nos
  passos 1 e 2; dedupe é o mesmo. Testado com romaneio sintético (canvas + OCR real
  e PDF gerado): 4/4 produtos, preço e total ignorados; sem cabeçalho, fallback OK.
- **PASSO 1 (principal)** — linha começa com: `Código(4-6 díg.) Cor(2-4, pode ter letra) Referência`
  Ex.: `00219 337 B074C B074C - CALCINHA...` e `03121 207 F500 F500- SHORT SAIA...`
- **PASSO 2 (complemento, só nas linhas que o passo 1 não reconheceu)** — acha a referência e
  usa como cor o token imediatamente ANTES dela; se não servir, o token DEPOIS.
  Guardas anti-lixo (17/07/2026, caso real: preço "R$524,19" virou produto "R52419/R0"):
  referência do passo 2 só com 2-4 dígitos (5-6 é preço/nº de pedido) e a cor precisa
  EXISTIR na tabela CORES. Cores com letra (A07) no início da linha não são confundidas
  com referência (consulta a tabela; caso do recorte de foto só com colunas cor+ref).
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
- [x] Acervo em dois servidores (16/07/2026): ver/sondar na Locaweb (rápido), baixar no
      e-commerce (CORS). Sondagem com 3 tentativas contra instabilidade de rede; tela
      vazia agora sugere tentar de novo; botão da galeria descarta partes de busca
      anterior. Ver seção "Padrão dos links das fotos".
- [x] Salvar na galeria em PARTES (16/07/2026): se o celular recusar muitas fotos de uma
      vez, o app divide em lotes (LOTE_MAX=24, encolhe até o navigator.canShare aceitar)
      e pede um toque por parte ("Toque p/ salvar — parte 2 de 4"). Antes ele desistia e
      mandava salvar por produto. Obs.: site NÃO consegue gravar direto na fototeca sem
      toque do usuário (regra do iPhone/Android) — o menu de compartilhar é o caminho.
      Testado em 16/07/2026 simulando: celular sem limite (1 envio), com limite de 4
      (4 partes guiadas) e iPhone exigindo gesto direto (2º toque).
- [x] Logo da marca (16/07/2026): o dono mandou a imagem oficial (ART/STILO ® + slogan
      "O que te move.", creme sobre petróleo escuro). Reproduzida como TEXTO estilizado
      (classe .brandmark, Poppins 300 espaçada) — sem arquivo externo. A constante
      LOGO_URL segue disponível caso queira usar um arquivo de imagem no futuro.
- [x] Busca por NOME da cor (16/07/2026): tabela da planilha Cores.xlsx da fábrica
      embutida no index.html (const CORES, 1.266 cores; INATIVO/NAO USAR excluídas).
      A revendedora pode digitar "F500 preto" além de "F500 207". Nomes com mais de
      um código (ex.: PRETO = 002 e 0002) viram um "grupo" de candidatos e só ficam
      os códigos com foto no acervo (funções parseManual/escolherCandidatos).
      Os cartões e a lista "sem foto" mostram o nome da cor (nomeDaCor).
      Testado ao vivo em 16/07/2026: "F500 moscou"→207, "F518 bronzeada com marfim"→A07,
      "F500 preto"→002 (0002 descartado por não ter foto). OCR re-testado nos 2 layouts.

## Decisões de design

- Marca: ART/STILO ® — slogan "O que te move." (logo oficial recebida em 16/07/2026).
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
