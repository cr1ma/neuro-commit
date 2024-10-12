// Вибираємо елементи для подальшої роботи
const gitDiffInput = document.getElementById('gitDiffInput');
const promptOutput = document.getElementById('promptOutput');
const copyButton = document.getElementById('copyButton');
const downloadButton = document.getElementById('downloadButton');
const toast = document.getElementById('toast');
const pasteButton = document.getElementById('pasteButton');
const clearButton = document.getElementById('clearButton');
const copyCommandButtons = document.querySelectorAll('.copyCommandButton');
const themeToggle = document.getElementById('themeToggle');
const themeLabel = document.getElementById('themeLabel');
const langUk = document.getElementById('langUk');
const langEn = document.getElementById('langEn');

// Тексти для підтримки мов
const texts = {
  uk: {
    headerDescription: 'Перетворіть свій <code>git diff</code> у готовий промт для нейромережі та зробіть свій коміт кращим!',
    gitDiffTitle: 'Вивід команди git diff',
    pasteButton: 'Вставити з буфера',
    clearButton: 'Очистити поле',
    promptTitle: 'Згенерований промт для нейромережі',
    copyButton: 'Скопіювати промт',
    downloadButton: 'Завантажити промт',
    themeLabelLight: 'Світла тема',
    themeLabelDark: 'Темна тема',
    gitCommandsTitle: 'Команди для отримання git diff',
    copyCommand: 'Копіювати',
    toastCopied: 'Промт успішно скопійовано в буфер обміну!',
    toastError: 'Не вдалося виконати дію.',
    toastPasted: 'Текст успішно вставлено з буфера обміну!',
    toastCommandCopied: 'Команда скопійована в буфер обміну!',
    placeholder: 'Вставте сюди результат команди git diff...',
    footerText: 'Приєднуйтесь до розробки на GitHub'
  },
  en: {
    headerDescription: 'Turn your <code>git diff</code> into a ready prompt for neural networks and make your commit better!',
    gitDiffTitle: 'Output of git diff command',
    pasteButton: 'Paste from clipboard',
    clearButton: 'Clear field',
    promptTitle: 'Generated prompt for neural network',
    copyButton: 'Copy prompt',
    downloadButton: 'Download prompt',
    themeLabelLight: 'Light theme',
    themeLabelDark: 'Dark theme',
    gitCommandsTitle: 'Commands to get git diff',
    copyCommand: 'Copy',
    toastCopied: 'Prompt successfully copied to clipboard!',
    toastError: 'Failed to perform the action.',
    toastPasted: 'Text successfully pasted from clipboard!',
    toastCommandCopied: 'Command copied to clipboard!',
    placeholder: 'Paste the result of git diff command here...',
    footerText: 'Join the development on GitHub'
  }
};

let currentLang = localStorage.getItem('language') || 'uk';
let promptTemplate = '';

// Функція для зміни мови інтерфейсу
function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('language', lang);
  const t = texts[lang];

  document.getElementById('headerDescription').innerHTML = t.headerDescription;
  document.getElementById('gitDiffTitle').textContent = t.gitDiffTitle;
  pasteButton.textContent = t.pasteButton;
  clearButton.textContent = t.clearButton;
  document.getElementById('promptTitle').textContent = t.promptTitle;
  copyButton.textContent = t.copyButton;
  downloadButton.textContent = t.downloadButton;
  themeLabel.textContent = themeToggle.checked ? t.themeLabelLight : t.themeLabelDark;
  document.querySelector('.git-commands h3').textContent = t.gitCommandsTitle;
  document.querySelectorAll('.copyCommandButton').forEach(btn => btn.textContent = t.copyCommand);
  gitDiffInput.placeholder = t.placeholder;
  document.querySelector('footer p a').textContent = t.footerText;

  // Змінюємо активний клас для кнопок мови
  if (lang === 'uk') {
    langUk.classList.add('active');
    langEn.classList.remove('active');
  } else {
    langUk.classList.remove('active');
    langEn.classList.add('active');
  }

  // Перезавантажуємо шаблон промпту
  loadPromptTemplate();
}

// Завантажуємо шаблон промпту з файлу prompt.txt або prompt_en.txt
function loadPromptTemplate() {
  const promptFile = currentLang === 'uk' ? 'prompt.txt' : 'prompt_en.txt';
  fetch(promptFile)
    .then(response => response.text())
    .then(data => {
      promptTemplate = data;
      updatePrompt();
    })
    .catch(error => {
      console.error('Помилка завантаження промпту:', error);
    });
}

