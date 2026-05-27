// sw.js (Service Worker)
self.addEventListener('push', function(event) {
    let data = { title: 'মেস ম্যানেজার আপডেট', body: 'নতুন কিছু আপডেট হয়েছে!' };
    
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: '/icon.png', 
        badge: '/badge.png', 
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: '1'
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});


self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/') 
    );
});


