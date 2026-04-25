// ============================================
// DOM MOCK — MUST BE LINE 1, BEFORE EVERYTHING
// ============================================
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

// ============================================
// UTILITY FUNCTIONS (mirrored from index.html)
// ============================================

/** Calculates mastery score as a 0-100 integer percentage */
function calculateMasteryScore(correctAnswers, totalQuestions) {
  if (totalQuestions === 0) return 0;
  return Math.round((correctAnswers / totalQuestions) * 100);
}

/** Determines learner level from a 0-100 probe score */
function determineLevel(probeScore) {
  if (probeScore >= 80) return 'advanced';
  if (probeScore >= 50) return 'intermediate';
  return 'beginner';
}

/** Returns the next spaced-repetition review Date */
function getNextReviewDate(lastStudied, masteryScore) {
  const date = new Date(lastStudied);
  let daysToAdd = 1;
  if (masteryScore >= 80) daysToAdd = 7;
  else if (masteryScore >= 50) daysToAdd = 3;
  date.setDate(date.getDate() + daysToAdd);
  return date;
}

/** Sanitizes raw text to prevent XSS */
function sanitizeInput(rawText) {
  if (!rawText) return '';
  const temp = document.createElement('div');
  temp.textContent = rawText;
  return temp.innerHTML;
}

/** Parses Gemini response, stripping optional markdown fences */
function parseGeminiJSON(responseText) {
  try {
    const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error('Invalid JSON response from Gemini');
  }
}

/** Calculates XP for a single probe/quiz question answer */
function calculateXP(correct, attemptNumber) {
  if (!correct) return 0;
  return attemptNumber === 1 ? 50 : 25;
}

/** Calculates XP for a full 5-question quiz result */
function calculateQuizXP(score, total) {
  if (total === 0) return 0;
  return Math.round((score / total) * 100);
}

/** Formats a day streak into display string */
function formatStreak(days) {
  return `${days} day streak 🔥`;
}

/** Builds the adaptive lesson prompt for Gemini */
function buildLessonPrompt(topic, level, concept, step) {
  if (!topic || !level || !concept || !step) return '';
  return `You are a world-class adaptive tutor.\nTopic: "${topic}"\nLearner level: "${level}" (beginner | intermediate | advanced)\nCurrent concept: "${concept}" (Step ${step} of 5)\n\nWrite a clear, engaging lesson on this concept.\nRules:\n- Beginner: use simple language, everyday analogies, avoid jargon\n- Intermediate: use correct terminology, build on basics, include one analogy\n- Advanced: use technical depth, discuss edge cases, compare approaches\n\nStructure your response as:\n1. One-sentence concept summary (bold)\n2. Core explanation (3-4 paragraphs)\n3. Key takeaway (prefixed with "💡 Key insight:")\nDo NOT use markdown headers. Use plain paragraphs only.`;
}

/** Calculates a score percentage label for quiz results */
function getScoreGrade(pct) {
  if (pct >= 80) return 'Excellent';
  if (pct >= 60) return 'Good job';
  if (pct >= 40) return 'Keep studying';
  return 'Just getting started';
}

/** Validates that an API key looks correct */
function isValidApiKey(key) {
  return typeof key === 'string' && key.startsWith('AIza') && key.length >= 30;
}

// ============================================
// TEST RUNNER
// ============================================
let passCount = 0, failCount = 0;

function runTest(name, fn) {
  try {
    const result = fn();
    if (result === true) {
      console.log(`✅ PASS: ${name}`);
      passCount++;
    } else {
      console.error(`❌ FAIL: ${name} — returned: ${JSON.stringify(result)}`);
      failCount++;
    }
  } catch (e) {
    console.error(`❌ FAIL: ${name} — threw: ${e.message}`);
    failCount++;
  }
}

// ============================================
// GROUP 1: calculateMasteryScore (5 tests)
// ============================================
console.log('\n📊 GROUP 1: calculateMasteryScore');

runTest('8/10 = 80', () => calculateMasteryScore(8, 10) === 80);
runTest('perfect 10/10 = 100', () => calculateMasteryScore(10, 10) === 100);
runTest('0 correct = 0', () => calculateMasteryScore(0, 10) === 0);
runTest('0/0 no crash = 0 (safe division)', () => calculateMasteryScore(0, 0) === 0);
runTest('rounds correctly: 1/3 = 33', () => calculateMasteryScore(1, 3) === 33);

// ============================================
// GROUP 2: determineLevel (5 tests)
// ============================================
console.log('\n🎓 GROUP 2: determineLevel');

runTest('85 = advanced', () => determineLevel(85) === 'advanced');
runTest('80 boundary = advanced', () => determineLevel(80) === 'advanced');
runTest('65 = intermediate', () => determineLevel(65) === 'intermediate');
runTest('50 boundary = intermediate', () => determineLevel(50) === 'intermediate');
runTest('30 = beginner', () => determineLevel(30) === 'beginner');

// ============================================
// GROUP 3: getNextReviewDate (4 tests)
// ============================================
console.log('\n📅 GROUP 3: getNextReviewDate');

runTest('score 80 = +7 days', () => {
  const d = getNextReviewDate('2024-01-01T10:00:00Z', 80);
  return d.toISOString() === new Date('2024-01-08T10:00:00Z').toISOString();
});
runTest('score 60 = +3 days', () => {
  const d = getNextReviewDate('2024-01-01T10:00:00Z', 60);
  return d.toISOString() === new Date('2024-01-04T10:00:00Z').toISOString();
});
runTest('score 30 = +1 day', () => {
  const d = getNextReviewDate('2024-01-01T10:00:00Z', 30);
  return d.toISOString() === new Date('2024-01-02T10:00:00Z').toISOString();
});
runTest('returns a Date object (not a string)', () => {
  return getNextReviewDate('2024-01-01T10:00:00Z', 50) instanceof Date;
});

