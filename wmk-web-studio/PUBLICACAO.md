# Publicação: estado e procedimento

**Estado desta entrega: pacote gerado localmente. Nenhum push ou release do GitHub foi executado.**

## Repositório recomendado
`WMK-Web-Designer` (público), contendo este pacote. O motor Rust deverá ser tratado em projeto/release separado e auditado antes de publicar.

## Publicação sem Git CLI, pelo navegador
1. Faça login na sua conta do GitHub, crie um repositório público chamado `WMK-Web-Designer` (sem gerar README ou LICENSE automáticos).
2. Clique em **Add file → Upload files** e envie os arquivos e pastas do ZIP extraído (não apenas o ZIP, para que o código seja navegável no GitHub).
3. Revise a estrutura e clique em **Commit changes**; confira que os arquivos aparecem online.
4. Adicione tópicos `rust`, `spreadsheet`, `form-designer`, `javascript`, `monaco-editor`, `open-source`.
5. Crie uma release `v0.5.2-docs1` anexando o pacote ZIP, caso queira uma distribuição pronta para download.
6. Verifique que LICENSE, NOTICE, AUTHORS e os manuais são legíveis publicamente.

## Antes de um anúncio público
- Confirmar propriedade/autorização de logos e autoria de material original.
- Auditar dependências distribuídas (inclusive bibliotecas web, fontes e motor Rust quando incluído).
- Revisar segurança da Bridge: tokens, origens, controle de acesso, chamadas permitidas e scripts recebidos.
- Testar instalação limpa em Windows com o WMK Formula real.

**Não copie o pacote do motor Rust para este repositório sem a auditoria de marcas/terceiros.**


A identidade visual oficial foi fornecida pelo mantenedor: `assets/wmk-formula-logo.png` e `assets/wmk-paleta-oficial.png`. O manual principal é `manuais/manual-completo.html`. **Não houve envio automático ao GitHub nesta entrega.**
