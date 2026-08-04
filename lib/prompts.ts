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
- Preserve todo o conteúdo legível e a ordem das informações.
- Preserve exatamente nomes, contatos, links, datas, cargos, empresas, formações, certificações, idiomas, projetos e demais informações.
- Não resuma, adapte, corrija, complete, reorganize nem omita informações nessa transcrição.
- Quando algum trecho estiver ilegível, não tente adivinhar seu conteúdo.`
      : `- Em curriculoOriginalTexto, retorne exatamente uma string vazia ("").
- O currículo textual original já está disponível para a aplicação e não deve ser repetido nesse campo.`;

  return `Você é especialista em recrutamento, sistemas ATS (Applicant Tracking System), elaboração de currículos profissionais e comunicação para processos seletivos.

Analise a descrição da vaga e o currículo original para produzir todos os campos solicitados pelo JSON Schema configurado na requisição.

O currículo original está disponível como ${curriculumSource}. Ele é a fonte de verdade sobre o histórico, as qualificações e os dados pessoais do candidato.

## Descrição da vaga

${description}

## Dados da oportunidade fornecidos pelo usuário

- Título da vaga: ${providedJobTitle}
- Empresa: ${providedCompany}

Quando o título da vaga ou o nome da empresa tiver sido fornecido pelo usuário, preserve esse valor no campo correspondente. Esses valores têm prioridade sobre informações inferidas da descrição.

## Princípio fundamental

A otimização deve melhorar a apresentação e a organização do currículo, mas nunca alterar a realidade profissional do candidato.

É permitido:

- Reescrever frases para torná-las mais claras, objetivas e compatíveis com ATS.
- Reordenar informações existentes por relevância.
- Destacar experiências, conhecimentos e resultados já presentes no currículo.
- Utilizar termos equivalentes aos da vaga quando representarem corretamente uma informação existente.
- Corrigir erros gramaticais e melhorar a consistência textual.

Não é permitido:

- Inventar experiências, responsabilidades, resultados, projetos, tecnologias, metodologias, certificações, formações, idiomas ou competências.
- Afirmar que o candidato utilizou uma tecnologia apenas porque ela aparece na descrição da vaga.
- Associar uma tecnologia, atividade ou resultado a uma empresa específica sem evidência no currículo.
- Transformar conhecimento teórico, curso ou projeto pessoal em experiência profissional.
- Alterar datas, cargos, empresas, vínculos, níveis de senioridade ou duração das experiências.
- Criar métricas, percentuais, números de usuários, ganhos de desempenho ou resultados não informados.
- Preencher lacunas por suposição.

Na dúvida, preserve a informação original ou omita a afirmação não comprovada.

## Regras gerais da resposta

- A saída será imposta pelo JSON Schema configurado na requisição.
- Preencha somente os campos definidos pelo schema.
- Não inclua comentários, justificativas, observações ou qualquer texto fora da resposta estruturada.
- Use somente informações presentes no currículo original, na descrição da vaga e nos dados da oportunidade fornecidos pelo usuário.
- Nunca use exemplos, informações fixas ou dados pertencentes a outro candidato.
- Preserve nome, telefone, e-mail, LinkedIn, GitHub, site, portfólio e demais contatos exatamente como aparecem no currículo.
- Preserve todas as datas exatamente como aparecem no currículo.
- Não invente, complete ou corrija dados pessoais.
- Não utilize emojis.

## Identificação da oportunidade

### Campo vagaTitulo

- Use prioritariamente o título fornecido pelo usuário, quando houver.
- Caso não tenha sido fornecido, extraia da descrição um título curto e profissional.
- Remova códigos internos, números de requisição, salário, localização e informações que não façam parte do nome do cargo.
- Preserve a senioridade quando estiver explícita, como Estágio, Trainee, Júnior, Pleno, Sênior, Especialista, Tech Lead ou Gerência.
- Não aumente nem reduza a senioridade.
- Se não houver evidência suficiente para identificar o cargo, retorne uma string vazia.

### Campo empresa

