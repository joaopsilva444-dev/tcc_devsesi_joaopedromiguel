const accessibilityMain = document.querySelector('main');
const speechSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
const readButton = document.createElement('button');
const readStatus = document.createElement('p');
const skipLink = document.querySelector('.skip-link');
let isReading = false;
let readingRun = 0;

readButton.className = 'read-aloud-button';
readButton.type = 'button';
readButton.textContent = 'Ler conteúdo';
readButton.setAttribute('aria-label', 'Ler o conteúdo principal em voz alta');

readStatus.className = 'visually-hidden';
readStatus.setAttribute('role', 'status');
readStatus.setAttribute('aria-live', 'polite');
readStatus.setAttribute('aria-atomic', 'true');
readStatus.id = 'readAloudStatus';
readButton.setAttribute('aria-describedby', readStatus.id);

document.body.append(readButton, readStatus);
document.body.classList.add('has-read-aloud-control');

skipLink?.addEventListener('click', () => accessibilityMain?.focus());

function setReadingState(reading, message) {
  isReading = reading;
  readButton.textContent = reading ? 'Parar leitura' : 'Ler conteúdo';
  readButton.setAttribute(
    'aria-label',
    reading ? 'Parar leitura em voz alta' : 'Ler o conteúdo principal em voz alta'
  );
  readButton.setAttribute('aria-pressed', String(reading));
  readStatus.textContent = message;
}

setReadingState(false, '');

function splitIntoChunks(text, maxLength = 220) {
  const chunks = [];
  const sentences = text.match(/[^.!?]+[.!?]?/g) || [];

  for (const sentence of sentences) {
    let remaining = sentence.trim();
    while (remaining.length > maxLength) {
      let splitAt = remaining.lastIndexOf(' ', maxLength);
      if (splitAt < 1) splitAt = maxLength;
      chunks.push(remaining.slice(0, splitAt).trim());
      remaining = remaining.slice(splitAt).trim();
    }
    if (remaining) chunks.push(remaining);
  }

  return chunks;
}

function speakChunk(chunks, index, runId) {
  if (runId !== readingRun) return;
  if (index >= chunks.length) {
    setReadingState(false, 'Leitura concluída.');
    return;
  }

  const utterance = new SpeechSynthesisUtterance(chunks[index]);
  utterance.lang = 'pt-BR';
  utterance.onend = () => speakChunk(chunks, index + 1, runId);
  utterance.onerror = (event) => {
    if (runId !== readingRun || event.error === 'canceled' || event.error === 'interrupted') return;
    setReadingState(false, 'Não foi possível continuar a leitura em voz alta.');
  };

  const portugueseVoice = speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith('pt'));
  if (portugueseVoice) utterance.voice = portugueseVoice;
  speechSynthesis.speak(utterance);
}

readButton.addEventListener('click', () => {
  if (!speechSupported) {
    setReadingState(false, 'A leitura em voz alta não é compatível com este navegador.');
    return;
  }

  if (isReading) {
    readingRun += 1;
    speechSynthesis.cancel();
    setReadingState(false, 'Leitura interrompida.');
    return;
  }

  const text = accessibilityMain?.innerText.replace(/\s+/g, ' ').trim();
  if (!text) {
    setReadingState(false, 'Não há conteúdo disponível para leitura.');
    return;
  }

  const chunks = splitIntoChunks(text);
  if (!chunks.length) {
    setReadingState(false, 'Não há conteúdo disponível para leitura.');
    return;
  }

  readingRun += 1;
  setReadingState(true, 'Leitura em voz alta iniciada.');
  speakChunk(chunks, 0, readingRun);
});
