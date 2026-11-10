/**
 * Entrevistas conversacionales SIN IA: el usuario responde con sus propias palabras (escribiendo o dictando)
 * y el motor local (src/lib/talk.ts) reconoce qué tipo de respuesta dio, extrae datos (nombre, lugar, número…)
 * y el personaje reacciona y sigue. Añadir una entrevista = añadir datos aquí; el motor no cambia.
 */

/** Qué tipo de respuesta espera cada pregunta. */
export type Expect = "name" | "place" | "number" | "job" | "likes" | "yesno" | "reason" | "duration" | "feeling" | "time" | "free";

export type InterviewCategory = "trabajo" | "viajes" | "social";
export const CATEGORY_LABEL: Record<InterviewCategory, string> = { trabajo: "💼 Trabajo", viajes: "✈️ Viajes", social: "🤝 Vida social" };

export interface Line {
  en: string;
  es: string;
}

export interface InterviewStep {
  id: string;
  ask: Line;
  /** Una o varias formas válidas de responder. */
  expect: Expect | Expect[];
  /** Reacción cuando te entiende. `{value}` se reemplaza por el dato que dijiste (nombre, lugar, número, duración). */
  ok: Line;
  /** Reacciones distintas para sí / no (preguntas de sí o no). */
  yes?: Line;
  no?: Line;
  /** Si le devuelves la pregunta («And you?»), responde esto. */
  back?: Line;
  /** Pista en español y respuesta modelo en inglés. */
  hint: string;
  model: string;
}

export interface Interview {
  id: string;
  title: string;
  emoji: string;
  partner: string;
  /** Quién es y cómo es la situación (español). */
  scene: string;
  category: InterviewCategory;
  level: 1 | 2 | 3;
  steps: InterviewStep[];
  outro: Line;
}

