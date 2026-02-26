import { AppState } from './state.js';
import { formatIDR } from './utils.js';
import Chart from 'chart.js/auto';

export function calculateMetrics() {
    let totalRevenue = 0, totalProfit = 0, totalLossRTS = 0, totalRTSCount = 0;
    const dailyData = {}; const productStats = {}; 
    const { shopee, tiktok_tokped, ads } = AppState.config;
    
    const channelFilter = document.getElementById('filter-channel').value;
    const periodFilter = document.getElementById('filter-period').value;

    let allDatesObj = {};
    AppState.rawSales.forEach(item => { Object.keys(item.dailySales).forEach(d => allDatesObj[d] = true); });
    const allDates = Object.keys(allDatesObj).sort();
    
    let activeDates = allDates;
    if (periodFilter === '7') activeDates = allDates.slice(-7);
    else if (periodFilter === '14') activeDates = allDates.slice(-14);
    else if (periodFilter === 'custom') {
        const start = document.getElementById('start-date').value, end = document.getElementById('end-date').value;
        activeDates = allDates.filter(d => { 
            if (start && end) return d >= start && d <= end; 
            if (start) return d >= start; 
            if (end) return d <= end; 
            return true; 
        });
    }

    AppState.rawSales.forEach(item => {
        let groupChannel = (item.channel === 'TOKOPEDIA' || item.channel === 'TIKTOK') ? 'TIKTOK_TOKOPEDIA' : item.channel;
        if (channelFilter !== 'all' && groupChannel !== channelFilter) return;
        
        const conf = groupChannel === 'SHOPEE' ? shopee : tiktok_tokped;
        const activeHJP = AppState.customPricing[item.product] || 100000; 
        let pQty = 0; 
        
        activeDates.forEach(date => {
            const qty = item.dailySales[date] || 0; if (qty === 0) return;
            pQty += qty;

            const rtsQty = qty * conf.rts; const successQty = qty - rtsQty;
            const grossRevenue = successQty * activeHJP; const rtsLossVal = rtsQty * activeHJP;
            const platformFeeCost = grossRevenue * conf.baseFee; const fixedFee = successQty * conf.fixed;
            const adsCost = grossRevenue * ads; const cogsCost = successQty * item.hpp; 
            const netProfit = grossRevenue - platformFeeCost - fixedFee - adsCost - cogsCost;

            totalRevenue += grossRevenue; totalProfit += netProfit; totalLossRTS += rtsLossVal; totalRTSCount += rtsQty;
            if (!dailyData[date]) dailyData[date] = { revenue: 0, profit: 0, settlement: 0, costs: { hpp: 0, ads: 0, platformFees: 0 } };
            
            dailyData[date].revenue += grossRevenue; dailyData[date].profit += netProfit;
            dailyData[date].costs.hpp += cogsCost; dailyData[date].costs.ads += adsCost; dailyData[date].costs.platformFees += (platformFeeCost + fixedFee);

            const txnDate = new Date(date); txnDate.setDate(txnDate.getDate() + conf.settlement);
            const settlementDateStr = txnDate.toISOString().split('T')[0];
            if (!dailyData[settlementDateStr]) dailyData[settlementDateStr] = { revenue:0, profit:0, settlement:0, costs:{hpp:0, ads:0, platformFees:0}};
            dailyData[settlementDateStr].settlement += (grossRevenue - platformFeeCost - fixedFee - adsCost); 
        });

        if (pQty > 0) {
            const pSuccess = pQty * (1 - conf.rts); const pRev = pSuccess * activeHJP;
            const pProfit = pRev - ((pRev * conf.baseFee) + (pSuccess * conf.fixed) + (pRev * ads) + (pSuccess * item.hpp));
            if (!productStats[item.product]) productStats[item.product] = { qty: 0, revenue: 0, profit: 0, channel: item.channel, currentPrice: activeHJP };
            productStats[item.product].qty += pQty; productStats[item.product].revenue += pRev; productStats[item.product].profit += pProfit;
        }
    });

    let totalSettlement = Object.values(dailyData).reduce((sum, d) => sum + d.settlement, 0);
    return { 
        totals: { totalRevenue, totalProfit, totalSettlement, totalLossRTS, totalRTSCount }, 
        daily: dailyData, 
        products: productStats, 
        dates: Object.keys(dailyData).sort() 
    };
}

