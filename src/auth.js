import { ROBINHOOD_API_BASE } from './config.js';
import { extractAuthToken } from './utils.js';
import { fetchWithAuth } from './api.js';

// Cache for authorization token
let cachedAuthToken = null;

export function getCachedAuthToken() {
    return cachedAuthToken;
}

export function setCachedAuthToken(token) {
    cachedAuthToken = token;
}

// Intercept fetch to capture authorization token and instrument IDs
export function setupAuthTokenInterceptor(capturedInstrumentIds, updateInstrumentsCount) {
    try {
        const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
        const originalFetch = pageWindow.fetch;

        // Always set up interceptor if not already done (don't return early)
        if (originalFetch && !originalFetch._intercepted) {
            pageWindow.fetch = function(input, init = {}) {
                let url = '';
                let headers = null;

                // Handle Request object or URL string
                if (typeof input === 'string') {
                    url = input;
                    headers = init.headers;
                } else if (input instanceof Request) {
                    url = input.url;
                    headers = input.headers;
                    // Merge with init headers if provided
                    if (init.headers) {
                        const mergedHeaders = new Headers(input.headers);
                        if (init.headers instanceof Headers) {
                            init.headers.forEach((value, key) => mergedHeaders.set(key, value));
                        } else if (typeof init.headers === 'object') {
                            Object.entries(init.headers).forEach(([key, value]) => mergedHeaders.set(key, value));
                        }
                        headers = mergedHeaders;
                    }
                }

                // Check if this is a Robinhood API call with auth
                if (url && url.includes('api.robinhood.com')) {
                    // Debug: log all Robinhood API calls
                    const isQuotesCall = url.includes('/marketdata/quotes/') || url.includes('/quotes/');
                    const isMarketDataCall = url.includes('marketdata');
                    
                    if (isQuotesCall || isMarketDataCall) {
                        console.log('🔍 [INTERCEPTOR] Robinhood API call detected:', {
                            fullUrl: url,
                            isQuotesCall,
                            isMarketDataCall,
                            method: init?.method || 'GET',
                            hasIds: url.includes('ids='),
                            urlLength: url.length
                        });
                    }
                    
                    if (headers) {
                        const authHeader = extractAuthToken(headers);
                        if (authHeader && authHeader.startsWith('Bearer ') && !cachedAuthToken) {
                            cachedAuthToken = authHeader;
                            console.log('✅ Captured auth token from page fetch');
                        }
                    }

                    // Intercept quotes API calls to capture instrument IDs
                    // Check for multiple possible URL patterns
                    const isQuotesEndpoint = url.includes('/marketdata/quotes/') || 
                                           url.includes('/quotes/') || 
                                           url.includes('/marketdata/') && url.includes('quote');
                    
                    if (isQuotesEndpoint) {
                        console.log('🔍 [QUOTES] Quotes endpoint detected, checking for IDs...');
                        
                        // Try multiple ways to extract IDs from URL
                        let idsParam = null;
                        let ids = [];
                        
                        try {
                            // Method 1: Standard URL parsing
                            const urlObj = new URL(url);
                            idsParam = urlObj.searchParams.get('ids') || 
                                      urlObj.searchParams.get('ids[]') ||
                                      urlObj.searchParams.get('instrument_ids');
                            
                            console.log('🔍 [QUOTES] URL params check:', {
                                hasIdsParam: !!urlObj.searchParams.get('ids'),
                                hasIdsArray: !!urlObj.searchParams.get('ids[]'),
                                hasInstrumentIds: !!urlObj.searchParams.get('instrument_ids'),
                                idsParam: idsParam ? idsParam.substring(0, 100) + (idsParam.length > 100 ? '...' : '') : null,
                                allParams: Array.from(urlObj.searchParams.keys())
                            });
                            
                            // Method 2: Try regex extraction if standard parsing doesn't work
                            if (!idsParam) {
                                const idsMatch = url.match(/[?&]ids=([^&]+)/i);
                                if (idsMatch) {
                                    idsParam = idsMatch[1];
                                    console.log('🔍 [QUOTES] Extracted IDs via regex:', idsParam.substring(0, 100));
                                }
                            }
                            
                            // Method 3: Check if IDs are in the path
                            const pathIdsMatch = url.match(/\/quotes\/([^/?]+)/);
                            if (pathIdsMatch && !idsParam) {
                                console.log('🔍 [QUOTES] Found IDs in path:', pathIdsMatch[1]);
                                idsParam = pathIdsMatch[1];
                            }
                            
                            if (idsParam) {
                                // Split by %2C (URL-encoded comma), %2c (lowercase), comma, or semicolon
                                ids = idsParam.split(/%2[Cc]|[,;]/)
                                    .map(id => {
                                        try {
                                            return decodeURIComponent(id.trim());
                                        } catch (e) {
                                            console.warn('🔍 [QUOTES] Failed to decode ID:', id, e);
                                            return id.trim();
                                        }
                                    })
                                    .filter(id => id && id.length > 0);
                                
                                console.log('🔍 [QUOTES] Parsed IDs:', {
                                    count: ids.length,
                                    ids: ids.length > 0 ? ids.slice(0, 5) : [],
                                    totalLength: ids.length
                                });
                                
                                let newIdsCount = 0;
                                ids.forEach(id => {
                                    if (id && !capturedInstrumentIds.has(id)) {
                                        // Store with placeholder data, will be updated from response
                                        capturedInstrumentIds.set(id, { symbol: 'Loading...', name: 'Loading...', instrumentId: id });
                                        newIdsCount++;
                                        console.log('📊 [QUOTES] Added new instrument ID:', id);
                                    } else if (id) {
                                        console.log('📊 [QUOTES] Instrument ID already captured:', id);
                                    }
                                });
                                
                                if (newIdsCount > 0) {
                                    updateInstrumentsCount(capturedInstrumentIds);
                                    console.log(`📊 [QUOTES] Captured ${newIdsCount} new instrument IDs from quotes API (total: ${capturedInstrumentIds.size})`);
                                } else if (ids.length > 0) {
                                    console.log(`📊 [QUOTES] All ${ids.length} IDs were already captured (total: ${capturedInstrumentIds.size})`);
                                }
                            } else {
                                console.warn('⚠️ [QUOTES] No IDs parameter found in URL:', url);
                                // Log the full URL for debugging
                                console.log('🔍 [QUOTES] Full URL for analysis:', url);
                            }

                            // Intercept the response to get symbol and name
                            const fetchPromise = originalFetch.apply(this, arguments);
                            fetchPromise.then(async (response) => {
                                console.log('🔍 [QUOTES] Response received:', {
                                    ok: response.ok,
                                    status: response.status,
                                    statusText: response.statusText,
                                    url: response.url
                                });
                                
                                if (response.ok) {
                                    try {
                                        const data = await response.clone().json();
                                        console.log('🔍 [QUOTES] Response data structure:', {
                                            hasResults: !!data.results,
                                            resultsIsArray: Array.isArray(data.results),
                                            resultsCount: data.results ? data.results.length : 0,
                                            dataKeys: Object.keys(data),
                                            firstResult: data.results && data.results[0] ? {
                                                keys: Object.keys(data.results[0]),
                                                hasInstrumentId: !!data.results[0].instrument_id,
                                                hasSymbol: !!data.results[0].symbol,
                                                instrumentId: data.results[0].instrument_id,
                                                symbol: data.results[0].symbol
                                            } : null
                                        });
                                        
                                        if (data.results && Array.isArray(data.results)) {
                                            let updatedCount = 0;
                                            data.results.forEach((result, index) => {
                                                if (result.instrument_id && result.symbol) {
                                                    const existing = capturedInstrumentIds.get(result.instrument_id);
                                                    capturedInstrumentIds.set(result.instrument_id, {
                                                        symbol: result.symbol,
                                                        name: existing?.name || result.symbol, // Keep existing name if better
                                                        instrumentId: result.instrument_id
                                                    });
                                                    updatedCount++;
                                                    console.log(`✅ [QUOTES] Updated instrument ${index + 1}/${data.results.length}:`, {
                                                        instrumentId: result.instrument_id,
                                                        symbol: result.symbol
                                                    });
                                                } else {
                                                    console.warn(`⚠️ [QUOTES] Result ${index + 1} missing required fields:`, {
                                                        hasInstrumentId: !!result.instrument_id,
                                                        hasSymbol: !!result.symbol,
                                                        keys: Object.keys(result)
                                                    });
                                                }
                                            });
                                            
                                            updateInstrumentsCount(capturedInstrumentIds);
                                            console.log(`✅ [QUOTES] Updated ${updatedCount} instruments with symbols from quotes response`);

                                            // Try to get names for all captured instruments (async, don't block)
                                            setTimeout(async () => {
                                                for (const [id, info] of capturedInstrumentIds.entries()) {
                                                    if (info.name === 'Loading...' || info.name === info.symbol) {
                                                        try {
                                                            const instrumentUrl = `${ROBINHOOD_API_BASE}/instruments/${id}/`;
                                                            const instrumentData = await fetchWithAuth(instrumentUrl);
                                                            if (instrumentData && instrumentData.name) {
                                                                info.name = instrumentData.name || instrumentData.simple_name || info.symbol;
                                                                capturedInstrumentIds.set(id, info);
                                                                updateInstrumentsCount(capturedInstrumentIds);
                                                            }
                                                        } catch (e) {
                                                            console.warn(`⚠️ [QUOTES] Failed to fetch instrument name for ${id}:`, e);
                                                        }
                                                    }
                                                }
                                            }, 100);
                                        } else {
                                            console.warn('⚠️ [QUOTES] Response data does not have expected structure:', {
                                                dataType: typeof data,
                                                dataKeys: Object.keys(data),
                                                dataPreview: JSON.stringify(data).substring(0, 200)
                                            });
                                        }
                                    } catch (e) {
                                        console.error('❌ [QUOTES] Could not parse quotes response:', e, {
                                            errorMessage: e.message,
                                            errorStack: e.stack
                                        });
                                    }
                                } else {
                                    console.warn('⚠️ [QUOTES] Response not OK:', {
                                        status: response.status,
                                        statusText: response.statusText
                                    });
                                }
                            }).catch((error) => {
                                console.error('❌ [QUOTES] Error handling response:', error);
                            });
                            return fetchPromise;
                        } catch (e) {
                            console.error('❌ [QUOTES] Error parsing quotes URL:', {
                                error: e,
                                errorMessage: e.message,
                                url: url,
                                errorStack: e.stack
                            });
                        }
                    }
                }

                return originalFetch.apply(this, arguments);
            };
            pageWindow.fetch._intercepted = true;
            console.log('✅ [INTERCEPTOR] Auth token and quotes interceptor set up successfully');
            console.log('🔍 [INTERCEPTOR] Monitoring for:', {
                apiBase: 'api.robinhood.com',
                quotesEndpoints: ['/marketdata/quotes/', '/quotes/', 'marketdata with quote'],
                idParams: ['ids', 'ids[]', 'instrument_ids']
            });
        }

        // Also intercept XMLHttpRequest as fallback
        const originalXHROpen = pageWindow.XMLHttpRequest.prototype.open;
        const originalXHRSend = pageWindow.XMLHttpRequest.prototype.send;

        if (originalXHROpen && !originalXHROpen._intercepted) {
            pageWindow.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
                this._url = url;
                const isQuotesCall = url && (url.includes('/marketdata/quotes/') || url.includes('/quotes/'));
                if (isQuotesCall) {
                    console.log('🔍 [XHR] Opening quotes XHR request:', { method, url });
                }
                return originalXHROpen.apply(this, [method, url, ...rest]);
            };

            pageWindow.XMLHttpRequest.prototype.send = function(...args) {
                if (this._url && this._url.includes('api.robinhood.com')) {
                    const isQuotesCall = this._url.includes('/marketdata/quotes/') || this._url.includes('/quotes/');
                    
                    if (isQuotesCall) {
                        console.log('🔍 [XHR] Quotes API call via XHR:', {
                            url: this._url,
                            hasIds: this._url.includes('ids=')
                        });
                    }
                    
                    const authHeader = this.getRequestHeader?.('Authorization') ||
                                     this.getRequestHeader?.('authorization');
                    if (authHeader && authHeader.startsWith('Bearer ') && !cachedAuthToken) {
                        cachedAuthToken = authHeader;
                        console.log('✅ Captured auth token from XHR');
                    }
                    
                    // Try to intercept XHR responses for quotes
                    if (isQuotesCall) {
                        const originalOnReadyStateChange = this.onreadystatechange;
                        this.onreadystatechange = function() {
                            if (this.readyState === 4 && this.status === 200) {
                                try {
                                    const data = JSON.parse(this.responseText);
                                    console.log('🔍 [XHR] Quotes response received via XHR:', {
                                        hasResults: !!data.results,
                                        resultsCount: data.results ? data.results.length : 0
                                    });
                                    
                                    if (data.results && Array.isArray(data.results)) {
                                        data.results.forEach(result => {
                                            if (result.instrument_id && result.symbol) {
                                                if (!capturedInstrumentIds.has(result.instrument_id)) {
                                                    capturedInstrumentIds.set(result.instrument_id, {
                                                        symbol: result.symbol,
                                                        name: result.symbol,
                                                        instrumentId: result.instrument_id
                                                    });
                                                    console.log('📊 [XHR] Captured instrument ID:', result.instrument_id, result.symbol);
                                                }
                                            }
                                        });
                                        updateInstrumentsCount(capturedInstrumentIds);
                                    }
                                } catch (e) {
                                    console.warn('⚠️ [XHR] Failed to parse quotes response:', e);
                                }
                            }
                            if (originalOnReadyStateChange) {
                                originalOnReadyStateChange.apply(this, arguments);
                            }
                        };
                    }
                }
                return originalXHRSend.apply(this, args);
            };
            originalXHROpen._intercepted = true;
        }
    } catch (e) {
        console.warn('Could not intercept fetch/XHR:', e);
    }

    return cachedAuthToken;
}

