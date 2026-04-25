// ==========================================
// MOCK DOM for Node.js environment (MUST BE FIRST)
// ==========================================
if (typeof document === 'undefined') {
  global.document = {
    createElement: () => {
      let _text = '';
      return {
        set textContent(val) {
          _text = val
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        },
        get innerHTML() { return _text; }
      };
    }
  };
}

// ==========================================
// CORE FUNCTIONS (duplicated for test isolation)
// ==========================================

/**
 * Calculates mastery score as a percentage.
 * @param {number} correctAnswers - Number of correct answers
 * @param {number} totalQuestions - Total number of questions
 * @returns {number} Score from 0 to 100
 */
function calculateMasteryScore(correctAnswers, totalQuestions) {
  if (totalQuestions === 0) return 0;
  return Math.round((correctAnswers / totalQuestions) * 100);
}

/**
 * Determines learner level from probe score.
 * @param {number} probeScore - Score from 0-100
 * @returns {'beginner'|'intermediate'|'advanced'}
 */
function determineLevel(probeScore) {
  if (probeScore >= 80) return 'advanced';
  if (probeScore >= 50) return 'intermediate';
  return 'beginner';
}

/**
 * Calculates next spaced repetition review date.
 * @param {Date} lastStudied - Date last studied
 * @param {number} masteryScore - Score 0-100
 * @returns {Date} Next review date
 */
function getNextReviewDate(lastStudied, masteryScore) {
  const date = new Date(lastStudied);
  let daysToAdd = 1;
  if (masteryScore >= 80) daysToAdd = 7;
  else if (masteryScore >= 50) daysToAdd = 3;
  date.setDate(date.getDate() + daysToAdd);
  return date;
}

/**
 * Sanitizes raw text to prevent XSS.
 * @param {string} rawText - Unsanitized user input
 * @returns {string} HTML-escaped string
 */
function sanitizeInput(rawText) {
  const temp = document.createElement('div');
  temp.textContent = rawText;
  return temp.innerHTML;
}

/**
 * Parses Gemini response which may be wrapped in markdown code fences.
 * @param {string} responseText - Raw Gemini API response
 * @returns {Object} Parsed JSON object
 * @throws {Error} If JSON is invalid
 */
function parseGeminiJSON(responseText) {
  try {
    const cleaned = responseText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error('Invalid JSON response from Gemini');
  }
}

/**
 * Calculates XP earned based on correctness and attempt number.
 * @param {boolean} correct - Whether the answer was correct
 * @param {number} attemptNumber - Which attempt (1 = first try)
 * @returns {number} XP earned
 */
function calculateXP(correct, attemptNumber) {
  if (!correct) return 0;
  return attemptNumber === 1 ? 50 : 25;
}

/**
 * Formats a streak count into a display string.
 * @param {number} days - Number of consecutive days
 * @returns {string} Formatted streak string
 */
function formatStreak(days) {
  return `${days} day streak 🔥`;
}

/**
 * Builds the Gemini prompt for an adaptive lesson.
 * @param {string} topic - The subject being learned
 * @param {string} level - Learner level (beginner|intermediate|advanced)
 * @param {string} concept - Specific concept within the topic
 * @param {number} step - Current step number (1-5)
 * @returns {string} Formatted prompt string
 */
function buildLessonPrompt(topic, level, concept, step) {
  if (!topic || !level || !concept || !step) throw new Error('All parameters required');
  return `
You are a world-class adaptive tutor. 
Topic: "${topic}"
Learner level: "${level}" (beginner | intermediate | advanced)
Current concept: "${concept}" (Step ${step} of 5)

Write a clear, engaging lesson on this concept.

Rules:
- Beginner: use simple language, everyday analogies, avoid jargon
- Intermediate: use correct terminology, build on basics, include one analogy
- Advanced: use technical depth, discuss edge cases, compare approaches

Structure your response as:
1. One-sentence concept summary (bold)
2. Core explanation (3-4 paragraphs)
3. Key takeaway (prefixed with "💡 Key insight:")

Do NOT use markdown headers. Use plain paragraphs only.
`.trim();
}

/**
 * Validates that a Gemini API key has the correct format.
 * @param {string} key - API key to validate
 * @returns {boolean} True if key looks valid
 */
function isValidApiKey(key) {
  return typeof key === 'string' && key.startsWith('AIza') && key.length > 20;
}

/**
 * Calculates overall session score combining MCQ and open answer.
 * @param {boolean} mcqCorrect - Whether MCQ was correct
 * @param {number} openScore - Open answer score (0-100)
 * @returns {number} Combined score 0-100
 */
function calculateSessionScore(mcqCorrect, openScore) {
  const mcqPoints = mcqCorrect ? 50 : 0;
  const openPoints = Math.round(openScore * 0.5);
  return mcqPoints + openPoints;
}

// ==========================================
// TEST RUNNER
// ==========================================
let passCount = 0;
let failCount = 0;

