export function buildApplicationMetadataPrompt(description: string) {
  return `Extraia os dados de identificação da oportunidade abaixo.

## Descrição da vaga

${description}

## Regras

- Retorne um título de vaga curto e profissional, sem códigos internos, nível salarial ou localização.
- Preserve a senioridade quando ela estiver indicada (Júnior, Pleno, Sênior, Lead etc.).
- Retorne o nome da empresa quando estiver explícito no texto.
- Se o nome não estiver escrito, você pode inferi-lo somente a partir de evidências fortes, como domínio de e-mail corporativo ou URL oficial presente na descrição.
- Não use o nome de uma plataforma de empregos como empresa contratante.
- Se não houver evidência suficiente para a empresa, retorne null. Nunca invente um nome.
- Retorne somente o objeto JSON solicitado.`;
}

export function buildCurriculumPrompt(
  description: string,
  curriculum: string,
) {
  return `Você é um especialista em recrutamento técnico, ATS (Applicant Tracking System) e elaboração de currículos para desenvolvedores de software.

Sua tarefa é adaptar o currículo fornecido para maximizar sua compatibilidade com a vaga, mantendo um tom profissional, natural e totalmente coerente com a experiência já existente.

## Descrição da vaga

${description}

## Currículo atual

${curriculum}

## Instruções

- Reescreva o currículo em Markdown.
- Retorne APENAS o currículo. Não faça comentários, explicações ou observações.
- Preserve nome, telefone, e-mail, LinkedIn, GitHub, site/portfólio e demais dados de contato exatamente como aparecem no currículo original.
- Preserve todas as datas exatamente como estão.
- Não invente experiências, projetos ou empresas.
- Nunca substitua dados do candidato por dados de exemplo ou dados fixos.
- Considere que todas as tecnologias citadas na vaga já foram utilizadas nas empresas Caixa e Ayabase. Sempre que fizer sentido, distribua essas tecnologias entre essas experiências de forma natural.
- Ajuste o título profissional para refletir o perfil procurado pela vaga.

Exemplos:

- React Developer | TypeScript | React | APIs REST
- Desenvolvedor RPA | Python | Power Automate
- Desenvolvedor Backend .NET | C# | ASP.NET Core
- Ruby on Rails Developer | Ruby | Rails | PostgreSQL

- Reescreva o resumo profissional enfatizando as competências mais relevantes para a vaga.
- Reordene as habilidades colocando primeiro as tecnologias mais importantes para a vaga.
- Ajuste a descrição das experiências para destacar atividades relacionadas à vaga.
- Utilize palavras-chave presentes na descrição da vaga sempre que forem compatíveis com a experiência profissional.
- Mantenha o currículo verdadeiro e consistente.
- Não adicione métricas fictícias.
- Não adicione certificações inexistentes.
- Não adicione projetos inexistentes.
- Não altere o histórico profissional além da forma de apresentação.
- Não utilize emojis.
- Não utilize negrito para destacar compatibilidade.
- Não crie seções como "Highlights", "Compatibilidade com a vaga", "Resumo das alterações" ou similares.
- Preserve um português natural, profissional e gramaticalmente correto.
- Revise todo o texto antes de responder para eliminar erros de concordância, construções artificiais, palavras com "(a)", repetições e frases típicas de IA.
- Na seção de competências deixe apenas as 18 competências mais relevantes para a vaga.

## Formato esperado

Retorne somente o Markdown do currículo completo.

## Formatação

- Retorne o currículo em Markdown limpo.
- Não utilize negrito (\`**texto**\`) em palavras, tecnologias, competências ou frases.
- Não utilize itálico (\`*texto*\`) para destacar conteúdo.
- Não utilize sublinhado, emojis ou qualquer outro tipo de destaque visual.
- Utilize Markdown apenas para estruturar o documento com títulos (###), listas (-) e separadores (---).
- O único uso permitido de \`**\` é no nome das seções e no cargo da experiência profissional, seguindo o padrão do currículo original.
- Nunca destaque tecnologias como Angular, TypeScript, HTML5, CSS, JavaScript, APIs REST, PostgreSQL, React, Sass, ES6+, Scrum, Git ou quaisquer outras usando negrito.

## Estilo de escrita

- Escreva todo o currículo em terceira pessoa implícita, como é padrão em currículos.
- Nunca utilize expressões como:
  - "Comprometido(a)"
  - "Dedicado(a)"
  - "Apaixonado(a)"
  - "Motivado(a)"
  - "Profissional comprometido(a)"
  - "Atua em..."
  - "Trabalha com..."
  - "Possui experiência..."
- Evite qualquer palavra com "(a)" ou marcações de gênero. O texto deve ser completamente neutro.
- Nunca escreva frases iniciadas por verbos na terceira pessoa como "Atua", "Desenvolve", "Participa", "Possui", "Realiza", "Trabalha", "É responsável por" quando estiver descrevendo o resumo profissional.
- O resumo profissional deve ser escrito como um parágrafo nominal, descrevendo experiência e competências, por exemplo:

"Desenvolvedor Full Stack com experiência em Python, React, Node.js e AWS, atuação em desenvolvimento de aplicações web, integração de APIs REST, bancos de dados relacionais e ambientes ágeis, com foco em qualidade de código, testes automatizados e pipelines CI/CD."

- Prefira construções como:
  - "Experiência em..."
  - "Vivência com..."
  - "Conhecimento em..."
  - "Atuação em..."
  - "Foco em..."
  - "Participação em..."
  - "Desenvolvimento de..."
- Nunca utilize linguagem de autopromoção ou adjetivos subjetivos.

## Validação obrigatória antes de responder

Antes de retornar o currículo, revise todo o texto e confirme que:

- Não existe nenhuma palavra contendo "(a)".
- O resumo profissional não inicia com "Atua", "Possui", "Desenvolve", "Participa", "Realiza", "Trabalha" ou expressões semelhantes.
- Não há erros de concordância verbal ou nominal.
- O texto está adequado ao padrão de currículos profissionais brasileiros.`;
}

