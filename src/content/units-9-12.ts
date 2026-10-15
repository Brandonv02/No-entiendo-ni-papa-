import { unit } from "./build";

export const units9to12 = [
  unit(9, "A1", "Compras y precios", "🛍️", "Pregunta precios, pide tallas y paga.", [
    {
      title: "Cuánto cuesta",
      objective: "Preguntar precios y hablar de dinero.",
      vocab: [
        ["price", "precio"],
        ["cheap", "barato"],
        ["expensive", "caro"],
        ["money", "dinero"],
        ["cash", "efectivo"],
        ["card", "tarjeta"],
      ],
      phrases: [
        ["How much is this?", "¿Cuánto cuesta esto?", "much", ["many", "long", "old"], { literal: "¿Cuánto es esto?" }],
        ["It is too expensive.", "Es demasiado caro.", "expensive", ["cheap", "small", "good"], { alt: ["It's too expensive."] }],
        ["Do you accept cards?", "¿Aceptan tarjetas?", "accept", ["take", "pay", "have"]],
        ["I will pay in cash.", "Voy a pagar en efectivo.", "cash", ["card", "bill", "money"], { alt: ["I'll pay in cash."] }],
      ],
      grammar: {
        title: "How much / How many",
        points: [
          "How much + singular o incontable: How much is it? How much money?",
          "How many + plural contable: How many apples?",
          "Demasiado = too: too expensive (demasiado caro).",
        ],
        example: "How much is the bread? It is cheap.",
      },
      writing: {
        prompt: "Pregunta cuánto cuesta algo.",
        hint: "How much is ...?",
        sample: "How much is this shirt?",
        keywords: ["how much"],
      },
    },
    {
      title: "Ropa y tallas",
      objective: "Probarte ropa y pedir otra talla.",
      vocab: [
        ["size", "talla / tamaño"],
        ["shirt", "camisa"],
        ["shoes", "zapatos"],
        ["big", "grande"],
        ["small", "pequeño"],
        ["try on", "probarse"],
      ],
      phrases: [
        ["Can I try this on?", "¿Me lo puedo probar?", "try", ["buy", "wear", "take"]],
        ["Do you have a smaller size?", "¿Tiene una talla más pequeña?", "smaller", ["bigger", "cheaper", "better"]],
        ["These shoes are too big.", "Estos zapatos me quedan muy grandes.", "too", ["very", "so", "much"], { literal: "Estos zapatos son demasiado grandes" }],
        ["I will take it.", "Me lo llevo.", "take", ["buy", "have", "want"], { literal: "Lo tomaré", alt: ["I'll take it."] }],
      ],
      grammar: {
        title: "This / these y comparativos",
        points: [
          "This (uno cerca) → these (varios cerca): this shirt, these shoes.",
          "Comparativo corto: small → smaller, cheap → cheaper.",
          "I'll take it es la forma natural de decir que compras algo.",
        ],
        example: "This shirt is big. Do you have a smaller one?",
      },
      writing: {
        prompt: "Pide una talla distinta en una tienda.",
        hint: "Do you have a ... size?",
        sample: "Do you have a bigger size?",
        keywords: ["do you have"],
      },
    },
  ]),

  unit(10, "A1", "Lugares y direcciones", "🧭", "Encuentra lugares y entiende indicaciones.", [
    {
      title: "Lugares de la ciudad",
      objective: "Preguntar dónde queda un lugar y describir su ubicación.",
      vocab: [
        ["bank", "banco"],
        ["supermarket", "supermercado"],
        ["hospital", "hospital"],
        ["pharmacy", "farmacia"],
        ["school", "colegio / escuela"],
        ["park", "parque"],
      ],
      phrases: [
        ["Where is the bank?", "¿Dónde queda el banco?", "Where", ["What", "Who", "When"]],
        ["The pharmacy is near the park.", "La farmacia está cerca del parque.", "near", ["far", "behind", "in"]],
        ["Is there a supermarket here?", "¿Hay un supermercado por aquí?", "there", ["it", "that", "this"], { note: "«Is there...?» = ¿hay...?" }],
        ["The hospital is far from here.", "El hospital queda lejos de aquí.", "far", ["near", "next", "close"]],
      ],
      grammar: {
        title: "There is / there are",
        points: [
          "There is + singular: There is a park. (hay un parque)",
          "There are + plural: There are two banks.",
          "Pregunta: Is there...? Are there...?",
        ],
        example: "There is a pharmacy near the school.",
      },
      writing: {
        prompt: "Pregunta dónde queda un lugar.",
        hint: "Where is the ...?",
        sample: "Where is the hospital?",
        keywords: ["where is"],
      },
    },
    {
      title: "Cómo llegar",
      objective: "Entender y dar direcciones sencillas.",
      vocab: [
        ["left", "izquierda"],
        ["right", "derecha"],
        ["straight", "derecho / recto"],
        ["turn", "girar / doblar"],
        ["corner", "esquina"],
        ["block", "cuadra"],
      ],
      phrases: [
        ["Turn left at the corner.", "Gira a la izquierda en la esquina.", "left", ["right", "straight", "back"]],
        ["Go straight for two blocks.", "Sigue derecho dos cuadras.", "straight", ["left", "right", "back"]],
        ["It is on your right.", "Queda a tu derecha.", "right", ["left", "straight", "corner"], { literal: "Está en tu derecha", alt: ["It's on your right."] }],
        ["Excuse me, how do I get to the park?", "Disculpe, ¿cómo llego al parque?", "get", ["go", "come", "turn"], { literal: "¿Cómo consigo llegar al parque?" }],
      ],
      grammar: {
        title: "Instrucciones con el imperativo",
        points: [
          "Para dar órdenes se usa el verbo base: Turn left. Go straight. Stop.",
          "Se añade «please» o «then» para suavizar: Go straight, then turn right.",
          "On your left/right = a tu izquierda/derecha.",
        ],
        example: "Go straight, then turn left at the corner.",
      },
      writing: {
        prompt: "Da una indicación a alguien que busca el banco.",
        hint: "Go straight... Turn left...",
        sample: "Go straight, then turn left.",
        keywords: ["go straight", "turn"],
      },
    },
  ]),

  unit(11, "A1", "Horas, fechas y actividades", "📅", "Di la hora, el día y tus planes.", [
    {
      title: "La hora",
      objective: "Preguntar y decir la hora.",
      vocab: [
        ["time", "hora / tiempo"],
        ["o'clock", "en punto"],
        ["half", "mitad / media"],
        ["quarter", "cuarto"],
        ["afternoon", "tarde"],
        ["evening", "noche (temprano)"],
      ],
      phrases: [
        ["What time is it?", "¿Qué hora es?", "time", ["day", "hour", "clock"]],
        ["It is three o'clock.", "Son las tres en punto.", "o'clock", ["clock", "hour", "minute"], { alt: ["It's three o'clock."], literal: "Es tres en punto" }],
        ["It is half past five.", "Son las cinco y media.", "half", ["quarter", "past", "almost"], { alt: ["It's half past five."] }],
        ["The class starts at nine.", "La clase empieza a las nueve.", "starts", ["start", "starting", "started"]],
      ],
      grammar: {
        title: "Decir la hora",
        points: [
          "Siempre «It is...»: It is two o'clock. (nunca «they are the two»).",
          "Y media = half past; y cuarto = quarter past; menos cuarto = quarter to.",
          "At + hora para eventos: at nine, at six thirty.",
        ],
        example: "What time is it? It is quarter past four.",
      },
      writing: {
        prompt: "Di a qué hora empieza tu día.",
        hint: "My day starts at...",
        sample: "My day starts at six.",
        keywords: ["at"],
      },
    },
    {
      title: "Días y fechas",
      objective: "Hablar de días de la semana, meses y planes.",
      vocab: [
        ["Monday", "lunes", "Los días y meses siempre van con mayúscula."],
        ["weekend", "fin de semana"],
        ["today", "hoy"],
        ["tomorrow", "mañana (el día siguiente)"],
        ["yesterday", "ayer"],
        ["month", "mes"],
      ],
      phrases: [
        ["Today is Monday.", "Hoy es lunes.", "Today", ["Tomorrow", "Yesterday", "Weekend"]],
        ["My birthday is in March.", "Mi cumpleaños es en marzo.", "March", ["Monday", "today", "weekend"]],
        ["I work from Monday to Friday.", "Trabajo de lunes a viernes.", "to", ["at", "in", "on"]],
        ["What do you do on the weekend?", "¿Qué haces el fin de semana?", "weekend", ["month", "today", "evening"], { literal: "¿Qué haces en el fin de semana?" }],
      ],
      grammar: {
        title: "In / on / at con tiempo",
        points: [
          "On + día: on Monday. In + mes: in March. At + hora: at five.",
          "From... to... = de... a...: from Monday to Friday.",
          "Mayúscula en días y meses: Monday, March.",
        ],
        example: "On Saturday I rest. In May I travel. At night I read.",
      },
      writing: {
        prompt: "Di qué haces el fin de semana.",
        hint: "On the weekend I...",
        sample: "On the weekend I visit my family.",
        keywords: ["weekend"],
      },
    },
  ]),

  unit(12, "A1", "Conversaciones cotidianas", "💬", "Sobrevive a una charla real: pide ayuda y habla del clima.", [
    {
      title: "Pedir ayuda y repetir",
      objective: "Pedir ayuda, que repitan y que hablen más despacio.",
      vocab: [
        ["help", "ayudar / ayuda"],
        ["sorry", "perdón / lo siento"],
        ["excuse me", "disculpe / con permiso"],
        ["repeat", "repetir"],
        ["slowly", "despacio"],
        ["learning", "aprendiendo"],
      ],
      phrases: [
        ["Excuse me, can you help me?", "Disculpe, ¿me puede ayudar?", "help", ["see", "stop", "call"]],
        ["Can you repeat that, please?", "¿Puede repetir eso, por favor?", "repeat", ["say", "speak", "write"]],
        ["Please speak slowly.", "Por favor hable despacio.", "slowly", ["quickly", "loudly", "later"]],
        ["I am learning English.", "Estoy aprendiendo inglés.", "learning", ["learn", "learns", "learned"], { alt: ["I'm learning English."], note: "«I am + verbo-ing» = estoy haciendo algo ahora o en esta etapa." }],
      ],
      grammar: {
        title: "Sobrevivir cuando no entiendes",
        points: [
          "«Sorry?» o «Excuse me?» = ¿cómo? / ¿perdón?",
          "«Can you repeat that?» y «Please speak slowly» son tus mejores amigas.",
          "Estoy haciendo algo ahora: I am + verbo-ing (I am learning).",
        ],
        example: "Sorry, can you repeat that? Please speak slowly.",
      },
      writing: {
        prompt: "Pide que te hablen más despacio.",
        hint: "Please speak slowly.",
        sample: "Sorry, please speak slowly.",
        keywords: ["speak slowly"],
      },
      dialog: [
        ["Tom", "Do you need help?", "¿Necesitas ayuda?"],
        ["Ana", "Yes. Please speak slowly. I am learning English.", "Sí. Por favor habla despacio. Estoy aprendiendo inglés."],
        ["Tom", "Sure. No problem!", "Claro. ¡Sin problema!"],
        ["Ana", "Can you repeat that, please?", "¿Puedes repetir eso, por favor?"],
      ],
    },
    {
      title: "Charla casual",
      objective: "Hablar del clima y hacer planes sencillos.",
      vocab: [
        ["weather", "clima"],
        ["sunny", "soleado"],
        ["rainy", "lluvioso"],
        ["cold", "frío"],
        ["hot", "caliente / con calor"],
        ["nice", "agradable / bonito"],
      ],
      phrases: [
        ["It is a sunny day.", "Es un día soleado.", "sunny", ["rainy", "cold", "late"], { alt: ["It's a sunny day."] }],
        ["What a nice day!", "¡Qué buen día!", "nice", ["bad", "cold", "late"]],
        ["It is very cold today.", "Hoy hace mucho frío.", "cold", ["hot", "sunny", "nice"], { literal: "Hoy es muy frío", alt: ["It's very cold today."], note: "El clima usa «it is»." }],
        ["Do you want to get a coffee?", "¿Quieres ir por un café?", "want", ["need", "like", "have"], { literal: "¿Quieres obtener un café?" }],
      ],
      grammar: {
        title: "Charla pequeña",
        points: [
          "Clima con «it is»: It is hot. It is raining.",
          "Invitar: Do you want to + verbo? Do you want to eat?",
          "Reaccionar: Really? Nice! Me too. (yo también)",
        ],
        example: "It is a nice day. Do you want to walk?",
      },
      writing: {
        prompt: "Describe el clima de hoy.",
        hint: "It is sunny / cold / hot...",
        sample: "It is a sunny day today.",
        keywords: ["it is"],
      },
    },
  ]),
];
