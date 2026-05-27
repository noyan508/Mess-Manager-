

import { initializeApp } from "./firebase-app.js";
import { getDatabase, ref, set, get } from "./firebase-database.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "./firebase-auth.js";


const firebaseConfig = {
  apiKey: "AIzaSyB-Zzsrl5-chOLtnFalRZU4bgGNnSJ-K18",
  authDomain: "mess-manager-9b662.firebaseapp.com",
  projectId: "mess-manager-9b662",
  storageBucket: "mess-manager-9b662.firebasestorage.app",
  messagingSenderId: "710172865421",
  appId: "1:710172865421:web:8897233378a250b0ed03c4",
  databaseURL: "https://mess-manager-9b662-default-rtdb.firebaseio.com/"
};


const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();


window.firebaseDB = database;
window.firebaseDatabaseRef = ref;
window.firebaseSet = set;
window.firebaseGet = get;
window.firebaseChild = (parentRef, path) => ref(database, parentRef.key ? `${parentRef.key}/${path}` : path);


export async function getBazarCost() {
    if (navigator.onLine && database) {
        const dbRef = ref(database, 'bazarCost');
        const snapshot = await get(dbRef);
        if (snapshot.exists()) {
            localStorage.setItem('cache_bazar_cost', snapshot.val());
            return snapshot.val();
        }
        return 0;
    } else {
        return localStorage.getItem('cache_bazar_cost') || 0;
    }
}


export async function getFinalRate() {
    if (navigator.onLine && database) {
        const dbRef = ref(database, 'finalRate');
        const snapshot = await get(dbRef);
        if (snapshot.exists()) {
            localStorage.setItem('cache_final_rate', snapshot.val());
            return snapshot.val();
        }
        return 0;
    } else {
        return localStorage.getItem('cache_final_rate') || 0;
    }
}

export async function getUserMealsData(username) {
    if (navigator.onLine && database) {
        const dbRef = ref(database, `meals/${username}`);
        const snapshot = await get(dbRef);
        if (snapshot.exists()) {
            localStorage.setItem(`cache_meals_${username}`, JSON.stringify(snapshot.val()));
            return snapshot.val();
        }
        return null;
    } else {
        return JSON.parse(localStorage.getItem(`cache_meals_${username}`)) || null;
    }
}


export function saveMealData(mealObj) {
    const { name, dateKey } = mealObj;
    
    if (navigator.onLine) {
        const dbRef = ref(database, `meals/${name}/${dateKey}`);
        return set(dbRef, mealObj)
            .then(() => {
                alert(`অনলাইনে সফলভাবে সেভ হয়েছে!`);
                return true;
            })
            .catch(err => {
                alert("অনলাইন সেভে সমস্যা: " + err.message);
                return false;
            });
    } else {
        
        let offlineMeals = JSON.parse(localStorage.getItem('offline_meals')) || [];
        offlineMeals = offlineMeals.filter(meal => !(meal.dateKey === dateKey && meal.name === name));
        offlineMeals.push(mealObj);
        localStorage.setItem('offline_meals', JSON.stringify(offlineMeals));
        
        alert("ইন্টারনেট নেই! ডাটা ফোনে অফলাইনে সেভ হলো। অনলাইন হলেই সিঙ্ক হবে।");
        return true;
    }
}


export async function loadMonthData(name) {
    return await getUserMealsData(name);
}


export async function getAllMembersMealsData() {
    if (navigator.onLine && database) {
        const dbRef = ref(database, 'meals');
        try {
            const snapshot = await get(dbRef);
            if (snapshot.exists()) {
                localStorage.setItem('cache_all_meals', JSON.stringify(snapshot.val()));
                return snapshot.val();
            }
            return null;
        } catch (err) {
            return null;
        }
    } else {
        return JSON.parse(localStorage.getItem('cache_all_meals')) || null;
    }
}



export function saveCalculatorState(calcObj) {
    localStorage.setItem('cache_calculator', JSON.stringify(calcObj));
}

export function loadCalculatorState() {
    return JSON.parse(localStorage.getItem('cache_calculator')) || { collect: "", totalCost: "", number: "" };
}


