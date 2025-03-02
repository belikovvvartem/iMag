import { db, auth } from './config.js';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// Перевірка автентифікації для адмін-панелі
function checkAdminAccess() {
    onAuthStateChanged(auth, (user) => {
        if (!user) { // Якщо користувач не автентифікований
            sessionStorage.removeItem('adminLoggedIn');
            window.location.href = 'login.html';
        } else {
            // Якщо користувач автентифікований, відображаємо потрібну сторінку
            if (window.location.pathname.endsWith('admin.html')) {
                displayAdminProducts();
            } else if (window.location.pathname.endsWith('admin-orders.html')) {
                displayOrders();
            } else if (window.location.pathname.endsWith('completed-orders.html')) {
                displayCompletedOrders();
            } else if (window.location.pathname.endsWith('deleted-orders.html')) {
                displayDeletedOrders();
            }
            // Додаємо кнопку "Вийти" до навігації
            const nav = document.querySelector('nav');
            if (!nav.querySelector('#logout-btn')) {
                const logoutBtn = document.createElement('button');
                logoutBtn.id = 'logout-btn';
                logoutBtn.textContent = 'Вийти';
                logoutBtn.onclick = logout;
                nav.appendChild(logoutBtn);
            }
        }
    });
}

// Додавання товару
document.getElementById('add-product-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const product = {
        name: document.getElementById('name').value,
        description: document.getElementById('description').value,
        price: Number(document.getElementById('price').value),
        currency: document.getElementById('currency').value,
        photo: document.getElementById('photo').value, // Повертаємо URL
        type: document.getElementById('type').value,
        category: document.getElementById('category').value,
        onSale: false,
        addedDate: new Date().toISOString()
    };
    try {
        await addDoc(collection(db, "products"), product);
        alert('Товар додано!');
        document.getElementById('add-product-form').reset();
        displayAdminProducts();
    } catch (error) {
        console.error('Помилка:', error);
    }
});

// Відображення товарів
async function displayAdminProducts() {
    const adminProductsList = document.getElementById('admin-products-list');
    if (!adminProductsList) return;
    adminProductsList.innerHTML = '';
    const querySnapshot = await getDocs(collection(db, "products"));
    const products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    products.forEach(product => {
        const productElement = document.createElement('div');
        productElement.classList.add('product');
        const priceHTML = product.onSale
            ? `<p><s>${product.originalPrice} ${product.currency}</s> <span style="color:red;">${product.price} ${product.currency}</span></p>`
            : `<p>${product.price} ${product.currency}</p>`;
        const discountButton = product.onSale
            ? `<button class="remove-discount-btn" onclick="removeDiscount('${product.id}')">Видалити акцію</button>`
            : `<button class="add-discount-btn" onclick="addDiscount('${product.id}')">Додати акцію</button>`;
        productElement.innerHTML = `
            <div class="image-wrapper">
                <img src="${product.photo}" alt="${product.name}">
            </div>
            <h3>${product.name}</h3>
            <p>${product.description}</p>
            ${priceHTML}
            <button class="delete-product-btn" onclick="deleteProduct('${product.id}')">Видалити</button>
            <button class="edit-product-btn" onclick="openEditModal('${product.id}')">Змінити</button>
            ${discountButton}
        `;

        // Додаємо позначку "б/у", якщо товар вживаний
        if (product.type === "used") {
            const usedLabel = document.createElement('span');
            usedLabel.className = 'used';
            usedLabel.textContent = 'б/у';
            productElement.appendChild(usedLabel);
        }

        if (isNewProduct(product)) {
            const newLabel = document.createElement('span');
            newLabel.style = 'background:red; color:white; padding:2px; position:absolute; top: 0; right: 0; padding: 0 10px; border-radius: 0 0 0 15px;';
            newLabel.textContent = 'Новинка';
            productElement.appendChild(newLabel);
        }
        adminProductsList.appendChild(productElement);
    });
}