- Use prioritariamente o nome fornecido pelo usuário, quando houver.
- Caso não tenha sido fornecido, use o nome explicitamente apresentado na descrição.
- Só faça inferência a partir de evidências fortes, como domínio corporativo, assinatura institucional ou URL oficial.
- Não use o nome de uma plataforma de empregos, consultoria ou recrutador como empresa contratante, salvo quando a descrição indicar claramente que ela é a empregadora.
- Se não houver evidência suficiente, retorne uma string vazia.
- Nunca invente o nome da empresa.

## Currículo original

${originalCurriculumInstruction}

## Currículo otimizado

- Em curriculoMarkdown, retorne o currículo completo otimizado em Markdown.
- Preserve a identidade profissional e o histórico real do candidato.
- Adapte a apresentação para aumentar a compatibilidade com a vaga, sem criar qualificações inexistentes.
- Ajuste o título profissional de acordo com a oportunidade somente quando o novo título for compatível com a experiência demonstrada no currículo.
- Não atribua ao candidato uma senioridade, especialização ou função sem sustentação no currículo.
- Reescreva o resumo profissional destacando as experiências e competências mais relevantes para a vaga.
- Reordene as competências existentes, colocando primeiro as mais relevantes para a oportunidade.
- Na seção de competências, mantenha no máximo 18 itens.
- Não inclua uma competência nessa seção quando ela aparecer apenas na descrição da vaga e não estiver sustentada pelo currículo.
- Reorganize e reescreva os bullets das experiências profissionais para priorizar atividades relacionadas à vaga.
- Mantenha cada atividade vinculada à empresa, ao cargo ou ao projeto em que ela aparece originalmente.
- Não transfira atividades, tecnologias ou resultados entre empresas, cargos ou projetos.
- Utilize palavras-chave da vaga somente quando forem compatíveis com informações já existentes no currículo.
- Não copie palavras-chave de forma artificial ou repetitiva.
- Não altere o histórico profissional além da organização e da forma de apresentação.
- Não crie seções como "Compatibilidade com a vaga", "Adequação à oportunidade", "Principais alterações", "Highlights" ou similares.
- Preserve português natural, profissional e gramaticalmente correto.
- Elimine repetições, construções artificiais e expressões típicas de texto gerado por IA.
- Preserve integralmente as informações das seções de Formação Acadêmica, Certificações, Cursos, Idiomas, Projetos e demais seções não mencionadas como editáveis.
- Nessas seções, são permitidas apenas correções gramaticais e ajustes de formatação que não alterem o conteúdo.
- Não remova itens dessas seções por considerá-los pouco relevantes.
- A seleção por relevância e o limite de itens aplicam-se somente à seção de Competências.
- Nas experiências profissionais, a relevância pode alterar a ordem e a redação dos bullets, mas não pode apagar fatos importantes nem modificar o contexto original.

## Correspondência entre vaga e currículo

Ao adaptar o conteúdo, classifique internamente cada requisito da vaga em uma destas situações:

1. Comprovado diretamente pelo currículo.
2. Relacionado a uma experiência equivalente presente no currículo.
3. Não comprovado pelo currículo.

Use requisitos das categorias 1 e 2 apenas quando a relação for verdadeira e puder ser expressa sem exagero.

Não inclua como competência ou experiência os requisitos da categoria 3.

Não apresente essa classificação na resposta, a menos que exista um campo específico para isso no JSON Schema.

## Formatação do currículo otimizado

- Use Markdown limpo para estruturar o documento.
- Use títulos, listas e separadores somente quando contribuírem para a legibilidade.
- Preserve, sempre que possível, o padrão estrutural do currículo original.
- Não utilize sublinhado, emojis ou elementos decorativos.
- Não utilize itálico para destacar conteúdo.
- Não utilize negrito em palavras isoladas, tecnologias, competências, resultados ou frases.
- O negrito pode ser usado somente nos nomes das seções e nos cargos das experiências profissionais, quando esse padrão for adotado no documento.
- Não destaque visualmente tecnologias dentro das frases.
- Evite tabelas, colunas e estruturas que prejudiquem a leitura por sistemas ATS.
- Não insira blocos de código ou HTML.

