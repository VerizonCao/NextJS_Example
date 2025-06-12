/**
 * Validates that a greeting message follows the required format:
 * - Exactly one pair of quotation marks for dialogue
 * - Exactly one pair of double asterisks for narrative
 * - Only whitespace and newlines allowed outside of these elements
 */
export function validateGreetingFormat(greeting: string): { isValid: boolean; error: string | null } {
  if (!greeting || !greeting.trim()) {
    return { isValid: false, error: "Greeting cannot be empty" };
  }

  const trimmedGreeting = greeting.trim();
  
  // Count quotation marks
  const quoteCount = (trimmedGreeting.match(/"/g) || []).length;
  if (quoteCount !== 2) {
    return { 
      isValid: false, 
      error: `Found ${quoteCount} quotation marks, but exactly 2 are required (one pair for dialogue)` 
    };
  }

  // Count double asterisks
  const doubleAsteriskMatches = trimmedGreeting.match(/\*\*/g) || [];
  if (doubleAsteriskMatches.length !== 2) {
    return { 
      isValid: false, 
      error: `Found ${doubleAsteriskMatches.length} double asterisks, but exactly 2 are required (one pair for narrative)` 
    };
  }

  // Find positions of quotes and double asterisks
  const firstQuoteIndex = trimmedGreeting.indexOf('"');
  const lastQuoteIndex = trimmedGreeting.lastIndexOf('"');
  const firstDoubleAsteriskIndex = trimmedGreeting.indexOf('**');
  const lastDoubleAsteriskIndex = trimmedGreeting.lastIndexOf('**');

  // Check if quotes come before double asterisks (dialogue first, then narrative)
  if (firstQuoteIndex > firstDoubleAsteriskIndex) {
    return { 
      isValid: false, 
      error: "Dialogue (in quotes) must come before narrative (in double asterisks)" 
    };
  }

  // Extract dialogue and narrative content
  const dialogueContent = trimmedGreeting.substring(firstQuoteIndex + 1, lastQuoteIndex);
  const narrativeContent = trimmedGreeting.substring(firstDoubleAsteriskIndex + 2, lastDoubleAsteriskIndex);

  // Check if dialogue content is not empty
  if (!dialogueContent.trim()) {
    return { isValid: false, error: "Dialogue content cannot be empty" };
  }

  // Check if narrative content is not empty
  if (!narrativeContent.trim()) {
    return { isValid: false, error: "Narrative content cannot be empty" };
  }

  // Extract everything outside of quotes and double asterisks
  const beforeDialogue = trimmedGreeting.substring(0, firstQuoteIndex);
  const betweenDialogueAndNarrative = trimmedGreeting.substring(lastQuoteIndex + 1, firstDoubleAsteriskIndex);
  const afterNarrative = trimmedGreeting.substring(lastDoubleAsteriskIndex + 2);

  // Check if there's only whitespace/newlines outside of quotes and double asterisks
  const extraContent = beforeDialogue + betweenDialogueAndNarrative + afterNarrative;
  if (extraContent.trim()) {
    return { 
      isValid: false, 
      error: "Only dialogue (in quotes) and narrative (in double asterisks) are allowed. Remove any extra text." 
    };
  }

  return { isValid: true, error: null };
}

/**
 * Example of correct format for display in placeholders
 */
export const GREETING_FORMAT_EXAMPLE = `"Hello! I'm so excited to meet you."

**She smiled warmly and extended her hand in greeting.**`;

/**
 * Placeholder text explaining the greeting format
 */
export const GREETING_PLACEHOLDER = `This is the first message your character will send to users. Follow this exact format:

Line 1: Dialogue wrapped in quotes "..."
Line 2: Narrative wrapped in double asterisks **...**

Example:
"Hello! I'm so excited to meet you."

**She smiled warmly and extended her hand in greeting.**`; 