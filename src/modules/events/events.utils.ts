import { randomInt } from "node:crypto";

const TICKET_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const maskEmail = (email: string): string => {
  const [localPart = "", domain = ""] = email.split("@");
  const localVisible = localPart.slice(0, 2);
  return `${localVisible}***@${domain}`;
};

export const generateTicketCode = (): string => {
  let code = "TCK-";

  for (let i = 0; i < 8; i += 1) {
    code += TICKET_ALPHABET[randomInt(0, TICKET_ALPHABET.length)];
  }

  return code;
};
