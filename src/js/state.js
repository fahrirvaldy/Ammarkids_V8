export const AppState = {
    rawSales: [], 
    inventory: {}, 
    forecast: {},  
    customPricing: {}, 
    simDeltas: {},     
    futureProductDemand: {}, 
    customSandboxData: {},
    
    config: {
        shopee: { baseFee: 0.20, fixed: 1250, rts: 0.07, settlement: 8 }, 
        tiktok_tokped: { baseFee: 0.1929, fixed: 1250, rts: 0.15, settlement: 14 },
        ads: 0.125
    },
    filters: { 
        channel: 'all', 
        period: 'all', 
        inventoryStatus: 'all' 
    },
    filesUploaded: { 
        sales: false, 
        inventory: false, 
        forecast: false 
    },
    charts: {}
};
