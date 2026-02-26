import { AppState } from './state.js';
import { formatIDR } from './utils.js';
import Chart from 'chart.js/auto';

export function runFutureSimulation() {
    if (Object.keys(AppState.futureProductDemand).length === 0) return; 
    
    const adsInput = document.getElementById('sim-ads');
    const rtsInput = document.getElementById('sim-rts');
    
    if(!adsInput || !rtsInput) return;

    const newAdsPct = parseFloat(adsInput.value) / 100;
    const deltaRTS = parseFloat(rtsInput.value) / 100;
    
    document.getElementById('val-sim-ads').innerText = (newAdsPct * 100).toFixed(1) + "%";
    document.getElementById('val-sim-rts').innerText = (deltaRTS * 100).toFixed(1) + "%";

    let baseFutureProfit = 0, simFutureProfit = 0;
    const conf = AppState.config.shopee; 

    for(let prod in AppState.futureProductDemand) {
        const demand = AppState.futureProductDemand[prod];
        const targetQty = demand.totalReqQty; if(targetQty === 0) continue;
        const activeHJP = AppState.customPricing[prod] || 100000; const hpp = demand.sampleHPP || (activeHJP * 0.5);

        const baseSuccess = targetQty * (1 - conf.rts); const baseRev = baseSuccess * activeHJP;
        const prodBaseProfit = baseRev - ((baseRev * conf.baseFee) + (baseSuccess * conf.fixed) + (baseRev * AppState.config.ads) + (baseSuccess * hpp));
        baseFutureProfit += prodBaseProfit;

        let simRTS = Math.max(0, conf.rts + deltaRTS); 
        const simPrice = activeHJP + (AppState.simDeltas[prod] || 0);
        const simSuccess = targetQty * (1 - simRTS); const simRev = simSuccess * simPrice;
        const prodSimProfit = simRev - ((simRev * conf.baseFee) + (simSuccess * conf.fixed) + (simRev * newAdsPct) + (simSuccess * hpp));
        simFutureProfit += prodSimProfit;

        const cleanId = prod.replace(/[^a-zA-Z0-9]/g, '');
        const impactEl = document.getElementById(`profit-impact-${cleanId}`);
        if(impactEl) {
            const prodDelta = prodSimProfit - prodBaseProfit;
            if(prodDelta > 0) { impactEl.innerText = "Dampak Laba: +" + formatIDR(prodDelta); impactEl.className = "text-[10px] font-black text-google-green"; } 
            else if(prodDelta < 0) { impactEl.innerText = "Dampak Laba: " + formatIDR(prodDelta); impactEl.className = "text-[10px] font-black text-google-red"; } 
            else { impactEl.innerText = "Dampak Laba: Rp 0"; impactEl.className = "text-[10px] font-bold text-gray-400"; }
        }
    }

    document.getElementById('sim-base-profit').innerText = formatIDR(baseFutureProfit);
    document.getElementById('sim-new-profit').innerText = formatIDR(simFutureProfit);
    const delta = simFutureProfit - baseFutureProfit;
    const dEl = document.getElementById('sim-delta');
    dEl.innerHTML = (delta > 0 ? "+" : "") + formatIDR(delta) + " Profit Extra";
    dEl.className = `absolute -bottom-4 left-1/2 transform -translate-x-1/2 px-5 py-1.5 rounded-full text-sm font-black shadow-lg border-2 border-white whitespace-nowrap transition-all ${delta >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`;

    if(AppState.charts.sim) AppState.charts.sim.destroy();
    const ctx = document.getElementById('chart-simulation');
    if(!ctx) return;
    
    AppState.charts.sim = new Chart(ctx, {
        type: 'bar', 
        data: { 
            labels: ['Base Forecast', 'Simulasi Baru'], 
            datasets: [{ 
                data: [baseFutureProfit, simFutureProfit], 
                backgroundColor: ['#e2e8f0', delta >= 0 ? '#34A853' : '#EA4335'], 
                borderRadius: 10, 
                barThickness: 80 
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: {legend:{display:false}}, 
            scales: { 
                y: {display:false}, 
                x: {grid:{display:false}, border: {display: false}, ticks: {font: {weight: 'bold'}}} 
            } 
        }
    });
}

export function buildSimulatorSliders() {
    const container = document.getElementById('dynamic-sim-sliders');
    if(!container || container.innerHTML !== '') return; 
    const uniqueProducts = [...new Set(AppState.rawSales.map(item => item.product))];
    
    uniqueProducts.forEach(prod => {
        const basePrice = AppState.customPricing[prod] || 100000;
        const futureTargetQty = AppState.futureProductDemand[prod]?.totalReqQty || 0;
        let targetBadge = futureTargetQty > 0 ? `<span class="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[9px] font-bold border border-purple-200"><i class="fas fa-bullseye mr-1"></i> Forecast: ${futureTargetQty} pcs</span>` : `<span class="text-[9px] text-gray-400 italic bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded">No Target</span>`;
        const cleanId = prod.replace(/[^a-zA-Z0-9]/g, '');

        const div = document.createElement('div');
        div.className = "bg-white border border-gray-200 p-4 rounded-xl shadow-sm mb-3 transition hover:shadow-md";
        div.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <label class="text-sm font-bold text-gray-800 w-2/3 leading-tight pr-2">${prod}</label>
                <div class="flex flex-col items-end gap-1"><span class="text-[9px] font-bold bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded whitespace-nowrap">HJP Dasar: ${formatIDR(basePrice)}</span>${targetBadge}</div>
            </div>
            <div class="bg-blue-50/50 border border-blue-100 p-3 rounded-lg">
                <div class="flex justify-between items-center text-[10px] font-bold text-gray-600 mb-2"><span>Target Harga Baru (HJP):</span><span id="val-sim-prod-${cleanId}" class="text-google-blue font-black text-sm bg-white px-2 py-0.5 border border-blue-200 rounded shadow-sm">${formatIDR(basePrice)}</span></div>
                <div class="flex items-center gap-2 mb-2">
                    <button class="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded shadow-sm text-gray-600 hover:bg-gray-100 hover:text-google-red transition focus:outline-none focus:ring-2 focus:ring-gray-200" data-action="minus" data-prod="${prod}" data-base="${basePrice}"><i class="fas fa-minus text-xs"></i></button>
                    <input type="range" id="slider-${cleanId}" data-prod="${prod}" data-base="${basePrice}" min="-50000" max="50000" step="1000" value="0" class="sim-slider w-full h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-google-blue">
                    <button class="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded shadow-sm text-gray-600 hover:bg-gray-100 hover:text-google-green transition focus:outline-none focus:ring-2 focus:ring-gray-200" data-action="plus" data-prod="${prod}" data-base="${basePrice}"><i class="fas fa-plus text-xs"></i></button>
                </div>
                <div class="flex justify-between items-end mt-1 border-t border-blue-100/50 pt-2">
                    <span class="text-[10px] text-gray-500 font-medium">Ubah HJP: <span id="label-delta-${cleanId}" class="font-bold text-gray-400">Rp 0</span></span>
                    <span class="text-[10px] font-black text-gray-400" id="profit-impact-${cleanId}">Dampak Laba: Rp 0</span>
                </div>
            </div>
        `; container.appendChild(div);
    });
}

export function calcSandbox() {
    let grandRev = 0; let grandProf = 0; let grandCair = 0;
    const conf = AppState.config.shopee; // Use safe standard

    for(let prod in AppState.customSandboxData) {
        const cleanId = prod.replace(/[^a-zA-Z0-9]/g, '');
        const qtyInput = document.getElementById(`sb-qty-${cleanId}`);
        const prcInput = document.getElementById(`sb-prc-${cleanId}`);
        const hppInput = document.getElementById(`sb-hpp-${cleanId}`);
        
        if(!qtyInput || !prcInput || !hppInput) continue;

        const qty = parseInt(qtyInput.value) || 0;
        const price = parseInt(prcInput.value) || 0;
        const hpp = parseInt(hppInput.value) || 0;

        const successQty = qty * (1 - conf.rts);
        const revenue = successQty * price;
        const costPlatformAndAds = (revenue * conf.baseFee) + (successQty * conf.fixed) + (revenue * AppState.config.ads);
        const profit = revenue - costPlatformAndAds - (successQty * hpp);
        const cair = revenue - costPlatformAndAds; 

        const revEl = document.getElementById(`sb-rev-${cleanId}`);
        if(revEl) revEl.innerText = formatIDR(revenue);
        
        const profEl = document.getElementById(`sb-prof-${cleanId}`);
        if(profEl) {
            profEl.innerText = formatIDR(profit);
            profEl.className = `px-6 py-4 text-right font-black ${profit < 0 ? 'text-google-red' : 'text-google-green'}`;
        }

        grandRev += revenue; grandProf += profit; grandCair += cair;
    }

    document.getElementById('sandbox-omzet').innerText = formatIDR(grandRev);
    document.getElementById('sandbox-profit').innerText = formatIDR(grandProf);
    document.getElementById('sandbox-cair').innerText = formatIDR(grandCair);
}

export function renderSandboxTable() {
    const tbody = document.getElementById('sandbox-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    for(let prod in AppState.customSandboxData) {
        const data = AppState.customSandboxData[prod];
        const cleanId = prod.replace(/[^a-zA-Z0-9]/g, '');
        
        const tr = document.createElement('tr');
        tr.className = "hover:bg-indigo-50/30 transition border-b border-gray-100";
        tr.innerHTML = `
            <td class="px-6 py-4 font-bold text-gray-800 text-xs whitespace-normal max-w-xs">${prod}</td>
            <td class="px-6 py-3 text-center bg-gray-50 border-r border-gray-200">
                <input type="number" id="sb-hpp-${cleanId}" value="${data.hpp}" data-prod="${prod}" data-field="hpp" class="sandbox-input w-20 text-center font-bold text-gray-600 border-b-2 border-gray-300 focus:border-gray-500 bg-transparent outline-none">
            </td>
            <td class="px-6 py-3 text-center bg-blue-50/50 border-l border-blue-100">
                <input type="number" id="sb-qty-${cleanId}" value="${data.qty}" data-prod="${prod}" data-field="qty" class="sandbox-input w-20 text-center font-bold text-google-blue border-b-2 border-blue-200 focus:border-blue-500 bg-transparent outline-none">
            </td>
            <td class="px-6 py-3 text-center bg-blue-50/50 border-r border-blue-100">
                <input type="number" id="sb-prc-${cleanId}" value="${data.price}" data-prod="${prod}" data-field="price" class="sandbox-input w-24 text-right font-bold text-google-blue border-b-2 border-blue-200 focus:border-blue-500 bg-transparent outline-none">
            </td>
            <td class="px-6 py-4 text-right font-bold text-gray-700" id="sb-rev-${cleanId}">Rp 0</td>
            <td class="px-6 py-4 text-right font-black text-google-green" id="sb-prof-${cleanId}">Rp 0</td>
        `;
        tbody.appendChild(tr);
    }
    calcSandbox(); 
}