// Відображення активних замовлень
async function displayOrders() {
    const ordersList = document.getElementById('orders-list');
    if (!ordersList) return;

    ordersList.innerHTML = '';
    const querySnapshot = await getDocs(collection(db, "orders"));
    const orders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(order => order.status === 'active');

    orders.forEach(order => {
        const orderElement = document.createElement('div');
        orderElement.classList.add('order');
        orderElement.setAttribute('data-order-id', order.id);
        orderElement.innerHTML = `
            <h3>Замовлення #${order.id}</h3>
            <p>Клієнт: ${order.customer.fullName}</p>
            <p>Телефон: ${order.customer.phone}</p>
            <p>Побажання: ${order.customer.wishes || 'Немає'}</p>
            <p>Товари: ${order.items.map(item => `${item.name} - ${item.price} ${item.currency}`).join(', ')}</p>
            <p>Загальна сума: ${order.total}</p> <!-- Змінено для відображення суми як рядка -->
            <button class="completeOrder" onclick="completeOrder('${order.id}')">Виконано</button>
            <button class="deleteOrder" onclick="deleteOrder('${order.id}')">Видалити</button>
        `;
        ordersList.appendChild(orderElement);
    });
}

// Відображення завершених замовлень
async function displayCompletedOrders() {
    const completedOrdersList = document.getElementById('completed-orders-list');
    if (!completedOrdersList) return;

    if (!completedOrdersList.hasAttribute('data-loaded')) {
        completedOrdersList.innerHTML = '';
        const querySnapshot = await getDocs(collection(db, "orders"));
        const orders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(order => order.status === 'completed');

        orders.forEach(order => {
            const orderElement = document.createElement('div');
            orderElement.classList.add('order', 'completed');
            orderElement.setAttribute('data-order-id', order.id);
            orderElement.innerHTML = `
                <h3>Замовлення #${order.id}</h3>
                <p class="timer" data-timestamp="${order.completedTimestamp}">Залишилось: ${formatTime(calculateRemainingTime(order.completedTimestamp))}</p>
                <p>Клієнт: ${order.customer.fullName}</p>
                <p>Телефон: ${order.customer.phone}</p>
                <p>Товари: ${order.items.map(item => `${item.name} - ${item.price} ${item.currency}`).join(', ')}</p>
                <p>Загальна сума: ${order.total}</p> <!-- Змінено для відображення суми як рядка -->
            `;
            completedOrdersList.appendChild(orderElement);
        });
        completedOrdersList.setAttribute('data-loaded', 'true');
    }

    Array.from(completedOrdersList.getElementsByClassName('order')).forEach(async orderElement => {
        const orderId = orderElement.getAttribute('data-order-id');
        const timerElement = orderElement.querySelector('.timer');
        const timestamp = timerElement.getAttribute('data-timestamp');
        const remainingTime = calculateRemainingTime(timestamp);
        if (remainingTime <= 0) {
            await deleteDoc(doc(db, "orders", orderId));
            orderElement.remove();
        } else {
            timerElement.textContent = `Залишилось: ${formatTime(remainingTime)}`;
        }
    });

    if (!window.completedOrdersInterval) {
        window.completedOrdersInterval = setInterval(displayCompletedOrders, 1000);
    }
}

// Відображення видалених замовлень із функцією "Відновити"
async function displayDeletedOrders() {
    const deletedOrdersList = document.getElementById('deleted-orders-list');
    if (!deletedOrdersList) return;

    deletedOrdersList.innerHTML = '';
    const querySnapshot = await getDocs(collection(db, "orders"));
    const orders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(order => order.status === 'deleted');

    orders.forEach(order => {
        const remainingTime = calculateRemainingTime(order.deletedTimestamp);
        if (remainingTime <= 0) {
            deleteDoc(doc(db, "orders", order.id));
            return;
        }
        const orderElement = document.createElement('div');
        orderElement.classList.add('order');
        orderElement.setAttribute('data-order-id', order.id);
        orderElement.innerHTML = `
            <h3>Замовлення #${order.id}</h3>
            <p class="timer" data-timestamp="${order.deletedTimestamp}">Залишилось: ${formatTime(remainingTime)}</p>
            <p>Клієнт: ${order.customer.fullName}</p>
            <p>Телефон: ${order.customer.phone}</p>
            <p>Товари: ${order.items.map(item => `${item.name} - ${item.price} ${item.currency}`).join(', ')}</p>
            <p>Загальна сума: ${order.total}</p> <!-- Змінено для відображення суми як рядка -->
            <button class="restoreOrder" onclick="restoreOrder('${order.id}')">Відновити</button>
        `;
        deletedOrdersList.appendChild(orderElement);
    });

    if (!window.deletedOrdersInterval) {
        window.deletedOrdersInterval = setInterval(() => {
            Array.from(deletedOrdersList.getElementsByClassName('order')).forEach(async orderElement => {
                const orderId = orderElement.getAttribute('data-order-id');
                const timerElement = orderElement.querySelector('.timer');
                const timestamp = timerElement.getAttribute('data-timestamp');
                const remainingTime = calculateRemainingTime(timestamp);
                if (remainingTime <= 0) {
                    await deleteDoc(doc(db, "orders", orderId));
                    orderElement.remove();
                } else {
                    timerElement.textContent = `Залишилось: ${formatTime(remainingTime)}`;
                }
            });
        }, 1000);
    }
}

