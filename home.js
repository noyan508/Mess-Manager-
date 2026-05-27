import { getBazarCost, getFinalRate, getUserMealsData } from './app-sync.js';

const totalBazarCost = document.getElementById('totalBazarCost');
const liveRate = document.getElementById('liveRate');
const userTotalMeals = document.getElementById('userTotalMeals');

// টোস্ট নোটিফিকেশন দেখানোর হেল্পার ফাংশন
function showToast(message, type = 'success') {
    Toastify({
        text: message,
        duration: 3000,
        gravity: "top", 
        position: "right", 
        style: {
            background: type === 'success' 
                ? "linear-gradient(to right, #00b09b, #96c93d)" 
                : "linear-gradient(to right, #ff5f6d, #ffc371)"
        }
    }).showToast();
}

function switchPage(pageId, index) {
    const items = document.querySelectorAll('.nav-item');
    items.forEach(item => item.classList.remove('active'));
    if(items[index]) items[index].classList.add('active');
    
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(page => page.classList.remove('active'));
    
    const selectedPage = document.getElementById(pageId);
    if(selectedPage) selectedPage.classList.add('active');
}

window.loadCost = async function(){
    if (!totalBazarCost) return;
    try {
        const cost = await getBazarCost();
        let totalCostTaka = parseFloat(cost) || 0;
        totalBazarCost.innerHTML = totalCostTaka.toFixed(2) + " ৳";
        showToast("বাজার খরচ সফলভাবে লোড হয়েছে!");
    } catch (error) {
        showToast("বাজার খরচ লোড করতে সমস্যা হয়েছে!", "error");
    }
}

window.mealRate = function(){
    if (!liveRate) return;
    getFinalRate().then((rate) => {
        let actualRate = parseFloat(rate) || 0;
        liveRate.innerHTML = actualRate.toFixed(2) + " ৳";
    }).catch((error) => {
        showToast("লাইভ মিল রেট লোড করতে সমস্যা হয়েছে!", "error");
    });
}

async function fetchUserTotalMeals(username) {
    if (!userTotalMeals || !username) return;
    try {
        const datesData = await getUserMealsData(username.trim().toLowerCase());
        let totalMeals = 0;
        if (datesData) {
            for (let date in datesData) {
                const dayMeal = datesData[date];
                if (dayMeal.breakfast) totalMeals += 0.5; 
                if (dayMeal.lunch) totalMeals += 1;       
                if (dayMeal.dinner) totalMeals += 1;      
            }
        }
        userTotalMeals.innerText = totalMeals.toFixed(2) + " টি";
    } catch (err) {
        showToast("মিল গণনা লোড করতে ত্রুটি হয়েছে!", "error");
    }
}

// ব্রাউজার পুশ নোটিফিকেশন পারমিশন ও সার্ভিস ওয়ার্কার রেজিস্টার করা
async function setupPushNotifications() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
            // সার্ভিস ওয়ার্কার রেজিস্টার
            const registration = await navigator.serviceWorker.register('/sw.js');
            
            // নোটিফিকেশনের পারমিশন চাওয়া
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('নোটিফিকেশন পারমিশন পাওয়া গেছে!');
                
                // এখানে FCM বা Web Push Token জেনারেট করে আপনার AppSync ডেটাবেজে পাঠাতে হবে
                // const token = await registration.pushManager.subscribe({...});
                // await saveTokenToDatabase(token);
            }
        } catch (error) {
            console.error('সার্ভিস ওয়ার্কার বা নোটিফিকেশন সেটআপে ভুল:', error);
        }
    }
}

window.switchPage = switchPage;
window.fetchUserTotalMeals = fetchUserTotalMeals;

window.addEventListener('DOMContentLoaded', () => {
    if(window.loadCost) window.loadCost();
    if(window.mealRate) window.mealRate();
    
    const cachedUser = localStorage.getItem('logged_in_user');
    if (cachedUser && window.fetchUserTotalMeals) {
        window.fetchUserTotalMeals(cachedUser);
    }

    // অ্যাপ চালু হলেই নোটিফিকেশন সেটআপ রান হবে
    setupPushNotifications();
});
