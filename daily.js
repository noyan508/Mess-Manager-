import { saveBazarData, getAllBazarHistory } from './app-sync.js';

const name = document.getElementById('name');
const month = document.getElementById('month');
const taka = document.getElementById('taka');
const tbody = document.getElementById('table-body');
const total = document.getElementById('totalPrice');
const year = document.getElementById('year');


function addOptionToDropdown(value, text) {
    if (name) {
        const newOption = document.createElement('option');
        newOption.value = value;
        newOption.textContent = text;
        
        name.insertBefore(newOption, name.lastElementChild);
    }
}


function loadCustomOptions() {
    
    const database = window.firebaseDB;
    const ref = window.firebaseDatabaseRef;
    const get = window.firebaseGet;
    const child = window.firebaseChild;

    if (!database || !ref || !get || !child) {
        console.error("Firebase মেথডগুলো খুঁজে পাওয়া যায়নি! নিশ্চিত করুন HTML-এ Firebase আগে লোড হয়েছে।");
        return;
    }
    
    const dbRef = ref(database);
    get(child(dbRef, 'custom_options')).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            Object.keys(data).forEach(key => {
                addOptionToDropdown(data[key].value, data[key].text);
            });
        }
    }).catch((error) => {
        console.error("ডাটা লোড করতে সমস্যা হয়েছে:", error);
    });
}


window.checkDropdown = function(selectElement) {
    if (selectElement.value === 'add-new') {
        const newProductName = prompt("নতুন পণ্যের নাম লিখুন:");
        
        if (newProductName && newProductName.trim() !== "") {
            const cleanName = newProductName.trim();
            
            const optionValue = cleanName.toLowerCase().replace(/\s+/g, '-'); 

            const database = window.firebaseDB;
            const ref = window.firebaseDatabaseRef;
            const set = window.firebaseSet;

            if (!database || !ref || !set) {
                alert("ডাটাবেজ কানেকশন পাওয়া যায়নি!");
                selectElement.value = "";
                return;
            }

            
            const uniqueId = 'opt_' + Date.now();
            const optionRef = ref(database, 'custom_options/' + uniqueId);
            
            set(optionRef, {
                value: optionValue,
                text: cleanName
            }).then(() => {
                
                addOptionToDropdown(optionValue, cleanName);
                selectElement.value = optionValue; 
                alert("নতুন পণ্য সফলভাবে যোগ করা হয়েছে!");
            }).catch((error) => {
                alert("সেভ করতে সমস্যা হয়েছে: " + error.message);
                selectElement.value = "";
            });
        } else {
            selectElement.value = ""; 
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


window.addEventListener('DOMContentLoaded', () => {
    
    setTimeout(() => {
        loadCustomOptions();
        window.loadPrice();
    }, 1000);
});
