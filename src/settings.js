const { loadConfig, updateConfig } = require("./config");
const { RESET, BOLD, DIM, GREEN, showSelectMenu } = require("./ui");

const LANGUAGES = [
  { label: "English", value: "en" },
  { label: "Ukrainian", value: "uk" },
  { label: "Russian", value: "ru" },
  { label: "German", value: "de" },
  { label: "French", value: "fr" },
  { label: "Spanish", value: "es" },
];

async function runSettingsMenu() {
  let config = loadConfig();

  while (true) {
    console.clear();
    console.log(`\n${BOLD}Settings${RESET}\n`);

    const langLabel =
      LANGUAGES.find((l) => l.value === config.language)?.label ||
      config.language;
    const histLabel =
      config.commitHistory === 0 ? "Off" : `${config.commitHistory}`;

    const choice = await showSelectMenu("Setting:", [
      { label: `Language: ${langLabel}` },
      { label: `Max length: ${config.maxLength}` },
      { label: `Auto-commit: ${config.autoCommit ? "ON" : "OFF"}` },
      { label: `Auto-push: ${config.autoPush ? "ON" : "OFF"}` },
      { label: `Commit history: ${histLabel}` },
      {
        label: `Dev mode: ${config.devMode ? "ON" : "OFF"}`,
        description: "store responses",
      },
    ]);

    switch (choice) {
      case -1:
        return;

      case 0: {
        console.clear();
        console.log("");
        const langChoice = await showSelectMenu(
          "Language:",
          LANGUAGES.map((l) => ({ label: l.label })),
        );
        if (langChoice >= 0 && langChoice < LANGUAGES.length) {
          config = updateConfig("language", LANGUAGES[langChoice].value);
          console.log(
            `${GREEN}✓${RESET} ${BOLD}${LANGUAGES[langChoice].label}${RESET}`,
          );
        }
        break;
      }

      case 1: {
        console.clear();
        console.log("");
        const lengths = [50, 72, 100];
        const lenChoice = await showSelectMenu("Max title length:", [
          { label: "50", description: "Git recommended" },
          { label: "72", description: "Default" },
          { label: "100", description: "Extended" },
        ]);
        if (lenChoice >= 0 && lenChoice < lengths.length) {
          config = updateConfig("maxLength", lengths[lenChoice]);
          console.log(
            `${GREEN}✓${RESET} ${BOLD}${lengths[lenChoice]}${RESET} chars`,
          );
        }
        break;
      }

      case 2:
        config = updateConfig("autoCommit", !config.autoCommit);
        console.log(
          `${GREEN}✓${RESET} Auto-commit ${config.autoCommit ? `${GREEN}ON${RESET}` : `${DIM}OFF${RESET}`}`,
        );
        break;

      case 3:
        config = updateConfig("autoPush", !config.autoPush);
        console.log(
          `${GREEN}✓${RESET} Auto-push ${config.autoPush ? `${GREEN}ON${RESET}` : `${DIM}OFF${RESET}`}`,
        );
        break;

      case 4: {
        console.clear();
        console.log("");
        const histOptions = [0, 3, 5, 10];
        const histChoice = await showSelectMenu("Recent commits for context:", [
          { label: "Off" },
          { label: "3" },
          { label: "5" },
          { label: "10" },
        ]);
        if (histChoice >= 0 && histChoice < histOptions.length) {
          config = updateConfig("commitHistory", histOptions[histChoice]);
          console.log(
            `${GREEN}✓${RESET} ${BOLD}${histOptions[histChoice] || "Off"}${RESET}`,
          );
        }
        break;
      }

      case 5:
        config = updateConfig("devMode", !config.devMode);
        console.log(
          `${GREEN}✓${RESET} Dev mode ${config.devMode ? `${GREEN}ON${RESET}` : `${DIM}OFF${RESET}`}`,
        );
        break;
    }
  }
}

module.exports = { runSettingsMenu };
