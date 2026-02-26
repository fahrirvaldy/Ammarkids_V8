import { AppState } from './state.js';

export function renderInventoryTab() {
    if (!AppState.filesUploaded.inventory || !AppState.filesUploaded.forecast) {
        document.getElementById('global-empty-state')?.classList.remove('hidden');
        document.getElementById('inventory-data-state')?.classList.add('hidden');
        document.getElementById('inventory-summary')?.classList.add('hidden');
        return;
    }

    document.getElementById('global-empty-state')?.classList.add('hidden');
    document.getElementById('inventory-data-state')?.classList.remove('hidden');
    document.getElementById('inventory-data-state')?.classList.add('flex');
    document.getElementById('inventory-summary')?.classList.remove('hidden');
    document.getElementById('inventory-summary')?.classList.add('grid');

    const tbody = document.getElementById('inventory-table-body'); 
    if(!tbody) return;
    tbody.innerHTML = '';
    
    const skus = Object.keys(AppState.inventory);
    let combinedData = []; let countDefisit = 0, countAman = 0, countOverstock = 0, countDeadstock = 0;

    skus.forEach(sku => {
        const item = AppState.inventory[sku]; const requirement = AppState.forecast[sku] || 0; const diff = item.total - requirement;
        let category = '';
        if (requirement === 0 && item.total > 0) { category = 'deadstock'; countDeadstock++; } 
        else if (diff < 0) { category = 'defisit'; countDefisit++; } 
        else if (diff > requirement && requirement > 0) { category = 'overstock'; countOverstock++; } 
        else { category = 'aman'; countAman++; }
        combinedData.push({ sku, name: item.name, total: item.total, req: requirement, diff, category });
    });

    const elDef = document.getElementById('inv-sum-defisit'); if(elDef) elDef.innerText = countDefisit;
    const elAma = document.getElementById('inv-sum-aman'); if(elAma) elAma.innerText = countAman;
    const elOve = document.getElementById('inv-sum-overstock'); if(elOve) elOve.innerText = countOverstock;
    const elDea = document.getElementById('inv-sum-deadstock'); if(elDea) elDea.innerText = countDeadstock;

    combinedData.sort((a, b) => a.diff - b.diff);

    combinedData.forEach(data => {
        let statusHtml = ''; let rowBg = ''; let recommendation = '';
        if (data.category === 'defisit') { statusHtml = '<span class="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-black border border-red-200">Defisit</span>'; recommendation = '<p class="text-[10px] text-red-600 mt-2 bg-white px-2 py-1 rounded inline-block border border-red-100"><b>Aksi:</b> Restock / Naikkan HJP</p>'; rowBg = 'bg-red-50/40 hover:bg-red-50'; } 
        else if (data.category === 'overstock') { statusHtml = '<span class="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-[10px] font-black border border-yellow-200">Overstock</span>'; recommendation = '<p class="text-[10px] text-yellow-700 mt-2 bg-white px-2 py-1 rounded inline-block border border-yellow-100"><b>Aksi:</b> Flash Sale / Ads Naik</p>'; rowBg = 'bg-yellow-50/30 hover:bg-yellow-50/50'; } 
        else if (data.category === 'deadstock') { statusHtml = '<span class="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-[10px] font-black border border-gray-300">Deadstock</span>'; recommendation = '<p class="text-[10px] text-gray-600 mt-2 bg-white px-2 py-1 rounded inline-block border border-gray-200"><b>Aksi:</b> Jadikan Hadiah Bundling</p>'; rowBg = 'bg-gray-50/50 hover:bg-gray-100'; } 
        else { statusHtml = '<span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black border border-green-200">Aman</span>'; recommendation = '<p class="text-[10px] text-green-600 mt-2 bg-white px-2 py-1 rounded inline-block border border-green-100"><b>Aksi:</b> Pertahankan Strategi</p>'; rowBg = 'hover:bg-gray-50'; }

        const tr = document.createElement('tr'); tr.className = `border-b border-gray-100 transition inv-row ${rowBg}`;
        tr.setAttribute('data-name', data.name.toLowerCase() + " " + data.sku.toLowerCase()); tr.setAttribute('data-category', data.category); 
        tr.innerHTML = `<td class="px-6 py-4 whitespace-normal min-w-[250px]"><div class="font-bold text-gray-800 text-sm mb-1">${data.sku}</div><div class="text-[11px] text-gray-500 leading-tight">${data.name}</div></td><td class="px-6 py-4 text-center font-bold text-gray-700 text-lg">${data.total}</td><td class="px-6 py-4 text-center font-bold text-purple-700 bg-purple-50/30 text-lg border-l border-r border-gray-100">${data.req}</td><td class="px-6 py-4 text-center font-black text-xl ${data.diff < 0 ? 'text-google-red' : (data.diff > 0 ? 'text-google-blue' : 'text-gray-400')}">${data.diff < 0 ? data.diff : '+'+data.diff}</td><td class="px-6 py-4 whitespace-normal"><div class="mb-1">${statusHtml}</div>${recommendation}</td>`;
        tbody.appendChild(tr);
    });
}

