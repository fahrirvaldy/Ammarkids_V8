import { AppState } from './state.js';
import * as DataProcessor from './dataProcessor.js';
import * as Dashboard from './dashboard.js';
import * as Simulators from './simulators.js';
import * as Inventory from './inventory.js';
import { showToast, formatIDR } from './utils.js';

export function toggleSidebar() { 
    document.getElementById('sidebar').classList.toggle('-translate-x-full'); 
    document.getElementById('sidebar-overlay').classList.toggle('hidden'); 
}

export function switchView(viewName) {
    ['dashboard', 'simulator', 'customsim', 'inventory', 'runway'].forEach(v => {
        document.getElementById('view-' + v)?.classList.add('hidden');
    });
    document.getElementById('view-' + viewName)?.classList.remove('hidden');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-blue-50', 'text-google-blue');
        btn.classList.add('hover:bg-gray-50', 'text-gray-600');
        if (btn.dataset.view === viewName) { 
            btn.classList.add('bg-blue-50', 'text-google-blue');
            btn.classList.remove('hover:bg-gray-50', 'text-gray-600'); 
        }
    });

    if(viewName === 'inventory') Inventory.renderInventoryTab();
    if(viewName === 'runway') Inventory.renderRunwayTab();
    if(viewName === 'customsim') { 
        if(Object.keys(AppState.customSandboxData).length === 0) initSandboxData(); 
        else Simulators.renderSandboxTable();
    }
    if(viewName === 'simulator') { 
        Simulators.buildSimulatorSliders(); 
        Simulators.runFutureSimulation(); 
    }
    
    if (window.innerWidth < 768 && !document.getElementById('sidebar').classList.contains('-translate-x-full')) {
        toggleSidebar();
    }

    const titles = {
        dashboard: "Executive Board",
        simulator: "Simulator Elastisitas",
        customsim: "Simulasi Bebas",
        inventory: "4 Kuadran Stok",
        runway: "Ketahanan Stok"
    };
    document.getElementById('header-title').innerText = titles[viewName] || "Enterprise HQ";
}

export function initSandboxData() {
    const uniqueProducts = [...new Set(AppState.rawSales.map(item => item.product))];
    AppState.customSandboxData = {};
    uniqueProducts.forEach(prod => {
        AppState.customSandboxData[prod] = {
            qty: AppState.futureProductDemand[prod]?.totalReqQty || 0,
            price: AppState.customPricing[prod] || 100000,
            hpp: AppState.futureProductDemand[prod]?.sampleHPP || ((AppState.customPricing[prod] || 100000) * 0.5)
        };
    });
    Simulators.renderSandboxTable();
}

export function updateDashboard() {
    if (AppState.rawSales.length === 0) return;
    const metrics = Dashboard.calculateMetrics();
    
    document.getElementById('kpi-revenue').innerText = formatIDR(metrics.totals.totalRevenue);
}

// Re-using the update logic but properly scoped
export function refreshAll() {
    if (AppState.rawSales.length === 0) return;
    const metrics = Dashboard.calculateMetrics();
    
    // UI Updates
    const format = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);
    
    document.getElementById('kpi-revenue').innerText = format(metrics.totals.totalRevenue);
    document.getElementById('kpi-profit').innerText = format(metrics.totals.totalProfit);
    document.getElementById('kpi-settlement').innerText = format(metrics.totals.totalSettlement);
    document.getElementById('kpi-loss').innerText = format(metrics.totals.totalLossRTS);
    
    let margin = metrics.totals.totalRevenue > 0 ? (metrics.totals.totalProfit / metrics.totals.totalRevenue) * 100 : 0;
    document.getElementById('kpi-margin-pct').innerText = margin.toFixed(1) + "%";
    document.getElementById('kpi-rts-count').innerText = Math.round(metrics.totals.totalRTSCount);

    Dashboard.renderCashflowChart(metrics); 
    Dashboard.renderCostChart(metrics); 
    Dashboard.renderSalesTable(metrics.products); 
    
    Simulators.buildSimulatorSliders(); 
    Simulators.runFutureSimulation(); 
}

export function initDatePickers() {
    if (AppState.rawSales.length === 0) return;
    let allDatesObj = {};
    AppState.rawSales.forEach(item => { Object.keys(item.dailySales).forEach(d => allDatesObj[d] = true); });
    const allDates = Object.keys(allDatesObj).sort();
    if(allDates.length > 0) {
        const startInput = document.getElementById('start-date'); 
        const endInput = document.getElementById('end-date');
        if(startInput && endInput) {
            startInput.min = allDates[0]; startInput.max = allDates[allDates.length - 1];
            endInput.min = allDates[0]; endInput.max = allDates[allDates.length - 1];
            if(!startInput.value) startInput.value = allDates[0]; 
            if(!endInput.value) endInput.value = allDates[allDates.length - 1];
        }
    }
}
