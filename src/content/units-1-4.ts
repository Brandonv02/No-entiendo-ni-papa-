import { unit } from "./build";

export const units1to4 = [
  unit(1, "A1", "Saludos y presentaciones", "👋", "Di hola, presenta tu nombre y de dónde eres.", [
    {
      title: "Hola y adiós",
      objective: "Saludar y despedirte según la hora del día.",
      vocab: [
        ["hello", "hola"],
        ["hi", "hola (informal)"],
        ["goodbye", "adiós"],
        ["good morning", "buenos días"],
        ["good night", "buenas noches", "Solo para despedirte o irte a dormir."],
        ["please", "por favor"],
        ["thank you", "gracias"],
      ],
      phrases: [
        ["Good morning! How are you?", "¡Buenos días! ¿Cómo estás?", "morning", ["afternoon", "night", "evening"]],
        ["I am fine, thank you.", "Estoy bien, gracias.", "fine", ["tired", "happy", "hungry"], { alt: ["I'm fine, thank you."] }],
        ["See you tomorrow.", "Nos vemos mañana.", "tomorrow", ["today", "later", "soon"], { literal: "Te veo mañana" }],
        ["Nice to meet you.", "Mucho gusto.", "meet", ["see", "know", "hear"], { literal: "Agradable conocerte" }],
      ],
      grammar: {
        title: "Saludos según la hora",
        points: [
          "Good morning (hasta el mediodía), good afternoon (tarde), good evening (al anochecer).",
          "Good night NO es un saludo: se usa para despedirte o antes de dormir.",
          "«How are you?» es un saludo de cortesía: la respuesta normal es «Fine, thanks. And you?».",
        ],
        example: "Good morning! → Good morning! How are you?",
      },
      writing: {
        prompt: "Escribe un saludo de la mañana para un amigo y pregúntale cómo está.",
        hint: "Usa «Good morning» y «How are you?».",
        sample: "Good morning, Carlos! How are you?",
        keywords: ["good morning", "how are you"],
      },
      dialog: [
        ["Ana", "Good morning! How are you?", "¡Buenos días! ¿Cómo estás?"],
        ["Tom", "I am fine, thank you. And you?", "Estoy bien, gracias. ¿Y tú?"],
        ["Ana", "Fine, thanks. See you tomorrow!", "Bien, gracias. ¡Nos vemos mañana!"],
      ],
    },
    {
      title: "Me llamo...",
      objective: "Decir tu nombre y tu país, y preguntarlos.",
      vocab: [
        ["name", "nombre"],
        ["my", "mi"],
        ["your", "tu / su (de usted)"],
        ["what", "qué / cuál"],
        ["where", "dónde"],
        ["from", "de (origen)"],
        ["country", "país"],
      ],
      phrases: [
        ["My name is Laura.", "Me llamo Laura.", "name", ["age", "city", "friend"], { literal: "Mi nombre es Laura" }],
        ["What is your name?", "¿Cómo te llamas?", "your", ["my", "his", "her"], { literal: "¿Cuál es tu nombre?" }],
        ["I am from Colombia.", "Soy de Colombia.", "from", ["in", "at", "to"], { alt: ["I'm from Colombia."] }],
        ["Where are you from?", "¿De dónde eres?", "Where", ["What", "Who", "When"]],
      ],
      grammar: {
        title: "My name is... / I am from...",
        points: [
          "Para el nombre usa «My name is...» o simplemente «I am...».",
          "El origen va con «from»: I am from Colombia. (no «of»).",
          "«What is your name?» es la forma natural; en español decimos «¿cómo te llamas?».",
        ],
        example: "Hi, I am Sofia. I am from Cali.",
      },
      writing: {
        prompt: "Preséntate: di tu nombre y de qué país eres.",
        hint: "My name is... I am from...",
        sample: "My name is Daniel. I am from Colombia.",
        keywords: ["my name is", "from"],
      },
      dialog: [
        ["Sam", "Hi! What is your name?", "¡Hola! ¿Cómo te llamas?"],
        ["Laura", "My name is Laura. Where are you from?", "Me llamo Laura. ¿De dónde eres?"],
        ["Sam", "I am from Canada. Nice to meet you!", "Soy de Canadá. ¡Mucho gusto!"],
      ],
    },
  ]),

  unit(2, "A1", "Pronombres y el verbo «to be»", "🧍", "Yo soy, tú eres, ella está: el verbo más importante.", [
    {
      title: "Los pronombres",
      objective: "Reconocer y usar I, you, he, she, it, we, they.",
      vocab: [
        ["I", "yo"],
        ["you", "tú / usted / ustedes", "You sirve para una o varias personas, y para tú y usted."],
        ["he", "él"],
        ["she", "ella"],
        ["it", "eso / ello (cosas y animales)"],
        ["we", "nosotros"],
        ["they", "ellos / ellas"],
      ],
      phrases: [
        ["He is a teacher.", "Él es profesor.", "He", ["She", "It", "We"]],
        ["They are students.", "Ellos son estudiantes.", "They", ["We", "He", "You"]],
        ["We are friends.", "Somos amigos.", "are", ["is", "am", "be"]],
        ["You are very kind.", "Eres muy amable.", "very", ["much", "too", "so"], { note: "You = tú o usted." }],
      ],
      grammar: {
        title: "Siempre hay sujeto",
        points: [
          "En inglés casi siempre se dice el sujeto: «I am tired», no «am tired».",
          "«You» sirve para tú, usted y ustedes: el contexto aclara.",
          "«It» se usa para cosas, animales y el clima: It is cold.",
        ],
        example: "She is a doctor. → They are doctors.",
      },
      writing: {
        prompt: "Escribe una frase sobre un amigo usando «he» o «she».",
        hint: "He is... / She is...",
        sample: "She is my friend.",
        keywords: ["is"],
      },
    },
    {
      title: "Ser y estar: to be",
      objective: "Conjugar am / is / are para ser y estar.",
      vocab: [
        ["am", "soy / estoy"],
        ["is", "es / está"],
        ["are", "eres / somos / son / están"],
        ["teacher", "profesor/a"],
        ["student", "estudiante"],
        ["happy", "feliz"],
      ],
      phrases: [
        ["I am happy today.", "Hoy estoy feliz.", "am", ["is", "are", "be"], { alt: ["I'm happy today."] }],
        ["She is a student.", "Ella es estudiante.", "is", ["am", "are", "be"], { note: "Con profesiones se pone «a»: a student." }],
        ["Are you a teacher?", "¿Eres profesor?", "Are", ["Is", "Am", "Do"]],
        ["We are tired.", "Estamos cansados.", "tired", ["happy", "ready", "late"], { alt: ["We're tired."] }],
      ],
      grammar: {
        title: "To be = ser + estar",
        points: [
          "I am · you are · he/she/it is · we are · you are · they are.",
          "Una sola palabra cubre ser y estar: I am a student / I am tired.",
          "Pregunta: invierte el orden → Are you happy? Is she a teacher?",
        ],
        example: "I am Ana. I am from Cali. I am happy.",
      },
      writing: {
        prompt: "Escribe cómo estás hoy usando «I am».",
        hint: "I am happy / tired / fine...",
        sample: "I am tired today.",
        keywords: ["i am"],
      },
    },
  ]),

  unit(3, "A1", "Información personal", "🪪", "Edad, teléfono, dónde vives y en qué trabajas.", [
    {
      title: "Edad y datos",
      objective: "Decir tu edad, teléfono y correo.",
      vocab: [
        ["age", "edad"],
        ["old", "viejo / de edad"],
        ["years old", "años (de edad)"],
        ["number", "número"],
        ["phone", "teléfono"],
        ["email", "correo electrónico"],
      ],
      phrases: [
        ["I am twenty-five years old.", "Tengo veinticinco años.", "am", ["have", "has", "is"], { literal: "Yo soy veinticinco años viejo", note: "En inglés la edad se dice con «to be», no con «tener».", alt: ["I'm twenty-five years old.", "I am 25 years old."] }],
        ["How old are you?", "¿Cuántos años tienes?", "old", ["age", "many", "years"], { literal: "¿Qué tan viejo eres?" }],
        ["What is your phone number?", "¿Cuál es tu número de teléfono?", "phone", ["email", "house", "name"]],
        ["My email is on the card.", "Mi correo está en la tarjeta.", "email", ["phone", "name", "age"]],
      ],
      grammar: {
        title: "La edad se dice con «to be»",
        points: [
          "I am 30 (years old). NO «I have 30 years».",
          "Pregunta: How old are you?",
          "«Years old» se puede omitir: I am thirty.",
        ],
        example: "I am twenty. She is thirty-two.",
      },
      writing: {
        prompt: "Escribe tu edad en inglés.",
        hint: "I am ... years old.",
        sample: "I am thirty years old.",
        keywords: ["i am"],
      },
    },
    {
      title: "Dónde vives y trabajas",
      objective: "Hablar de tu ciudad y tu trabajo.",
      vocab: [
        ["live", "vivir"],
        ["work", "trabajar / trabajo"],
        ["job", "empleo / trabajo"],
        ["city", "ciudad"],
        ["married", "casado/a"],
        ["single", "soltero/a"],
      ],
      phrases: [
        ["I live in Bogota.", "Vivo en Bogotá.", "live", ["work", "am", "go"]],
        ["I work in a bank.", "Trabajo en un banco.", "work", ["live", "study", "go"]],
        ["What do you do?", "¿A qué te dedicas?", "do", ["did", "are", "does"], { literal: "¿Qué haces?", note: "Es la pregunta natural sobre tu trabajo." }],
        ["She is single.", "Ella está soltera.", "single", ["married", "tired", "happy"]],
      ],
      grammar: {
        title: "In + ciudad, preview del presente simple",
        points: [
          "Vivir en una ciudad: live in. Trabajar en un lugar: work in / at.",
          "Con I, you, we, they el verbo no cambia: I live, you live, we live.",
          "Con he/she/it se agrega -s: she lives, he works (lo veremos en la unidad 4).",
        ],
        example: "I live in Medellin. I work in a school.",
      },
      writing: {
        prompt: "Di dónde vives y dónde trabajas o estudias.",
        hint: "I live in... I work in...",
        sample: "I live in Cali. I work in a school.",
        keywords: ["i live", "i work"],
      },
    },
  ]),

  unit(4, "A1", "Rutinas y presente simple", "⏰", "Lo que haces todos los días.", [
    {
      title: "Tu día, paso a paso",
      objective: "Describir tu rutina diaria con el presente simple.",
      vocab: [
        ["wake up", "despertarse"],
        ["get up", "levantarse"],
        ["breakfast", "desayuno"],
        ["go to work", "ir al trabajo"],
        ["every day", "todos los días"],
        ["always", "siempre"],
      ],
      phrases: [
        ["I wake up at six.", "Me despierto a las seis.", "wake", ["work", "eat", "go"]],
        ["I eat breakfast at seven.", "Desayuno a las siete.", "breakfast", ["lunch", "dinner", "coffee"]],
        ["She goes to work by bus.", "Ella va al trabajo en bus.", "goes", ["go", "going", "is"]],
        ["I always drink coffee.", "Siempre tomo café.", "always", ["never", "today", "very"]],
      ],
      grammar: {
        title: "Presente simple: hábitos",
        points: [
          "Se usa para rutinas y hechos: I wake up at six.",
          "Con he/she/it el verbo termina en -s: she works. (go → goes, study → studies).",
          "«At» + hora: at six, at seven thirty.",
        ],
        example: "I wake up at six. He wakes up at seven.",
      },
      writing: {
        prompt: "Escribe dos cosas que haces cada mañana.",
        hint: "I wake up at... I eat...",
        sample: "I wake up at six. I eat breakfast at seven.",
        keywords: ["i wake up", "i eat"],
      },
    },
    {
      title: "Con qué frecuencia",
      objective: "Usar adverbios de frecuencia y la -s de he/she/it.",
      vocab: [
        ["usually", "normalmente"],
        ["sometimes", "a veces"],
        ["never", "nunca"],
        ["study", "estudiar"],
        ["play", "jugar / tocar"],
        ["often", "a menudo"],
      ],
      phrases: [
        ["He usually studies at night.", "Normalmente él estudia en la noche.", "studies", ["study", "studying", "studied"]],
        ["They sometimes play football.", "A veces juegan fútbol.", "sometimes", ["never", "usually", "always"], { note: "En inglés americano también «soccer»." }],
        ["I never eat meat.", "Nunca como carne.", "never", ["always", "often", "sometimes"], { note: "«Never» ya es negativo: no se dice «I don't never»." }],
        ["My friend works every day.", "Mi amigo trabaja todos los días.", "works", ["work", "working", "worked"]],
      ],
      grammar: {
        title: "Adverbios de frecuencia",
        points: [
          "Van ANTES del verbo principal: I always eat, she never drinks.",
          "Van DESPUÉS de «to be»: He is always late.",
          "He/she/it + s: she studies, he plays, it works.",
        ],
        example: "I sometimes play football. She usually studies.",
      },
      writing: {
        prompt: "Escribe qué haces siempre y qué nunca haces.",
        hint: "I always... I never...",
        sample: "I always drink coffee. I never eat meat.",
        keywords: ["i always", "i never"],
      },
    },
  ]),
];
