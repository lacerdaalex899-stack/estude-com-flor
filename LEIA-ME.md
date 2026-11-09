# 🌸 Estude com Flor

IA de estudos universitários para Android, de uso pessoal. Por trás, ela usa o Claude (Anthropic).

## O que o app faz
- **Perfis**: um para cada pessoa. Na primeira vez, o app pergunta seu nome, a **faculdade**, o **curso** e o período. Também pergunta se a IA vai agir como **mulher ou homem** e qual vai ser o **nome** dela. Para trocar de perfil ou criar outro, abra o menu ☰.
- **Fala da sua área**: a IA usa o vocabulário do seu curso (Direito, Enfermagem, Engenharia…) sem exagerar no jargão.
- **Memória por chat**: cada chat segue um raciocínio só. Arquivos, fotos e links novos no mesmo chat continuam o assunto. Para mudar de tema, abra um **novo chat** (＋), toque em **🧹 Esquecer** ou escreva “esquece tudo isso”.
- **Arquivos**: fotos (câmera ou galeria), PDF, Word (.docx), Excel (.xlsx/.csv), PowerPoint (.pptx), OpenDocument, textos e códigos. Links são lidos direto da mensagem.
- **🔎 Pesquisa** na internet com as fontes citadas.
- **📄 Montar trabalho**: pesquisa fontes, escreve o trabalho e exporta em **Word no padrão ABNT** (capa, resumo, sumário, seções numeradas, referências e números de página).
- **📊 Montar slides**: exporta em **PowerPoint** com as cores do seu tema e as notas do apresentador.
- **✍️ Humanizar**: depois de montar, o texto é reescrito com uma escrita mais natural, de estudante. Isso pode ser desligado em Configurações. Também tem um botão para fazer isso em qualquer resposta, com opção de ver o original.
- **🎨 Aparência**: 10 paletas, cores principal e secundária livres, modo claro/escuro/do sistema, tom suave/médio/vibrante e tamanho da letra.
- **Atalhos**: Resumo, Questões estilo prova, Explicar fácil e Cronograma de estudos.
- **Backup**: exporte e importe seus chats em Configurações → Dados.

## Como gerar o APK (sem instalar nada no computador)
1. Crie uma conta grátis no **github.com** e um repositório novo (pode ser privado).
2. Envie todos os arquivos desta pasta para o repositório (botão “Add file → Upload files”). A pasta `node_modules` não vai junto.
3. Entre na aba **Actions**. O processo “Gerar APK do Estude com Flor” roda sozinho e leva uns 5 minutos.
4. Abra a execução que terminou com ✅ e baixe **Estude-com-Flor-APK** no final da página. Dentro do zip está o `Estude-com-Flor.apk`.
5. Passe o APK para o celular e instale. Se o Android pedir, permita “instalar apps de fonte desconhecida”.

### Alternativa: Android Studio
```
npm install
npx cap sync android
npx cap open android      # depois: Build → Build APK(s)
```

## Chave da IA (obrigatória)
1. Acesse **console.anthropic.com**, crie uma conta e adicione créditos (o uso é pago por consumo).
2. Vá em **API Keys → Create Key** e copie a chave (`sk-ant-...`).
3. Cole a chave no app, na primeira tela ou em ⚙️ → IA. Ela fica salva só no celular, e vocês dois podem usar a mesma.

Os modelos ficam em ⚙️ → IA. O **Sonnet** é o padrão equilibrado, o **Opus** é o mais inteligente e o **Haiku** é o mais econômico.

## Estrutura
- `www/`: o app (index.html, styles.css, app.js e as bibliotecas em `lib/`)
- `android/`: o projeto Android (Capacitor)
- `.github/workflows/gerar-apk.yml`: gera o APK automaticamente no GitHub
