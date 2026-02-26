import './style.css';
import { AppState } from './js/state.js';
import * as DataProcessor from './js/dataProcessor.js';
import * as App from './js/app.js';
import * as Simulators from './js/simulators.js';
import * as Dashboard from './js/dashboard.js';
import { showToast, formatIDR } from './js/utils.js';

// Setup Global Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // UI Event Handlers
    document.getElementById('sidebar-overlay').addEventListener('click', App.toggleSidebar);
    
    // Sidebar Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => App.switchView(btn.dataset.view));
    });

    // Filters
    document.getElementById('filter-channel').addEventListener('change', App.refreshAll);
    document.getElementById('filter-period').addEventListener('change', () => {
        const periodVal = document.getElementById('filter-period').value;
        const customContainer = document.getElementById('custom-date-container');
        if (periodVal === 'custom') { 
            customContainer.classList.remove('hidden'); 
            customContainer.classList.add('flex'); 
        } else { 
            customContainer.classList.add('hidden'); 
            customContainer.classList.remove('flex'); 
        }
        App.refreshAll();
    });
    
    document.getElementById('start-date').addEventListener('change', App.refreshAll);
    document.getElementById('end-date').addEventListener('change', App.refreshAll);

    // Data Integration Modal
    const dataModal = document.getElementById('data-modal');
    window.openDataIntegration = () => dataModal.classList.remove('hidden');
    window.closeDataIntegration = () => dataModal.classList.add('hidden');

    // File Uploads
    document.getElementById('file-sales').addEventListener('change', async (e) => {
        const files = e.target.files;
        if (!files.length) return;
        
        const tempSales = []; 
        for (const file of files) {
            const text = await file.text();
            tempSales.push(...DataProcessor.parseSalesSegment(text));
        }
        DataProcessor.aggregateRawSales(tempSales);
        AppState.filesUploaded.sales = true;
        updateBadge('sales', `${files.length} File Digabung`);
        showToast(`${files.length} file penjualan berhasil diproses`, 'success');
    });

    document.getElementById('file-inventory').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        DataProcessor.parseInventory(await file.text());
        AppState.filesUploaded.inventory = true;
        updateBadge('inventory', file.name);
        showToast(`Stok gudang berhasil diperbarui`, 'success');
    });

    document.getElementById('file-forecast').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        DataProcessor.parseForecast(await file.text());
        AppState.filesUploaded.forecast = true;
        updateBadge('forecast', file.name);
        showToast(`Data forecast berhasil diperbarui`, 'success');
    });

    window.saveAndCloseIntegration = () => {
        let inShopee = parseFloat(document.getElementById('setup-shopee-fee').value)/100 || 0.325;
        let inTiktok = parseFloat(document.getElementById('setup-tiktok-fee').value)/100 || 0.3179;
        let inAds = parseFloat(document.getElementById('setup-ads').value)/100 || 0.125;
        
        AppState.config.shopee.baseFee = inShopee - inAds;
        AppState.config.tiktok_tokped.baseFee = inTiktok - inAds; 
        AppState.config.ads = inAds;
        AppState.config.shopee.rts = parseFloat(document.getElementById('setup-shopee-rts').value)/100 || 0.07;
        AppState.config.tiktok_tokped.rts = parseFloat(document.getElementById('setup-tiktok-rts').value)/100 || 0.15;
        
        DataProcessor.mapForecastToProducts(); 
        App.initDatePickers(); 
        App.refreshAll(); 
        window.closeDataIntegration();
    };

    window.useAllSampleData = () => {
        // Sample data constants are now imported or defined
        const SAMPLE_SALES = `Channel,Nama Produk,2026-02-01,2026-02-02,2026-02-03,2026-02-04,2026-02-05,2026-02-06,2026-02-07,2026-02-08,2026-02-09,2026-02-10,2026-02-11,2026-02-12,2026-02-13,2026-02-14,2026-02-15,2026-02-16,2026-02-17,2026-02-18,2026-02-19,2026-02-20,2026-02-21,2026-02-22,2026-02-23,2026-02-24,Total
SHOPEE,AMMARKIDS KAFFA BASIC CHINO | CELANA PANJANG ANAK LAKI-LAKI,39,76,83,58,73,40,43,53,70,66,96,75,68,63,96,104,121,186,277,298,376,397,346,199,"3,303"
SHOPEE,Ammarkids Athar Kurta Set Setelan Kurta Anak Laki Laki,5,44,37,29,17,46,23,32,34,29,29,28,53,48,60,51,59,98,94,104,125,143,110,80,"1,379"
SHOPEE,Hawa Dress Daily Gamis untuk Anak Perempuan 4 - 12 Tahun by Ammar Kids,19,32,14,9,11,10,13,8,7,11,14,11,8,15,14,11,23,26,38,39,38,34,32,17,454
SHOPEE,Ammarkids Kaos Proud to be Muslim Series,7,30,18,8,4,16,21,5,7,13,10,15,11,5,31,14,9,33,23,40,39,39,22,11,431
Shop | Tokopedia,AMMARKIDS KAFFA BASIC CHINO | CELANA PANJANG ANAK LAKI-LAKI,4,8,5,7,4,4,14,9,9,14,21,9,10,5,13,8,11,15,25,31,23,25,15,5,294`;
        const SAMPLE_INV = `SKU,Nama,Bundle,HPP,Variasi,"AMMARKIDS X RIKO","DISPLAY","Gudang Aksesoris","GUDANG BAZAR","GUDANG HIJAB FEST","Transit",Total
"CK01-BLACK-XL","AMMARKIDS KAFFA BASIC CHINO | CELANA PANJANG ANAK LAKI-LAKI","false","65000.00","BLACK - XL","0","0","0","0","0","0","500"
"CK05-ARMY-S","AMMARKIDS KAFFA BASIC CHINO | CELANA PANJANG ANAK LAKI-LAKI","false","65000.00","ARMY - S","0","0","0","0","0","0","15"
"HANEEN-LILAC-L","AMMARKIDS HANEEN ONET SET","false","70000.00","LILAC - L","0","0","0","0","0","0","200"
"YUMNA01-BLACK-M","YUMNA 2.0","false","85000","BLACK - M","0","0","0","0","0","0","49"
"DEAD-ITEM-01","PRODUK LAMA TIDAK LAKU","false","40000","ALL","0","0","0","0","0","0","150"`;
        const SAMPLE_FORECAST = `SKU,Total_Requirement,2026-02-23
CK01-BLACK-XL,1771,0.5
CK05-ARMY-S,19,0.5
HANEEN-LILAC-L,250,1
YUMNA01-BLACK-M,20,1
DEAD-ITEM-01,0,0`;

        DataProcessor.aggregateRawSales(DataProcessor.parseSalesSegment(SAMPLE_SALES));
        DataProcessor.parseInventory(SAMPLE_INV);
        DataProcessor.parseForecast(SAMPLE_FORECAST);

        ['sales', 'inventory', 'forecast'].forEach(type => {
            AppState.filesUploaded[type] = true;
            updateBadge(type, "Data Demo Sinkron", true);
        });
        showToast("Data demo berhasil dimuat", "info");
    };

    // Table Event Delegation for Price Inputs
    document.getElementById('product-table-body').addEventListener('change', (e) => {
        if (e.target.classList.contains('price-input')) {
            const product = e.target.dataset.product;
            AppState.customPricing[product] = parseInt(e.target.value) || 0;
            App.refreshAll();
        }
    });

    // Simulator Slider Delegation
    document.getElementById('dynamic-sim-sliders').addEventListener('input', (e) => {
        if (e.target.classList.contains('sim-slider')) {
            const prod = e.target.dataset.prod;
            const delta = parseInt(e.target.value);
            const base = parseInt(e.target.dataset.base);
            
            AppState.simDeltas[prod] = delta;
            const cleanId = prod.replace(/[^a-zA-Z0-9]/g, '');
            document.getElementById(`val-sim-prod-${cleanId}`).innerText = formatIDR(base + delta);
            
            const labelDelta = document.getElementById(`label-delta-${cleanId}`);
            if(delta > 0) { 
                labelDelta.innerText = "+" + formatIDR(delta); 
                labelDelta.className = "font-bold text-google-green"; 
            } else if (delta < 0) { 
                labelDelta.innerText = formatIDR(delta); 
                labelDelta.className = "font-bold text-google-red"; 
            } else { 
                labelDelta.innerText = "Rp 0"; 
                labelDelta.className = "font-bold text-gray-400"; 
            }
            Simulators.runFutureSimulation();
        }
    });

    document.getElementById('dynamic-sim-sliders').addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (btn) {
            const prod = btn.dataset.prod;
            const base = parseInt(btn.dataset.base);
            const cleanId = prod.replace(/[^a-zA-Z0-9]/g, '');
            const slider = document.getElementById(`slider-${cleanId}`);
            const amount = btn.dataset.action === 'plus' ? 1000 : -1000;
            
            slider.value = parseInt(slider.value) + amount;
            slider.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });

    // Global simulator inputs
    document.getElementById('sim-ads').addEventListener('input', Simulators.runFutureSimulation);
    document.getElementById('sim-rts').addEventListener('input', Simulators.runFutureSimulation);
    window.resetFutureSimulation = () => {
        document.getElementById('sim-ads').value = AppState.config.ads * 100;
        document.getElementById('sim-rts').value = 0;
        document.getElementById('dynamic-sim-sliders').innerHTML = '';
        for(let key in AppState.simDeltas) AppState.simDeltas[key] = 0;
        Simulators.buildSimulatorSliders();
        Simulators.runFutureSimulation();
    };

    // Sandbox Table Inputs
    document.getElementById('sandbox-table-body').addEventListener('input', (e) => {
        if (e.target.classList.contains('sandbox-input')) {
            const { prod, field } = e.target.dataset;
            AppState.customSandboxData[prod][field] = parseInt(e.target.value) || 0;
            Simulators.calcSandbox();
        }
    });
    window.resetSandbox = App.initSandboxData;

    // Inventory Filters
    window.setInvFilter = (category) => {
        AppState.filters.inventoryStatus = category;
        ['defisit', 'aman', 'overstock', 'deadstock'].forEach(cat => {
            const card = document.getElementById(`card-${cat}`);
            if(card) {
                if(category === cat || category === 'all') { 
                    card.classList.remove('opacity-40', 'scale-95'); 
                    if(category !== 'all') card.classList.add('ring-2', 'ring-offset-2'); 
                } else { 
                    card.classList.add('opacity-40', 'scale-95'); 
                    card.classList.remove('ring-2', 'ring-offset-2'); 
                }
                if(category === 'all') card.classList.remove('ring-2', 'ring-offset-2');
            }
        });
        const btnClear = document.getElementById('btn-clear-filter');
        if(category === 'all') btnClear.classList.add('hidden'); else btnClear.classList.remove('hidden');
        applyAllInvFilters();
    };

    const applyAllInvFilters = () => {
        const query = document.getElementById('inv-text-search').value.toLowerCase();
        const statusFilter = AppState.filters.inventoryStatus;
        document.querySelectorAll('.inv-row').forEach(row => {
            const matchesText = row.getAttribute('data-name').includes(query); 
            const matchesStatus = (statusFilter === 'all' || row.getAttribute('data-category') === statusFilter);
            row.style.display = (matchesText && matchesStatus) ? '' : 'none';
        });
    };
    document.getElementById('inv-text-search').addEventListener('input', applyAllInvFilters);

    window.openDataIntegration();
});

function updateBadge(type, text, isSuccess = true) {
    const badge = document.getElementById('badge-' + type);
    badge.innerText = text;
    badge.className = isSuccess 
        ? "bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold mt-1 inline-block border border-green-200"
        : "bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-[10px] font-bold mt-1 inline-block truncate w-full border border-blue-200";
}