// Розрахунок часу до видалення
function calculateRemainingTime(timestamp) {
    if (!timestamp) return 0;
    const now = new Date();
    const endTime = new Date(timestamp).getTime() + 24 * 60 * 60 * 1000; // 24 години
    return Math.max(0, endTime - now.getTime());
}

// Форматування часу
function formatTime(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours}г ${minutes}хв ${seconds}с`;
}

// Перевірка, чи товар є новинкою
function isNewProduct(product) {
    const now = new Date();
    const addedDate = new Date(product.addedDate);
    const diff = now - addedDate;
    return diff < 24 * 60 * 60 * 1000; // 24 години
}

// Видалення товару
window.deleteProduct = async function(productId) {
    await deleteDoc(doc(db, "products", productId));
    alert('Товар видалено!');
    displayAdminProducts();
};

// Відкриття модального вікна для редагування
window.openEditModal = async function(productId) {
    const productDoc = await getDoc(doc(db, "products", productId));
    const product = productDoc.data();
    document.getElementById('edit-name').value = product.name;
    document.getElementById('edit-description').value = product.description;
    document.getElementById('edit-price').value = product.price;
    document.getElementById('edit-currency').value = product.currency;
    document.getElementById('edit-photo').value = product.photo; // Повертаємо URL для редагування
    document.getElementById('edit-type').value = product.type;
    document.getElementById('edit-category').value = product.category;
    document.getElementById('edit-modal').style.display = 'block';

    document.getElementById('edit-product-form').onsubmit = async function(e) {
        e.preventDefault();
        await updateDoc(doc(db, "products", productId), {
            name: document.getElementById('edit-name').value,
            description: document.getElementById('edit-description').value,
            price: Number(document.getElementById('edit-price').value),
            currency: document.getElementById('edit-currency').value,
            photo: document.getElementById('edit-photo').value, // Оновлюємо через URL
            type: document.getElementById('edit-type').value,
            category: document.getElementById('edit-category').value
        });
        alert('Товар змінено!');
        document.getElementById('edit-modal').style.display = 'none';
        displayAdminProducts();
    };
};

// Додавання акції
window.addDiscount = async function(productId) {
    const discountPrice = prompt('Введіть акційну ціну:');
    if (discountPrice) {
        const productDoc = await getDoc(doc(db, "products", productId));
        const product = productDoc.data();
        await updateDoc(doc(db, "products", productId), {
            originalPrice: product.price,
            price: Number(discountPrice),
            onSale: true
        });
        alert('Акцію додано!');
        displayAdminProducts();
    }
};

// Видалення акції
window.removeDiscount = async function(productId) {
    const productDoc = await getDoc(doc(db, "products", productId));
    const product = productDoc.data();
    await updateDoc(doc(db, "products", productId), {
        price: product.originalPrice,
        onSale: false,
        originalPrice: null
    });
    alert('Акцію видалено!');
    displayAdminProducts();
};

// Виконання замовлення
window.completeOrder = async function(orderId) {
    await updateDoc(doc(db, "orders", orderId), {
        status: 'completed',
        completedTimestamp: new Date().toISOString()
    });
    displayOrders();
};

// Видалення замовлення
window.deleteOrder = async function(orderId) {
    await updateDoc(doc(db, "orders", orderId), {
        status: 'deleted',
        deletedTimestamp: new Date().toISOString()
    });
    displayOrders();
};

// Відновлення замовлення
window.restoreOrder = async function(orderId) {
    await updateDoc(doc(db, "orders", orderId), {
        status: 'active',
        deletedTimestamp: null
    });
    displayDeletedOrders();
};

// Вихід із адмін-панелі
window.logout = async function() {
    await signOut(auth);
    sessionStorage.removeItem('adminLoggedIn');
    window.location.href = 'login.html';
};

// Ініціалізація з перевіркою доступу
checkAdminAccess();