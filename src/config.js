const fs = require("fs");
const path = require("path");
const os = require("os");

const CONFIG_DIR = path.join(os.homedir(), ".neurocommit");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

const DEFAULT_CONFIG = {
  model: "gpt-5-nano",
  language: "en",
  maxLength: 72,
  autoCommit: false,
  autoPush: false,
  commitHistory: 5,
  devMode: false,
};

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function loadConfig() {
  ensureConfigDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    saveConfig(DEFAULT_CONFIG);
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    const saved = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...saved };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(config) {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

function updateConfig(key, value) {
  const config = loadConfig();
  config[key] = value;
  saveConfig(config);
  return config;
}

function getApiKey() {
  return process.env.OPENAI_API_KEY || null;
}

function isAiAvailable() {
  return !!getApiKey();
}

module.exports = {
  CONFIG_DIR,
  CONFIG_FILE,
  DEFAULT_CONFIG,
  loadConfig,
  saveConfig,
  updateConfig,
  getApiKey,
  isAiAvailable,
};
