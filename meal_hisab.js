
import { saveMealData, loadMonthData, getAllMembersMealsData } from './app-sync.js';

const dateInput = document.getElementById('meal_date');
const dateDisplay = document.querySelector('#date-display'); 
const nameInput = document.getElementById('name'); 
const breakfast = document.getElementById('breakfast'); 
const lunch = document.getElementById('lunch'); 
const dinner = document.getElementById('dinner'); 
const mealBox = document.getElementById('mealBox');

const monthName = document.getElementById('month-name');
const tk = document.getElementById('month-tk');
const heading = document.getElementById('heading');
const tbody = document.getElementById('table-body');
const total = document.getElementById('total-amount');
const button = document.getElementById('clear-btn');

const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", 
                    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    dateInput.addEventListener('change', function() {
        updateDateDisplay();
        checkExistingMeal(); 
    });
}

if (nameInput) {
    nameInput.addEventListener('input', function() {
        if (this.value.trim() !== "") {
            if (mealBox) mealBox.style.display = "block";
        } else {
            if (mealBox) mealBox.style.display = "none";
        }
        updateDateDisplay(); 
        checkExistingMeal(); 
    });
}

function getFormattedDateString(selectedDate) {
    const day = selectedDate.getDate();
    const month = monthNames[selectedDate.getMonth()];
    const yr = selectedDate.getFullYear();
    return `${day} ${month} , ${yr}`;
}


window.saveMealToFirebase = function() {
    if (!dateInput || !nameInput) return;
    
    const selectedDate = new Date(dateInput.value.replace(/-/g, '\/'));
    const fullDate = getFormattedDateString(selectedDate);
    const currentName = nameInput.value.trim().toLowerCase();
    const dateKey = dateInput.value; 

    if (!currentName) {
        alert('দয়া করে নাম লিখুন!');
        return;
    }
    
    const b = document.getElementById('breakfast') ? document.getElementById('breakfast').checked : false;
    const l = document.getElementById('lunch') ? document.getElementById('lunch').checked : false;
    const d = document.getElementById('dinner') ? document.getElementById('dinner').checked : false;

    const firebaseMealObj = {
        name: currentName,
        dateKey: dateKey,
        breakfast: b,
        lunch: l,
        dinner: d,
        fullDate: fullDate,
        month: monthNames[selectedDate.getMonth()]
    };

    saveMealData(firebaseMealObj).then((success) => {
        if(success) {
            if(nameInput) nameInput.value = "";
            if(mealBox) mealBox.style.display = "none";
            clearCheckboxes();
            updateDateDisplay();
            
            window.loadMonthDataFromFirebase();
        }
    });
}

function updateDateDisplay() {
    if (!dateInput || !dateDisplay) return;
    
    const selectedDate = new Date(dateInput.value.replace(/-/g, '\/'));
    if (isNaN(selectedDate)) return;

    const day = selectedDate.getDate();
    const year = selectedDate.getFullYear();
    const month = monthNames[selectedDate.getMonth()];
    
    let suffix = "th";
    if (day === 1 || day === 21 || day === 31) suffix = "st";
    else if (day === 2 || day === 22) suffix = "nd";
    else if (day === 3 || day === 23) suffix = "rd";
    
    dateDisplay.innerHTML = `তারিখ: ${day}<sup>${suffix}</sup> ${month} , ${year}`;
} 

function clearCheckboxes() {
    if (breakfast) breakfast.checked = false;
    if (lunch) lunch.checked = false;
    if (dinner) dinner.checked = false;
}

async function checkExistingMeal() {
    const currentName = nameInput ? nameInput.value.trim().toLowerCase() : "";
    const dateKey = dateInput ? dateInput.value : "";

    if (!currentName || !dateKey) {
        clearCheckboxes();
        return;
    }

    let offlineMeals = JSON.parse(localStorage.getItem('offline_meals')) || [];
    let localMatch = offlineMeals.find(meal => meal.dateKey === dateKey && meal.name === currentName);

    if (localMatch) {
        if (breakfast) breakfast.checked = localMatch.breakfast;
        if (lunch) lunch.checked = localMatch.lunch;
        if (dinner) dinner.checked = localMatch.dinner;
        return;
    }

    if (navigator.onLine && window.firebaseDB && window.firebaseDatabaseRef && window.firebaseGet) {
        const dbRef = window.firebaseDatabaseRef(window.firebaseDB, `meals/${currentName}/${dateKey}`);
        
        window.firebaseGet(dbRef).then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                if (breakfast) breakfast.checked = data.breakfast || false;
                if (lunch) lunch.checked = data.lunch || false;
                if (dinner) dinner.checked = data.dinner || false;
            } else {
                clearCheckboxes();
            }
        }).catch((error) => {
            console.error("অনলাইন থেকে মিল চেক করতে সমস্যা হয়েছে: ", error);
        });
    } else {
        let cachedData = JSON.parse(localStorage.getItem(`cache_meals_${currentName}`)) || {};
        if (cachedData[dateKey]) {
            let data = cachedData[dateKey];
            if (breakfast) breakfast.checked = data.breakfast || false;
            if (lunch) lunch.checked = data.lunch || false;
            if (dinner) dinner.checked = data.dinner || false;
        } else {
            clearCheckboxes();
        }
    }
}

