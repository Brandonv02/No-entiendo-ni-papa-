import { unit } from "./build";

export const units5to8 = [
  unit(5, "A1", "Preguntas y respuestas", "❓", "Pregunta lo que quieras y responde corto.", [
    {
      title: "Do y does",
      objective: "Formar preguntas de sí/no en presente simple.",
      vocab: [
        ["do", "(auxiliar de pregunta)", "No se traduce: solo marca que es una pregunta."],
        ["does", "(auxiliar con he/she/it)"],
        ["speak", "hablar"],
        ["here", "aquí"],
        ["yes", "sí"],
        ["no", "no"],
      ],
      phrases: [
        ["Do you speak English?", "¿Hablas inglés?", "Do", ["Are", "Does", "Is"]],
        ["Does she work here?", "¿Ella trabaja aquí?", "Does", ["Do", "Is", "Are"], { note: "Con does el verbo NO lleva -s: work, no works." }],
        ["Yes, I do.", "Sí.", "do", ["am", "is", "have"], { literal: "Sí, yo hago", note: "Respuesta corta: repite el auxiliar, no el verbo." }],
        ["Where do you live?", "¿Dónde vives?", "do", ["are", "does", "is"]],
      ],
      grammar: {
        title: "Preguntas con do / does",
        points: [
          "Do + sujeto + verbo base: Do you like music?",
          "Does para he/she/it, y el verbo vuelve a su forma base: Does he work?",
          "Respuesta corta: Yes, I do. / No, she doesn't.",
        ],
        example: "Do they live here? → Yes, they do.",
      },
      writing: {
        prompt: "Escribe una pregunta para saber si alguien habla inglés.",
        hint: "Do you ...?",
        sample: "Do you speak English?",
        keywords: ["do you"],
      },
      dialog: [
        ["Ana", "Excuse me, do you speak English?", "Disculpa, ¿hablas inglés?"],
        ["Tom", "Yes, I do. Can I help you?", "Sí. ¿Te puedo ayudar?"],
        ["Ana", "Where do you live?", "¿Dónde vives?"],
        ["Tom", "I live near here.", "Vivo cerca de aquí."],
      ],
    },
    {
      title: "Palabras para preguntar",
      objective: "Usar what, when, where, who, why y how.",
      vocab: [
        ["what", "qué"],
        ["when", "cuándo"],
        ["where", "dónde"],
        ["who", "quién"],
        ["why", "por qué"],
        ["how", "cómo"],
      ],
      phrases: [
        ["Why do you like music?", "¿Por qué te gusta la música?", "Why", ["What", "Who", "How"], { literal: "¿Por qué tú gustas música?", note: "«Like» es el verbo de quien siente: tú lo sientes." }],
        ["Who is your teacher?", "¿Quién es tu profesor?", "Who", ["What", "Where", "When"]],
        ["How do you go to work?", "¿Cómo vas al trabajo?", "How", ["Why", "Who", "Where"]],
        ["When do you study?", "¿Cuándo estudias?", "When", ["Where", "What", "Who"]],
      ],
      grammar: {
        title: "Wh- + do/does",
        points: [
          "Estructura: palabra de pregunta + do/does + sujeto + verbo base.",
          "Con «to be» no hace falta «do»: Where is the bank? Who are you?",
          "Respuesta con «because»: Why do you study? Because I like English.",
        ],
        example: "Where do you work? When does she study?",
      },
      writing: {
        prompt: "Escribe una pregunta con «Where» para un amigo.",
        hint: "Where do you ...?",
        sample: "Where do you live?",
        keywords: ["where"],
      },
    },
  ]),

  unit(6, "A1", "Negaciones", "🚫", "Decir que no, que no sabes y que no entiendes ni papa.", [
    {
      title: "Don't y doesn't",
      objective: "Negar en presente simple.",
      vocab: [
        ["don't", "no (con I/you/we/they)"],
        ["doesn't", "no (con he/she/it)"],
        ["understand", "entender"],
        ["know", "saber / conocer"],
        ["like", "gustar / querer (agrado)", "«I like» = me gusta; no es «me gusto»."],
        ["want", "querer"],
      ],
      phrases: [
        ["I don't understand.", "No entiendo.", "don't", ["doesn't", "not", "no"], { alt: ["I do not understand."] }],
        ["She doesn't like coffee.", "No le gusta el café.", "doesn't", ["don't", "isn't", "not"]],
        ["I don't know.", "No sé.", "know", ["knows", "do", "am"]],
        ["I don't understand anything.", "No entiendo ni papa.", "anything", ["nothing", "something", "nobody"], { literal: "No entiendo nada", note: "«No entiendo ni papa» es un modismo: en inglés se dice «I don't understand anything»." }],
      ],
      grammar: {
        title: "Negar con don't / doesn't",
        points: [
          "I/you/we/they + don't + verbo base: I don't know.",
          "He/she/it + doesn't + verbo base (sin -s): He doesn't work.",
          "En inglés solo hay UNA negación: I don't know anything (no «I don't know nothing»).",
        ],
        example: "We don't want tea. She doesn't want tea.",
      },
      writing: {
        prompt: "Escribe algo que NO te gusta, usando «don't».",
        hint: "I don't like...",
        sample: "I don't like cold coffee.",
        keywords: ["i don't like"],
      },
    },
    {
      title: "Negar con to be",
      objective: "Usar am not, isn't y aren't.",
      vocab: [
        ["isn't", "no es / no está"],
        ["aren't", "no eres / no son / no están"],
        ["am not", "no soy / no estoy"],
        ["tired", "cansado/a"],
        ["late", "tarde"],
        ["alone", "solo/a"],
      ],
      phrases: [
        ["I am not tired.", "No estoy cansado.", "not", ["no", "don't", "isn't"], { alt: ["I'm not tired."] }],
        ["He isn't at home.", "Él no está en casa.", "isn't", ["aren't", "doesn't", "don't"], { alt: ["He is not at home."] }],
        ["They aren't late.", "Ellos no llegan tarde.", "aren't", ["isn't", "don't", "doesn't"], { alt: ["They are not late."], literal: "Ellos no son tarde" }],
        ["You aren't alone.", "No estás solo.", "alone", ["late", "tired", "happy"], { alt: ["You are not alone."] }],
      ],
      grammar: {
        title: "To be + not",
        points: [
          "Con to be se agrega «not»: I am not, he is not (isn't), they are not (aren't).",
          "NO se usa «do» con to be: I don't am está mal → I am not.",
          "«Am not» casi nunca se contrae: I'm not.",
        ],
        example: "She isn't happy. We aren't ready.",
      },
      writing: {
        prompt: "Escribe cómo NO estás hoy usando «I am not».",
        hint: "I am not tired / sad / late...",
        sample: "I am not sad today.",
        keywords: ["i am not"],
      },
    },
  ]),

  unit(7, "A1", "Familia y relaciones", "👨‍👩‍👧", "Habla de tu familia y de la gente que quieres.", [
    {
      title: "Mi familia cercana",
      objective: "Nombrar a tu familia cercana y decir cuántos son.",
      vocab: [
        ["mother", "madre / mamá"],
        ["father", "padre / papá"],
        ["sister", "hermana"],
        ["brother", "hermano"],
        ["parents", "padres (papá y mamá)", "Ojo: «parents» no es «parientes» (esos son «relatives»)."],
        ["family", "familia"],
      ],
      phrases: [
        ["This is my mother.", "Esta es mi mamá.", "mother", ["father", "sister", "friend"]],
        ["I have two brothers.", "Tengo dos hermanos.", "have", ["has", "am", "are"]],
        ["My father works in Cali.", "Mi papá trabaja en Cali.", "works", ["work", "working", "worked"]],
        ["She has one sister.", "Ella tiene una hermana.", "has", ["have", "is", "does"]],
      ],
      grammar: {
        title: "Have / has",
        points: [
          "I/you/we/they have. He/she/it has.",
          "Plural: brother → brothers (pero child → children).",
          "My, your, his, her: my mother, her father.",
        ],
        example: "I have a sister. She has two brothers.",
      },
      writing: {
        prompt: "Escribe cuántos hermanos o hermanas tienes.",
        hint: "I have ... brothers / sisters.",
        sample: "I have one brother and two sisters.",
        keywords: ["i have"],
      },
    },
    {
      title: "Más familia",
      objective: "Hablar de abuelos, hijos, pareja y primos.",
      vocab: [
        ["grandmother", "abuela"],
        ["grandfather", "abuelo"],
        ["son", "hijo"],
        ["daughter", "hija"],
        ["husband", "esposo"],
        ["wife", "esposa"],
        ["cousin", "primo/a"],
      ],
      phrases: [
        ["My grandmother lives with us.", "Mi abuela vive con nosotros.", "lives", ["live", "living", "lived"]],
        ["He is my husband.", "Él es mi esposo.", "husband", ["wife", "son", "cousin"]],
        ["Do you have children?", "¿Tienes hijos?", "children", ["child", "sons", "brothers"], { note: "«Children» es el plural irregular de «child»." }],
        ["My cousin is very funny.", "Mi primo es muy chistoso.", "funny", ["tall", "sad", "old"]],
      ],
      grammar: {
        title: "Posesivos: my, his, her y 's",
        points: [
          "my, your, his, her, our, their van antes del sustantivo: her son.",
          "Para decir «de alguien» se usa 's: Ana's brother = el hermano de Ana.",
          "Nunca «the brother of Ana» en la vida diaria.",
        ],
        example: "This is Ana's cousin. His grandmother is nice.",
      },
      writing: {
        prompt: "Presenta a un familiar: di quién es y cómo es.",
        hint: "This is my... He/She is...",
        sample: "This is my cousin. He is very funny.",
        keywords: ["this is my"],
      },
    },
  ]),

  unit(8, "A1", "Comida y pedidos", "🍽️", "Pide, paga y pide la cuenta sin sufrir.", [
    {
      title: "Qué quieres comer",
      objective: "Nombrar comidas y pedir con cortesía.",
      vocab: [
        ["water", "agua"],
        ["coffee", "café"],
        ["bread", "pan"],
        ["rice", "arroz"],
        ["chicken", "pollo"],
        ["juice", "jugo"],
      ],
      phrases: [
        ["I would like a coffee, please.", "Quisiera un café, por favor.", "like", ["want", "have", "need"], { literal: "Yo querría gustar un café", note: "«I would like» es más educado que «I want».", alt: ["I'd like a coffee, please."] }],
        ["Can I have some water?", "¿Me puede dar agua?", "Can", ["Do", "Is", "Will"], { literal: "¿Puedo tener algo de agua?" }],
        ["I am hungry.", "Tengo hambre.", "hungry", ["thirsty", "tired", "cold"], { alt: ["I'm hungry."], note: "En inglés no «tienes» hambre: «eres» hambriento (to be)." }],
        ["The rice is delicious.", "El arroz está delicioso.", "delicious", ["cold", "small", "late"]],
      ],
      grammar: {
        title: "Pedir con cortesía",
        points: [
          "I would like... (quisiera...) suena más amable que I want...",
          "Can I have...? es la forma común de pedir algo.",
          "Hambre y sed usan to be: I am hungry, I am thirsty.",
        ],
        example: "I would like some juice, please.",
      },
      writing: {
        prompt: "Escribe qué pedirías de beber con cortesía.",
        hint: "I would like ..., please.",
        sample: "I would like a juice, please.",
        keywords: ["i would like", "please"],
      },
    },
    {
      title: "En el restaurante",
      objective: "Pedir mesa, carta y la cuenta.",
      vocab: [
        ["menu", "carta / menú"],
        ["table", "mesa"],
        ["waiter", "mesero"],
        ["bill", "cuenta", "En EE. UU. también «check»."],
        ["order", "pedir / pedido"],
        ["delicious", "delicioso"],
      ],
      phrases: [
        ["A table for two, please.", "Una mesa para dos, por favor.", "table", ["menu", "bill", "chair"]],
        ["Can I see the menu?", "¿Puedo ver la carta?", "menu", ["bill", "table", "water"]],
        ["I will have the chicken.", "Voy a pedir el pollo.", "will", ["am", "do", "can"], { literal: "Yo tendré el pollo", note: "«I will have» es muy natural al pedir.", alt: ["I'll have the chicken."] }],
        ["The bill, please.", "La cuenta, por favor.", "bill", ["menu", "table", "order"]],
      ],
      grammar: {
        title: "Frases útiles para pedir",
        points: [
          "A table for + número: A table for four, please.",
          "I will have... = voy a pedir...; I'll have the soup.",
          "Al final: The bill, please. / Can I have the bill?",
        ],
        example: "Can I see the menu? I will have the rice.",
      },
      writing: {
        prompt: "Pide una mesa para dos personas.",
        hint: "A table for two, please.",
        sample: "A table for two, please.",
        keywords: ["table", "two"],
      },
      dialog: [
        ["Waiter", "Good evening. A table for two?", "Buenas noches. ¿Una mesa para dos?"],
        ["Ana", "Yes, please. Can I see the menu?", "Sí, por favor. ¿Puedo ver la carta?"],
        ["Waiter", "Of course. What would you like?", "Claro. ¿Qué desea?"],
        ["Ana", "I will have the chicken, please.", "Voy a pedir el pollo, por favor."],
      ],
    },
  ]),
];
