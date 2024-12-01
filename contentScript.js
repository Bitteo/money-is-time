// contentScript.js

/**
 * Carica i messaggi localizzati in base alla lingua selezionata.
 * @param {string} language - Il codice della lingua preferita (es. 'en', 'it').
 * @returns {Object} - Un oggetto contenente i messaggi localizzati.
 */
function loadLocalizedMessages(language) {
  const messages = {
    en: {
      minutes: 'min',
      hours: 'h',
      and: 'and',
      ofWork: 'of work',
    },
    it: {
      minutes: 'min',
      hours: 'ore',
      and: 'e',
      ofWork: 'di lavoro',
    },
    // Aggiungi altre lingue se necessario
  };

  return messages[language] || messages['en'];
}

/**
 * Converte un prezzo in ore lavorative in base al reddito orario dell'utente.
 * @param {number} price - Il prezzo da convertire.
 * @param {number} hourlyIncome - Il reddito orario dell'utente.
 * @returns {number|null} - Le ore lavorative necessarie per acquistare il prezzo, o null se errore.
 */
function convertPriceToWorkHours(price, hourlyIncome) {
  if (hourlyIncome <= 0) {
    console.error('Il reddito orario deve essere maggiore di zero.');
    return null;
  }
  return price / hourlyIncome;
}

/**
 * Formatta le ore lavorative in ore e minuti.
 * @param {number} workHours - Le ore lavorative.
 * @param {Object} localizedMessages - Oggetto contenente i messaggi localizzati.
 * @returns {string} - Il tempo formattato in ore e minuti.
 */
function formatWorkTime(workHours, localizedMessages) {
  const totalMinutes = Math.round(workHours * 60);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  let timeString = '';

  if (hours > 0) {
    timeString += `${hours} ${localizedMessages.hours}`;
  }

  if (minutes > 0) {
    if (hours > 0) {
      timeString += ` ${localizedMessages.and} `;
    }
    timeString += `${minutes} ${localizedMessages.minutes}`;
  }

  if (timeString === '') {
    // Se il tempo è inferiore a un minuto
    timeString = `1 ${localizedMessages.minutes}`;
  }

  return `${timeString} ${localizedMessages.ofWork}`;
}

/**
 * Parsea una stringa di importo e restituisce il valore numerico.
 * @param {string} amount - La stringa dell'importo da parsare.
 * @returns {number|null} - L'importo numerico, o null se non è possibile parsare.
 */
function parsePrice(amount) {
  // Rimuove spazi e caratteri non numerici eccetto ',' e '.'
  let sanitizedAmount = amount.replace(/\s+/g, '').replace(/[^\d.,-]/g, '');

  // Gestione dei segni negativi
  let isNegative = false;
  if (sanitizedAmount.startsWith('-')) {
    isNegative = true;
    sanitizedAmount = sanitizedAmount.substring(1);
  }

  // Se l'importo contiene sia '.' che ',', determiniamo quale è il separatore decimale
  let price = null;

  if (sanitizedAmount.indexOf(',') > -1 && sanitizedAmount.indexOf('.') > -1) {
    // Presumiamo che '.' sia il separatore delle migliaia e ',' il separatore decimale
    sanitizedAmount = sanitizedAmount.replace(/\./g, '').replace(',', '.');
    price = parseFloat(sanitizedAmount);
  } else if (sanitizedAmount.indexOf('.') > -1) {
    // Se c'è solo '.', verifichiamo se è probabile che sia un separatore decimale o delle migliaia
    const parts = sanitizedAmount.split('.');
    if (parts[1] && parts[1].length === 3) {
      // Presumiamo che '.' sia un separatore delle migliaia
      sanitizedAmount = sanitizedAmount.replace(/\./g, '');
      price = parseFloat(sanitizedAmount);
    } else {
      // Presumiamo che '.' sia un separatore decimale
      price = parseFloat(sanitizedAmount);
    }
  } else if (sanitizedAmount.indexOf(',') > -1) {
    // Presumiamo che ',' sia il separatore decimale
    sanitizedAmount = sanitizedAmount.replace(',', '.');
    price = parseFloat(sanitizedAmount);
  } else {
    // Nessun separatore, convertiamo direttamente
    price = parseFloat(sanitizedAmount);
  }

  if (isNaN(price)) {
    return null;
  }

  return isNegative ? -price : price;
}

