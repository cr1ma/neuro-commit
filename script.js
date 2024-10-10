// Вибираємо елементи для подальшої роботи
const gitDiffInput = document.getElementById('gitDiffInput');
const promptOutput = document.getElementById('promptOutput');
const copyButton = document.getElementById('copyButton');
const toast = document.getElementById('toast');

let promptTemplate = '';

// Завантажуємо шаблон промпту з файлу prompt.txt
fetch('prompt.txt')
  .then(response => response.text())
  .then(data => {
    promptTemplate = data;
  })
  .catch(error => {
    console.error('Помилка завантаження промпту:', error);
  });

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
}

// Слідкуємо за змінами у полі введення і автоматично оновлюємо промт
gitDiffInput.addEventListener('input', updatePrompt);

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

// Обробляємо натискання кнопки "Скопіювати промт"
copyButton.addEventListener('click', async () => {
  const textToCopy = promptOutput.textContent;

  try {
    await navigator.clipboard.writeText(textToCopy);
    showToast('Промт успішно скопійовано в буфер обміну!', 'success');
  } catch (err) {
    console.error('Не вдалося скопіювати текст: ', err);
    showToast('Не вдалося скопіювати промт.', 'error');
  }
});