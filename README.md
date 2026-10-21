# Açaí da Bru

Catálogo online com pedido pelo WhatsApp para o **Açaí da Bru** — desenvolvido pela TF Solutions.

## Arquivos

- `index.html`, `script.js`, `style.css` — a loja (categorias, produtos, carrinho e envio do pedido pelo WhatsApp)
- `admin.html` — painel da loja (produtos, categorias, cupons, PDV, relatório e configurações)
- `seed-firebase.html` — cadastra o cardápio inicial no Firestore (rodar uma única vez — SOBRESCREVE os produtos)
- `atualizar-firebase.html` — aplica a atualização de 21/10 (combo com 2 açaís, taxas por bairro, fotos novas) sem apagar edições feitas no admin
- `regras.md` — regras de segurança do Firestore
- `assets/` — fotos dos produtos (recortes das artes da loja) e logo da TF Solutions

## Colocar no ar

1. Criar o projeto no Firebase, ativar Firestore e Authentication (e-mail/senha) e criar o usuário admin.
2. O `firebaseConfig` (projeto `acai-da-bru-41a8d`) já está em `script.js`, `admin.html` e `seed-firebase.html`.
3. Publicar as regras do `regras.md`.
4. Abrir `seed-firebase.html`, entrar com o admin e enviar os produtos.
5. Publicar no GitHub Pages.