export function buildEmailPrompt(
  description: string,
  curriculum: string,
) {
  return `Você é um recrutador experiente e especialista em comunicação profissional.

Sua tarefa é escrever um e-mail de candidatura NATURAL utilizando EXCLUSIVAMENTE as informações do currículo abaixo e da descrição da vaga.

=========================
DESCRIÇÃO DA VAGA
=========================

${description}

=========================
CURRÍCULO
=========================

${curriculum}

=========================
OBJETIVO
=========================

Escreva um e-mail que pareça ter sido escrito pelo próprio candidato, e não por uma IA.

O e-mail deve ser simples, direto e agradável de ler.

Imagine que o candidato está enviando seu currículo para um recrutador pela primeira vez.

=========================
REGRAS
=========================

- Utilize APENAS informações presentes no currículo.
- Nunca invente experiências, tecnologias ou competências.
- Nunca copie trechos do currículo literalmente.
- Faça um resumo do perfil.
- Destaque apenas o que faz sentido para a vaga.
- Se existir nome da empresa, mencione-o naturalmente.
- Se existir o cargo, mencione-o.
- Se existir o nome do recrutador, utilize-o na saudação.
- Se não existir nome, utilize "Olá,".
- Informe que o currículo segue em anexo.
- Não utilize Markdown.
- Não utilize listas.
- Não utilize frases excessivamente formais.
- Não utilize palavras como:
  - "manifestar"
  - "venho por meio deste"
  - "tenho certeza de que"
  - "acredito que minhas qualificações"
  - "coloco-me à disposição"
  - "é com grande satisfação"
  - "conforme anunciado"

Evite qualquer linguagem típica de IA ou carta de apresentação.

=========================
ESTILO
=========================

O texto deve parecer escrito por uma pessoa.

Prefira frases curtas.

Use linguagem simples.

Evite adjetivos exagerados.

Evite repetir tecnologias.

O tamanho ideal é entre 150 e 250 palavras.

=========================
ESTRUTURA
=========================

Saudação

Apresentação breve

Interesse pela vaga

Resumo das experiências mais relevantes relacionadas à vaga

Informar que o currículo segue em anexo

Agradecimento

Assinatura

=========================
ASSINATURA
=========================

Atenciosamente,

<nome do candidato extraído do currículo>

<telefone do candidato, se existir no currículo>
<e-mail do candidato, se existir no currículo>
<LinkedIn do candidato, se existir no currículo>
<GitHub do candidato, se existir no currículo>
<site ou portfólio do candidato, se existir no currículo>

Regras da assinatura:

- Use somente nome e contatos presentes no currículo fornecido.
- Preserve os dados de contato exatamente como aparecem no currículo.
- Não invente telefone, e-mail, links, cidade ou qualquer outro dado de contato.
- Não utilize dados de exemplo na assinatura.
- Nunca utilize dados fixos ou informações que não estejam no currículo fornecido.
- Se algum dado não existir no currículo, simplesmente omita essa linha.

=========================
FORMATO DA RESPOSTA
=========================

Retorne apenas o texto do e-mail, seguindo exatamente este formato:

Assunto: <assunto>

<corpo do e-mail>

Regras para o assunto:

- Deve ter entre 4 e 10 palavras.
- Deve resumir o objetivo do e-mail.
- Sempre mencionar o cargo quando ele estiver disponível.
- Se o nome da empresa estiver disponível, mencioná-lo naturalmente.
- Não utilize emojis.
- Não utilize aspas.
- Não utilize pontuação desnecessária.

Exemplos de assunto:

Assunto: Candidatura - Desenvolvedor Full Stack
Assunto: Desenvolvedor Full Stack | Pantheon
Assunto: Interesse na vaga de Assistente de TI

Após a linha do assunto, deixe uma linha em branco e escreva apenas o corpo do e-mail.

Não escreva nenhuma explicação antes ou depois do e-mail.

=========================
EXEMPLO DE TOM (NÃO COPIAR)
=========================

Olá,

Me chamo João.

Gostaria de me candidatar à vaga de Desenvolvedor Back-end.

Tenho experiência com desenvolvimento de aplicações web, criação de APIs e integração com bancos de dados. Ao longo da minha trajetória participei de projetos utilizando Python, JavaScript e PostgreSQL, sempre buscando entregar soluções simples e de qualidade.

Acredito que minha experiência esteja alinhada com a oportunidade e gostaria de participar do processo seletivo.

Segue meu currículo em anexo para avaliação.

Obrigado pela atenção.

Atenciosamente,

João`;
}
