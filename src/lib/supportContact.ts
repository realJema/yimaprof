/**
 * WhatsApp support contact shown on the plans page ("Besoin d'aide ?").
 * International format without "+" or spaces, e.g. "2376XXXXXXXX".
 * Leave empty to hide the button until the real number is provided.
 */
export const WHATSAPP_SUPPORT_NUMBER = '';

export const whatsappSupportUrl = (message: string) =>
  `https://wa.me/${WHATSAPP_SUPPORT_NUMBER}?text=${encodeURIComponent(message)}`;
