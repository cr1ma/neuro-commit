const OpenAI = require("openai");
const { getApiKey, loadConfig } = require("./config");
const { isLockFile, statusLabel } = require("./git");

// Pricing per 1M tokens — gpt-5-nano
const MODEL_PRICING = {
  input: 0.05,
  cachedInput: 0.005,
  output: 0.4,
};

/**
 * Build a file summary string for the prompt.
 */
function buildFilesInfo(stagedFiles, numstat) {
  const statMap = new Map();
  for (const entry of numstat) {
    statMap.set(entry.file, entry);
  }

  const lines = [];
  for (const { status, file } of stagedFiles) {
    const label = statusLabel(status).padEnd(10);
    const s = statMap.get(file);
    if (isLockFile(file)) {
      lines.push(`  ${label} ${file} | lock file (diff omitted)`);
    } else {
      const stat = s ? `| +${s.added} -${s.deleted}` : "";
      lines.push(`  ${label} ${file} ${stat}`);
    }
  }
  return lines.join("\n");
}

/**
 * Build system prompt. Always uses Conventional Commits.
 */
function buildSystemPrompt(config, context = {}) {
  const { language, maxLength } = config;

  let langInstruction = "";
  if (language && language !== "en") {
    langInstruction = `\nWrite the commit message body in ${language} language. Keep the type prefix in English.`;
  }

  let branchContext = "";
  if (context.branch) {
    branchContext = `\nCurrent branch: ${context.branch}`;
  }

  let historyContext = "";
  if (context.recentCommits && context.recentCommits.length > 0) {
    historyContext = `\nRecent commits for style reference:\n${context.recentCommits.map((c) => `  - ${c}`).join("\n")}`;
  }

  return `You are an expert at writing clear, concise git commit messages.

Rules:
1. Use Conventional Commits: feat:, fix:, docs:, style:, refactor:, test:, chore:, perf:, ci:, build:
2. If changes affect a specific scope, use parentheses: feat(auth): ...
3. Title max ${maxLength} chars, imperative mood, no period at end.
4. Blank line between title and body.
5. Body uses bullet points (- ) for key changes.
6. Be specific — WHAT changed and WHY.
7. Omit file paths unless essential. Omit lock file changes.
8. Return ONLY the commit message. No markdown fences, no quotes.
${langInstruction}
${branchContext}
${historyContext}`.trim();
}

/**
 * Build user prompt with the diff content.
 */
function buildUserPrompt(filesInfo, diff) {
  return `Staged changes:

Files:
${filesInfo}

Diff:
\`\`\`diff
${diff}
\`\`\`

Generate a commit message.`;
}

/**
 * Calculate cost from real API usage data.
 */
function calculateCost(usage) {
  const inputTokens = usage.input_tokens || 0;
  const cachedTokens = usage.input_tokens_details?.cached_tokens || 0;
  const uncachedInput = inputTokens - cachedTokens;
  const outputTokens = usage.output_tokens || 0;
  const reasoningTokens = usage.output_tokens_details?.reasoning_tokens || 0;
  const totalTokens = usage.total_tokens || 0;

  const cost =
    (uncachedInput / 1_000_000) * MODEL_PRICING.input +
    (cachedTokens / 1_000_000) * MODEL_PRICING.cachedInput +
    (outputTokens / 1_000_000) * MODEL_PRICING.output;

  return {
    cost,
    inputTokens,
    cachedTokens,
    uncachedInput,
    outputTokens,
    reasoningTokens,
    totalTokens,
  };
}

/**
 * Rough cost estimate before making a request.
 */
function estimateCost(estimatedInputTokens, estimatedOutputTokens = 200) {
  return (
    (estimatedInputTokens / 1_000_000) * MODEL_PRICING.input +
    (estimatedOutputTokens / 1_000_000) * MODEL_PRICING.output
  );
}

/**
 * Generate a commit message via OpenAI Responses API (non-streaming).
 * Returns { message, usage }.
 */
async function generateCommitMessage(
  diff,
  filesInfo,
  context = {},
  extraInstruction = "",
) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not set.");
  }

  const config = loadConfig();
  const client = new OpenAI({ apiKey });

  const systemPrompt = buildSystemPrompt(config, context) + extraInstruction;
  const userPrompt = buildUserPrompt(filesInfo, diff);

  const params = {
    model: config.model,
    instructions: systemPrompt,
    input: userPrompt,
    reasoning: { effort: "low" },
    text: { verbosity: "low" },
  };

  if (config.devMode) {
    params.store = true;
  }

  const response = await client.responses.create(params);

  return {
    message: response.output_text,
    usage: response.usage || null,
  };
}

module.exports = {
  buildFilesInfo,
  buildSystemPrompt,
  buildUserPrompt,
  generateCommitMessage,
  calculateCost,
  estimateCost,
  MODEL_PRICING,
};
