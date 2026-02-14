const OpenAI = require("openai");
const { z } = require("zod");
const { zodTextFormat } = require("openai/helpers/zod");
const { get_encoding } = require("tiktoken");
const { getApiKey, loadConfig } = require("./config");
const { isLockFile, statusLabel } = require("./git");

// Lazy-initialized tiktoken encoder (o200k_base for GPT-5 / GPT-4o family)
let _encoder = null;

/**
 * Count tokens accurately using tiktoken (o200k_base).
 */
function countTokens(text) {
  if (!_encoder) _encoder = get_encoding("o200k_base");
  return _encoder.encode(text).length;
}

// Pricing per 1M tokens — gpt-5-nano
const MODEL_PRICING = {
  input: 0.05,
  cachedInput: 0.005,
  output: 0.4,
};

// Structured output schema
const CommitMessage = z.object({
  title: z
    .string()
    .describe("Commit title line (max ~72 chars, imperative mood, no period)"),
  body: z
    .array(z.string())
    .describe("Bullet points describing key changes (without leading dash)"),
});

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
4. Body: concise bullet points for key changes.
5. Be specific — WHAT changed and WHY.
6. Omit file paths unless essential. Omit lock file changes.
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
 * Format structured response into conventional commit message string.
 */
function formatCommitMessage(parsed) {
  const lines = [parsed.title];
  if (parsed.body && parsed.body.length > 0) {
    lines.push("");
    for (const point of parsed.body) {
      lines.push(`- ${point}`);
    }
  }
  return lines.join("\n");
}

/**
 * Extract parsed content from Structured Outputs response.
 * Handles refusals gracefully.
 */
function extractParsedContent(response) {
  for (const output of response.output) {
    if (output.type !== "message") continue;
    for (const item of output.content) {
      if (item.type === "refusal") {
        throw new Error(`Model refused: ${item.refusal}`);
      }
      if (item.parsed) {
        return item.parsed;
      }
    }
  }
  throw new Error("Could not parse structured response.");
}

/**
 * Generate a commit message via OpenAI Responses API with Structured Outputs.
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
    text: {
      format: zodTextFormat(CommitMessage, "commit_message"),
    },
  };

  if (config.devMode) {
    params.store = true;
  }

  const response = await client.responses.parse(params);
  const parsed = extractParsedContent(response);

  return {
    message: formatCommitMessage(parsed),
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
  countTokens,
  MODEL_PRICING,
};