export function renderRunwayTab() {
    const tbody = document.getElementById('runway-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    if (Object.keys(AppState.inventory).length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-gray-500">Data Stok Belum Tersedia. Hubungkan di Panel Data.</td></tr>';
        return;
    }

    const runwayData = [];

    for(let sku in AppState.inventory) {
        const item = AppState.inventory[sku];
        const requirement30Days = AppState.forecast[sku] || 0;
        const dailyVelocity = requirement30Days / 30; 
        
        let runwayDays = 9999; 
        if (dailyVelocity > 0) {
            runwayDays = item.total / dailyVelocity;
        }

        runwayData.push({ sku, name: item.name, stock: item.total, velocity: dailyVelocity, runway: runwayDays });
    }

    runwayData.sort((a, b) => a.runway - b.runway);

    runwayData.forEach(data => {
        let statusHtml = ''; let rowBg = '';
        let displayRunway = data.runway === 9999 ? "∞" : Math.floor(data.runway);

        if (data.stock === 0) {
            statusHtml = '<span class="bg-gray-800 text-white px-2 py-1 rounded text-[10px] font-bold">KOSONG</span>';
            rowBg = 'bg-gray-100';
            displayRunway = 0;
        } else if (data.runway === 9999) {
            statusHtml = '<span class="bg-gray-200 text-gray-600 px-2 py-1 rounded text-[10px] font-bold">TIDAK ADA DEMAND (DEAD)</span>';
        } else if (data.runway <= 7) {
            statusHtml = '<span class="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold"><i class="fas fa-siren-on mr-1"></i> KRITIS (< 1 Minggu)</span>';
            rowBg = 'bg-red-50/30';
        } else if (data.runway <= 14) {
            statusHtml = '<span class="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-[10px] font-bold">WARNING (< 2 Minggu)</span>';
        } else if (data.runway > 60) {
            statusHtml = '<span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-bold">OVERSTOCK (> 2 Bulan)</span>';
        } else {
            statusHtml = '<span class="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold">STOK AMAN</span>';
        }

        const tr = document.createElement('tr');
        tr.className = `border-b border-gray-100 hover:bg-gray-50 transition runway-row ${rowBg}`;
        tr.setAttribute('data-search', data.sku.toLowerCase() + " " + data.name.toLowerCase());
        
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-normal min-w-[200px]">
                <div class="font-bold text-gray-800">${data.sku}</div>
                <div class="text-[10px] text-gray-500 line-clamp-1">${data.name}</div>
            </td>
            <td class="px-6 py-4 text-center font-bold text-gray-700 text-lg">${data.stock}</td>
            <td class="px-6 py-4 text-center font-bold text-gray-500 bg-gray-50 border-l border-r border-gray-200">${data.velocity > 0 ? data.velocity.toFixed(2) : 0} <span class="text-[9px] font-normal">pcs/hari</span></td>
            <td class="px-6 py-4 text-center font-black text-2xl ${data.runway <= 7 ? 'text-google-red' : 'text-google-blue'}">${displayRunway}</td>
            <td class="px-6 py-4">${statusHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}
