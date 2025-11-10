// Вибираємо елементи для подальшої роботи
const gitDiffInput = document.getElementById("gitDiffInput");
const promptOutput = document.getElementById("promptOutput");
const copyButton = document.getElementById("copyButton");
const downloadButton = document.getElementById("downloadButton");
const toast = document.getElementById("toast");
const pasteButton = document.getElementById("pasteButton");
const clearButton = document.getElementById("clearButton");
const copyCommandButtons = document.querySelectorAll(".copyCommandButton");
const themeToggle = document.getElementById("themeToggle");
const themeLabel = document.getElementById("themeLabel");

// Тексти інтерфейсу
// TODO: В майбутньому можна додати підтримку інших мов через об'єкт texts
const texts = {
  toastCopied: "Промт успішно скопійовано в буфер обміну!",
  toastError: "Не вдалося виконати дію.",
  toastPasted: "Текст успішно вставлено з буфера обміну!",
  toastCommandCopied: "Команда скопійована в буфер обміну!",
  themeLabelLight: "Світла тема",
  themeLabelDark: "Темна тема",
};

let promptTemplate = "";

// Завантажуємо шаблон промпту з файлу prompt.txt
function loadPromptTemplate() {
  fetch("prompt.txt")
    .then((response) => response.text())
    .then((data) => {
      promptTemplate = data;
      updatePrompt();
    })
    .catch((error) => {
      console.error("Помилка завантаження промпту:", error);
    });
}

// Ініціалізація при завантаженні сторінки
loadPromptTemplate();

// Функція для екранування HTML, щоб уникнути XSS атак
function escapeHTML(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Функція для підсвічування рядків у git diff
function highlightDiff(diff) {
  const lines = diff.split("\n");
  return lines
    .map((line) => {
      if (line.startsWith("+")) {
        return `<span class="addition">${escapeHTML(line)}</span>`;
      } else if (line.startsWith("-")) {
        return `<span class="deletion">${escapeHTML(line)}</span>`;
      } else {
        return escapeHTML(line);
      }
    })
    .join("\n");
}

// Функція для очищення введеного користувачем git diff для GitHub Copilot
function sanitizeInput(input) {
  const wordsToSanitize = [
    "@workspace",
    "/explain",
    "/tests",
    "/fix",
    "/new",
    "/newNotebook",
    "/fixTestFailure",
    "/setupTests",
    "@vscode",
    "/search",
    "/runCommand",
    "/startDebugging",
    "@terminal",
    "@github",
    "#selection",
    "/help",
    "#codebase",
    "#editor",
    "#terminalLastCommand",
    "#terminalSelection",
    "#file",
  ];

  let sanitized = input;
  wordsToSanitize.forEach((word) => {
    const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    sanitized = sanitized.replace(
      regex,
      word.startsWith("/") ? word.slice(1) : word
    );
  });

  return sanitized;
}

// Функція для оновлення промпту на основі введеного користувачем git diff
function updatePrompt() {
  const gitDiff = gitDiffInput.value.trim();
  if (gitDiff === "") {
    promptOutput.innerHTML = "";
    return;
  }
  const sanitizedDiff = sanitizeInput(gitDiff);
  const highlightedDiff = highlightDiff(sanitizedDiff);
  const filledPrompt = promptTemplate.replace("<diff>", highlightedDiff);
  promptOutput.innerHTML = filledPrompt;

  // Зберігаємо gitDiff у Local Storage
  localStorage.setItem("gitDiff", gitDiff);
}

// Слідкуємо за змінами у полі введення і автоматично оновлюємо промт
gitDiffInput.addEventListener("input", updatePrompt);

// Відновлюємо gitDiff з Local Storage
if (localStorage.getItem("gitDiff")) {
  gitDiffInput.value = localStorage.getItem("gitDiff");
  updatePrompt();
}

// Обробляємо натискання кнопки "Скопіювати промт"
copyButton.addEventListener("click", async () => {
  const textToCopy = promptOutput.textContent;

  try {
    await navigator.clipboard.writeText(textToCopy);
    showToast(texts.toastCopied, "success");
  } catch (err) {
    console.error("Не вдалося скопіювати текст: ", err);
    showToast(texts.toastError, "error");
  }
});

// Обробляємо натискання кнопки "Завантажити промт"
downloadButton.addEventListener("click", () => {
  const text = promptOutput.textContent;
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "prompt.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Обробляємо натискання кнопки "Вставити з буфера"
pasteButton.addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    gitDiffInput.value = text;
    updatePrompt();
    showToast(texts.toastPasted, "success");
  } catch (err) {
    console.error("Не вдалося вставити текст з буфера обміну: ", err);
    showToast(texts.toastError, "error");
  }
});

// Обробляємо натискання кнопки "Очистити поле"
clearButton.addEventListener("click", () => {
  gitDiffInput.value = "";
  updatePrompt();
  localStorage.removeItem("gitDiff");
});

// Обробляємо натискання кнопок "Копіювати" для команд git
copyCommandButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const command = button.getAttribute("data-command");
    try {
      await navigator.clipboard.writeText(command);
      showToast(texts.toastCommandCopied, "success");
    } catch (err) {
      console.error("Не вдалося скопіювати команду: ", err);
      showToast(texts.toastError, "error");
    }
  });
});

// Тема (темна/світла)
function setTheme(isDark) {
  document.documentElement.setAttribute(
    "data-theme",
    isDark ? "dark" : "light"
  );
  themeToggle.checked = isDark;
  themeLabel.textContent = isDark
    ? texts.themeLabelDark
    : texts.themeLabelLight;
  localStorage.setItem("theme", isDark ? "dark" : "light");
}

// Ініціалізація теми при завантаженні сторінки
const savedTheme = localStorage.getItem("theme") || "dark";
setTheme(savedTheme === "dark");

// Обробляємо зміну теми
themeToggle.addEventListener("change", () => {
  setTheme(themeToggle.checked);
});

// Функція для показу сповіщення (toast) на екрані
function showToast(message, type = "success") {
  toast.className = "toast";

  if (type === "success") {
    toast.classList.add("success");
  } else if (type === "error") {
    toast.classList.add("error");
  } else if (type === "info") {
    toast.classList.add("info");
  }

  toast.innerHTML = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
    toast.classList.add("hide");
  }, 3500);
}
