chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ hourlyIncome: 0 }, () => {
      console.log('Hourly income set to 0 as default.');
    });
  });
  