// Ініціалізація мови при завантаженні сторінки
setLanguage(currentLang);

// Додаємо події для перемикачів мови
langUk.addEventListener('click', () => setLanguage('uk'));
langEn.addEventListener('click', () => setLanguage('en'));

// Функція для екранування HTML, щоб уникнути XSS атак
function escapeHTML(str) {
  return str.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Функція для підсвічування рядків у git diff
function highlightDiff(diff) {
  const lines = diff.split('\n');
  return lines.map(line => {
    if (line.startsWith('+')) {
      return `<span class="addition">${escapeHTML(line)}</span>`;
    } else if (line.startsWith('-')) {
      return `<span class="deletion">${escapeHTML(line)}</span>`;
    } else {
      return escapeHTML(line);
    }
  }).join('\n');
}

// Функція для очищення введеного користувачем git diff для GitHub Copilot
function sanitizeInput(input) {
  const wordsToSanitize = [
    '@workspace', '/explain', '/tests', '/fix', '/new', '/newNotebook', '/fixTestFailure', '/setupTests',
    '@vscode', '/search', '/runCommand', '/startDebugging',
    '@terminal', '@github', '#selection', '/help', '#codebase', '#editor', '#terminalLastCommand', '#terminalSelection', '#file'
  ];

  let sanitized = input;
  wordsToSanitize.forEach(word => {
    const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    sanitized = sanitized.replace(regex, word.startsWith('/') ? word.slice(1) : word);
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
  localStorage.setItem('gitDiff', gitDiff);
}

// Слідкуємо за змінами у полі введення і автоматично оновлюємо промт
gitDiffInput.addEventListener('input', updatePrompt);

// Відновлюємо gitDiff з Local Storage
if (localStorage.getItem('gitDiff')) {
  gitDiffInput.value = localStorage.getItem('gitDiff');
  updatePrompt();
}

// Обробляємо натискання кнопки "Скопіювати промт"
copyButton.addEventListener('click', async () => {
  const textToCopy = promptOutput.textContent;

  try {
    await navigator.clipboard.writeText(textToCopy);
    showToast(texts[currentLang].toastCopied, 'success');
  } catch (err) {
    console.error('Не вдалося скопіювати текст: ', err);
    showToast(texts[currentLang].toastError, 'error');
  }
});

// Обробляємо натискання кнопки "Завантажити промт"
downloadButton.addEventListener('click', () => {
  const text = promptOutput.textContent;
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'prompt.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Обробляємо натискання кнопки "Вставити з буфера"
pasteButton.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    gitDiffInput.value = text;
    updatePrompt();
    showToast(texts[currentLang].toastPasted, 'success');
  } catch (err) {
    console.error('Не вдалося вставити текст з буфера обміну: ', err);
    showToast(texts[currentLang].toastError, 'error');
  }
});

// Обробляємо натискання кнопки "Очистити поле"
clearButton.addEventListener('click', () => {
  gitDiffInput.value = '';
  updatePrompt();
  localStorage.removeItem('gitDiff');
});

// Обробляємо натискання кнопок "Копіювати" для команд git
copyCommandButtons.forEach(button => {
  button.addEventListener('click', async () => {
    const command = button.getAttribute('data-command');
    try {
      await navigator.clipboard.writeText(command);
      showToast(`${texts[currentLang].toastCommandCopied}`, 'success');
    } catch (err) {
      console.error('Не вдалося скопіювати команду: ', err);
      showToast(texts[currentLang].toastError, 'error');
    }
  });
});

// Тема (темна/світла)
function setTheme(isDark) {
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  themeToggle.checked = isDark;
  themeLabel.textContent = isDark ? texts[currentLang].themeLabelDark : texts[currentLang].themeLabelLight;
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Ініціалізація теми при завантаженні сторінки
const savedTheme = localStorage.getItem('theme') || 'dark';
setTheme(savedTheme === 'dark');

// Обробляємо зміну теми
themeToggle.addEventListener('change', () => {
  setTheme(themeToggle.checked);
});

// Функція для показу сповіщення (toast) на екрані
function showToast(message, type = 'success') {
  toast.className = 'toast';

  if (type === 'success') {
    toast.classList.add('success');
  } else if (type === 'error') {
    toast.classList.add('error');
  } else if (type === 'info') {
    toast.classList.add('info');
  }

  toast.innerHTML = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hide');
  }, 3500);
}
