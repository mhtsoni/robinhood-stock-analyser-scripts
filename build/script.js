// ==UserScript==
// @name         Robinhood Stock Ratings & Fair Value Fetcher
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Fetch analyst ratings and fair value data for stocks from Robinhood API and export to Excel
// @author       You
// @match        *://*.robinhood.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        unsafeWindow
// @require      https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js
// ==/UserScript==


(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

  // src/config.js
  var ROBINHOOD_API_BASE = "https://api.robinhood.com";
  var BATCH_SIZE = 50;
  var RATE_LIMIT_DELAY = 1e3;

  // src/utils.js
  function extractAuthToken(headers) {
    if (!headers)
      return null;
    if (headers instanceof Headers || headers.get && typeof headers.get === "function") {
      return headers.get("Authorization") || headers.get("authorization");
    }
    if (typeof headers === "object") {
      return headers["Authorization"] || headers["authorization"] || headers.Authorization || headers.authorization;
    }
    return null;
  }
  function showStatus(message, type = "info") {
    const statusDiv = document.getElementById("rh-status");
    statusDiv.textContent = message;
    statusDiv.style.display = "block";
    statusDiv.style.background = type === "error" ? "#fee" : type === "success" ? "#efe" : "#eef";
    statusDiv.style.color = type === "error" ? "#c00" : type === "success" ? "#0a0" : "#006";
  }
  function updateProgress(current, total, message) {
    const progressDiv = document.getElementById("rh-progress");
    const progressBar = document.getElementById("rh-progress-bar");
    const progressText = document.getElementById("rh-progress-text");
    progressDiv.style.display = "block";
    const percentage = total > 0 ? current / total * 100 : 0;
    progressBar.style.width = percentage + "%";
    progressText.textContent = message || `${current} / ${total}`;
  }

  // src/data.js
  function compileData(instrumentMappings, ratingsMap, fairValueMap, quotesMap = {}) {
    const compiled = [];
    instrumentMappings.forEach((mapping) => {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
      const instrumentId = mapping.instrumentId;
      const ratings = instrumentId ? ratingsMap[instrumentId] : null;
      const fairValue = instrumentId ? fairValueMap[instrumentId] : null;
      const quote = instrumentId ? quotesMap[instrumentId] : null;
      const row = {
        "Symbol": mapping.symbol,
        "Company Name": mapping.name,
        "Instrument ID": instrumentId || "N/A",
        "Buy Ratings": ((_a = ratings == null ? void 0 : ratings.summary) == null ? void 0 : _a.num_buy_ratings) || 0,
        "Hold Ratings": ((_b = ratings == null ? void 0 : ratings.summary) == null ? void 0 : _b.num_hold_ratings) || 0,
        "Sell Ratings": ((_c = ratings == null ? void 0 : ratings.summary) == null ? void 0 : _c.num_sell_ratings) || 0,
        "Total Ratings": (((_d = ratings == null ? void 0 : ratings.summary) == null ? void 0 : _d.num_buy_ratings) || 0) + (((_e = ratings == null ? void 0 : ratings.summary) == null ? void 0 : _e.num_hold_ratings) || 0) + (((_f = ratings == null ? void 0 : ratings.summary) == null ? void 0 : _f.num_sell_ratings) || 0),
        "Fair Value": ((_g = fairValue == null ? void 0 : fairValue.fair_value) == null ? void 0 : _g.value) || "N/A",
        "Fair Value Currency": ((_h = fairValue == null ? void 0 : fairValue.fair_value) == null ? void 0 : _h.currency_code) || "N/A",
        "Star Rating": (fairValue == null ? void 0 : fairValue.star_rating) || "N/A",
        "Economic Moat": (fairValue == null ? void 0 : fairValue.economic_moat) || "N/A",
        "Uncertainty": (fairValue == null ? void 0 : fairValue.uncertainty) || "N/A",
        "Stewardship": (fairValue == null ? void 0 : fairValue.stewardship) || "N/A",
        "Report Title": (fairValue == null ? void 0 : fairValue.report_title) || "N/A",
        "Report Published": (fairValue == null ? void 0 : fairValue.report_published_at) || "N/A",
        "Report Updated": (fairValue == null ? void 0 : fairValue.report_updated_at) || "N/A",
        "Quote Ask Price": (quote == null ? void 0 : quote.ask_price) || "N/A",
        "Quote Ask Size": (_i = quote == null ? void 0 : quote.ask_size) != null ? _i : "N/A",
        "Quote Ask Time": (quote == null ? void 0 : quote.venue_ask_time) || "N/A",
        "Quote Bid Price": (quote == null ? void 0 : quote.bid_price) || "N/A",
        "Quote Bid Size": (_j = quote == null ? void 0 : quote.bid_size) != null ? _j : "N/A",
        "Quote Bid Time": (quote == null ? void 0 : quote.venue_bid_time) || "N/A",
        "Quote Last Trade Price": (quote == null ? void 0 : quote.last_trade_price) || "N/A",
        "Quote Last Trade Time": (quote == null ? void 0 : quote.venue_last_trade_time) || "N/A",
        "Quote Extended Hours Price": (quote == null ? void 0 : quote.last_extended_hours_trade_price) || "N/A",
        "Quote Non Regular Price": (quote == null ? void 0 : quote.last_non_reg_trade_price) || "N/A",
        "Quote Non Regular Time": (quote == null ? void 0 : quote.venue_last_non_reg_trade_time) || "N/A",
        "Quote Previous Close": (quote == null ? void 0 : quote.previous_close) || "N/A",
        "Quote Adjusted Previous Close": (quote == null ? void 0 : quote.adjusted_previous_close) || "N/A",
        "Quote Previous Close Date": (quote == null ? void 0 : quote.previous_close_date) || "N/A",
        "Quote Trading Halted": (_k = quote == null ? void 0 : quote.trading_halted) != null ? _k : "N/A",
        "Quote Has Traded": (_l = quote == null ? void 0 : quote.has_traded) != null ? _l : "N/A",
        "Quote Last Trade Price Source": (quote == null ? void 0 : quote.last_trade_price_source) || "N/A",
        "Quote Non Regular Price Source": (quote == null ? void 0 : quote.last_non_reg_trade_price_source) || "N/A",
        "Quote Updated At": (quote == null ? void 0 : quote.updated_at) || "N/A",
        "Quote Instrument URL": (quote == null ? void 0 : quote.instrument) || "N/A",
        "Quote State": (quote == null ? void 0 : quote.state) || "N/A"
      };
      if ((ratings == null ? void 0 : ratings.ratings) && ratings.ratings.length > 0) {
        const buyRatings = ratings.ratings.filter((r) => r.type === "buy").map((r) => r.text);
        const sellRatings = ratings.ratings.filter((r) => r.type === "sell").map((r) => r.text);
        row["Buy Rating Reasons"] = buyRatings.join(" | ");
        row["Sell Rating Reasons"] = sellRatings.join(" | ");
      } else {
        row["Buy Rating Reasons"] = "N/A";
        row["Sell Rating Reasons"] = "N/A";
      }
      compiled.push(row);
    });
    return compiled;
  }

  // src/excel.js
  function generateExcel(data) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    const colWidths = [
      { wch: 10 },
      // Symbol
      { wch: 30 },
      // Company Name
      { wch: 40 },
      // Instrument ID
      { wch: 12 },
      // Buy Ratings
      { wch: 12 },
      // Hold Ratings
      { wch: 12 },
      // Sell Ratings
      { wch: 12 },
      // Total Ratings
      { wch: 15 },
      // Fair Value
      { wch: 10 },
      // Currency
      { wch: 12 },
      // Star Rating
      { wch: 15 },
      // Economic Moat
      { wch: 15 },
      // Uncertainty
      { wch: 15 },
      // Stewardship
      { wch: 50 },
      // Report Title
      { wch: 20 },
      // Report Published
      { wch: 20 },
      // Report Updated
      { wch: 80 },
      // Buy Rating Reasons
      { wch: 80 },
      // Sell Rating Reasons
      { wch: 15 },
      // Quote Ask Price
      { wch: 12 },
      // Quote Ask Size
      { wch: 24 },
      // Quote Ask Time
      { wch: 15 },
      // Quote Bid Price
      { wch: 12 },
      // Quote Bid Size
      { wch: 24 },
      // Quote Bid Time
      { wch: 15 },
      // Quote Last Trade Price
      { wch: 24 },
      // Quote Last Trade Time
      { wch: 15 },
      // Quote Extended Hours Price
      { wch: 15 },
      // Quote Non Regular Price
      { wch: 24 },
      // Quote Non Regular Time
      { wch: 15 },
      // Quote Previous Close
      { wch: 20 },
      // Quote Adjusted Previous Close
      { wch: 15 },
      // Quote Previous Close Date
      { wch: 15 },
      // Quote Trading Halted
      { wch: 15 },
      // Quote Has Traded
      { wch: 24 },
      // Quote Last Trade Price Source
      { wch: 30 },
      // Quote Non Regular Price Source
      { wch: 24 },
      // Quote Updated At
      { wch: 40 },
      // Quote Instrument URL
      { wch: 12 }
      // Quote State
    ];
    ws["!cols"] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, "Stock Ratings");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `robinhood_stock_ratings_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // src/api.js
  async function fetchWithAuth(url, requireAuth = false) {
    const baseHeaders = {
      "Accept": "*/*",
      "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
      "Origin": "https://robinhood.com",
      "Referer": "https://robinhood.com/",
      "X-Midlands-API-Version": "1.66.64"
    };
    if (requireAuth) {
      if (window.setupAuthTokenInterceptorFn) {
        window.setupAuthTokenInterceptorFn();
      }
      let cachedAuthToken2 = getCachedAuthToken();
      if (!cachedAuthToken2) {
        for (let i = 0; i < 5 && !cachedAuthToken2; i++) {
          await new Promise((resolve) => setTimeout(resolve, 200));
          if (window.setupAuthTokenInterceptorFn) {
            window.setupAuthTokenInterceptorFn();
          }
          cachedAuthToken2 = getCachedAuthToken();
        }
      }
      if (!cachedAuthToken2) {
        console.warn("\u26A0\uFE0F Auth token not captured yet. The page may need to make an API call first.");
      }
      if (cachedAuthToken2) {
        baseHeaders["Authorization"] = cachedAuthToken2;
      }
      baseHeaders["X-Hyper-Ex"] = "enabled";
      baseHeaders["X-Timezone-Id"] = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles";
      try {
        const pageWindow = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
        const response = await pageWindow.fetch(url, {
          method: "GET",
          credentials: "include",
          headers: baseHeaders
        });
        if (response.ok) {
          return await response.json();
        } else {
          const errorText = await response.text();
          if (response.status === 401 && !cachedAuthToken2) {
            console.warn("\u26A0\uFE0F 401 Unauthorized - Auth token not available. Please wait for the page to load fully and try again.");
          }
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
      } catch (error) {
        console.warn("Page fetch failed, trying GM_xmlhttpRequest:", error);
      }
    }
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url,
        headers: __spreadProps(__spreadValues({}, baseHeaders), {
          "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36"
        }),
        onload: function(response) {
          if (response.status >= 200 && response.status < 300) {
            try {
              resolve(JSON.parse(response.responseText));
            } catch (e) {
              resolve(response.responseText);
            }
          } else {
            reject(new Error(`HTTP ${response.status}: ${response.responseText}`));
          }
        },
        onerror: function(error) {
          reject(error);
        }
      });
    });
  }
  async function getRatings(instrumentIds) {
    if (instrumentIds.length === 0)
      return {};
    const ratingsMap = {};
    for (let i = 0; i < instrumentIds.length; i += BATCH_SIZE) {
      const batch = instrumentIds.slice(i, i + BATCH_SIZE);
      const idsParam = batch.join("%2C");
      const url = `${ROBINHOOD_API_BASE}/midlands/ratings/?ids=${idsParam}`;
      try {
        const data = await fetchWithAuth(url);
        if (data.results) {
          data.results.forEach((result) => {
            ratingsMap[result.instrument_id] = result;
          });
        }
      } catch (error) {
        console.error(`Error fetching ratings for batch:`, error);
      }
    }
    return ratingsMap;
  }
  async function getFairValue(instrumentId) {
    try {
      const url = `${ROBINHOOD_API_BASE}/discovery/ratings/${instrumentId}/overview/`;
      const data = await fetchWithAuth(url, true);
      return data;
    } catch (error) {
      console.error(`Error fetching fair value for ${instrumentId}:`, error);
      return null;
    }
  }
  async function getQuote(instrumentId) {
    if (!instrumentId) {
      return null;
    }
    try {
      const url = `${ROBINHOOD_API_BASE}/quotes/${instrumentId}/`;
      const data = await fetchWithAuth(url);
      return data;
    } catch (error) {
      console.error(`Error fetching quote for ${instrumentId}:`, error);
      return null;
    }
  }
  async function fetchStockData(capturedInstrumentIds2, updateProgress2, showStatus2) {
    const fetchBtn = document.getElementById("rh-fetch-btn");
    fetchBtn.disabled = true;
    fetchBtn.textContent = "Fetching...";
    try {
      const instrumentIds = Array.from(capturedInstrumentIds2.keys());
      const totalStocks = instrumentIds.length;
      if (totalStocks === 0) {
        showStatus2("No stocks captured yet", "error");
        return;
      }
      showStatus2(`Fetching data for ${totalStocks} stocks...`, "info");
      const instrumentMappings = Array.from(capturedInstrumentIds2.entries()).map(([id, info]) => ({
        symbol: info.symbol,
        instrumentId: id,
        name: info.name
      }));
      updateProgress2(0, totalStocks, "Fetching analyst ratings...");
      const ratingsMap = await getRatings(instrumentIds);
      updateProgress2(totalStocks, totalStocks, "Ratings fetched");
      updateProgress2(0, totalStocks, "Fetching latest quotes...");
      const quotesMap = {};
      for (let i = 0; i < instrumentIds.length; i++) {
        const instrumentId = instrumentIds[i];
        const quote = await getQuote(instrumentId);
        if (quote) {
          quotesMap[instrumentId] = quote;
        }
        updateProgress2(i + 1, totalStocks, `Fetched quotes ${i + 1}/${totalStocks}...`);
        if ((i + 1) % 10 === 0 && i + 1 < instrumentIds.length) {
          await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
        }
      }
      updateProgress2(0, totalStocks, "Fetching fair value data...");
      const fairValueMap = {};
      for (let i = 0; i < instrumentIds.length; i++) {
        const instrumentId = instrumentIds[i];
        const fairValue = await getFairValue(instrumentId);
        fairValueMap[instrumentId] = fairValue;
        updateProgress2(i + 1, totalStocks, `Fetched fair value ${i + 1}/${totalStocks}...`);
        if ((i + 1) % 10 === 0 && i + 1 < instrumentIds.length) {
          await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
        }
      }
      updateProgress2(0, 1, "Compiling data...");
      const compiledData = compileData(instrumentMappings, ratingsMap, fairValueMap, quotesMap);
      updateProgress2(1, 1, "Generating Excel file...");
      generateExcel(compiledData);
      showStatus2(`Successfully exported data for ${compiledData.length} stocks!`, "success");
      updateProgress2(compiledData.length, compiledData.length, "Complete!");
    } catch (error) {
      console.error("Error fetching stock data:", error);
      showStatus2(`Error: ${error.message}`, "error");
    } finally {
      fetchBtn.disabled = false;
      fetchBtn.textContent = "Download Excel";
    }
  }

  // src/auth.js
  var cachedAuthToken = null;
  function getCachedAuthToken() {
    return cachedAuthToken;
  }
  function setupAuthTokenInterceptor(capturedInstrumentIds2, updateInstrumentsCount2) {
    try {
      const pageWindow = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
      const originalFetch = pageWindow.fetch;
      if (originalFetch && !originalFetch._intercepted) {
        pageWindow.fetch = function(input, init = {}) {
          let url = "";
          let headers = null;
          if (typeof input === "string") {
            url = input;
            headers = init.headers;
          } else if (input instanceof Request) {
            url = input.url;
            headers = input.headers;
            if (init.headers) {
              const mergedHeaders = new Headers(input.headers);
              if (init.headers instanceof Headers) {
                init.headers.forEach((value, key) => mergedHeaders.set(key, value));
              } else if (typeof init.headers === "object") {
                Object.entries(init.headers).forEach(([key, value]) => mergedHeaders.set(key, value));
              }
              headers = mergedHeaders;
            }
          }
          if (url && url.includes("api.robinhood.com")) {
            const isQuotesCall = url.includes("/marketdata/quotes/") || url.includes("/quotes/");
            const isMarketDataCall = url.includes("marketdata");
            if (isQuotesCall || isMarketDataCall) {
              console.log("\u{1F50D} [INTERCEPTOR] Robinhood API call detected:", {
                fullUrl: url,
                isQuotesCall,
                isMarketDataCall,
                method: (init == null ? void 0 : init.method) || "GET",
                hasIds: url.includes("ids="),
                urlLength: url.length
              });
            }
            if (headers) {
              const authHeader = extractAuthToken(headers);
              if (authHeader && authHeader.startsWith("Bearer ") && !cachedAuthToken) {
                cachedAuthToken = authHeader;
                console.log("\u2705 Captured auth token from page fetch");
              }
            }
            const isQuotesEndpoint = url.includes("/marketdata/quotes/") || url.includes("/quotes/") || url.includes("/marketdata/") && url.includes("quote");
            if (isQuotesEndpoint) {
              console.log("\u{1F50D} [QUOTES] Quotes endpoint detected, checking for IDs...");
              let idsParam = null;
              let ids = [];
              try {
                const urlObj = new URL(url);
                idsParam = urlObj.searchParams.get("ids") || urlObj.searchParams.get("ids[]") || urlObj.searchParams.get("instrument_ids");
                console.log("\u{1F50D} [QUOTES] URL params check:", {
                  hasIdsParam: !!urlObj.searchParams.get("ids"),
                  hasIdsArray: !!urlObj.searchParams.get("ids[]"),
                  hasInstrumentIds: !!urlObj.searchParams.get("instrument_ids"),
                  idsParam: idsParam ? idsParam.substring(0, 100) + (idsParam.length > 100 ? "..." : "") : null,
                  allParams: Array.from(urlObj.searchParams.keys())
                });
                if (!idsParam) {
                  const idsMatch = url.match(/[?&]ids=([^&]+)/i);
                  if (idsMatch) {
                    idsParam = idsMatch[1];
                    console.log("\u{1F50D} [QUOTES] Extracted IDs via regex:", idsParam.substring(0, 100));
                  }
                }
                const pathIdsMatch = url.match(/\/quotes\/([^/?]+)/);
                if (pathIdsMatch && !idsParam) {
                  console.log("\u{1F50D} [QUOTES] Found IDs in path:", pathIdsMatch[1]);
                  idsParam = pathIdsMatch[1];
                }
                if (idsParam) {
                  ids = idsParam.split(/%2[Cc]|[,;]/).map((id) => {
                    try {
                      return decodeURIComponent(id.trim());
                    } catch (e) {
                      console.warn("\u{1F50D} [QUOTES] Failed to decode ID:", id, e);
                      return id.trim();
                    }
                  }).filter((id) => id && id.length > 0);
                  console.log("\u{1F50D} [QUOTES] Parsed IDs:", {
                    count: ids.length,
                    ids: ids.length > 0 ? ids.slice(0, 5) : [],
                    totalLength: ids.length
                  });
                  let newIdsCount = 0;
                  ids.forEach((id) => {
                    if (id && !capturedInstrumentIds2.has(id)) {
                      capturedInstrumentIds2.set(id, { symbol: "Loading...", name: "Loading...", instrumentId: id });
                      newIdsCount++;
                      console.log("\u{1F4CA} [QUOTES] Added new instrument ID:", id);
                    } else if (id) {
                      console.log("\u{1F4CA} [QUOTES] Instrument ID already captured:", id);
                    }
                  });
                  if (newIdsCount > 0) {
                    updateInstrumentsCount2(capturedInstrumentIds2);
                    console.log(`\u{1F4CA} [QUOTES] Captured ${newIdsCount} new instrument IDs from quotes API (total: ${capturedInstrumentIds2.size})`);
                  } else if (ids.length > 0) {
                    console.log(`\u{1F4CA} [QUOTES] All ${ids.length} IDs were already captured (total: ${capturedInstrumentIds2.size})`);
                  }
                } else {
                  console.warn("\u26A0\uFE0F [QUOTES] No IDs parameter found in URL:", url);
                  console.log("\u{1F50D} [QUOTES] Full URL for analysis:", url);
                }
                const fetchPromise = originalFetch.apply(this, arguments);
                fetchPromise.then(async (response) => {
                  console.log("\u{1F50D} [QUOTES] Response received:", {
                    ok: response.ok,
                    status: response.status,
                    statusText: response.statusText,
                    url: response.url
                  });
                  if (response.ok) {
                    try {
                      const data = await response.clone().json();
                      console.log("\u{1F50D} [QUOTES] Response data structure:", {
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
                            const existing = capturedInstrumentIds2.get(result.instrument_id);
                            capturedInstrumentIds2.set(result.instrument_id, {
                              symbol: result.symbol,
                              name: (existing == null ? void 0 : existing.name) || result.symbol,
                              // Keep existing name if better
                              instrumentId: result.instrument_id
                            });
                            updatedCount++;
                            console.log(`\u2705 [QUOTES] Updated instrument ${index + 1}/${data.results.length}:`, {
                              instrumentId: result.instrument_id,
                              symbol: result.symbol
                            });
                          } else {
                            console.warn(`\u26A0\uFE0F [QUOTES] Result ${index + 1} missing required fields:`, {
                              hasInstrumentId: !!result.instrument_id,
                              hasSymbol: !!result.symbol,
                              keys: Object.keys(result)
                            });
                          }
                        });
                        updateInstrumentsCount2(capturedInstrumentIds2);
                        console.log(`\u2705 [QUOTES] Updated ${updatedCount} instruments with symbols from quotes response`);
                        setTimeout(async () => {
                          for (const [id, info] of capturedInstrumentIds2.entries()) {
                            if (info.name === "Loading..." || info.name === info.symbol) {
                              try {
                                const instrumentUrl = `${ROBINHOOD_API_BASE}/instruments/${id}/`;
                                const instrumentData = await fetchWithAuth(instrumentUrl);
                                if (instrumentData && instrumentData.name) {
                                  info.name = instrumentData.name || instrumentData.simple_name || info.symbol;
                                  capturedInstrumentIds2.set(id, info);
                                  updateInstrumentsCount2(capturedInstrumentIds2);
                                }
                              } catch (e) {
                                console.warn(`\u26A0\uFE0F [QUOTES] Failed to fetch instrument name for ${id}:`, e);
                              }
                            }
                          }
                        }, 100);
                      } else {
                        console.warn("\u26A0\uFE0F [QUOTES] Response data does not have expected structure:", {
                          dataType: typeof data,
                          dataKeys: Object.keys(data),
                          dataPreview: JSON.stringify(data).substring(0, 200)
                        });
                      }
                    } catch (e) {
                      console.error("\u274C [QUOTES] Could not parse quotes response:", e, {
                        errorMessage: e.message,
                        errorStack: e.stack
                      });
                    }
                  } else {
                    console.warn("\u26A0\uFE0F [QUOTES] Response not OK:", {
                      status: response.status,
                      statusText: response.statusText
                    });
                  }
                }).catch((error) => {
                  console.error("\u274C [QUOTES] Error handling response:", error);
                });
                return fetchPromise;
              } catch (e) {
                console.error("\u274C [QUOTES] Error parsing quotes URL:", {
                  error: e,
                  errorMessage: e.message,
                  url,
                  errorStack: e.stack
                });
              }
            }
          }
          return originalFetch.apply(this, arguments);
        };
        pageWindow.fetch._intercepted = true;
        console.log("\u2705 [INTERCEPTOR] Auth token and quotes interceptor set up successfully");
        console.log("\u{1F50D} [INTERCEPTOR] Monitoring for:", {
          apiBase: "api.robinhood.com",
          quotesEndpoints: ["/marketdata/quotes/", "/quotes/", "marketdata with quote"],
          idParams: ["ids", "ids[]", "instrument_ids"]
        });
      }
      const originalXHROpen = pageWindow.XMLHttpRequest.prototype.open;
      const originalXHRSend = pageWindow.XMLHttpRequest.prototype.send;
      if (originalXHROpen && !originalXHROpen._intercepted) {
        pageWindow.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
          this._url = url;
          const isQuotesCall = url && (url.includes("/marketdata/quotes/") || url.includes("/quotes/"));
          if (isQuotesCall) {
            console.log("\u{1F50D} [XHR] Opening quotes XHR request:", { method, url });
          }
          return originalXHROpen.apply(this, [method, url, ...rest]);
        };
        pageWindow.XMLHttpRequest.prototype.send = function(...args) {
          var _a, _b;
          if (this._url && this._url.includes("api.robinhood.com")) {
            const isQuotesCall = this._url.includes("/marketdata/quotes/") || this._url.includes("/quotes/");
            if (isQuotesCall) {
              console.log("\u{1F50D} [XHR] Quotes API call via XHR:", {
                url: this._url,
                hasIds: this._url.includes("ids=")
              });
            }
            const authHeader = ((_a = this.getRequestHeader) == null ? void 0 : _a.call(this, "Authorization")) || ((_b = this.getRequestHeader) == null ? void 0 : _b.call(this, "authorization"));
            if (authHeader && authHeader.startsWith("Bearer ") && !cachedAuthToken) {
              cachedAuthToken = authHeader;
              console.log("\u2705 Captured auth token from XHR");
            }
            if (isQuotesCall) {
              const originalOnReadyStateChange = this.onreadystatechange;
              this.onreadystatechange = function() {
                if (this.readyState === 4 && this.status === 200) {
                  try {
                    const data = JSON.parse(this.responseText);
                    console.log("\u{1F50D} [XHR] Quotes response received via XHR:", {
                      hasResults: !!data.results,
                      resultsCount: data.results ? data.results.length : 0
                    });
                    if (data.results && Array.isArray(data.results)) {
                      data.results.forEach((result) => {
                        if (result.instrument_id && result.symbol) {
                          if (!capturedInstrumentIds2.has(result.instrument_id)) {
                            capturedInstrumentIds2.set(result.instrument_id, {
                              symbol: result.symbol,
                              name: result.symbol,
                              instrumentId: result.instrument_id
                            });
                            console.log("\u{1F4CA} [XHR] Captured instrument ID:", result.instrument_id, result.symbol);
                          }
                        }
                      });
                      updateInstrumentsCount2(capturedInstrumentIds2);
                    }
                  } catch (e) {
                    console.warn("\u26A0\uFE0F [XHR] Failed to parse quotes response:", e);
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
      console.warn("Could not intercept fetch/XHR:", e);
    }
    return cachedAuthToken;
  }

  // src/ui.js
  function updateInstrumentsCount(capturedInstrumentIds2) {
    const countDiv = document.getElementById("rh-instruments-count");
    if (countDiv) {
      const count = capturedInstrumentIds2.size;
      if (count > 0) {
        countDiv.textContent = `\u{1F4CA} ${count} stock${count !== 1 ? "s" : ""} captured from quotes API`;
      } else {
        countDiv.textContent = "\u{1F4CA} Monitoring quotes API calls... (0 stocks captured)";
      }
    } else {
      console.log(`\u{1F4CA} Instruments captured: ${capturedInstrumentIds2.size} (UI not ready yet)`);
    }
  }
  function updateAuthStatus(cachedAuthToken2, capturedInstrumentIds2) {
    const authStatusDiv = document.getElementById("rh-auth-status");
    const authStatusText = document.getElementById("rh-auth-status-text");
    if (authStatusDiv && authStatusText) {
      if (cachedAuthToken2) {
        authStatusDiv.style.display = "block";
        authStatusDiv.style.background = "#d4edda";
        authStatusDiv.style.color = "#155724";
        authStatusText.textContent = "\u2705 Authentication token ready";
      } else {
        authStatusDiv.style.display = "block";
        authStatusDiv.style.background = "#fff3cd";
        authStatusDiv.style.color = "#856404";
        authStatusText.textContent = "\u23F3 Waiting for authentication token... (Navigate to a stock page if needed)";
      }
    }
    updateInstrumentsCount(capturedInstrumentIds2);
  }
  function createUI(capturedInstrumentIds2, fetchStockDataFn) {
    const container = document.createElement("div");
    container.id = "rh-stock-fetcher";
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
            <button id="rh-close-btn" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #666;">\xD7</button>
        </div>
        <div id="rh-auth-status" style="margin-bottom: 10px; padding: 8px; border-radius: 4px; font-size: 12px; background: #fff3cd; color: #856404; display: none;">
            <span id="rh-auth-status-text">Waiting for authentication token...</span>
        </div>
        <div id="rh-instruments-status" style="margin-bottom: 10px; padding: 8px; border-radius: 4px; font-size: 12px; background: #e7f3ff; color: #004085; display: block;">
            <span id="rh-instruments-count">\u{1F4CA} Monitoring quotes API calls... (0 stocks captured)</span>
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
    document.getElementById("rh-close-btn").addEventListener("click", () => {
      container.remove();
    });
    document.getElementById("rh-fetch-btn").addEventListener("click", async () => {
      if (capturedInstrumentIds2.size === 0) {
        showStatus("No stocks captured yet. Please wait for quotes API calls or navigate to stock pages.", "error");
        return;
      }
      await fetchStockDataFn(capturedInstrumentIds2, updateProgress, showStatus);
    });
  }

  // src/main.js
  var capturedInstrumentIds = /* @__PURE__ */ new Map();
  window.capturedInstrumentIds = capturedInstrumentIds;
  window.updateInstrumentsCount = () => updateInstrumentsCount(capturedInstrumentIds);
  window.setupAuthTokenInterceptorFn = () => setupAuthTokenInterceptor(capturedInstrumentIds, updateInstrumentsCount);
  setupAuthTokenInterceptor(capturedInstrumentIds, updateInstrumentsCount);
  function updateAuthStatusPeriodic() {
    updateAuthStatus(getCachedAuthToken(), capturedInstrumentIds);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      createUI(capturedInstrumentIds, fetchStockData);
      updateAuthStatusPeriodic();
      setInterval(() => {
        setupAuthTokenInterceptor(capturedInstrumentIds, updateInstrumentsCount);
        updateAuthStatusPeriodic();
      }, 2e3);
    });
  } else {
    createUI(capturedInstrumentIds, fetchStockData);
    updateAuthStatusPeriodic();
    setInterval(() => {
      setupAuthTokenInterceptor(capturedInstrumentIds, updateInstrumentsCount);
      updateAuthStatusPeriodic();
    }, 2e3);
  }
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === "R") {
      e.preventDefault();
      const existing = document.getElementById("rh-stock-fetcher");
      if (existing) {
        existing.remove();
      } else {
        createUI(capturedInstrumentIds, fetchStockData);
      }
    }
  });
})();
