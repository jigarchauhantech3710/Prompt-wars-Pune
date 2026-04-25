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
// UTILITY FUNCTIONS (copied from index.html)
// ============================================

function calculateMasteryScore(correctAnswers, totalQuestions) {
  if (totalQuestions === 0) return 0;
  return Math.round((correctAnswers / totalQuestions) * 100);
}

function determineLevel(probeScore) {
  if (probeScore >= 80) return 'advanced';
  if (probeScore >= 50) return 'intermediate';
  return 'beginner';
}

function getNextReviewDate(lastStudied, masteryScore) {
  const date = new Date(lastStudied);
  let daysToAdd = 1;
  if (masteryScore >= 80) daysToAdd = 7;
  else if (masteryScore >= 50) daysToAdd = 3;
  
  date.setDate(date.getDate() + daysToAdd);
  return date;
}

function sanitizeInput(rawText) {
  if (!rawText) return '';
  const temp = document.createElement('div');
  temp.textContent = rawText;
  return temp.innerHTML;
}

function parseGeminiJSON(responseText) {
  try {
    const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error("Invalid JSON response from Gemini");
  }
}

function calculateXP(correct, attemptNumber) {
  if (!correct) return 0;
  return attemptNumber === 1 ? 50 : 25;
}

function formatStreak(days) {
  return `${days} day streak 🔥`;
}

function buildLessonPrompt(topic, level, concept, step) {
  return `You are a world-class adaptive tutor.\nTopic: "${topic}"\nLearner level: "${level}" (beginner | intermediate | advanced)\nCurrent concept: "${concept}" (Step ${step} of 5)\n\nWrite a clear, engaging lesson on this concept.\nRules:\n- Beginner: use simple language, everyday analogies, avoid jargon\n- Intermediate: use correct terminology, build on basics, include one analogy\n- Advanced: use technical depth, discuss edge cases, compare approaches\n\nStructure your response as:\n1. One-sentence concept summary (bold)\n2. Core explanation (3-4 paragraphs)\n3. Key takeaway (prefixed with "💡 Key insight:")\nDo NOT use markdown headers. Use plain paragraphs only.`;
}

// ============================================
// TEST RUNNER
// ============================================
let passCount = 0, failCount = 0;
function runTest(name, fn) {
  try {
    if (fn()) {
      console.log(`✅ PASS: ${name}`);
      passCount++;
    } else {
      console.error(`❌ FAIL: ${name}`);
      failCount++;
    }
  } catch (e) {
    console.error(`❌ FAIL: ${name} (Exception: ${e.message})`);
    failCount++;
  }
}

// ============================================
// GROUP 1: calculateMasteryScore (5 tests)
// ============================================
runTest('calculateMasteryScore — 8/10 = 80', () => calculateMasteryScore(8, 10) === 80);
runTest('calculateMasteryScore — perfect 10/10 = 100', () => calculateMasteryScore(10, 10) === 100);
runTest('calculateMasteryScore — 0 correct = 0', () => calculateMasteryScore(0, 10) === 0);
runTest('calculateMasteryScore — 0/0 no crash = 0', () => calculateMasteryScore(0, 0) === 0);
runTest('calculateMasteryScore — rounds correctly 1/3 = 33', () => calculateMasteryScore(1, 3) === 33);

// ============================================
// GROUP 2: determineLevel (5 tests)
// ============================================
runTest('determineLevel — 85 = advanced', () => determineLevel(85) === 'advanced');
runTest('determineLevel — 80 boundary = advanced', () => determineLevel(80) === 'advanced');
runTest('determineLevel — 65 = intermediate', () => determineLevel(65) === 'intermediate');
runTest('determineLevel — 50 boundary = intermediate', () => determineLevel(50) === 'intermediate');
runTest('determineLevel — 30 = beginner', () => determineLevel(30) === 'beginner');