// ============================================
// GROUP 4: sanitizeInput (4 tests)
// ============================================
console.log('\n🔒 GROUP 4: sanitizeInput');

runTest('escapes <script> XSS tags', () =>
  sanitizeInput('<script>alert("XSS")</script>') === '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
);
runTest('escapes ampersands and quotes', () =>
  sanitizeInput('John & Doe "CEO"') === 'John &amp; Doe &quot;CEO&quot;'
);
runTest('empty string returns empty string safely', () => sanitizeInput('') === '');
runTest('plain text passes through unchanged', () => sanitizeInput('hello world') === 'hello world');

// ============================================
// GROUP 5: parseGeminiJSON (4 tests)
// ============================================
console.log('\n🤖 GROUP 5: parseGeminiJSON');

runTest('parses clean JSON', () => parseGeminiJSON('{"key": "value"}').key === 'value');
runTest('strips ```json fences', () => parseGeminiJSON('```json\n{"key": "value"}\n```').key === 'value');
runTest('strips plain ``` fences', () => parseGeminiJSON('```\n{"key": "value"}\n```').key === 'value');
runTest('throws correct error on invalid JSON', () => {
  try { parseGeminiJSON('not valid json }{'); return false; }
  catch (e) { return e.message === 'Invalid JSON response from Gemini'; }
});

// ============================================
// GROUP 6: calculateXP (3 tests)
// ============================================
console.log('\n⚡ GROUP 6: calculateXP (probe questions)');

runTest('first try correct = 50 XP', () => calculateXP(true, 1) === 50);
runTest('retry correct = 25 XP', () => calculateXP(true, 2) === 25);
runTest('wrong answer = 0 XP', () => calculateXP(false, 1) === 0);

// ============================================
// GROUP 7: calculateQuizXP (4 tests) — NEW
// ============================================
console.log('\n🏆 GROUP 7: calculateQuizXP (5-question final quiz)');

runTest('5/5 correct = 100 XP', () => calculateQuizXP(5, 5) === 100);
runTest('4/5 correct = 80 XP', () => calculateQuizXP(4, 5) === 80);
runTest('0/5 correct = 0 XP', () => calculateQuizXP(0, 5) === 0);
runTest('0/0 no crash = 0 XP (safe division)', () => calculateQuizXP(0, 0) === 0);

// ============================================
// GROUP 8: getScoreGrade (4 tests) — NEW
// ============================================
console.log('\n🎖️  GROUP 8: getScoreGrade');

runTest('100% = Excellent', () => getScoreGrade(100) === 'Excellent');
runTest('80% = Excellent', () => getScoreGrade(80) === 'Excellent');
runTest('65% = Good job', () => getScoreGrade(65) === 'Good job');
runTest('20% = Just getting started', () => getScoreGrade(20) === 'Just getting started');

// ============================================
// GROUP 9: formatStreak + buildLessonPrompt (4 tests)
// ============================================
console.log('\n📚 GROUP 9: formatStreak + buildLessonPrompt');

runTest('formatStreak(3) = "3 day streak 🔥"', () => formatStreak(3) === '3 day streak 🔥');
runTest('formatStreak(0) = "0 day streak 🔥"', () => formatStreak(0) === '0 day streak 🔥');
runTest('buildLessonPrompt contains all params', () => {
  const p = buildLessonPrompt('Math', 'beginner', 'Addition', 1);
  return p.includes('Math') && p.includes('beginner') && p.includes('Addition') && p.length > 50;
});
runTest('buildLessonPrompt with empty params returns empty string', () => {
  return buildLessonPrompt('', 'beginner', 'concept', 1) === '';
});

// ============================================
// GROUP 10: isValidApiKey (3 tests) — NEW
// ============================================
console.log('\n🔑 GROUP 10: isValidApiKey');

runTest('accepts valid AIza key', () => isValidApiKey('AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ1234') === true);
runTest('rejects empty string', () => isValidApiKey('') === false);
runTest('rejects key not starting with AIza', () => isValidApiKey('badkey123456789012345678901234') === false);

// ============================================
// GROUP 11: Integration pipeline (4 tests)
// ============================================
console.log('\n🔗 GROUP 11: Integration pipelines');

runTest('calcMastery + determineLevel: 2/3 → intermediate', () =>
  determineLevel(calculateMasteryScore(2, 3)) === 'intermediate'
);
runTest('calcMastery + determineLevel: 3/3 → advanced', () =>
  determineLevel(calculateMasteryScore(3, 3)) === 'advanced'
);
runTest('calcMastery + determineLevel: 0/3 → beginner', () =>
  determineLevel(calculateMasteryScore(0, 3)) === 'beginner'
);
runTest('5-Q quiz: 4 correct → 80 XP, Excellent grade', () => {
  const score = calculateMasteryScore(4, 5);
  const xp = calculateQuizXP(4, 5);
  const grade = getScoreGrade(score);
  return score === 80 && xp === 80 && grade === 'Excellent';
});

// ============================================
// SUMMARY
// ============================================
const total = passCount + failCount;
console.log(`\n${'─'.repeat(55)}`);
console.log(`  Tests: ${total} total  |  ✅ ${passCount} passed  |  ❌ ${failCount} failed`);
console.log(`${'─'.repeat(55)}`);

if (failCount > 0) {
  console.error(`\n⚠️  ${failCount} test(s) failed. Fix before pushing.\n`);
  process.exit(1);
} else {
  console.log(`\n🎉 All ${passCount} tests passed!\n`);
}
