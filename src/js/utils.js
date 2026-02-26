export const formatIDR = (num) => { 
    return new Intl.NumberFormat('id-ID', { 
        style: 'currency', 
        currency: 'IDR', 
        maximumFractionDigits: 0 
    }).format(num || 0); 
};

export const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-xl shadow-2xl text-white font-bold z-[100] transform transition-all duration-300 translate-y-20 opacity-0`;
    
    const colors = {
        info: 'bg-google-blue',
        success: 'bg-google-green',
        error: 'bg-google-red',
        warning: 'bg-google-yellow'
    };
    
    toast.classList.add(colors[type] || colors.info);
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'} mr-2"></i> ${message}`;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-y-20', 'opacity-0');
    }, 10);
    
    // Remove
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};