window.addEventListener('online', () => {
    console.log("ইন্টারনেট কানেকশন ফিরে এসেছে। অফলাইন ডাটা সিঙ্ক হচ্ছে...");
    
    
    let offlineMeals = JSON.parse(localStorage.getItem('offline_meals')) || [];
    if (offlineMeals.length > 0) {
        let promises = offlineMeals.map(meal => {
            const dbRef = ref(database, `meals/${meal.name}/${meal.dateKey}`);
            return set(dbRef, meal);
        });

        Promise.all(promises)
            .then(() => {
                localStorage.removeItem('offline_meals');
                alert("আপনার অফলাইনে করা সব মিল হিসাব সফলভাবে মেইন ডাটাবেজে সিঙ্ক হয়েছে!");
                if(window.loadCost) window.loadCost();
                if(window.mealRate) window.mealRate();
            })
            .catch(err => console.error("মিল অটো-সিঙ্ক ব্যর্থ:", err));
    }

  
    let offlineCollects = JSON.parse(localStorage.getItem('offline_collections')) || [];
    if (offlineCollects.length > 0) {
        let promises = offlineCollects.map(item => {
            const dbRef = ref(database, item.dbPath);
            return get(dbRef).then((snapshot) => {
                if (snapshot.exists()) {
                    item.collectObj.taka = Number(snapshot.val().taka) + (Number(item.collectObj.taka) - Number(snapshot.val().taka || 0));
                }
                return set(dbRef, item.collectObj);
            });
        });

        Promise.all(promises)
            .then(() => {
                localStorage.removeItem('offline_collections');
                alert("অফলাইনের সমস্ত জমার হিসাব সফলভাবে মেইন ডাটাবেজে সিঙ্ক হয়েছে!");
                if(window.loadCollection) window.loadCollection();
            })
            .catch(err => console.error("কালেকশন অটো-সিঙ্ক ব্যর্থ:", err));
    }

    
    let offlineBazars = JSON.parse(localStorage.getItem('offline_bazars')) || [];
    if (offlineBazars.length > 0) {
        let promises = offlineBazars.map(item => {
            const dbRef = ref(database, item.dbPath);
            return get(dbRef).then((snapshot) => {
                if (snapshot.exists()) {
                    item.collectObj.taka = Number(snapshot.val().taka) + (Number(item.collectObj.taka) - Number(snapshot.val().taka || 0));
                }
                return set(dbRef, item.collectObj);
            });
        });

        Promise.all(promises)
            .then(() => {
                localStorage.removeItem('offline_bazars');
                alert("অফলাইনের সমস্ত বাজার খরচ সফলভাবে মেইন ডাটাবেজে সিঙ্ক হয়েছে!");
                if(window.loadPrice) window.loadPrice();
            })
            .catch(err => console.error("বাজার অটো-সিঙ্ক ব্যর্থ:", err));
    }
});


window.loginWithGoogle = () => {
    if (!navigator.onLine) {
        alert("অফলাইনে গুগল লগইন সম্ভব নয়। দয়া করে ইন্টারনেট কানেক্ট করুন।");
        return;
    }
    signInWithPopup(auth, provider).catch(err => alert("লগইন ব্যর্থ: " + err.message));
};

window.logoutFirebase = () => {
    signOut(auth).then(() => {
        localStorage.removeItem('logged_in_user');
        location.reload();
    });
};


