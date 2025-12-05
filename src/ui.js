import { updateProgress, showStatus } from './utils.js';

// Update instruments count display
export function updateInstrumentsCount(capturedInstrumentIds) {
    const countDiv = document.getElementById('rh-instruments-count');
    if (countDiv) {
        const count = capturedInstrumentIds.size;
        if (count > 0) {
            countDiv.textContent = `📊 ${count} stock${count !== 1 ? 's' : ''} captured from quotes API`;
        } else {
            countDiv.textContent = '📊 Monitoring quotes API calls... (0 stocks captured)';
        }
    } else {
        // UI not ready yet, will update when it's created
        console.log(`📊 Instruments captured: ${capturedInstrumentIds.size} (UI not ready yet)`);
    }
}

export function updateAuthStatus(cachedAuthToken, capturedInstrumentIds) {
    const authStatusDiv = document.getElementById('rh-auth-status');
    const authStatusText = document.getElementById('rh-auth-status-text');

    if (authStatusDiv && authStatusText) {
        if (cachedAuthToken) {
            authStatusDiv.style.display = 'block';
            authStatusDiv.style.background = '#d4edda';
            authStatusDiv.style.color = '#155724';
            authStatusText.textContent = '✅ Authentication token ready';
        } else {
            authStatusDiv.style.display = 'block';
            authStatusDiv.style.background = '#fff3cd';
            authStatusDiv.style.color = '#856404';
            authStatusText.textContent = '⏳ Waiting for authentication token... (Navigate to a stock page if needed)';
        }
    }

    // Also update instruments count
    updateInstrumentsCount(capturedInstrumentIds);
}

// Create UI
export function createUI(capturedInstrumentIds, fetchStockDataFn) {
    const container = document.createElement('div');
    container.id = 'rh-stock-fetcher';
    container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 400px;
        background: white;
        border: 2px solid #00c805;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h3 style="margin: 0; color: #00c805;">Stock Data Fetcher</h3>
            <button id="rh-close-btn" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #666;">×</button>
        </div>
        <div id="rh-auth-status" style="margin-bottom: 10px; padding: 8px; border-radius: 4px; font-size: 12px; background: #fff3cd; color: #856404; display: none;">
            <span id="rh-auth-status-text">Waiting for authentication token...</span>
        </div>
        <div id="rh-instruments-status" style="margin-bottom: 10px; padding: 8px; border-radius: 4px; font-size: 12px; background: #e7f3ff; color: #004085; display: block;">
            <span id="rh-instruments-count">📊 Monitoring quotes API calls... (0 stocks captured)</span>
        </div>
        <button id="rh-fetch-btn" style="width: 100%; margin-top: 10px; padding: 12px; background: #00c805; color: white; border: none; border-radius: 4px; font-size: 16px; font-weight: bold; cursor: pointer;">
            Download Excel
        </button>
        <div id="rh-status" style="margin-top: 15px; padding: 10px; border-radius: 4px; display: none;"></div>
        <div id="rh-progress" style="margin-top: 10px; display: none;">
            <div style="background: #f0f0f0; border-radius: 4px; height: 20px; overflow: hidden;">
                <div id="rh-progress-bar" style="background: #00c805; height: 100%; width: 0%; transition: width 0.3s;"></div>
            </div>
            <div id="rh-progress-text" style="margin-top: 5px; font-size: 12px; color: #666;"></div>
        </div>
    `;

    document.body.appendChild(container);

    // Close button
    document.getElementById('rh-close-btn').addEventListener('click', () => {
        container.remove();
    });

    // Fetch button
    document.getElementById('rh-fetch-btn').addEventListener('click', async () => {
        if (capturedInstrumentIds.size === 0) {
            showStatus('No stocks captured yet. Please wait for quotes API calls or navigate to stock pages.', 'error');
            return;
        }

        await fetchStockDataFn(capturedInstrumentIds, updateProgress, showStatus);
    });
}

