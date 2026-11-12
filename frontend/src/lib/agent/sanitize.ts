import { Candidate } from "@/contracts/product";

/**
 * Common prompt injection patterns and delimiters found in malicious e-commerce listings
 */
const INJECTION_PATTERNS = [
  /system\s*override/i,
  /ignore\s+(?:all\s+|your\s+|the\s+|any\s+|previous\s+)*(?:instructions|rules|limits|mandates|constraints|budget)/i,
  /disregard\s+(?:all\s+|your\s+|the\s+|any\s+|previous\s+)*(?:instructions|rules|limits|mandates|constraints)/i,
  /forget\s+(?:all\s+|your\s+|the\s+|any\s+|previous\s+)*(?:instructions|rules|limits|budget|constraints)/i,
  /bypass\s+(?:the\s+)?(?:policy|mandate|guardrails|limit|approval)/i,
  /set\s+(?:the\s+)?(?:approval|verdict)\s+to\s+(?:allow|approved)/i,
  /execute\s+(?:payment\s+)?capture/i,
  /charge\s+\$?\d+/i,
  /<\|(?:im_start|im_end|system|user|assistant)\|>/i,
  /\[\/?(?:inst|system|instructions)\]/i,
];

/**
 * Detects whether untrusted product text contains known prompt injection attempts
 */
export function detectPotentialInjection(text: string): boolean {
  if (!text) return false;
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Strips dangerous control tokens, characters, and system overrides from untrusted strings
 */
export function sanitizeText(text: string): string {
  if (!text) return "";

  const cleaned = text
    // Strip control tokens
    .replace(/<\|.*?\|>/g, "")
    .replace(/\[\/?(?:inst|system|instructions)\]/gi, "")
    // Neutralize backticks and delimiter exploits
    .replace(/```/g, "'''")
    // Replace system override phrases with safe warnings
    .replace(/system\s*override/gi, "[REDACTED_COMMAND]")
    .replace(/ignore\s+(all\s+)?(?:previous\s+)?instructions/gi, "[REDACTED_PROMPT_DIRECTIVE]")
    .trim();

  return cleaned;
}

/**
 * Sanitizes all untrusted textual fields of a product Candidate
 */
export function sanitizeCandidate(candidate: Candidate): Candidate {
  const hasInjection =
    detectPotentialInjection(candidate.title) ||
    detectPotentialInjection(candidate.description);

  return {
    ...candidate,
    title: sanitizeText(candidate.title),
    description: sanitizeText(candidate.description),
    explanation: hasInjection
      ? `(Notice: Untrusted input sanitized. Potentially malicious instruction ignored.)`
      : candidate.explanation,
  };
}

/**
 * Wraps product data safely inside strict XML-like data tags so the LLM
 * treats them strictly as data, NEVER as prompt instructions.
 */
export function formatUntrustedProductData(candidate: Candidate): string {
  const safe = sanitizeCandidate(candidate);
  return `<untrusted_product_item>
  <id>${safe.id}</id>
  <title>${safe.title}</title>
  <description>${safe.description}</description>
  <price USD>${safe.price}</price>
  <merchant>${safe.merchant}</merchant>
  <category>${safe.category}</category>
</untrusted_product_item>`;
}