// ============================================
// GROUP 3: getNextReviewDate (4 tests)
// ============================================
runTest('getNextReviewDate — score 80 = +7 days', () => { 
  const d = getNextReviewDate('2023-10-01T10:00:00Z', 80);
  return d.toISOString() === new Date('2023-10-08T10:00:00Z').toISOString();
});
runTest('getNextReviewDate — score 60 = +3 days', () => { 
  const d = getNextReviewDate('2023-10-01T10:00:00Z', 60);
  return d.toISOString() === new Date('2023-10-04T10:00:00Z').toISOString();
});
runTest('getNextReviewDate — score 30 = +1 day', () => { 
  const d = getNextReviewDate('2023-10-01T10:00:00Z', 30);
  return d.toISOString() === new Date('2023-10-02T10:00:00Z').toISOString();
});
runTest('getNextReviewDate — returns Date object', () => { 
  return getNextReviewDate('2023-10-01T10:00:00Z', 50) instanceof Date;
});

// ============================================
// GROUP 4: sanitizeInput (4 tests)
// ============================================
runTest('sanitizeInput — escapes script tags', () => sanitizeInput('<script>alert("XSS")</script>') === '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
runTest('sanitizeInput — escapes quotes and ampersands', () => sanitizeInput('John & Doe "CEO"') === 'John &amp; Doe &quot;CEO&quot;');
runTest('sanitizeInput — empty string safe', () => sanitizeInput('') === '');
runTest('sanitizeInput — plain text unchanged', () => sanitizeInput('hello world') === 'hello world');

// ============================================
// GROUP 5: parseGeminiJSON (4 tests)
// ============================================
runTest('parseGeminiJSON — parses clean json', () => parseGeminiJSON('{"key": "value"}').key === 'value');
runTest('parseGeminiJSON — strips ```json fences', () => parseGeminiJSON('```json\n{"key": "value"}\n```').key === 'value');
runTest('parseGeminiJSON — strips ``` fences', () => parseGeminiJSON('```\n{"key": "value"}\n```').key === 'value');
runTest('parseGeminiJSON — throws correct error message', () => { 
  try { parseGeminiJSON('invalid json'); return false; } 
  catch(e) { return e.message === "Invalid JSON response from Gemini"; }
});

// ============================================
// GROUP 6: calculateXP (3 tests)
// ============================================
runTest('calculateXP — first try correct = 50', () => calculateXP(true, 1) === 50);
runTest('calculateXP — retry correct = 25', () => calculateXP(true, 2) === 25);
runTest('calculateXP — wrong answer = 0', () => calculateXP(false, 1) === 0);

// ============================================
// GROUP 7: formatStreak + buildLessonPrompt (3 tests)
// ============================================
runTest('formatStreak — formats correctly', () => formatStreak(3) === '3 day streak 🔥');
runTest('formatStreak — zero days', () => formatStreak(0) === '0 day streak 🔥');
runTest('buildLessonPrompt — contains all 4 params', () => {
  const p = buildLessonPrompt('Math', 'beginner', 'Addition', 1);
  return p.includes('Math') && p.includes('beginner') && p.includes('Addition') && p.length > 50;
});

// ============================================
// GROUP 8: Integration pipeline tests (3 tests)
// ============================================
runTest('pipeline — mastery + level: 2/3 → intermediate', () => {
  return determineLevel(calculateMasteryScore(2, 3)) === 'intermediate';
});
runTest('pipeline — mastery + level: 3/3 → advanced', () => {
  return determineLevel(calculateMasteryScore(3, 3)) === 'advanced';
});
runTest('pipeline — mastery + level: 0/3 → beginner', () => {
  return determineLevel(calculateMasteryScore(0, 3)) === 'beginner';
});

// ============================================
// SUMMARY
// ============================================
console.log(`\n${'─'.repeat(50)}`);
console.log(`Total: ${passCount + failCount} | ✅ ${passCount} passed | ❌ ${failCount} failed`);
console.log(`${'─'.repeat(50)}`);
if (failCount > 0) process.exit(1);
