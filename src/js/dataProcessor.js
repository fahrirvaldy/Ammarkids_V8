import { AppState } from './state.js';
import { showToast } from './utils.js';

export function getProductCategory(pname) {
    if (!pname) return "Unknown";
    pname = pname.toUpperCase();
    if (pname.includes("YUMNA")) return "Yumna Set";
    if (pname.includes("HANEEN")) return "Haneen Set";
    if (pname.includes("ATHAR")) return "Athar Kurta Set";
    if (pname.includes("GM") || pname.includes("GAMIS") || pname.includes("HAWA")) return "Gamis / Hawa Dress";
    if (pname.includes("ATQ") || pname.includes("ATTAQI") || (pname.includes("KURTA") && !pname.includes("ATHAR"))) return "Kurta (ATQ)";
    if (pname.includes("CK") || pname.includes("CHINO")) return "Chino (CK)";
    if (pname.includes("PTM") || pname.includes("PROUD")) return "Kaos PTM";
    if (pname.includes("ATK") || pname.includes("T-SHIRT") || pname.includes("KAOS")) return "Kaos (ATK)";
    return "Produk Lainnya";
}

export function getBaseHJP(category) {
    if (category.includes("Yumna")) return 159000;
    if (category.includes("Haneen")) return 140000;
    if (category.includes("Athar")) return 135000;
    if (category.includes("Gamis")) return 125000;
    if (category.includes("Kurta (ATQ)")) return 120000;
    if (category.includes("Chino")) return 105000;
    if (category.includes("Kaos PTM")) return 85000;
    if (category.includes("Kaos (ATK)")) return 70000;
    return 100000;
}

export function csvSplit(line) { 
    return line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(cell => cell.replace(/^"|"$/g, '').trim()); 
}

export function parseSalesSegment(csvText) {
    const lines = csvText.replace(/\r/g, '').split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];
    
    const headers = csvSplit(lines[0]);
    const dateColsRaw = headers.filter(h => h.match(/^\d{4}/)); 
    const segmentResult = [];

    for (let i = 1; i < lines.length; i++) {
        const row = csvSplit(lines[i]);
        let channel = (row[0] || '').toUpperCase().trim();
        const rawNameOrSKU = row[1]; 
        if (!rawNameOrSKU || !channel) continue;

        if (channel.includes('TOKOPEDIA')) channel = 'TOKOPEDIA';
        if (channel.includes('TIKTOK')) channel = 'TIKTOK';

        const categoryMaster = getProductCategory(rawNameOrSKU);

        const salesMap = {};
        dateColsRaw.forEach(dateStr => {
            const idx = headers.indexOf(dateStr);
            const qty = parseInt(row[idx] ? row[idx].replace(/,/g, '') : "0") || 0;
            let isoDate = dateStr;
            if(dateStr.includes(' ')) {
                 const parts = dateStr.split(' ');
                 if(parts.length === 3) isoDate = `${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}`;
            }
            salesMap[isoDate] = qty;
        });
        segmentResult.push({ channel, category: categoryMaster, dailySales: salesMap });
    }
    return segmentResult;
}

export function aggregateRawSales(tempSales) {
    const aggregated = {};
    tempSales.forEach(item => {
        const key = item.channel + "|||" + item.category;
        if (!aggregated[key]) {
            aggregated[key] = { channel: item.channel, product: item.category, hpp: 0, dailySales: {} };
        }
        for (let d in item.dailySales) {
            if (!aggregated[key].dailySales[d]) aggregated[key].dailySales[d] = 0;
            aggregated[key].dailySales[d] += item.dailySales[d];
        }
    });
    
    AppState.rawSales = Object.values(aggregated);
    
    AppState.customPricing = {}; 
    AppState.simDeltas = {};
    AppState.rawSales.forEach(item => {
        if(!AppState.customPricing[item.product]) AppState.customPricing[item.product] = getBaseHJP(item.product);
        AppState.simDeltas[item.product] = 0;
        item.hpp = AppState.customPricing[item.product] * 0.5; 
    });
}

export function parseInventory(csvText) {
    const lines = csvText.replace(/\r/g, '').split('\n').filter(line => line.trim() !== '');
    AppState.inventory = {};
    const headers = csvSplit(lines[0]).map(h => h.toLowerCase()); 
    const idxSku = headers.findIndex(h => h === 'sku');
    const idxNama = headers.findIndex(h => h === 'nama');
    const idxTotal = headers.findIndex(h => h === 'total'); 

    if(idxSku === -1 || idxTotal === -1) {
        showToast("Inventory harus punya kolom SKU dan Total.", "error");
        return;
    }

    for (let i = 1; i < lines.length; i++) {
        const row = csvSplit(lines[i]);
        const sku = row[idxSku];
        if(!sku) continue;
        AppState.inventory[sku] = { name: idxNama !== -1 ? row[idxNama] : 'Unknown', total: parseInt(row[idxTotal]) || 0 };
    }
}

export function parseForecast(csvText) {
    const lines = csvText.replace(/\r/g, '').split('\n').filter(line => line.trim() !== '');
    AppState.forecast = {};
    const headers = csvSplit(lines[0]).map(h => h.toLowerCase());
    const idxSku = headers.findIndex(h => h === 'sku');
    const idxTotalReq = headers.findIndex(h => h.includes('req'));

    if(idxSku === -1 || idxTotalReq === -1) {
        showToast("Forecast harus punya kolom SKU dan Requirement.", "error");
        return;
    }

    for (let i = 1; i < lines.length; i++) {
        const row = csvSplit(lines[i]);
        const sku = row[idxSku];
        if(!sku) continue;
        AppState.forecast[sku] = parseInt(row[idxTotalReq]) || 0;
    }
}

export function mapForecastToProducts() {
    AppState.futureProductDemand = {};
    for(let sku in AppState.inventory) {
        const invItem = AppState.inventory[sku];
        const reqQty = AppState.forecast[sku] || 0; 
        
        const categoryMaster = getProductCategory(invItem.name);
        
        if(reqQty > 0) {
            if(!AppState.futureProductDemand[categoryMaster]) {
                AppState.futureProductDemand[categoryMaster] = { 
                    totalReqQty: 0, 
                    sampleHPP: (AppState.customPricing[categoryMaster]*0.5) || 50000 
                };
            }
            AppState.futureProductDemand[categoryMaster].totalReqQty += reqQty;
        }
    }
}
