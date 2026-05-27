
import { saveCalculatorState, loadCalculatorState } from './app-sync.js';

const collect = document.getElementById('collect');
const totalCost = document.getElementById('totalCost');
const nom = document.getElementById('number');
const calculateRate = document.getElementById('calculated_rate');


window.addEventListener('DOMContentLoaded', () => {
    
    if (!navigator.onLine) {
        console.log("ক্যালকুলেটরে অফলাইন ক্যাশ ডাটা লোড হচ্ছে...");
        loadCachedCalculatorData();
    } else {
        setTimeout(() => {
            loadLiveDataFromFirebase();
        }, 1500);
    }
});


function loadCachedCalculatorData() {
    const savedState = loadCalculatorState();
    if (collect) collect.value = savedState.collect || "0";
    if (totalCost) totalCost.value = savedState.totalCost || "0";
    if (nom) nom.value = savedState.number || "0";
    
      
    let x = parseFloat(totalCost.value) || 0;
    let y = parseFloat(nom.value) || 0;
    if (y > 0 && calculateRate) {
        calculateRate.value = (x / y).toFixed(2) + " ৳";
    } else if (calculateRate) {
        calculateRate.value = "0.00 ৳";
    }
}


function loadLiveDataFromFirebase() {
    if (!window.firebaseDB) {
        console.error("Firebase এখনো লোড হয়নি! index.html এর কোড চেক করুন।");
        loadCachedCalculatorData(); 
        return;
    }

    const dbRef = window.firebaseDatabaseRef(window.firebaseDB);

    
    window.firebaseGet(window.firebaseChild(dbRef, 'collections'))
    .then((snapshot) => {
        let grandTotalCollection = 0;
        if (snapshot.exists()) {
            const rootData = snapshot.val();
            for (let userKey in rootData) {
                for (let monthKey in rootData[userKey]) {
                    grandTotalCollection += (parseInt(rootData[userKey][monthKey].taka) || 0);
                }
            }
        }
        if (collect) collect.value = grandTotalCollection;
        
        
        return window.firebaseGet(window.firebaseChild(dbRef, 'meals'));
    })
    .then((snapshot) => {
        let totalMealsCount = 0;
        if (snapshot.exists()) {
            const mealsData = snapshot.val();
            for (let userKey in mealsData) {
                for (let dateKey in mealsData[userKey]) {
                    const dayMeals = mealsData[userKey][dateKey];
                    if (dayMeals.breakfast) totalMealsCount += 0.5;
                    if (dayMeals.lunch) totalMealsCount += 1;
                    if (dayMeals.dinner) totalMealsCount += 1;
                }
            }
        }
        if (nom) nom.value = totalMealsCount;

        
        return window.firebaseGet(window.firebaseChild(dbRef, 'bazarCost'));
    })
    .then((snapshot) => {
        let totalCostTaka = 0;
        if (snapshot.exists()) {
            totalCostTaka = parseFloat(snapshot.val()) || 0;
        }
        if (totalCost) totalCost.value = totalCostTaka;

        
        calculateLiveMealRate();
    })
    .catch((error) => {
        console.error("ফায়ারবেস থেকে ডাটা লোড করতে সমস্যা হয়েছে, অফলাইন ডাটা দেখানো হচ্ছে: ", error);
        loadCachedCalculatorData(); // কোনো এরর আসলে নিরাপদ থাকার জন্য ক্যাশ ডাটা লোড করবে
    });
}


function calculateLiveMealRate() {
    if (!totalCost || !nom || !calculateRate) return;

    let x = parseFloat(totalCost.value) || 0;
    let y = parseFloat(nom.value) || 0;
    let finalRate = "0.00";
    
    if (y > 0) {
        const rate = x / y;
        finalRate = rate.toFixed(2);
        calculateRate.value = finalRate + " ৳"; 
    } else {
        calculateRate.value = finalRate + " ৳";
    }

    
    saveCalculatorState({
        collect: collect.value,
        totalCost: totalCost.value,
        number: parseFloat(nom.value)
    });

    
    if (navigator.onLine && window.firebaseDB && window.firebaseDatabaseRef && window.firebaseSet) {
        const mealRateRef = window.firebaseDatabaseRef(window.firebaseDB, 'finalRate');
        
        window.firebaseSet(mealRateRef, parseFloat(finalRate))
        .then(() => {
            console.log("মিল রেট অনলাইনে সফলভাবে আপডেট হয়েছে: " + finalRate);
            
            localStorage.setItem('cache_final_rate', finalRate);
        })
        .catch((error) => {
            console.error("অনলাইনে মিল রেট আপডেট হতে সমস্যা: ", error);
        });
    } else {
        
        localStorage.setItem('cache_final_rate', finalRate);
        console.log("অফলাইন মোড: মিল রেট লোকালে ক্যাশ করা হয়েছে।");
    }
}


if (collect) collect.addEventListener('input', calculateLiveMealRate);
if (totalCost) totalCost.addEventListener('input', calculateLiveMealRate);
if (nom) nom.addEventListener('input', calculateLiveMealRate);