function runTest(name, fn) {
  try {
    const result = fn();
    if (result === true) {
      console.log(`✅ PASS: ${name}`);
      passCount++;
    } else {
      console.error(`❌ FAIL: ${name} — got ${JSON.stringify(result)}`);
      failCount++;
    }
  } catch (e) {
    console.error(`❌ FAIL: ${name} — Exception: ${e.message}`);
    failCount++;
  }
}

// ==========================================
// TESTS
// ==========================================

runTest('calculateMasteryScore — correct percentage', () =>
  calculateMasteryScore(8, 10) === 80 &&
  calculateMasteryScore(0, 10) === 0 &&
  calculateMasteryScore(10, 10) === 100
);

runTest('calculateMasteryScore — zero total returns 0 (no divide by zero)', () =>
  calculateMasteryScore(0, 0) === 0
);

runTest('determineLevel — all three levels', () =>
  determineLevel(85) === 'advanced' &&
  determineLevel(60) === 'intermediate' &&
  determineLevel(30) === 'beginner'
);

runTest('determineLevel — boundary values (80 = advanced, 50 = intermediate)', () =>
  determineLevel(80) === 'advanced' &&
  determineLevel(50) === 'intermediate' &&
  determineLevel(49) === 'beginner'
);

runTest('getNextReviewDate — advanced mastery = 7 days', () => {
  const base = new Date('2024-01-01T10:00:00Z');
  const result = getNextReviewDate(base, 80);
  return result.toISOString() === new Date('2024-01-08T10:00:00Z').toISOString();
});

runTest('getNextReviewDate — intermediate mastery = 3 days', () => {
  const base = new Date('2024-01-01T10:00:00Z');
  const result = getNextReviewDate(base, 60);
  return result.toISOString() === new Date('2024-01-04T10:00:00Z').toISOString();
});

runTest('getNextReviewDate — low mastery = 1 day', () => {
  const base = new Date('2024-01-01T10:00:00Z');
  const result = getNextReviewDate(base, 30);
  return result.toISOString() === new Date('2024-01-02T10:00:00Z').toISOString();
});

runTest('sanitizeInput — escapes script tags (XSS prevention)', () =>
  sanitizeInput('<script>alert("XSS")</script>') ===
  '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
);

runTest('sanitizeInput — escapes HTML entities', () =>
  sanitizeInput('<b>Hello & "World"</b>').includes('&lt;b&gt;')
);

runTest('parseGeminiJSON — parses clean JSON', () => {
  const data = parseGeminiJSON('{"key": "value", "num": 42}');
  return data.key === 'value' && data.num === 42;
});

runTest('parseGeminiJSON — strips markdown fences', () => {
  const data = parseGeminiJSON('```json\n{"level": "beginner"}\n```');
  return data.level === 'beginner';
});

runTest('parseGeminiJSON — throws on invalid JSON', () => {
  try {
    parseGeminiJSON('not valid json {{{{');
    return false;
  } catch (e) {
    return e.message === 'Invalid JSON response from Gemini';
  }
});

runTest('calculateXP — 50 for first try correct', () =>
  calculateXP(true, 1) === 50
);

runTest('calculateXP — 25 for retry correct', () =>
  calculateXP(true, 2) === 25
);

runTest('calculateXP — 0 for wrong answer', () =>
  calculateXP(false, 1) === 0 && calculateXP(false, 2) === 0
);

runTest('formatStreak — correct format', () =>
  formatStreak(3) === '3 day streak 🔥' &&
  formatStreak(0) === '0 day streak 🔥'
);

runTest('buildLessonPrompt — contains required fields', () => {
  const prompt = buildLessonPrompt('Math', 'beginner', 'Addition', 1);
  return (
    prompt.includes('Topic: "Math"') &&
    prompt.includes('Learner level: "beginner"') &&
    prompt.includes('Step 1 of 5') &&
    prompt.length > 100
  );
});

runTest('buildLessonPrompt — throws if params missing', () => {
  try {
    buildLessonPrompt('', 'beginner', 'concept', 1);
    return false;
  } catch (e) {
    return e.message === 'All parameters required';
  }
});

runTest('isValidApiKey — accepts valid key format', () =>
  isValidApiKey('AIzaSyABCDEFGHIJKLMNOP12345') === true
);

runTest('isValidApiKey — rejects invalid keys', () =>
  isValidApiKey('') === false &&
  isValidApiKey('badkey') === false &&
  isValidApiKey(null) === false
);

runTest('calculateSessionScore — full MCQ + full open = 100', () =>
  calculateSessionScore(true, 100) === 100
);

runTest('calculateSessionScore — wrong MCQ + full open = 50', () =>
  calculateSessionScore(false, 100) === 50
);

// ==========================================
// SUMMARY
// ==========================================
console.log(`\n${'─'.repeat(40)}`);
console.log(`Tests: ${passCount + failCount} total | ✅ ${passCount} passed | ❌ ${failCount} failed`);
console.log(`${'─'.repeat(40)}`);

if (failCount > 0) process.exit(1);