/**
 * Verifica se un nodo o uno dei suoi genitori ha lo stile 'text-decoration: line-through'.
 * @param {Node} node - Il nodo da verificare.
 * @returns {boolean} - True se il nodo o uno dei suoi genitori ha lo stile 'line-through'.
 */
function isCrossedOut(node) {
  let currentNode = node.parentNode;
  while (currentNode && currentNode !== document.body) {
    const style = window.getComputedStyle(currentNode);
    if (style.textDecorationLine.includes('line-through')) {
      return true;
    }
    currentNode = currentNode.parentNode;
  }
  return false;
}

/**
 * Verifica se un nodo è nascosto (display: none o visibility: hidden).
 * @param {Node} node - Il nodo da verificare.
 * @returns {boolean} - True se il nodo o uno dei suoi genitori è nascosto.
 */
function isNodeHidden(node) {
  let currentNode = node.parentNode;
  while (currentNode && currentNode !== document.body) {
    const style = window.getComputedStyle(currentNode);
    if (style && (style.display === 'none' || style.visibility === 'hidden')) {
      return true;
    }
    currentNode = currentNode.parentNode;
  }
  return false;
}

/**
 * Verifica se un nodo è un campo di input o un elemento modificabile dall'utente.
 * @param {Node} node - Il nodo da verificare.
 * @returns {boolean} - True se il nodo o uno dei suoi genitori è un campo di input o modificabile.
 */
function isEditableNode(node) {
  let currentNode = node.parentNode;
  while (currentNode && currentNode !== document.body) {
    if (
      currentNode.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(currentNode.tagName)
    ) {
      return true;
    }
    currentNode = currentNode.parentNode;
  }
  return false;
}

// Set per tracciare i nodi già processati
let processedNodes = new WeakSet();

// Variabili globali per le impostazioni
let hourlyIncome;
let localizedMessages;
let userCurrency;
let extensionEnabled = true; // Stato di attivazione dell'estensione

// Funzione per inizializzare l'estensione
function initializeExtension() {
  console.log('Initializing extension...');

  // Imposta il listener per i cambiamenti nelle impostazioni
  chrome.storage.onChanged.addListener(onStorageChange);

  // Recupera le impostazioni iniziali
  chrome.storage.sync.get(
    ['hourlyIncome', 'preferredLanguage', 'preferredCurrency', 'extensionEnabled'],
    (result) => {
      console.log('Initial storage values:', result);

      hourlyIncome = result.hourlyIncome || null;
      const language = result.preferredLanguage || navigator.language.slice(0, 2) || 'en';
      userCurrency = result.preferredCurrency || 'EUR'; // Default a EUR se non impostato
      extensionEnabled = result.extensionEnabled !== undefined ? result.extensionEnabled : true;

      // Carica i messaggi localizzati
      localizedMessages = loadLocalizedMessages(language);

      // Resetta il set dei nodi processati
      processedNodes = new WeakSet();

      // Processa l'intera pagina se l'estensione è attiva
      if (extensionEnabled && hourlyIncome) {
        processElement(document.body);
      }

      // Osserva le modifiche al DOM per gestire contenuti dinamici
      observeDOMChanges();
    }
  );
}

// Funzione per osservare le modifiche al DOM
function observeDOMChanges() {
  console.log('Observing DOM changes...');

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            processElement(node);
          } else if (node.nodeType === Node.TEXT_NODE) {
            processTextNode(node);
          }
        });
      } else if (mutation.type === 'characterData') {
        processTextNode(mutation.target);
      } else if (mutation.type === 'attributes') {
        if (mutation.target.nodeType === Node.ELEMENT_NODE) {
          processElement(mutation.target);
        }
      }
    });
  });

  // Configurazione del MutationObserver
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    characterDataOldValue: true,
    attributeOldValue: true,
  });
}

// Funzione per ripristinare il testo originale
function restoreOriginalText(element) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
  let node;
  while ((node = walker.nextNode())) {
    if (node.originalText && node.nodeValue !== node.originalText) {
      node.nodeValue = node.originalText;
    }
  }
}