if (dateInput) {
    updateDateDisplay();
    setTimeout(() => { checkExistingMeal(); }, 1500);
}


window.loadMonthDataFromFirebase = async function() {
    if (!tbody) return;

    const currentName = monthName ? monthName.value.trim().toLowerCase() : "";
    tbody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>ডেটা লোড হচ্ছে...</td></tr>";

    
    if (currentName !== "") {
        const mealData = await loadMonthData(currentName);
        if (mealData) {
            window.currentLoadedMeals = mealData;
            window.currentLoadedName = currentName;
            renderMealTableLive();
        } else {
            tbody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>এই মেম্বারের কোনো ডেটা পাওয়া যায়নি!</td></tr>";
            if(total) total.innerHTML = "0.00 ৳";
            if(heading) heading.innerHTML = "";
            window.currentLoadedMeals = null;
        }
    }
    
    else {
        const allMealsData = await getAllMembersMealsData();
        if (allMealsData) {
            let combinedMeals = {};

            
            for (let user in allMealsData) {
                let userMeals = allMealsData[user];
                for (let dateKey in userMeals) {
                    let item = userMeals[dateKey];
                    
                    if (!combinedMeals[dateKey]) {
                        combinedMeals[dateKey] = {
                            fullDate: item.fullDate || dateKey,
                            breakfast: 0,
                            lunch: 0,
                            dinner: 0
                        };
                    }
                    
                    
                    if (item.breakfast) combinedMeals[dateKey].breakfast += 0.5;
                    if (item.lunch) combinedMeals[dateKey].lunch += 1;
                    if (item.dinner) combinedMeals[dateKey].dinner += 1;
                }
            }
            
            window.currentLoadedMeals = combinedMeals;
            window.currentLoadedName = "সব মেম্বারের একত্রিত";
            renderMealTableLive(true); 
        } else {
            tbody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>ডাটাবেজে কোনো মিলের রেকর্ড নেই!</td></tr>";
            if(total) total.innerHTML = "0.00 ৳";
            if(heading) heading.innerHTML = "";
        }
    }
}


function renderMealTableLive(isCombined = false) {
    if (!tbody || !window.currentLoadedMeals) return;

    const currentTkPerMeal = tk ? (parseFloat(tk.value) || 0) : 0; 
    if(tk) localStorage.setItem('last_viewed_meal_tk', tk.value);

    tbody.innerHTML = ""; 
    let grandTotal = 0;

    if(heading && window.currentLoadedName) {
        heading.innerHTML = window.currentLoadedName.toUpperCase() + " হিসাব ";
    }

    const sortedDates = Object.keys(window.currentLoadedMeals).sort();

    sortedDates.forEach(dateKey => {
        let item = window.currentLoadedMeals[dateKey];
        let liveTaka = 0;
        let bDisplay, lDisplay, dDisplay;

        if (isCombined) {
            
            bDisplay = `${item.breakfast} টি`;
            lDisplay = `${item.lunch} টি`;
            dDisplay = `${item.dinner} টি`;
            
            let totalDayMeals = item.breakfast + item.lunch + item.dinner;
            liveTaka = totalDayMeals * currentTkPerMeal;
        } else {
            
            let mealCount = 0;
            if (item.breakfast) mealCount += 0.5;
            if (item.lunch) mealCount += 1;
            if (item.dinner) mealCount += 1;
            
            liveTaka = mealCount * currentTkPerMeal;

            bDisplay = item.breakfast ? "✓" : "✗";
            lDisplay = item.lunch ? "✓" : "✗";
            dDisplay = item.dinner ? "✓" : "✗";
        }

        const row = `<tr>
            <td>${item.fullDate || dateKey}</td>
            <td>${bDisplay}</td>
            <td>${lDisplay}</td>
            <td>${dDisplay}</td>
            <td>${liveTaka.toFixed(2)} ৳</td>
        </tr>`;
        tbody.innerHTML += row;
        
        grandTotal += liveTaka;
    });
    
    if(total) total.innerHTML = grandTotal.toFixed(2) + " ৳";
}

if (tk) {
    tk.addEventListener('input', () => {
        const isCombined = (monthName && monthName.value.trim() === "");
        renderMealTableLive(isCombined);
    });
}


if (monthName) {
    monthName.addEventListener('input', window.loadMonthDataFromFirebase);
}


window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const savedTk = localStorage.getItem('last_viewed_meal_tk');
        if (savedTk && tk) {
            tk.value = savedTk;
        }
        
        window.loadMonthDataFromFirebase();
    }, 1200); 
});

if(button) {
    button.onclick = () => {
        if(confirm("সতর্কতা: এটি লাইভ ডাটাবেজ ক্লিয়ার করবে না, শুধু পেজ রিফ্রেশ করবে।")) {
            if(tbody) tbody.innerHTML = "";
            if(total) total.innerHTML = "0";
            if(monthName) monthName.value = "";
            if(tk) tk.value = "";
            if(heading) heading.innerHTML = "";
            localStorage.removeItem('last_viewed_meal_tk');
            window.loadMonthDataFromFirebase(); 
        }
    };
}