export const INTERVIEWS: Interview[] = [
  {
    id: "papito",
    title: "Papito te entrevista",
    emoji: "🥔",
    partner: "Papito",
    scene: "Papito se sienta contigo con un tinto y quiere conocerte. Respóndele con tus propias palabras.",
    category: "social",
    level: 1,
    steps: [
      {
        id: "name",
        ask: { en: "Hi! I'm Papito. What's your name?", es: "¡Hola! Soy Papito. ¿Cómo te llamas?" },
        expect: "name",
        ok: { en: "Nice to meet you, {value}!", es: "¡Mucho gusto, {value}!" },
        hint: "Di tu nombre: «My name is…» o «I'm…».",
        model: "My name is Ana.",
      },
      {
        id: "from",
        ask: { en: "Where are you from?", es: "¿De dónde eres?" },
        expect: "place",
        ok: { en: "{value}! That sounds like a great place.", es: "¡{value}! Suena a un lugar genial." },
        back: { en: "Me? I'm from a potato farm in Boyacá!", es: "¿Yo? ¡De una finca de papas en Boyacá!" },
        hint: "Di de dónde eres: «I'm from…».",
        model: "I'm from Barranquilla.",
      },
      {
        id: "age",
        ask: { en: "How old are you?", es: "¿Cuántos años tienes?" },
        expect: "number",
        ok: { en: "{value}? Perfect age to learn English!", es: "¿{value}? ¡Edad perfecta para aprender inglés!" },
        back: { en: "I'm three months old. Potatoes grow fast!", es: "Tengo tres meses. ¡Las papas crecen rápido!" },
        hint: "La edad va con «to be»: «I'm … years old».",
        model: "I'm 28 years old.",
      },
      {
        id: "job",
        ask: { en: "What do you do? Do you work or study?", es: "¿A qué te dedicas? ¿Trabajas o estudias?" },
        expect: "job",
        ok: { en: "That's interesting! Thanks for telling me.", es: "¡Qué interesante! Gracias por contarme." },
        back: { en: "I'm an English teacher… and a potato.", es: "Soy profesor de inglés… y papa." },
        hint: "«I'm a…», «I work in…», «I study…».",
        model: "I'm a nurse. I work in a hospital.",
      },
      {
        id: "free-time",
        ask: { en: "What do you like to do in your free time?", es: "¿Qué te gusta hacer en tu tiempo libre?" },
        expect: "likes",
        ok: { en: "That sounds fun! I like dancing champeta.", es: "¡Suena divertido! A mí me gusta bailar champeta." },
        back: { en: "I love dancing champeta!", es: "¡Me encanta bailar champeta!" },
        hint: "«I like…» + verbo con -ing.",
        model: "I like playing football and listening to music.",
      },
      {
        id: "why",
        ask: { en: "Why do you want to learn English?", es: "¿Por qué quieres aprender inglés?" },
        expect: "reason",
        ok: { en: "Great reason! You're going to do it.", es: "¡Gran razón! Lo vas a lograr." },
        hint: "«Because…» o «I want to…».",
        model: "I want to travel and get a better job.",
      },
    ],
    outro: { en: "Thanks for the chat! See you tomorrow.", es: "¡Gracias por la charla! Nos vemos mañana." },
  },
  {
    id: "trabajo",
    title: "Entrevista de trabajo",
    emoji: "💼",
    partner: "Ms. Taylor",
    scene: "Ms. Taylor, de recursos humanos, te entrevista para un puesto en una empresa internacional.",
    category: "trabajo",
    level: 2,
    steps: [
      {
        id: "greeting",
        ask: { en: "Good morning! Thanks for coming. How are you today?", es: "¡Buenos días! Gracias por venir. ¿Cómo estás hoy?" },
        expect: "feeling",
        ok: { en: "Glad to hear that.", es: "Me alegra oírlo." },
        back: { en: "I'm very well, thank you.", es: "Muy bien, gracias." },
        hint: "Responde cómo estás: «I'm fine, thank you» o «I'm a little nervous».",
        model: "I'm fine, thank you. And you?",
      },
      {
        id: "about",
        ask: { en: "Can you tell me a little about yourself?", es: "¿Me puedes contar un poco sobre ti?" },
        expect: ["job", "free"],
        ok: { en: "Thank you, that's helpful.", es: "Gracias, eso es útil." },
        hint: "Di tu nombre, edad y a qué te dedicas, en 2 o 3 frases cortas.",
        model: "I'm Carlos. I'm 30 years old and I'm a sales assistant.",
      },
      {
        id: "experience",
        ask: { en: "How long have you worked in your current job?", es: "¿Cuánto tiempo llevas en tu trabajo actual?" },
        expect: "duration",
        ok: { en: "{value}. That's good experience.", es: "{value}. Es buena experiencia." },
        hint: "Usa «for» con la duración: «I've worked there for three years».",
        model: "I've worked there for three years.",
      },
      {
        id: "strengths",
        ask: { en: "What are your strengths?", es: "¿Cuáles son tus fortalezas?" },
        expect: "free",
        ok: { en: "Those are important skills for this job.", es: "Son habilidades importantes para este trabajo." },
        hint: "«I'm responsible / hard-working / organized», «I'm good at…».",
        model: "I'm responsible and I'm good at working in a team.",
      },
      {
        id: "why",
        ask: { en: "Why do you want to work here?", es: "¿Por qué quieres trabajar aquí?" },
        expect: "reason",
        ok: { en: "I see. That's a good answer.", es: "Ya veo. Es una buena respuesta." },
        hint: "«Because…», «I want to…», «I like your company because…».",
        model: "Because I want to grow and I like your company.",
      },
      {
        id: "questions",
        ask: { en: "Do you have any questions for us?", es: "¿Tienes alguna pregunta para nosotros?" },
        expect: "yesno",
        ok: { en: "Okay!", es: "¡Bien!" },
        yes: { en: "Great, we'll answer all your questions in the next interview.", es: "Genial, responderemos todas tus preguntas en la siguiente entrevista." },
        no: { en: "No problem. We'll call you next week.", es: "No hay problema. Te llamaremos la próxima semana." },
        hint: "Puedes decir «Yes, …» o «No, thank you».",
        model: "No, thank you. Everything is clear.",
      },
    ],
    outro: { en: "Thank you for your time. Have a great day!", es: "Gracias por tu tiempo. ¡Que tengas un buen día!" },
  },
  {
    id: "aeropuerto",
    title: "Migración en el aeropuerto",
    emoji: "🛂",
    partner: "Officer Brown",
    scene: "Llegaste a Estados Unidos. El oficial de migración te hace algunas preguntas.",
    category: "viajes",
    level: 2,
    steps: [
      {
        id: "passport",
        ask: { en: "Good afternoon. May I see your passport, please?", es: "Buenas tardes. ¿Me permite su pasaporte, por favor?" },
        expect: "yesno",
        ok: { en: "Thank you.", es: "Gracias." },
        yes: { en: "Thank you.", es: "Gracias." },
        no: { en: "I need to see your passport to continue.", es: "Necesito ver su pasaporte para continuar." },
        hint: "Al entregar algo se dice «Here you are» o «Sure, here it is».",
        model: "Sure, here you are.",
      },
      {
        id: "purpose",
        ask: { en: "What is the purpose of your visit?", es: "¿Cuál es el propósito de su visita?" },
        expect: "reason",
        ok: { en: "Okay.", es: "Bien." },
        hint: "«I'm here on vacation», «for business», «to visit my family».",
        model: "I'm here on vacation.",
      },
      {
        id: "length",
        ask: { en: "How long are you staying?", es: "¿Cuánto tiempo se va a quedar?" },
        expect: "duration",
        ok: { en: "{value}, okay.", es: "{value}, bien." },
        hint: "«For two weeks», «For ten days».",
        model: "For two weeks.",
      },
      {
        id: "where",
        ask: { en: "Where are you staying?", es: "¿Dónde se va a hospedar?" },
        expect: "place",
        ok: { en: "Alright.", es: "Muy bien." },
        hint: "«At a hotel in…», «At my sister's house in…».",
        model: "At a hotel in Miami.",
      },
      {
        id: "first",
        ask: { en: "Is this your first time in the United States?", es: "¿Es su primera vez en Estados Unidos?" },
        expect: "yesno",
        ok: { en: "Okay.", es: "Bien." },
        yes: { en: "Welcome! Enjoy your first visit.", es: "¡Bienvenido! Disfrute su primera visita." },
        no: { en: "Welcome back!", es: "¡Bienvenido de nuevo!" },
        hint: "«Yes, it is» o «No, it isn't. I was here in 2019».",
        model: "Yes, it is.",
      },
      {
        id: "work",
        ask: { en: "What do you do for work?", es: "¿A qué se dedica?" },
        expect: "job",
        ok: { en: "Thank you.", es: "Gracias." },
        hint: "«I'm a…», «I work in…».",
        model: "I'm an accountant. I work in a bank.",
      },
    ],
    outro: { en: "Everything is in order. Enjoy your stay!", es: "Todo está en orden. ¡Disfrute su estadía!" },
  },
  {
    id: "cafe",
    title: "Conociendo a alguien en un café",
    emoji: "☕",
    partner: "Jake",
    scene: "Estás en un café y Jake, un viajero, se acerca a tu mesa.",
    category: "social",
    level: 1,
    steps: [
      {
        id: "seat",
        ask: { en: "Hi! Is this seat free?", es: "¡Hola! ¿Está libre este puesto?" },
        expect: "yesno",
        ok: { en: "Thanks!", es: "¡Gracias!" },
        yes: { en: "Thanks! I'm Jake, by the way.", es: "¡Gracias! Por cierto, soy Jake." },
        no: { en: "Oh, no problem. Can I stand here for a minute? I'm Jake, by the way.", es: "Ah, no hay problema. ¿Puedo quedarme aquí un minuto? Por cierto, soy Jake." },
        hint: "«Yes, sure!» o «Sorry, it's taken».",
        model: "Yes, sure! Sit down.",
      },
      {
        id: "name",
        ask: { en: "What's your name?", es: "¿Cómo te llamas?" },
        expect: "name",
        ok: { en: "Nice to meet you, {value}!", es: "¡Mucho gusto, {value}!" },
        hint: "«I'm…» o «My name is…».",
        model: "I'm Laura. Nice to meet you!",
      },
      {
        id: "local",
        ask: { en: "Are you from around here?", es: "¿Eres de por aquí?" },
        expect: ["place", "yesno"],
        ok: { en: "Cool! I'm from Canada.", es: "¡Chévere! Yo soy de Canadá." },
        yes: { en: "Cool! I'm from Canada.", es: "¡Chévere! Yo soy de Canadá." },
        no: { en: "Oh, me neither! I'm from Canada.", es: "¡Ah, yo tampoco! Soy de Canadá." },
        back: { en: "I'm from Canada.", es: "Soy de Canadá." },
        hint: "«Yes, I'm from here» o «No, I'm from…».",
        model: "Yes, I live here. I'm from Cartagena.",
      },
      {
        id: "do",
        ask: { en: "So, what do you do?", es: "¿Y a qué te dedicas?" },
        expect: "job",
        ok: { en: "Nice! I'm a photographer.", es: "¡Bacano! Yo soy fotógrafo." },
        back: { en: "I'm a photographer.", es: "Soy fotógrafo." },
        hint: "«I'm a…», «I study…».",
        model: "I'm a student. I study engineering.",
      },
      {
        id: "weekend",
        ask: { en: "What do you usually do on weekends?", es: "¿Qué sueles hacer los fines de semana?" },
        expect: "likes",
        ok: { en: "That sounds great!", es: "¡Suena genial!" },
        back: { en: "I usually go to the beach.", es: "Normalmente voy a la playa." },
        hint: "«I usually…», «I like…».",
        model: "I usually go to the beach with my friends.",
      },
      {
        id: "again",
        ask: { en: "Do you want to get a coffee again sometime?", es: "¿Quieres tomar un café otra vez algún día?" },
        expect: "yesno",
        ok: { en: "Okay!", es: "¡Bien!" },
        yes: { en: "Awesome! Let's do it.", es: "¡Genial! De una." },
        no: { en: "No worries! It was nice talking to you.", es: "¡Sin problema! Fue un gusto hablar contigo." },
        hint: "«Sure, let's do it!» o «Maybe another time».",
        model: "Sure, let's do it!",
      },
    ],
    outro: { en: "It was great to meet you!", es: "¡Fue genial conocerte!" },
  },
  {
    id: "primer-dia",
    title: "Tu primer día de trabajo",
    emoji: "👋",
    partner: "Sarah",
    scene: "Es tu primer día en la oficina. Sarah, una compañera, se acerca a darte la bienvenida.",
    category: "trabajo",
    level: 1,
    steps: [
      {
        id: "welcome",
        ask: { en: "Hi! You must be the new person. How are you feeling?", es: "¡Hola! Tú debes ser la persona nueva. ¿Cómo te sientes?" },
        expect: "feeling",
        ok: { en: "Don't worry, everyone is very friendly here.", es: "No te preocupes, aquí todos son muy amables." },
        back: { en: "I'm good, thanks!", es: "¡Bien, gracias!" },
        hint: "«I'm a little nervous» o «I'm excited».",
        model: "I'm a little nervous, but I'm excited.",
      },
      {
        id: "name",
        ask: { en: "I'm Sarah. What's your name?", es: "Soy Sarah. ¿Cómo te llamas?" },
        expect: "name",
        ok: { en: "Welcome to the team, {value}!", es: "¡Bienvenido al equipo, {value}!" },
        hint: "«I'm…» o «My name is…».",
        model: "I'm Daniel. Nice to meet you.",
      },
      {
        id: "position",
        ask: { en: "What's your position here?", es: "¿Cuál es tu cargo aquí?" },
        expect: "job",
        ok: { en: "Oh, great! We need someone like you.", es: "¡Genial! Necesitamos a alguien como tú." },
        back: { en: "I'm a marketing assistant.", es: "Soy asistente de mercadeo." },
        hint: "«I'm the new…», «I'm a…», «I work in sales».",
        model: "I'm the new sales assistant.",
      },
      {
        id: "before",
        ask: { en: "Where did you work before?", es: "¿Dónde trabajabas antes?" },
        expect: ["place", "job", "free"],
        ok: { en: "Interesting! So you have experience.", es: "¡Interesante! Entonces tienes experiencia." },
        hint: "«I worked at…», «I worked in a bank», «This is my first job».",
        model: "I worked at a bank in Bogotá.",
      },
      {
        id: "lunch",
        ask: { en: "Do you want to have lunch with us today?", es: "¿Quieres almorzar con nosotros hoy?" },
        expect: "yesno",
        ok: { en: "Okay!", es: "¡Bien!" },
        yes: { en: "Great! We usually go at twelve thirty.", es: "¡Genial! Normalmente vamos a las doce y media." },
        no: { en: "No problem, maybe tomorrow!", es: "No hay problema, ¡quizá mañana!" },
        hint: "«Sure, I'd love to!» o «Thanks, maybe tomorrow».",
        model: "Sure, I'd love to!",
      },
    ],
    outro: { en: "If you need anything, just ask me. Have a good first day!", es: "Si necesitas algo, solo pregúntame. ¡Que tengas un buen primer día!" },
  },
  {
    id: "llamada",
    title: "Llamada con un cliente",
    emoji: "📞",
    partner: "Mr. Lee",
    scene: "Suena tu teléfono del trabajo. Es el señor Lee, un cliente de otra empresa.",
    category: "trabajo",
    level: 2,
    steps: [
      {
        id: "hello",
        ask: { en: "Hello, this is David Lee from Global Tech. Do you have a minute?", es: "Hola, habla David Lee de Global Tech. ¿Tiene un minuto?" },
        expect: "yesno",
        ok: { en: "Thank you.", es: "Gracias." },
        yes: { en: "Thank you. It's about the project.", es: "Gracias. Es sobre el proyecto." },
        no: { en: "Okay, I'll be quick. It's about the project.", es: "Bien, seré breve. Es sobre el proyecto." },
        hint: "«Yes, of course. How can I help you?».",
        model: "Yes, of course. How can I help you?",
      },
      {
        id: "email",
        ask: { en: "Did you receive my email yesterday?", es: "¿Recibió mi correo de ayer?" },
        expect: "yesno",
        ok: { en: "Okay.", es: "Bien." },
        yes: { en: "Perfect.", es: "Perfecto." },
        no: { en: "Oh, I'll send it again after this call.", es: "Ah, se lo vuelvo a enviar después de esta llamada." },
        hint: "«Yes, I did» o «No, I didn't. Can you send it again?».",
        model: "Yes, I did. Thank you.",
      },
      {
        id: "report",
        ask: { en: "When can you send me the report?", es: "¿Cuándo me puede enviar el informe?" },
        expect: "time",
        ok: { en: "Perfect, {value} then.", es: "Perfecto, {value} entonces." },
        hint: "Di cuándo: «tomorrow», «on Friday», «by Monday morning».",
        model: "I can send it to you on Friday.",
      },
      {
        id: "meeting",
        ask: { en: "Can we have a meeting next week to talk about the details?", es: "¿Podemos tener una reunión la próxima semana para hablar de los detalles?" },
        expect: "yesno",
        ok: { en: "Okay.", es: "Bien." },
        yes: { en: "Great.", es: "Genial." },
        no: { en: "I understand. Maybe a short call instead.", es: "Entiendo. Quizá mejor una llamada corta." },
        hint: "«Sure, that's a good idea».",
        model: "Sure, that's a good idea.",
      },
      {
        id: "when",
        ask: { en: "What day and time work for you?", es: "¿Qué día y hora le sirven?" },
        expect: "time",
        ok: { en: "{value} works for me. I'll send you an invitation.", es: "{value} me sirve. Le envío una invitación." },
        hint: "Día y hora: «Tuesday at 10 am».",
        model: "Tuesday at 10 am works for me.",
      },
    ],
    outro: { en: "Thank you for your time. Talk to you soon!", es: "Gracias por su tiempo. ¡Hablamos pronto!" },
  },
  {
    id: "jefa",
    title: "Reunión con tu jefa",
    emoji: "📊",
    partner: "Linda",
    scene: "Linda, tu jefa, te pregunta cómo va tu trabajo en la reunión semanal.",
    category: "trabajo",
    level: 2,
    steps: [
      {
        id: "how",
        ask: { en: "How is the project going?", es: "¿Cómo va el proyecto?" },
        expect: ["feeling", "free"],
        ok: { en: "Good to know. Thanks.", es: "Bueno saberlo. Gracias." },
        hint: "«It's going well», «It's okay, but we have some problems».",
        model: "It's going well. We are almost done.",
      },
      {
        id: "finished",
        ask: { en: "Did you finish the sales report?", es: "¿Terminaste el informe de ventas?" },
        expect: "yesno",
        ok: { en: "Okay.", es: "Bien." },
        yes: { en: "Excellent, thank you!", es: "¡Excelente, gracias!" },
        no: { en: "Okay, no problem.", es: "Bien, no hay problema." },
        hint: "«Yes, I finished it yesterday» o «Not yet, I'm still working on it».",
        model: "Not yet. I'm still working on it.",
      },
      {
        id: "deadline",
        ask: { en: "When can you finish it?", es: "¿Cuándo lo puedes terminar?" },
        expect: "time",
        ok: { en: "Okay, {value} is fine.", es: "Bien, {value} está bien." },
        hint: "«By Thursday», «tomorrow afternoon».",
        model: "I can finish it by Thursday.",
      },
      {
        id: "help",
        ask: { en: "Do you need any help?", es: "¿Necesitas ayuda?" },
        expect: ["yesno", "free"],
        ok: { en: "Okay. Tell me if you need anything.", es: "Bien. Dime si necesitas algo." },
        yes: { en: "Sure, Tom can help you this afternoon.", es: "Claro, Tom te puede ayudar esta tarde." },
        no: { en: "Great, I trust you.", es: "Genial, confío en ti." },
        hint: "«Yes, I need help with…» o «No, I'm fine, thanks».",
        model: "Yes, I need help with the graphics.",
      },
      {
        id: "presentation",
        ask: { en: "Can you present the results at the next meeting?", es: "¿Puedes presentar los resultados en la próxima reunión?" },
        expect: "yesno",
        ok: { en: "Okay.", es: "Bien." },
        yes: { en: "Perfect. Prepare five or six slides.", es: "Perfecto. Prepara cinco o seis diapositivas." },
        no: { en: "No problem, I'll ask Tom.", es: "No hay problema, le pregunto a Tom." },
        hint: "«Sure, no problem».",
        model: "Sure, no problem.",
      },
    ],
    outro: { en: "Great meeting. Thank you!", es: "Buena reunión. ¡Gracias!" },
  },
  {
    id: "dia-libre",
    title: "Pedir un día libre",
    emoji: "🗓️",
    partner: "Mark",
    scene: "Necesitas pedirle un día libre a Mark, tu supervisor. Él empieza la conversación.",
    category: "trabajo",
    level: 3,
    steps: [
      {
        id: "talk",
        ask: { en: "Hi! You wanted to talk to me?", es: "¡Hola! ¿Querías hablar conmigo?" },
        expect: "reason",
        ok: { en: "Okay, tell me more.", es: "Bien, cuéntame más." },
        hint: "«Yes, I need a day off», «I want to ask for a day off».",
        model: "Yes, I need to ask for a day off.",
      },
      {
        id: "when",
        ask: { en: "When do you need it?", es: "¿Cuándo lo necesitas?" },
        expect: "time",
        ok: { en: "{value}… let me check the calendar.", es: "{value}… déjame revisar el calendario." },
        hint: "«Next Friday», «on Monday».",
        model: "I need next Friday.",
      },
      {
        id: "okay",
        ask: { en: "Is everything okay?", es: "¿Está todo bien?" },
        expect: ["yesno", "reason", "free"],
        ok: { en: "I understand.", es: "Entiendo." },
        yes: { en: "Good to hear.", es: "Me alegra." },
        no: { en: "I'm sorry to hear that.", es: "Lamento oír eso." },
        hint: "«Yes, I have a doctor's appointment» o «I have a family event».",
        model: "Yes, I have a doctor's appointment.",
      },
      {
        id: "cover",
        ask: { en: "Who can do your work that day?", es: "¿Quién puede hacer tu trabajo ese día?" },
        expect: ["name", "free"],
        ok: { en: "Okay, good plan.", es: "Bien, buen plan." },
        hint: "«Laura can help», «I can finish everything before».",
        model: "Laura can help me that day.",
      },
      {
        id: "email",
        ask: { en: "Okay, no problem. Can you send me an email with the date?", es: "Bien, no hay problema. ¿Me envías un correo con la fecha?" },
        expect: "yesno",
        ok: { en: "Perfect.", es: "Perfecto." },
        yes: { en: "Perfect, thanks.", es: "Perfecto, gracias." },
        no: { en: "Please do, it's important for the records.", es: "Por favor hazlo, es importante para el registro." },
        hint: "«Sure, I'll send it today».",
        model: "Sure, I'll send it today. Thank you!",
      },
    ],
    outro: { en: "You're welcome. Have a nice day off!", es: "De nada. ¡Disfruta tu día libre!" },
  },
];

export const interviewById = new Map(INTERVIEWS.map((i) => [i.id, i]));
