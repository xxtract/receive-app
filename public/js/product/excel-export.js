import { showAlert } from '../utils.js';

export class ExcelExport {
    constructor(config) {
        this.productTableContainer = config.productTableContainer;
        this.productTableBody = config.productTableBody;
        this.selectedCompany = null;

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Handle Excel download
        const excelDownloadBtn = document.getElementById('excelDownloadBtn');
        if (excelDownloadBtn) {
            excelDownloadBtn.addEventListener('click', (e) => {
                if (!e.currentTarget.classList.contains('disabled')) {
                    this.downloadExcel();
                }
            });
        }
    }

    setSelectedCompany(company) {
        this.selectedCompany = company;
    }

    downloadExcel() {
        // Double check for required fields before proceeding
        const hasEmptyRequiredFields = Array.from(this.productTableBody.querySelectorAll('select[required]'))
            .some(select => !select.value);

        if (hasEmptyRequiredFields) {
            showAlert('Vul eerst alle verplichte velden in');
            return;
        }

        // Get table headers (excluding action and bracket columns)
        const headers = Array.from(this.productTableContainer.querySelectorAll('thead th'))
            .slice(2) // Skip first two columns (delete and bracket)
            .map(th => th.textContent.trim());

        // Get table data
        const rows = Array.from(this.productTableBody.querySelectorAll('tr')).map(row => {
            const cells = Array.from(row.querySelectorAll('td')).slice(2); // Skip first two columns
            return cells.map((cell, index) => {
                if (index === 0) { // GTIN column
                    // Get the GTIN value and format as text
                    const gtin = cell.textContent.trim();
                    return { v: gtin, t: 's' };
                }
                // For package layer and product type dropdowns, get the selected value
                if (cell.querySelector('select')) {
                    const select = cell.querySelector('select');
                    return select.options[select.selectedIndex].text;
                }
                return cell.textContent.trim();
            });
        });

        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

        // Set column widths
        const colWidths = [
            { wch: 20 }, // GTIN
            { wch: 40 }, // Product description
            { wch: 20 }, // Package layer
            { wch: 20 }, // Quantity
            { wch: 15 }  // Product type
        ];
        ws['!cols'] = colWidths;

        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Producten");

        // Format current date and time
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const dateTimeStr = `${day}-${month}-${year} ${hours}:${minutes}`;

        // Create filename with GLN, company name, date, and time
        const filename = `${this.selectedCompany.gln} - ${this.selectedCompany.companyName} - ontvangstlijst - ${dateTimeStr}.xlsx`;

        // Generate Excel file
        XLSX.writeFile(wb, filename);
    }
}
