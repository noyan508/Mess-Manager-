
import { saveCollectionData, getAllCollections } from './app-sync.js';

const name = document.getElementById('name');
const month = document.getElementById('month');
const taka = document.getElementById('taka');
const headingName = document.getElementById('heading-name');
const headingMonth = document.getElementById('heading-month');
const tbody = document.getElementById('table-body');
const total = document.getElementById('totalCollect');
const year = document.getElementById('year');
const button = document.getElementById('clear-btn');


window.saveMealToFirebase = async function() {
    const selectedMonth = month.value;
    const currentName = name.value.trim().toLowerCase();
    const inputTaka = parseInt(taka.value) || 0;
    
    if (!currentName) {
        alert('দয়া করে নাম লিখুন!');
        return;
    }
    if (!selectedMonth) {
        alert('দয়া করে মাস সিলেক্ট করুন!');
        return;
    }
    if (inputTaka <= 0) {
        alert('দয়া করে সঠিক টাকার পরিমাণ লিখুন!');
        return;
    }

    const dbPath = 'collections/' + currentName + '/' + selectedMonth;
    let newTotalTaka = inputTaka;

    
    let cachedCollections = JSON.parse(localStorage.getItem('cache_collections')) || {};
    if (cachedCollections[currentName] && cachedCollections[currentName][selectedMonth]) {
        const existingData = cachedCollections[currentName][selectedMonth];
        newTotalTaka = (parseInt(existingData.taka) || 0) + inputTaka;
    }

    const collectObj = {
        name: currentName,
        month: selectedMonth,
        taka: newTotalTaka
    };

    
    const success = await saveCollectionData(dbPath, collectObj, inputTaka);
    if (success) {
        if(taka) taka.value = "";
        window.loadCollection();
    }
}


window.loadCollection = async function() {
    if (!tbody) return;

    const selectMonth = month.value;
    const currentName = name.value.trim().toLowerCase();
    let na = name.value.trim().toUpperCase();
    
    if(headingName) headingName.innerHTML = "NAME : " + (na || "সবার");
    if(headingMonth) headingMonth.innerHTML = "MONTH : " + (selectMonth || "");

    tbody.innerHTML = "<tr><td colspan='3' style='text-align:center;'>ডাটা লোড হচ্ছে...</td></tr>";

    
    const rootData = await getAllCollections();
    
    tbody.innerHTML = ""; 
    let filterTotal = 0;
    let allCollections = [];

    if (rootData) {
        
        for (let userKey in rootData) {
            for (let monthKey in rootData[userKey]) {
                const item = rootData[userKey][monthKey];
                
                const matchMonth = selectMonth ? item.month === selectMonth : true;
                const matchName = currentName ? item.name === currentName : true;

                if (matchMonth && matchName) {
                    allCollections.push(item);
                }
            }
        }
        
        
        allCollections.sort((a, b) => a.name.localeCompare(b.name));
        
        
        allCollections.forEach(item => {
            let liveTaka = Number(item.taka) || 0;

            const row = `<tr>
                <td style="text-transform: uppercase;">${item.name}</td>
                <td>${item.month}</td>
                <td>${liveTaka} ৳</td>
            </tr>`;
            tbody.innerHTML += row;
            
            filterTotal += liveTaka;
        });
    }

    if (allCollections.length === 0) {
        tbody.innerHTML = "<tr><td colspan='3' style='text-align:center;'>কোনো জমার রেকর্ড পাওয়া যায়নি!</td></tr>";
    }
    
    if(total) total.innerHTML = filterTotal + " ৳";
    
    
    localStorage.setItem('grandTotal', filterTotal);
}


if(month) month.addEventListener('change', window.loadCollection);
if(name) name.addEventListener('input', window.loadCollection);


window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.loadCollection();
    }, 1000);
});


if(button) {
    button.onclick = () => {
        if(confirm("পেজের ভিউ ক্লিয়ার করবেন?")) {
            if(name) name.value = "";
            if(month) month.value = "";
            if(taka) taka.value = "";
            window.loadCollection();
        }
    };
}