export function renderSalesTable(products) {
    const tbody = document.getElementById('product-table-body'); tbody.innerHTML = '';
    Object.entries(products).sort((a,b) => b[1].revenue - a[1].revenue).forEach(([name, stats]) => {
        let marginPct = stats.revenue > 0 ? (stats.profit / stats.revenue) * 100 : 0;
        let chnColor = stats.channel === 'SHOPEE' ? 'bg-orange-50 text-orange-600 border-orange-200' : (stats.channel === 'TOKOPEDIA' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-800 text-white');
        const tr = document.createElement('tr'); tr.className = "hover:bg-blue-50/40 border-b border-gray-100 transition";
        tr.innerHTML = `
            <td class="px-6 py-4 font-medium text-gray-800 name-col whitespace-normal min-w-[250px]"><div class="line-clamp-2 leading-snug text-base">${name}</div><span class="inline-block mt-1.5 px-2 py-0.5 text-[9px] rounded-full border ${chnColor} font-bold tracking-wider">${stats.channel}</span></td>
            <td class="px-6 py-4 text-center font-bold text-gray-700 text-lg">${stats.qty}</td>
            <td class="px-6 py-4 text-right"><div class="flex items-center justify-end gap-1 bg-white border border-gray-300 rounded px-2 py-1 shadow-inner focus-within:border-google-blue focus-within:ring-1 focus-within:ring-google-blue transition"><span class="text-[10px] text-gray-400 font-bold">Rp</span><input type="number" value="${stats.currentPrice}" data-product="${name}" class="price-input w-24 text-right outline-none bg-transparent font-bold text-google-blue"></div></td>
            <td class="px-6 py-4 text-right font-black ${stats.profit > 0 ? 'text-google-green' : 'text-google-red'} text-base">${formatIDR(stats.profit)}</td>
            <td class="px-6 py-4 text-center"><span class="inline-flex px-3 py-1 rounded-lg text-xs font-bold ${marginPct < 15 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}">${marginPct.toFixed(1)}%</span></td>
        `;
        tbody.appendChild(tr);
    });
}

export function renderCashflowChart(m) {
    const ctx = document.getElementById('chart-cashflow').getContext('2d');
    if (AppState.charts.cashflow) AppState.charts.cashflow.destroy();
    const labels = m.dates.filter(d => m.daily[d].revenue > 0 || m.daily[d].settlement > 0);
    AppState.charts.cashflow = new Chart(ctx, {
        type: 'line', 
        data: { 
            labels: labels.map(d => d.slice(5)), 
            datasets: [ 
                { label: 'Omzet Sukses', data: labels.map(d => m.daily[d].revenue), borderColor: '#4285F4', backgroundColor: 'rgba(66, 133, 244, 0.1)', fill: true, tension: 0.4, borderWidth: 2 }, 
                { label: 'Est. Cair Bank', data: labels.map(d => m.daily[d].settlement), borderColor: '#34A853', backgroundColor: 'rgba(52, 168, 83, 0.1)', fill: true, tension: 0.4, borderDash: [5, 5], borderWidth: 2 } 
            ] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { 
                legend: {display:false}, 
                tooltip: {callbacks: {label: (ctx) => ' ' + ctx.dataset.label + ': ' + formatIDR(ctx.raw)}} 
            }, 
            scales: { 
                y: { border: {display:false}, ticks: { callback: v => "Rp "+(v/1000000).toFixed(0)+"M" } }, 
                x: { grid: {display:false} } 
            } 
        }
    });
}

export function renderCostChart(m) {
    const ctx = document.getElementById('chart-costs').getContext('2d');
    if (AppState.charts.costs) AppState.charts.costs.destroy();
    const labels = m.dates.filter(d => m.daily[d].revenue > 0); 
    AppState.charts.costs = new Chart(ctx, {
        type: 'bar', 
        data: { 
            labels: labels.map(d => d.slice(8)), 
            datasets: [ 
                { label: 'HPP', data: labels.map(d => m.daily[d].costs.hpp), backgroundColor: '#e2e8f0' }, 
                { label: 'Admin Platform', data: labels.map(d => m.daily[d].costs.platformFees), backgroundColor: '#FCD34D' }, 
                { label: 'Budget Ads', data: labels.map(d => m.daily[d].costs.ads), backgroundColor: '#FCA5A5' }, 
                { label: 'Net Profit', data: labels.map(d => m.daily[d].profit), backgroundColor: '#34A853', borderRadius: {topLeft: 4, topRight: 4} } 
            ] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            scales: { 
                x: { stacked: true, grid: {display:false} }, 
                y: { stacked: true, border: {display:false}, ticks: {display:false} } 
            }, 
            plugins: { 
                legend: {position:'bottom', labels: {boxWidth: 10, usePointStyle: true}}, 
                tooltip: {callbacks: {label: (ctx) => ' ' + ctx.dataset.label + ': ' + formatIDR(ctx.raw)}} 
            } 
        }
    });
}
