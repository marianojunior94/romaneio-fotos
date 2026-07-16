# Art Stilo — Fotos pelo Romaneio

App web em **um único arquivo** (`index.html`). O cliente envia a foto ou o PDF do romaneio,
o app identifica cada **referência + código da cor** e busca as fotos no acervo, permitindo
baixar **todas em um só clique** (botão "Baixar todas (.zip)").

## Como funciona

1. O cliente envia o romaneio (JPG, PNG ou PDF) — ou digita os códigos manualmente.
2. O app lê o documento no próprio navegador (PDF com texto: leitura direta; foto ou PDF escaneado: OCR em português).
3. Para cada linha de item (`Código | Cor | Referência`), extrai o par referência+cor. Produto repetido (tamanhos diferentes) entra **uma vez só**.
4. Monta os links das fotos e testa a sequência 1, 2, 3… **parando na primeira que não existir**:
   `https://artstilo-ecommerce-production.up.railway.app/fotos/B074C_337-1.jpg`
5. Mostra a galeria e libera o download individual ou de todas em .zip.

## Onde editar (tudo em `index.html`)

Procure o bloco `CONFIGURAÇÃO DO ACERVO DE FOTOS` no início do `<script>`:

| Constante     | O que é                                              | Valor atual |
|---------------|------------------------------------------------------|-------------|
| `FOTO_BASE`   | Endereço base das fotos                              | `https://artstilo-ecommerce-production.up.railway.app/fotos/` |
| `FOTO_EXT`    | Extensão dos arquivos                                | `.jpg`      |
| `MAX_SEQ`     | Teto de fotos por produto (segurança)                | `30`        |
| `COR_DIGITOS` | Dígitos do código da cor (zeros à esquerda)          | `3`         |

- **Leitura do romaneio**: função `extractPairs()` — o PASSO 1 é calibrado para o layout
  ART STILO (`00219 337 B074C ...`); o PASSO 2 é um plano B genérico para outros layouts.
- **Visual/cores do app**: bloco `:root{}` no `<style>` (cores da marca).
- **Textos**: direto no HTML (títulos, avisos, rodapé).

## Hospedar no Railway

Pode sim — e a **melhor opção é servir este arquivo no MESMO app do Railway que já serve as fotos**
(`artstilo-ecommerce-production.up.railway.app`). Ficando no mesmo domínio, o navegador não impõe
restrição de acesso (CORS) e o .zip funciona garantido.

### Opção A (recomendada) — dentro do app que já existe
Coloque o `index.html` na pasta de arquivos estáticos do seu e-commerce e crie uma rota. Exemplo em Express:

```js
// junto das rotas existentes
app.get("/romaneio", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
```

O app fica disponível em `https://artstilo-ecommerce-production.up.railway.app/romaneio`.

### Opção B — serviço novo no Railway
1. Crie um repositório com `index.html` (e este README).
2. No Railway: **New Project → Deploy from GitHub repo**.
3. Como é um site estático, use um servidor simples. Basta um `package.json`:

```json
{
  "name": "romaneio-fotos",
  "scripts": { "start": "npx serve -s . -l $PORT" },
  "dependencies": { "serve": "^14.0.0" }
}
```

4. Deploy. O Railway gera um domínio tipo `romaneio-fotos.up.railway.app`.

**Atenção na Opção B:** como o domínio é diferente do das fotos, para o download em .zip funcionar
o servidor das fotos precisa liberar CORS. No Express do e-commerce, basta:

```js
// libera leitura das fotos por outros sites (só GET)
app.use("/fotos", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});
```

Sem isso, o app ainda mostra as fotos e o cliente ainda baixa (uma a uma, em abas), mas o .zip é bloqueado pelo navegador.

## Dicas de uso

- PDF com texto (gerado pelo sistema) é sempre mais confiável que foto.
- Foto de romaneio: quanto mais nítida e reta, melhor o OCR.
- O campo "digite os códigos manualmente" aceita: `B074C 337, B461 005`.
