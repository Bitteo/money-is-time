// popup.js

document.addEventListener('DOMContentLoaded', () => {
    const languageSelect = document.getElementById('language');
    const currencySelect = document.getElementById('currency');
    const incomeTypeSelect = document.getElementById('incomeType');
    const hourlyIncomeInput = document.getElementById('hourlyIncome');
    const otherIncomeInput = document.getElementById('otherIncome');
    const workingHoursInput = document.getElementById('workingHours');
    const saveBtn = document.getElementById('saveBtn');
    const messageDiv = document.getElementById('message');
    const calculatedIncomeDiv = document.getElementById('calculatedIncomeDiv');
    const calculatedIncomeSpan = document.getElementById('calculatedIncome');

    const hourlyIncomeDiv = document.getElementById('hourlyIncomeDiv');
    const otherIncomeDiv = document.getElementById('otherIncomeDiv');

    // Localized labels and messages
    const localizedContent = {
        en: {
            setHourlyIncome: 'Set your hourly income',
            incomeType: 'Income type:',
            hourlyIncomeLabel: 'Hourly income',
            incomeLabel: 'Income',
            workingHoursLabel: 'Weekly working hours',
            calculatedHourlyIncome: 'Calculated hourly income:',
            save: 'Save',
            saving: 'Saving...',
            savedSuccess: 'Hourly income saved successfully!',
            savedError: 'An error occurred. Please try again.',
            settings: 'Settings',
            selectLanguage: 'Select language:',
            selectCurrency: 'Select currency:',
            placeholders: {
                hourlyIncome: 'E.g., 15.50',
                income: 'Enter your income',
                workingHours: 'Weekly working hours (e.g., 40)',
            },
            incomeTypes: {
                hourly: 'Hourly',
                weekly: 'Weekly',
                monthly: 'Monthly',
                annual: 'Annual',
            },
            messages: {
                invalidValues: 'Please enter valid values.',
            },
            enableExtension: 'Enable Extension:',
        },
        it: {
            setHourlyIncome: 'Imposta il tuo reddito orario',
            incomeType: 'Tipo di reddito:',
            hourlyIncomeLabel: 'Reddito orario',
            incomeLabel: 'Reddito',
            workingHoursLabel: 'Ore lavorative settimanali',
            calculatedHourlyIncome: 'Reddito orario calcolato:',
            save: 'Salva',
            saving: 'Salvataggio...',
            savedSuccess: 'Reddito orario salvato con successo!',
            savedError: 'Si è verificato un errore. Riprova.',
            settings: 'Impostazioni',
            selectLanguage: 'Seleziona la lingua:',
            selectCurrency: 'Seleziona la valuta:',
            placeholders: {
                hourlyIncome: 'Es: 15.50',
                income: 'Inserisci il tuo reddito',
                workingHours: 'Ore lavorative settimanali (es. 40)',
            },
            incomeTypes: {
                hourly: 'Orario',
                weekly: 'Settimanale',
                monthly: 'Mensile',
                annual: 'Annuale',
            },
            messages: {
                invalidValues: 'Per favore, inserisci valori validi.',
            },
            enableExtension: 'Attiva Estensione:',
        },
        // Aggiungi altre lingue qui
    };

    // Function to update the UI labels based on selected language
    function updateLocalizedContent() {
        const selectedLanguage = languageSelect.value;
        const content = localizedContent[selectedLanguage];

        // Update text content of labels and placeholders
        document.getElementById('title').textContent = content.setHourlyIncome;
        document.getElementById('incomeTypeLabel').textContent = content.incomeType;
        document.getElementById('hourlyIncomeLabel').textContent = `${content.hourlyIncomeLabel} (${currencySelect.value}):`;
        document.getElementById('otherIncomeLabel').textContent = `${content.incomeLabel} (${currencySelect.value}):`;
        document.getElementById('workingHoursLabel').textContent = content.workingHoursLabel + ':';
        document.getElementById('calculatedIncomeLabel').textContent = `${content.calculatedHourlyIncome} `;
        saveBtn.textContent = content.save;
        document.getElementById('settingsTitle').textContent = content.settings;
        document.getElementById('languageLabel').textContent = content.selectLanguage;
        document.getElementById('currencyLabel').textContent = content.selectCurrency;
        document.getElementById('extensionToggleLabel').textContent = content.enableExtension;

        // Update placeholders
        hourlyIncomeInput.placeholder = content.placeholders.hourlyIncome;
        otherIncomeInput.placeholder = content.placeholders.income;
        workingHoursInput.placeholder = content.placeholders.workingHours;

        // Update income type options
        incomeTypeSelect.options[0].textContent = content.incomeTypes.hourly;
        incomeTypeSelect.options[1].textContent = content.incomeTypes.weekly;
        incomeTypeSelect.options[2].textContent = content.incomeTypes.monthly;
        incomeTypeSelect.options[3].textContent = content.incomeTypes.annual;

        // Update calculated income unit
        calculatedIncomeSpan.nextSibling.textContent = ` ${currencySelect.value}/h`;

        // Update message if present
        if (messageDiv.className.includes('success')) {
            messageDiv.textContent = content.savedSuccess;
        } else if (messageDiv.className.includes('error')) {
            messageDiv.textContent = content.savedError;
        }
    }

    // Load existing preferred language and currency
    chrome.storage.sync.get(['preferredLanguage', 'preferredCurrency'], (result) => {
        if (result.preferredLanguage) {
            languageSelect.value = result.preferredLanguage;
        }
        if (result.preferredCurrency) {
            currencySelect.value = result.preferredCurrency;
        }
        updateLocalizedContent();
    });

    // Save the selected language
    languageSelect.addEventListener('change', () => {
        const selectedLanguage = languageSelect.value;
        chrome.storage.sync.set({ preferredLanguage: selectedLanguage }, () => {
            updateLocalizedContent();
        });
    });

    // Save the selected currency
    currencySelect.addEventListener('change', () => {
        const selectedCurrency = currencySelect.value;
        chrome.storage.sync.set({ preferredCurrency: selectedCurrency }, () => {
            updateLocalizedContent();
        });
    });

    // Function to update the visibility of fields
    function updateIncomeFields() {
        const incomeType = incomeTypeSelect.value;
        if (incomeType === 'hourly') {
            hourlyIncomeDiv.style.display = 'block';
            otherIncomeDiv.style.display = 'none';
            calculatedIncomeDiv.style.display = 'none';
            workingHoursInput.value = '';
            otherIncomeInput.value = '';
        } else {
            hourlyIncomeDiv.style.display = 'none';
            otherIncomeDiv.style.display = 'block';
            calculatedIncomeDiv.style.display = 'block';

            // Set default placeholder for working hours
            if (!workingHoursInput.value) {
                workingHoursInput.value = '40';
            }

            hourlyIncomeInput.value = '';
        }
        validateInputs();
    }

    // Load existing data
    chrome.storage.sync.get(['hourlyIncome', 'incomeType', 'otherIncome', 'workingHours'], (result) => {
        if (result.incomeType) {
            incomeTypeSelect.value = result.incomeType;
        }
        if (result.hourlyIncome) {
            hourlyIncomeInput.value = result.hourlyIncome;
            saveBtn.disabled = false;
        }
        if (result.otherIncome) {
            otherIncomeInput.value = result.otherIncome;
        }
        if (result.workingHours) {
            workingHoursInput.value = result.workingHours;
        }
        updateIncomeFields();
        calculateHourlyIncome();
    });

    // Update fields based on selected income type
    incomeTypeSelect.addEventListener('change', () => {
        updateIncomeFields();
        chrome.storage.sync.set({ incomeType: incomeTypeSelect.value });
    });

    // Input validation
    function validateInputs() {
        const incomeType = incomeTypeSelect.value;
        let isValid = false;

        if (incomeType === 'hourly') {
            const hourlyIncome = parseFloat(hourlyIncomeInput.value);
            isValid = hourlyIncome > 0;
        } else {
            const otherIncome = parseFloat(otherIncomeInput.value);
            const workingHours = parseFloat(workingHoursInput.value);
            isValid = otherIncome > 0 && workingHours > 0;
        }

        saveBtn.disabled = !isValid;
        messageDiv.textContent = '';

        if (isValid && incomeType !== 'hourly') {
            calculateHourlyIncome();
        } else {
            calculatedIncomeDiv.style.display = 'none';
        }
    }

    // Add event listeners for validation
    hourlyIncomeInput.addEventListener('input', validateInputs);
    otherIncomeInput.addEventListener('input', validateInputs);
    workingHoursInput.addEventListener('input', validateInputs);

    // Function to calculate and display the hourly income
    function calculateHourlyIncome() {
        const incomeType = incomeTypeSelect.value;
        const otherIncome = parseFloat(otherIncomeInput.value);
        const workingHours = parseFloat(workingHoursInput.value);

        if (otherIncome > 0 && workingHours > 0) {
            let hourlyIncome = 0;

            if (incomeType === 'weekly') {
                hourlyIncome = otherIncome / workingHours;
            } else if (incomeType === 'monthly') {
                const monthlyWorkingHours = workingHours * 4;
                hourlyIncome = otherIncome / monthlyWorkingHours;
            } else if (incomeType === 'annual') {
                const annualWorkingHours = workingHours * 52;
                hourlyIncome = otherIncome / annualWorkingHours;
            }

            hourlyIncome = parseFloat(hourlyIncome.toFixed(2));
            calculatedIncomeSpan.textContent = hourlyIncome;
            calculatedIncomeSpan.nextSibling.textContent = ` ${currencySelect.value}/h`;
            calculatedIncomeDiv.style.display = 'block';

            // Update the calculated hourly income value
            hourlyIncomeInput.value = hourlyIncome;
        } else {
            calculatedIncomeDiv.style.display = 'none';
        }
    }

    saveBtn.addEventListener('click', () => {
        const selectedLanguage = languageSelect.value;
        const content = localizedContent[selectedLanguage];

        const incomeType = incomeTypeSelect.value;
        let hourlyIncome = 0;

        if (incomeType === 'hourly') {
            hourlyIncome = parseFloat(hourlyIncomeInput.value);
        } else {
            const otherIncome = parseFloat(otherIncomeInput.value);
            const workingHours = parseFloat(workingHoursInput.value);

            if (incomeType === 'weekly') {
                hourlyIncome = otherIncome / workingHours;
            } else if (incomeType === 'monthly') {
                hourlyIncome = otherIncome / (workingHours * 4);
            } else if (incomeType === 'annual') {
                hourlyIncome = otherIncome / (workingHours * 52);
            }

            hourlyIncome = parseFloat(hourlyIncome.toFixed(2));
            hourlyIncomeInput.value = hourlyIncome; // Update the field with the calculated hourly income
        }

        if (!hourlyIncome || isNaN(hourlyIncome) || hourlyIncome <= 0) {
            messageDiv.textContent = content.messages.invalidValues;
            messageDiv.className = 'message error';
            return;
        }

        // Show saving indicator
        saveBtn.textContent = content.saving;
        saveBtn.disabled = true;

        // Save data using chrome.storage.sync
        chrome.storage.sync.set(
            {
                hourlyIncome: hourlyIncome,
                incomeType: incomeTypeSelect.value,
                otherIncome: otherIncomeInput.value,
                workingHours: workingHoursInput.value,
                preferredLanguage: selectedLanguage,
                preferredCurrency: currencySelect.value,
            },
            () => {
                if (chrome.runtime.lastError) {
                    console.error('Error saving hourly income: ', chrome.runtime.lastError);
                    messageDiv.textContent = content.savedError;
                    messageDiv.className = 'message error';
                } else {
                    messageDiv.textContent = content.savedSuccess;
                    messageDiv.className = 'message success';
                }
                saveBtn.textContent = content.save;
                saveBtn.disabled = false;
            }
        );
    });

    // Initialize fields
    updateIncomeFields();
    updateLocalizedContent();
});

// Recupera lo stato di attivazione dell'estensione
chrome.storage.sync.get(['extensionEnabled'], (result) => {
    const extensionToggle = document.getElementById('extensionToggle');
    extensionToggle.checked = result.extensionEnabled !== undefined ? result.extensionEnabled : true;

    // Aggiungi event listener per l'interruttore
    extensionToggle.addEventListener('change', () => {
        const isEnabled = extensionToggle.checked;
        chrome.storage.sync.set({ extensionEnabled: isEnabled }, () => {
            console.log('Extension enabled status updated:', isEnabled);
        });
    });
});