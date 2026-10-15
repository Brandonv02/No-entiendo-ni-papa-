import type { ConvNode, ConvOption, ConvQuality, Conversation } from "@/lib/types";

type O = [en: string, es: string, quality: ConvQuality, next: string, why: string, extra?: { better?: string; kind?: ConvOption["kind"] }];

const opt = ([en, es, quality, next, why, extra]: O): ConvOption => ({ en, es, quality, next, why, ...(extra?.better ? { better: extra.better } : {}), ...(extra?.kind ? { kind: extra.kind } : {}) });
const node = (en: string, es: string, options?: O[]): ConvNode => ({ npc: { en, es }, ...(options ? { options: options.map(opt) } : {}) });
const end = (en: string, es: string, summary: string): ConvNode => ({ npc: { en, es }, end: summary });

export const CONVERSATIONS: Conversation[] = [
  {
    id: "cartagena",
    title: "Un turista en Cartagena",
    emoji: "🏰",
    category: "viajes",
    npcName: "Emma",
    scene: "Estás en una plaza de Cartagena. Emma, una turista, se te acerca.",
    start: "n0",
    nodes: {
      n0: node("Hey! I'm visiting Cartagena for the first time. Any recommendations?", "¡Hola! Visito Cartagena por primera vez. ¿Alguna recomendación?", [
        ["You should walk around the Walled City at sunset. It's beautiful!", "Deberías caminar por la Ciudad Amurallada al atardecer. ¡Es hermoso!", "great", "walled", "Das una recomendación concreta con «You should…» y una razón."],
        ["What do you like to do? Beaches, history, food?", "¿Qué te gusta hacer? ¿Playas, historia, comida?", "great", "likes", "Preguntar primero qué le gusta es natural y hace tu consejo más útil.", { kind: "question" }],
        ["Cartagena is good.", "Cartagena es buena.", "weak", "vague", "Es correcto, pero no ayuda: falta un lugar o una razón.", { better: "Try the Walled City. It's beautiful!" }],
        ["Sorry, could you say that again, please?", "Perdón, ¿puedes repetir, por favor?", "ok", "repeat", "Pedir que repitan es mejor que fingir que entendiste.", { kind: "repeat" }],
      ]),
      repeat: node("Sure! Slowly: I'm new in Cartagena. Do you know any good places to visit?", "¡Claro! Despacio: soy nueva en Cartagena. ¿Conoces buenos lugares para visitar?", [
        ["Yes! Visit the Walled City. It's my favorite place.", "¡Sí! Visita la Ciudad Amurallada. Es mi lugar favorito.", "great", "walled", "Respuesta clara y personal."],
        ["Yes, many places.", "Sí, muchos lugares.", "weak", "vague", "Es muy vago: no nombras ninguno.", { better: "Yes! The Walled City is amazing." }],
      ]),
      vague: node("Okay... but where should I go exactly?", "Vale… pero ¿a dónde debería ir exactamente?", [
        ["Try the Walled City and the Getsemaní neighborhood.", "Prueba la Ciudad Amurallada y el barrio Getsemaní.", "great", "walled", "Ahora das nombres concretos."],
        ["Everywhere is nice.", "Todo es bonito.", "weak", "ending_ok", "Suena amable, pero no resuelve su pregunta.", { better: "Try the Walled City first." }],
      ]),
      likes: node("I love history and good food!", "¡Me encantan la historia y la buena comida!", [
        ["Then you'll love the Walled City and the local restaurants!", "¡Entonces te encantarán la Ciudad Amurallada y los restaurantes locales!", "great", "ending_good", "Conectas su gusto con tu recomendación."],
        ["Food is good here.", "La comida es buena aquí.", "ok", "ending_ok", "Se entiende, pero suena corto.", { better: "Then try the local restaurants. The food is great!" }],
      ]),
      walled: node("That sounds amazing! How do I get there from my hotel?", "¡Suena increíble! ¿Cómo llego desde mi hotel?", [
        ["Take a taxi. It's about ten minutes.", "Toma un taxi. Son unos diez minutos.", "great", "ending_good", "Instrucción clara con «Take…»."],
        ["Where are you staying?", "¿Dónde te hospedas?", "great", "ending_good", "Preguntar el punto de partida es lo más útil.", { kind: "question" }],
        ["You go in the taxi.", "Tú vas en el taxi.", "ok", "ending_ok", "Se entiende, pero suena raro.", { better: "Take a taxi." }],
      ]),
      ending_good: end("Thank you so much! You're so helpful!", "¡Muchas gracias! ¡Eres muy amable!", "¡Excelente! Diste recomendaciones concretas y naturales."),
      ending_ok: end("Okay, thanks! I'll figure it out.", "Vale, ¡gracias! Ya veré cómo.", "Te entendió, pero tus respuestas fueron cortas. Practica añadir un lugar y una razón."),
    },
  },
  {
    id: "restaurante",
    title: "En el restaurante",
    emoji: "🍲",
    category: "comida",
    npcName: "Mesero",
    scene: "Estás en un restaurante de la costa. El mesero llega a tu mesa.",
    start: "n0",
    nodes: {
      n0: node("Good evening! Are you ready to order?", "¡Buenas noches! ¿Están listos para pedir?", [
        ["Yes, I'll have the grilled fish, please.", "Sí, voy a pedir el pescado a la parrilla, por favor.", "great", "drink", "«I'll have…» es la forma natural de pedir."],
        ["Could you tell me what's in the sancocho?", "¿Me puede decir qué lleva el sancocho?", "great", "explain", "Preguntar con «Could you…» es cortés y útil.", { kind: "question" }],
        ["I want fish.", "Quiero pescado.", "ok", "drink", "Se entiende, pero suena seco.", { better: "I'll have the fish, please." }],
        ["Sorry, could you speak more slowly?", "Perdón, ¿puede hablar más despacio?", "ok", "repeat", "Pedir que hablen despacio siempre está bien.", { kind: "repeat" }],
      ]),
      repeat: node("Of course! Are... you... ready... to order?", "¡Claro! ¿Están… listos… para pedir?", [
        ["Yes, I'll have the chicken, please.", "Sí, voy a pedir el pollo, por favor.", "great", "drink", "Pedido claro y cortés."],
        ["Chicken.", "Pollo.", "weak", "drink", "Una sola palabra suena brusco.", { better: "I'll have the chicken, please." }],
      ]),
      explain: node("It's a traditional soup with chicken, potato and yuca.", "Es una sopa tradicional con pollo, papa y yuca.", [
        ["That sounds great. I'll have it, please.", "Suena genial. La pido, por favor.", "great", "drink", "Reaccionas y pides en una sola frase."],
        ["I no eat chicken.", "Yo no como pollo.", "weak", "drink", "Falta el auxiliar: en inglés se dice «I don't eat chicken».", { better: "I don't eat chicken, sorry." }],
      ]),
      drink: node("Great choice! Anything to drink?", "¡Buena elección! ¿Algo de tomar?", [
        ["A lemonade, please.", "Una limonada, por favor.", "great", "ending_good", "Corto, claro y cortés."],
        ["Can I have a fresh juice, please?", "¿Me puede dar un jugo natural, por favor?", "great", "ending_good", "«Can I have…?» es muy común."],
        ["Water.", "Agua.", "weak", "ending_ok", "Es correcto pero seco.", { better: "Just water, please." }],
      ]),
      ending_good: end("Perfect! I'll be right back with your drinks.", "¡Perfecto! Enseguida vuelvo con sus bebidas.", "¡Pediste con cortesía y claridad!"),
      ending_ok: end("Okay. Coming right up.", "Bien. Enseguida.", "El mesero te entendió, pero faltó cortesía. Recuerda «please» y «I'll have…»."),
    },
  },
  {
    id: "tienda",
    title: "De compras en el centro",
    emoji: "🛍️",
    category: "compras",
    npcName: "Vendedora",
    scene: "Entras a una tienda de ropa. La vendedora te saluda.",
    start: "n0",
    nodes: {
      n0: node("Hi! Can I help you?", "¡Hola! ¿Le puedo ayudar?", [
        ["I'm looking for a shirt, please.", "Busco una camisa, por favor.", "great", "price", "Dices claro lo que buscas."],
        ["Just looking, thanks.", "Solo estoy mirando, gracias.", "ok", "price", "Perfecta para curiosear sin compromiso."],
        ["I buy a shirt.", "Yo compro una camisa.", "weak", "price", "Suena a que ya la compras todos los días; mejor «I'm looking for…».", { better: "I'm looking for a shirt." }],
      ]),
      price: node("This one is 80,000 pesos.", "Esta cuesta 80.000 pesos.", [
        ["Is there any discount?", "¿Hay algún descuento?", "great", "discount", "Pregunta natural para regatear con cortesía."],
        ["That's way too expensive.", "Es demasiado caro.", "ok", "discount", "Es directo; funciona, pero suena duro. Mejor pedir el descuento.", { better: "Is there any discount?" }],
        ["Sorry, how much?", "Perdón, ¿cuánto?", "ok", "price", "Pedir que repitan está bien.", { kind: "repeat" }],
      ]),
      discount: node("I can do 70,000 if you take two.", "Puedo dejarla en 70.000 si lleva dos.", [
        ["Great, I'll take two.", "Perfecto, me llevo dos.", "great", "ending_good", "Cierras el trato con «I'll take…»."],
        ["I'll think about it.", "Lo voy a pensar.", "ok", "ending_ok", "Es una salida cortés."],
      ]),
      ending_good: end("Wonderful! Let me wrap them up for you.", "¡Maravilloso! Se las envuelvo.", "¡Negociaste y cerraste la compra con naturalidad!"),
      ending_ok: end("Sure. Come back anytime!", "Claro. ¡Vuelva cuando quiera!", "Saliste con cortesía. La próxima vez puedes cerrar con «I'll take it»."),
    },
  },
  {
    id: "amigo",
    title: "Encuentro con un amigo",
    emoji: "🤙",
    category: "amigos",
    npcName: "Alex",
    scene: "Te encuentras en la calle con Alex, un amigo que no ves hace meses.",
    start: "n0",
    nodes: {
      n0: node("Hey! What's up? Long time no see!", "¡Ey! ¿Qué más? ¡Cuánto tiempo!", [
        ["Hey! Not much, you? It's been ages!", "¡Ey! Nada especial, ¿y tú? ¡Hace siglos!", "great", "plan", "Respondes natural y devuelves la pregunta."],
        ["I am fine and you?", "Estoy bien, ¿y tú?", "ok", "plan", "Correcta, pero un poco de libro.", { better: "I'm good, you?" }],
        ["Sorry, what did you say?", "Perdón, ¿qué dijiste?", "ok", "repeat", "Pedir repetir está bien.", { kind: "repeat" }],
      ]),
      repeat: node("I said, how are you? It's been a long time!", "Dije, ¿cómo estás? ¡Ha pasado mucho tiempo!", [
        ["Oh, I'm good! It's been ages.", "¡Ah, bien! Han pasado siglos.", "great", "plan", "Natural y cercana."],
      ]),
      plan: node("Want to grab a coffee and catch up?", "¿Tomamos un café y nos ponemos al día?", [
        ["Sure! Let's do it!", "¡Claro! ¡De una!", "great", "ending_good", "«Let's do it!» es el «de una» en inglés."],
        ["I don't feel like it today, sorry.", "Hoy me da pereza, perdón.", "ok", "ending_ok", "Rechazas con honestidad y cortesía."],
        ["I have laziness today.", "Hoy tengo pereza.", "weak", "ending_ok", "«Have laziness» no se dice.", { better: "I don't feel like it today." }],
      ]),
      ending_good: end("Awesome! I know a great place nearby.", "¡Genial! Conozco un buen lugar cerca.", "¡Plan aceptado con ganas y sin dudar!"),
      ending_ok: end("No worries! Let's do it another day.", "¡Sin problema! Lo hacemos otro día.", "Rechazaste con cortesía. Bien hecho."),
    },
  },
  {
    id: "hotel",
    title: "Llegada al hotel",
    emoji: "🏨",
    category: "viajes",
    npcName: "Recepcionista",
    scene: "Llegas al hotel después de un viaje largo.",
    start: "n0",
    nodes: {
      n0: node("Welcome! Do you have a reservation?", "¡Bienvenido! ¿Tiene una reserva?", [
        ["Yes, I have a reservation under Ana Gómez.", "Sí, tengo una reserva a nombre de Ana Gómez.", "great", "nights", "Das tu nombre: es lo que necesita."],
        ["Yes, I have a reserve.", "Sí, tengo una reserve.", "weak", "nights", "«Reserve» no es «reserva» de hotel (falso amigo).", { better: "Yes, I have a reservation." }],
        ["Sorry, could you repeat that?", "Perdón, ¿puede repetir?", "ok", "repeat", "Pedir repetir está bien.", { kind: "repeat" }],
      ]),
      repeat: node("Of course. Do you have a reservation with us?", "Claro. ¿Tiene una reserva con nosotros?", [
        ["Yes, under Ana Gómez, please.", "Sí, a nombre de Ana Gómez, por favor.", "great", "nights", "Respuesta breve y clara."],
      ]),
      nights: node("Perfect. How many nights are you staying?", "Perfecto. ¿Cuántas noches se hospeda?", [
        ["Three nights, please.", "Tres noches, por favor.", "great", "ending_good", "Respuesta clara y cortés."],
        ["I stay three nights.", "Yo me quedo tres noches.", "ok", "ending_ok", "Se entiende; más natural «I'm staying for three nights».", { better: "I'm staying for three nights." }],
      ]),
      ending_good: end("Here is your key. Enjoy your stay!", "Aquí está su llave. ¡Disfrute su estadía!", "¡Check-in impecable!"),
      ending_ok: end("Here is your key. Enjoy!", "Aquí está su llave. ¡Disfrute!", "Check-in completo. Practica «I'm staying for…»."),
    },
  },
];

export const conversationById = new Map(CONVERSATIONS.map((c) => [c.id, c]));

export const QUALITY_SCORE: Record<ConvQuality, number> = { great: 1, ok: 0.6, weak: 0.2 };
