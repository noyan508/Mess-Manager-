
import { saveBazarData, getAllBazarHistory } from './app-sync.js';

const name = document.getElementById('name');
const month = document.getElementById('month');
const taka = document.getElementById('taka');
const tbody = document.getElementById('table-body');
const total = document.getElementById('totalPrice');
const year = document.getElementById('year');


window.checkDropdown = function(selectElement) {
    if (selectElement.value === "add-new") {
        var newItem = prompt("নতুন অপশনের নাম লিখুন:");
        if (newItem !== null && newItem.trim() !== "") {
            newItem = newItem.trim();
            var newOption = document.createElement("option");
            newOption.text = newItem;
            newOption.value = newItem.toLowerCase().replace(/\s+/g, '-');
            var length = selectElement.options.length;
            selectElement.add(newOption, length - 1);
            newOption.selected = true;
        } else {
            selectElement.selectedIndex = 0;
        }
    }
}

const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", 
                "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

function getFormattedDateString() {
    const selectedDate = new Date();
    const day = selectedDate.getDate();
    const month = months[selectedDate.getMonth()];
    const yr = selectedDate.getFullYear();
    return `${day} ${month} , ${yr}`;
}

function getShortDateKey() {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
}


window.dailyBazar = async function() {
    const fullDateStr = getFormattedDateString();
    const dateKey = getShortDateKey(); 
    const productName = name.value ? name.value.trim().toLowerCase() : "";
    let tkInput = parseInt(taka.value) || 0;
    
    if (!productName) {
        alert('দয়া করে বাজারের নাম বা আইটেম সিলেক্ট করুন!');
        return;
    }
    if (tkInput <= 0) {
        alert('দয়া করে সঠিক টাকার পরিমাণ লিখুন!');
        return;
    }

    const dbPath = 'bazar_history/' + dateKey + '/' + productName;
    let newTotalTaka = tkInput;
    
    
    let cachedBazarHistory = JSON.parse(localStorage.getItem('cache_bazar_history')) || {};
    if (cachedBazarHistory[dateKey] && cachedBazarHistory[dateKey][productName]) {
        const existingData = cachedBazarHistory[dateKey][productName];
        newTotalTaka = (parseInt(existingData.taka) || 0) + tkInput;
    }

    const collectObj = {
        name: productName,
        date: fullDateStr,
        taka: newTotalTaka
    };

    
    const success = await saveBazarData(dbPath, collectObj, tkInput);
    if (success) {
        if(name) name.value = "";
        if(taka) taka.value = "";
        window.loadPrice();
    }
}



function renderTableData(rootData) {
    if (!tbody) return;
    
    tbody.innerHTML = ""; 
    let productTotal = 0;
    let rowsHtml = "";

    if (rootData) {
        
        Object.keys(rootData).forEach(dateKey => {
            const dateNode = rootData[dateKey];
            if (dateNode && typeof dateNode === 'object') {
                Object.keys(dateNode).forEach(itemKey => {
                    const item = dateNode[itemKey];
                    if (item) {
                        let itemName = item.name ? item.name : itemKey;
                        let itemDate = item.date ? item.date : dateKey;
                        let liveTaka = Number(item.taka) || 0;

                        rowsHtml += `<tr>
                            <td style="text-transform: uppercase;">${itemName}</td>
                            <td>${itemDate}</td>
                            <td>${liveTaka} ৳</td>
                        </tr>`;
                        
                        productTotal += liveTaka;
                    }
                });
            }
        });
        tbody.innerHTML = rowsHtml;
    }

    if (tbody.innerHTML === "") {
        tbody.innerHTML = "<tr><td colspan='3' style='text-align:center;'>আজ পর্যন্ত কোনো বাজারের রেকর্ড নেই!</td></tr>";
    }

    if (total) total.innerHTML = productTotal + " ৳";
    
    
    localStorage.setItem('cache_bazar_cost', productTotal);
    if (navigator.onLine && window.firebaseDB && window.firebaseDatabaseRef && window.firebaseSet) {
        const totalCostRef = window.firebaseDatabaseRef(window.firebaseDB, 'bazarCost');
        window.firebaseSet(totalCostRef, productTotal);
    }
}



window.loadPrice = async function() {
    
    const rootData = await getAllBazarHistory();
    renderTableData(rootData);
}

if(name) name.addEventListener('change', window.loadPrice);


window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.loadPrice();
    }, 1000);
});
