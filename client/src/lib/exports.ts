export const exportToExcel = async (startDate?: string, endDate?: string) => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await fetch(`/api/export/excel?${params}`);
    const data = await response.json();
    
    // In a real implementation, this would download an Excel file
    console.log('Excel export data:', data);
    
    // Create a mock download for demonstration
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alvaras_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    return data;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw error;
  }
};

export const exportDashboardToPDF = async (startDate?: string, endDate?: string) => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await fetch(`/api/export/dashboard-pdf?${params}`);
    const data = await response.json();
    
    // In a real implementation, this would download a PDF file
    console.log('PDF export data:', data);
    
    // Create a mock download for demonstration
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    return data;
  } catch (error) {
    console.error('Error exporting dashboard to PDF:', error);
    throw error;
  }
};
