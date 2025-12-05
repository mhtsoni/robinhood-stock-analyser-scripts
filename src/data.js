// Data compilation functions

export function compileData(instrumentMappings, ratingsMap, fairValueMap, quotesMap = {}) {
    const compiled = [];

    instrumentMappings.forEach(mapping => {
        const instrumentId = mapping.instrumentId;
        const ratings = instrumentId ? ratingsMap[instrumentId] : null;
        const fairValue = instrumentId ? fairValueMap[instrumentId] : null;
        const quote = instrumentId ? quotesMap[instrumentId] : null;

        const row = {
            'Symbol': mapping.symbol,
            // 'Company Name': mapping.name,
            // 'Instrument ID': instrumentId || 'N/A',
            // 'Buy Ratings': ratings?.summary?.num_buy_ratings || 0,
            // 'Hold Ratings': ratings?.summary?.num_hold_ratings || 0,
            // 'Sell Ratings': ratings?.summary?.num_sell_ratings || 0,
            'Total Ratings': (ratings?.summary?.num_buy_ratings || 0) +
                            (ratings?.summary?.num_hold_ratings || 0) +
                            (ratings?.summary?.num_sell_ratings || 0),
            'Fair Value': fairValue?.fair_value?.value || 'N/A',
            // 'Fair Value Currency': fairValue?.fair_value?.currency_code || 'N/A',
            'Star Rating': fairValue?.star_rating || 'N/A',
            'Economic Moat': fairValue?.economic_moat || 'N/A',
            'Uncertainty': fairValue?.uncertainty || 'N/A',
            'Stewardship': fairValue?.stewardship || 'N/A',
            // 'Report Title': fairValue?.report_title || 'N/A',
            // 'Report Published': fairValue?.report_published_at || 'N/A',
            // 'Report Updated': fairValue?.report_updated_at || 'N/A',
            // 'Quote Ask Price': quote?.ask_price || 'N/A',
            // 'Quote Ask Size': quote?.ask_size ?? 'N/A',
            // 'Quote Ask Time': quote?.venue_ask_time || 'N/A',
            // 'Quote Bid Price': quote?.bid_price || 'N/A',
            // 'Quote Bid Size': quote?.bid_size ?? 'N/A',
            // 'Quote Bid Time': quote?.venue_bid_time || 'N/A',
            'Quote Last Trade Price': quote?.last_trade_price || 'N/A',
            // 'Quote Last Trade Time': quote?.venue_last_trade_time || 'N/A',
            // 'Quote Extended Hours Price': quote?.last_extended_hours_trade_price || 'N/A',
            // 'Quote Non Regular Price': quote?.last_non_reg_trade_price || 'N/A',
            // 'Quote Non Regular Time': quote?.venue_last_non_reg_trade_time || 'N/A',
            // 'Quote Previous Close': quote?.previous_close || 'N/A',
            // 'Quote Adjusted Previous Close': quote?.adjusted_previous_close || 'N/A',
            // 'Quote Previous Close Date': quote?.previous_close_date || 'N/A',
            // 'Quote Trading Halted': quote?.trading_halted ?? 'N/A',
            // 'Quote Has Traded': quote?.has_traded ?? 'N/A',
            // 'Quote Last Trade Price Source': quote?.last_trade_price_source || 'N/A',
            // 'Quote Non Regular Price Source': quote?.last_non_reg_trade_price_source || 'N/A',
            // 'Quote Updated At': quote?.updated_at || 'N/A',
            // 'Quote Instrument URL': quote?.instrument || 'N/A',
            // 'Quote State': quote?.state || 'N/A',
        };

        // Add individual rating texts
        if (ratings?.ratings && ratings.ratings.length > 0) {
            const buyRatings = ratings.ratings.filter(r => r.type === 'buy').map(r => r.text);
            const sellRatings = ratings.ratings.filter(r => r.type === 'sell').map(r => r.text);

            row['Buy Rating Reasons'] = buyRatings.join(' | ');
            row['Sell Rating Reasons'] = sellRatings.join(' | ');
        } else {
            row['Buy Rating Reasons'] = 'N/A';
            row['Sell Rating Reasons'] = 'N/A';
        }

        compiled.push(row);
    });

    return compiled;
}

