
export const REWARDS = {
  MESSAGES: { amount: 90, coins: 1 },
  VOICE_TIME: { amount: 8 * 60 * 60 * 1000, coins: 1 },
  FORUMS: {
    coins: 1,
    allowedForums: (process.env.REWARD_CHANNELS || '').split(',').filter(Boolean)
  }
};

export const MENSAJES_CAOS = {
  RECOMPENSA: [
    "¡La entropía te favorece! Has sido bendecido con",
    "El caos reconoce tu valor. Te otorga",
    "¡Las fuerzas del desorden te premian con",
    "¡La manifestación del caos toma forma de"
  ],
  ERROR: [
    "El vacío ha consumido tu petición...",
    "Las fuerzas del caos rechazan tu intento...",
    "El cosmos se niega a cooperar con tus designios...",
    "La entropía ha devorado tu solicitud..."
  ],
  SALDO: [
    "Las fuerzas del caos te susurran que posees",
    "Tu poder en el vacío se cuantifica en",
    "El cosmos ha contabilizado tu influencia:",
    "Tu dominio sobre el caos se mide en"
  ]
};