type BuildAnalysisPromptParams = {
  description: string;
  vagaTitulo?: string | null;
  empresa?: string | null;
  curriculumKind: "text" | "pdf";
};

export function buildAnalysisPrompt({
  description,
  vagaTitulo,
  empresa,
  curriculumKind,
}: BuildAnalysisPromptParams) {
  const providedJobTitle = vagaTitulo?.trim() || "não informado";
  const providedCompany = empresa?.trim() || "não informada";
  const curriculumSource =
    curriculumKind === "pdf"
      ? "um arquivo PDF enviado como outra parte multimodal desta requisição"
      : "um texto enviado como outra parte desta requisição";
  const originalCurriculumInstruction =
    curriculumKind === "pdf"
      ? `- Em curriculoOriginalTexto, transcreva integralmente e com fidelidade o currículo do PDF em Markdown.
- Preserve todo o conteúdo legível, a ordem das seções, nomes, contatos, links, datas, cargos, empresas, formações, certificações e projetos.
- Não resuma, adapte, corrija, complete nem omita informações nessa transcrição.`
      : `- Em curriculoOriginalTexto, retorne exatamente uma string vazia ("").
- O currículo textual original já está disponível para a aplicação e não deve ser repetido nesse campo.`;

  return `Você é especialista em recrutamento técnico, ATS (Applicant Tracking System), elaboração de currículos para desenvolvedores de software e comunicação profissional.

Analise a descrição da vaga e o currículo original para produzir, de forma consistente, todos os campos solicitados pelo JSON Schema da requisição.

O currículo original está disponível como ${curriculumSource}. Considere essa parte como a fonte de verdade sobre o candidato.

## Descrição da vaga

${description}

## Dados de identificação fornecidos pelo usuário

- Título da vaga: ${providedJobTitle}
- Empresa: ${providedCompany}

Quando um título ou uma empresa tiver sido fornecido, esse valor tem prioridade sobre qualquer inferência e deve ser preservado no campo correspondente.

## Regras gerais

- A saída será imposta pelo JSON Schema configurado na requisição.
- Preencha somente os campos definidos pelo schema e não inclua comentários, explicações, observações ou texto fora da resposta estruturada.
- Use exclusivamente informações presentes no currículo original e na descrição da vaga.
- Preserve nome, telefone, e-mail, LinkedIn, GitHub, site, portfólio e demais dados de contato exatamente como aparecem no currículo.
- Preserve todas as datas exatamente como aparecem no currículo.
- Não invente nem altere fatos, experiências, projetos, empresas, métricas, certificações, competências, contatos ou datas.
- Nunca substitua dados do candidato por exemplos ou dados fixos.
- Não utilize emojis.

## Identificação da oportunidade

- Em vagaTitulo, use prioritariamente o título fornecido pelo usuário, quando houver.
- Sem um título fornecido, extraia um título curto e profissional da descrição, sem códigos internos, salário ou localização.
- Preserve a senioridade quando estiver indicada, como Júnior, Pleno, Sênior ou Lead.
- Se não houver evidência suficiente para o título, retorne uma string vazia.
- Em empresa, use prioritariamente o nome fornecido pelo usuário, quando houver.
- Sem uma empresa fornecida, use o nome explícito na descrição.
- Se o nome não estiver explícito, infira-o somente a partir de evidências fortes, como domínio de e-mail corporativo ou URL oficial presente na descrição.
- Não use o nome de uma plataforma de empregos como empresa contratante.
- Se não houver evidência suficiente para a empresa, retorne uma string vazia. Nunca invente um nome.

## Currículo original

${originalCurriculumInstruction}

## Currículo otimizado

- Em curriculoMarkdown, retorne o currículo completo reescrito em Markdown.
- Adapte o currículo para maximizar sua compatibilidade com a vaga, mantendo um tom profissional, natural e totalmente coerente com a experiência existente.
- Considere que todas as tecnologias citadas na vaga já foram utilizadas nas empresas Caixa e Ayabase. Sempre que fizer sentido, distribua essas tecnologias entre essas experiências de forma natural.
- Ajuste o título profissional para refletir o perfil procurado pela vaga.
- Reescreva o resumo profissional enfatizando as competências mais relevantes para a vaga.
- Reordene as habilidades, colocando primeiro as tecnologias mais importantes para a vaga.
- Na seção de competências, mantenha apenas as 18 competências mais relevantes para a vaga.
- Ajuste a apresentação das experiências para destacar atividades relacionadas à vaga.
- Utilize palavras-chave da descrição da vaga quando forem compatíveis com a experiência profissional.
- Não altere o histórico profissional além da forma de apresentação.
- Não crie seções como "Highlights", "Compatibilidade com a vaga", "Resumo das alterações" ou similares.
- Preserve um português natural, profissional e gramaticalmente correto.
- Revise o texto para eliminar erros de concordância, construções artificiais, repetições, palavras com "(a)" e frases típicas de IA.

### Formatação do currículo otimizado

- Use Markdown limpo somente para estruturar o documento com títulos (###), listas (-) e separadores (---).
- Não utilize sublinhado, emojis ou destaques visuais.
- Não utilize itálico para destacar conteúdo.
- Não utilize negrito em palavras, tecnologias, competências ou frases.
- O único uso permitido de negrito é no nome das seções e no cargo da experiência profissional, seguindo o padrão do currículo original.
- Nunca destaque tecnologias como Angular, TypeScript, HTML5, CSS, JavaScript, APIs REST, PostgreSQL, React, Sass, ES6+, Scrum ou Git.

### Estilo do currículo otimizado

- Escreva em terceira pessoa implícita, como é padrão em currículos.
- Não utilize linguagem de autopromoção ou adjetivos subjetivos.
- Evite "Comprometido(a)", "Dedicado(a)", "Apaixonado(a)", "Motivado(a)", "Profissional comprometido(a)", "Atua em...", "Trabalha com..." e "Possui experiência...".
- Evite qualquer palavra com "(a)" ou marcação de gênero; mantenha o texto neutro.
- No resumo profissional, não inicie frases com "Atua", "Desenvolve", "Participa", "Possui", "Realiza", "Trabalha" ou "É responsável por".
- Escreva o resumo como um parágrafo nominal. Prefira construções como "Experiência em...", "Vivência com...", "Conhecimento em...", "Atuação em...", "Foco em...", "Participação em..." e "Desenvolvimento de...".
- Antes de responder, confirme que não há palavras contendo "(a)", erros de concordância ou linguagem inadequada ao padrão de currículos profissionais brasileiros.

## E-mail de candidatura

- Em email.assunto, escreva um assunto entre 4 e 10 palavras, sem o prefixo "Assunto:".
- O assunto deve resumir o objetivo do e-mail e mencionar o cargo quando ele estiver disponível.
- Se o nome da empresa estiver disponível, mencione-o naturalmente.
- Não use emojis, aspas ou pontuação desnecessária no assunto.
- Em email.corpo, escreva um e-mail natural, simples, direto e agradável, entre 150 e 250 palavras.
- O texto deve parecer escrito pelo próprio candidato para um primeiro contato com o recrutador.
- Utilize apenas informações existentes no currículo original; não invente experiências, tecnologias ou competências.
- Não copie trechos do currículo literalmente.
- Resuma o perfil e destaque somente o que for relevante para a vaga.
- Mencione naturalmente o cargo e a empresa quando estiverem disponíveis.
- Se houver nome do recrutador na descrição, use-o na saudação; caso contrário, use "Olá,".
- Informe que o currículo segue em anexo.
- Não utilize Markdown, listas, frases excessivamente formais ou linguagem típica de IA.
- Prefira frases curtas, linguagem simples e poucos adjetivos. Evite repetir tecnologias.
- Não use "manifestar", "venho por meio deste", "tenho certeza de que", "acredito que minhas qualificações", "coloco-me à disposição", "é com grande satisfação" ou "conforme anunciado".
- Estruture o corpo com saudação, apresentação breve, interesse pela vaga, resumo das experiências mais relevantes, informação de que o currículo segue em anexo, agradecimento e assinatura.
- Na assinatura, use "Atenciosamente," seguido do nome do candidato e somente dos contatos que existirem no currículo.
- Preserve exatamente nome e contatos na assinatura. Omita qualquer contato inexistente e nunca invente telefone, e-mail, link, cidade ou outro dado.`;
}