onAuthStateChanged(auth, (user) => {
    const loginScreen = document.getElementById("loginScreen");
    const mainApp = document.getElementById("mainApp");
    const userNameEl = document.getElementById("userName");
    const userImgEl = document.getElementById("userImg");
    const nameInputEl = document.getElementById("name");

    if (user) {
        if(loginScreen) loginScreen.style.display = "none";
        if(mainApp) mainApp.style.display = "block";
        if(userNameEl) userNameEl.innerText = user.displayName;
        if(userImgEl) userImgEl.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}`;
        if(nameInputEl) nameInputEl.value = user.displayName;
        
        localStorage.setItem('logged_in_user', user.displayName);
        
        if (window.fetchUserTotalMeals) {
            window.fetchUserTotalMeals(user.displayName);
        }
    } else {
        const cachedUser = localStorage.getItem('logged_in_user');
        if (!navigator.onLine && cachedUser) {
            if(loginScreen) loginScreen.style.display = "none";
            if(mainApp) mainApp.style.display = "block";
            if(userNameEl) userNameEl.innerText = cachedUser;
            if(nameInputEl) nameInputEl.value = cachedUser;
            
            if (window.fetchUserTotalMeals) {
                window.fetchUserTotalMeals(cachedUser);
            }
        } else {
            if(loginScreen) loginScreen.style.display = "flex";
            if(mainApp) mainApp.style.display = "none";
        }
    }
});



export function saveCollectionData(dbPath, collectObj, inputTaka) {
    if (navigator.onLine) {
        const dbRef = ref(database, dbPath);
        return set(dbRef, collectObj)
            .then(() => {
                alert(`${collectObj.name.toUpperCase()} এর ${collectObj.month} মাসের জমা টাকা অনলাইনে সফলভাবে সেভ হয়েছে!`);
                return true;
            })
            .catch(err => {
                alert("অনলাইন কালেকশন সেভে সমস্যা: " + err.message);
                return false;
            });
    } else {
        let offlineCollects = JSON.parse(localStorage.getItem('offline_collections')) || [];
        let existingIndex = offlineCollects.findIndex(c => c.dbPath === dbPath);
        if (existingIndex > -1) {
            offlineCollects[existingIndex].collectObj.taka = Number(offlineCollects[existingIndex].collectObj.taka) + inputTaka;
        } else {
            offlineCollects.push({ dbPath, collectObj });
        }
        localStorage.setItem('offline_collections', JSON.stringify(offlineCollects));
        
        let cachedCollections = JSON.parse(localStorage.getItem('cache_collections')) || {};
        const pathParts = dbPath.split('/');
        const nameKey = pathParts[1];
        const monthKey = pathParts[2];
        
        if (!cachedCollections[nameKey]) cachedCollections[nameKey] = {};
        cachedCollections[nameKey][monthKey] = collectObj;
        localStorage.setItem('cache_collections', JSON.stringify(cachedCollections));

        alert("ইন্টারনেট নেই! কালেকশন ফোনে অফলাইনে সেভ হলো। অনলাইন হলেই সিঙ্ক হবে।");
        return true;
    }
}

export async function getAllCollections() {
    if (navigator.onLine && database) {
        const dbRef = ref(database, 'collections');
        try {
            const snapshot = await get(dbRef);
            if (snapshot.exists()) {
                localStorage.setItem('cache_collections', JSON.stringify(snapshot.val()));
                return snapshot.val();
            }
            return null;
        } catch (err) {
            return null;
        }
    } else {
        return JSON.parse(localStorage.getItem('cache_collections')) || null;
    }
}



export function saveBazarData(dbPath, collectObj, tkInput) {
    if (navigator.onLine) {
        const dbRef = ref(database, dbPath);
        return set(dbRef, collectObj)
            .then(() => {
                alert(`${collectObj.name.toUpperCase()} এর খরচ সফলভাবে অনলাইনে সেভ হয়েছে!`);
                return true;
            })
            .catch(err => {
                alert("অনলাইন বাজার খরচ সেভে সমস্যা: " + err.message);
                return false;
            });
    } else {
        let offlineBazars = JSON.parse(localStorage.getItem('offline_bazars')) || [];
        let existingIndex = offlineBazars.findIndex(b => b.dbPath === dbPath);
        if (existingIndex > -1) {
            offlineBazars[existingIndex].collectObj.taka = Number(offlineBazars[existingIndex].collectObj.taka) + tkInput;
        } else {
            offlineBazars.push({ dbPath, collectObj });
        }
        localStorage.setItem('offline_bazars', JSON.stringify(offlineBazars));
        
        let cachedBazarHistory = JSON.parse(localStorage.getItem('cache_bazar_history')) || {};
        const pathParts = dbPath.split('/');
        const dateKey = pathParts[1];
        const prodKey = pathParts[2];
        
        if (!cachedBazarHistory[dateKey]) cachedBazarHistory[dateKey] = {};
        cachedBazarHistory[dateKey][prodKey] = collectObj;
        localStorage.setItem('cache_bazar_history', JSON.stringify(cachedBazarHistory));

        alert("ইন্টারনেট নেই! বাজার খরচ ফোনে অফলাইনে সেভ হলো। অনলাইন হলেই সিঙ্ক হবে।");
        return true;
    }
}

export async function getAllBazarHistory() {
    if (navigator.onLine && database) {
        const dbRef = ref(database, 'bazar_history');
        try {
            const snapshot = await get(dbRef);
            if (snapshot.exists()) {
                localStorage.setItem('cache_bazar_history', JSON.stringify(snapshot.val()));
                return snapshot.val();
            }
            return null;
        } catch (err) {
            return null;
        }
    } else {
        return JSON.parse(localStorage.getItem('cache_bazar_history')) || null;
    }
}
