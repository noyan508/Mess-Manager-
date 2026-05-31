// app-sync.js থেকে প্রয়োজনীয় হাইব্রিড ফাংশন ইমপোর্ট করা হল

import { getAllBazarHistory } from './app-sync.js';

const tableBody = document.getElementById('tableBody');
const totalCost = document.getElementById('totalCost');

// ==========================================
// ১. ডাটা রেন্ডার করার মূল লজিক (গ্রুপিং সহ)
// ==========================================
function renderGroupedData(rootData) {
    if (!tableBody) return;

    tableBody.innerHTML = ""; 
    let productCost = 0;
    let rowHTML = "";
    const groupData = {}; 

    if (rootData) {
        // তারিখ এবং আইটেম নোড লুপ করে ডাটা গ্রুপ করা
        for (let dateKey in rootData) {
            for (let itemKey in rootData[dateKey]) {
                const item = rootData[dateKey][itemKey];
                const taka = Number(item.taka) || 0;
                const date = item.date ? item.date : dateKey; 
               
                if (groupData[date]) {
                    groupData[date] += taka;
                } else {
                    groupData[date] = taka;
                }
            }
        }

        // গ্রুপ করা ডাটা দিয়ে টেবিল রো (Row) তৈরি
        for (const date in groupData) {
            const totalTakaonDate = groupData[date];
            
            rowHTML += `<tr>
                <td>${date}</td>
                <td>${totalTakaonDate} ৳</td>
            </tr>`;
            
            productCost += totalTakaonDate; // সর্বমোট বাজার খরচ যোগ হচ্ছে
        }
    }

    // টেবিল আপডেট
    if (rowHTML !== "") {
        tableBody.innerHTML = rowHTML;
    } else {
        tableBody.innerHTML = "<tr><td colspan='2' style='text-align:center;'>কোনো বাজারের রেকর্ড পাওয়া যায়নি!</td></tr>";
    }

    if (totalCost) totalCost.textContent = productCost + " ৳";

    // লোকাল ক্যাশ মেমোরি এবং অনলাইনে 'bazarCost' সিঙ্ক রাখা
    localStorage.setItem('cache_bazar_cost', productCost);
    if (navigator.onLine && window.firebaseDB && window.firebaseDatabaseRef && window.firebaseSet) {
        const totalCostRef = window.firebaseDatabaseRef(window.firebaseDB, 'bazarCost');
        window.firebaseSet(totalCostRef, productCost);
    }
}

// ==========================================
// ২. বাজার খরচ লোড ফাংশন (হাইব্রিড)
// ==========================================
window.loadPrice = async function() {
    // অনলাইন থাকলে ফায়ারবেস থেকে আনবে, অফলাইন থাকলে ক্যাশ মেমোরি থেকে আনবে
    const rootData = await getAllBazarHistory();
    renderGroupedData(rootData);
}

// পেজ লোড হওয়ার ১ সেকেন্ড পর ডাটা রেন্ডার হবে যেন ফায়ারবেস রেডি হবার সময় পায়
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.loadPrice();
    }, 1000);
});