// Funzione per gestire i cambiamenti nello storage
function onStorageChange(changes, area) {
  console.log('onStorageChange triggered:', changes, area);

  if (area === 'sync') {
    let shouldReinitialize = false;

    if ('hourlyIncome' in changes) {
      hourlyIncome = changes.hourlyIncome.newValue;
      console.log('hourlyIncome updated:', hourlyIncome);
      shouldReinitialize = true;
    }

    if ('preferredLanguage' in changes) {
      const language = changes.preferredLanguage.newValue || navigator.language.slice(0, 2) || 'en';
      localizedMessages = loadLocalizedMessages(language);
      console.log('preferredLanguage updated:', language);
      shouldReinitialize = true;
    }

    if ('preferredCurrency' in changes) {
      userCurrency = changes.preferredCurrency.newValue || 'EUR';
      console.log('preferredCurrency updated:', userCurrency);
      shouldReinitialize = true;
    }

    if ('extensionEnabled' in changes) {
      extensionEnabled = changes.extensionEnabled.newValue;
      console.log('extensionEnabled updated:', extensionEnabled);
      shouldReinitialize = true;

      // Ripristina il testo originale se l'estensione è disattivata
      if (!extensionEnabled) {
        restoreOriginalText(document.body);
      }
    }

    if (shouldReinitialize) {
      console.log('Reinitializing extension...');
      // Resetta il set dei nodi processati
      processedNodes = new WeakSet();

      if (extensionEnabled && hourlyIncome) {
        // Riprocessa l'intera pagina
        processElement(document.body);
      } else if (!extensionEnabled) {
        // Ripristina il testo originale
        restoreOriginalText(document.body);
      }
    }
  }
}

// Inizializza l'estensione
initializeExtension();

// Funzione per processare i nodi di testo
function processTextNode(node) {
  // Se il reddito orario non è impostato o l'estensione è disattivata, non processare il nodo
  if (!hourlyIncome || !extensionEnabled) {
    return;
  }

  // Evita di processare nodi già elaborati durante questa esecuzione
  if (processedNodes.has(node)) {
    return;
  }

  // Evita di processare nodi all'interno di campi di input o contenuti modificabili
  if (isEditableNode(node)) {
    return;
  }

  // Evita di processare prezzi barrati
  if (isCrossedOut(node)) {
    return;
  }

  // Evita di processare nodi nascosti
  if (isNodeHidden(node)) {
    return;
  }

  // Se il testo originale non è stato ancora memorizzato, lo memorizziamo
  if (!node.originalText) {
    node.originalText = node.nodeValue;
  }

  let text = node.originalText;

  // Definizione dei simboli di valuta e dei codici ISO 4217
  const currencySymbols = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    // Aggiungi altre valute se necessario
  };

  const currencyCodes = Object.keys(currencySymbols);
  const currencySymbolsPattern = Object.values(currencySymbols).map(sym => `\\${sym}`).join('|');
  const currencyCodesPattern = currencyCodes.join('|');

  const currencyPattern = `(?:${currencySymbolsPattern}|${currencyCodesPattern})`;

  const numberPattern = '\\d{1,3}(?:[.,]\\d{3})*(?:[.,]\\d{2})?';

  // Regex per individuare i prezzi con simboli o codici di valuta supportati
  const regex = new RegExp(
    `(${currencyPattern})\\s*(${numberPattern})|(${numberPattern})\\s*(${currencyPattern})`,
    'gi'
  );

  // Sostituisce i prezzi con il testo di conversione
  const newText = text.replace(regex, (match, currency1, amount1, amount2, currency2) => {
    const currency = currency1 || currency2;
    const amount = amount1 || amount2;

    // Assicura che sia presente sia la valuta che l'importo
    if (!currency || !amount) {
      return match;
    }

    const price = parsePrice(amount);
    if (!isNaN(price)) {
      const workHours = convertPriceToWorkHours(price, hourlyIncome);
      if (workHours !== null) {
        const formattedTime = formatWorkTime(workHours, localizedMessages);
        return `${currency}${amount} (${formattedTime})`; // Ricostruisce il prezzo con valuta e importo
      }
    }
    return match;
  });

  // Aggiorna il nodo di testo se è cambiato
  if (newText !== node.nodeValue) {
    node.nodeValue = newText;
    processedNodes.add(node);
  }
}

// Funzione per processare un elemento del DOM
function processElement(element) {
  // Se l'estensione è disattivata o il reddito orario non è impostato, non processare
  if (!extensionEnabled || !hourlyIncome) {
    return;
  }

  // Evita di processare elementi non rilevanti
  if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'CODE', 'PRE', 'INPUT', 'TEXTAREA'].includes(element.tagName)) {
    return;
  }

  // Evita di processare elementi modificabili dall'utente
  if (element.isContentEditable) {
    return;
  }

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);

  let node;
  while ((node = walker.nextNode())) {
    processTextNode(node);
  }
}