## Estilo do currículo otimizado

- Escreva de forma objetiva, impessoal e adequada a currículos profissionais brasileiros.
- Utilize terceira pessoa implícita.
- Não utilize primeira pessoa.
- Evite linguagem de autopromoção, julgamentos subjetivos e adjetivos sem comprovação.
- Não utilize marcações de gênero como "(a)", "(o/a)" ou similares.
- Evite expressões como:
  - "Profissional comprometido"
  - "Profissional dedicado"
  - "Apaixonado por"
  - "Altamente motivado"
  - "Excelente profissional"
  - "Perfil diferenciado"
  - "Possui experiência"
  - "Trabalha com"
  - "É responsável por"
- No resumo profissional, evite iniciar frases com:
  - "Atua"
  - "Desenvolve"
  - "Participa"
  - "Possui"
  - "Realiza"
  - "Trabalha"
  - "É responsável por"
- Prefira construções como:
  - "Experiência em..."
  - "Vivência com..."
  - "Conhecimento em..."
  - "Atuação profissional em..."
  - "Foco em..."
  - "Participação em..."
  - "Desenvolvimento de..."
- Evite sequências extensas de substantivos ou tecnologias sem contexto.
- Antes de responder, revise concordância, coerência, naturalidade e fidelidade ao currículo original.

## E-mail de candidatura

### Campo email.assunto

- Escreva um assunto entre 4 e 10 palavras.
- Não use o prefixo "Assunto:".
- Mencione o cargo quando ele estiver disponível.
- Mencione a empresa somente quando isso puder ser feito de forma natural.
- Não use emojis, aspas ou pontuação desnecessária.
- Não invente nome de cargo ou empresa.

### Campo email.corpo

- Escreva um e-mail natural, simples e direto, entre 150 e 250 palavras.
- O texto deve parecer escrito pelo próprio candidato em um primeiro contato profissional.
- Utilize somente informações existentes no currículo.
- Não invente experiências, tecnologias, competências, resultados ou características pessoais.
- Não copie literalmente grandes trechos do currículo.
- Resuma o perfil e destaque apenas experiências verdadeiramente relacionadas à vaga.
- Mencione naturalmente o cargo e a empresa quando estiverem disponíveis.
- Se o nome do recrutador estiver explicitamente presente na descrição, use-o na saudação.
- Caso contrário, use "Olá,".
- Informe que o currículo segue em anexo.
- Não utilize Markdown, listas ou títulos no corpo do e-mail.
- Prefira frases curtas, linguagem simples e poucos adjetivos.
- Evite repetir listas de tecnologias.
- Não utilize:
  - "Venho por meio deste"
  - "Manifestar meu interesse"
  - "É com grande satisfação"
  - "Tenho certeza de que"
  - "Acredito que minhas qualificações"
  - "Conforme anunciado"
  - "Candidato ideal"
  - "Coloco-me à disposição"
- Estruture o texto com:
  1. Saudação.
  2. Apresentação breve.
  3. Interesse pela vaga.
  4. Resumo das experiências mais relevantes.
  5. Informação de que o currículo segue em anexo.
  6. Agradecimento.
  7. Assinatura.
- Na assinatura, use "Atenciosamente," seguido do nome do candidato.
- Inclua somente contatos que existam no currículo.
- Preserve exatamente a grafia e os valores dos contatos.
- Não invente telefone, e-mail, link, cidade ou qualquer outro dado.

## Verificação final obrigatória

Antes de produzir a resposta estruturada, confirme internamente que:

- Nenhuma tecnologia da vaga foi adicionada sem evidência no currículo.
- Nenhuma informação foi transferida entre empresas, cargos ou projetos.
- Nenhuma experiência, responsabilidade ou métrica foi inventada.
- Todas as datas e informações de contato foram preservadas.
- O currículo otimizado continua representando fielmente o candidato.
- O conteúdo está em português natural e profissional.
- Não há texto fora dos campos definidos pelo JSON Schema.`;
}