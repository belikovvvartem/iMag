import { db, auth } from './config.js';
import { collection, getDocs, getDoc, doc, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// Створення елемента товару
function createProductElement(product) {
    const productElement = document.createElement('div');
    productElement.classList.add('product');
    const priceHTML = product.onSale
        ? `<p><s>${product.originalPrice} ${product.currency}</s> <span style="color:red;">${product.price} ${product.currency}</span></p>`
        : `<p>${product.price} ${product.currency}</p>`;
    productElement.innerHTML = `
        <div class="image-wrapper">
            <img src="${product.photo}" alt="${product.name}">
        </div>
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        ${priceHTML}
        <div class="productButton">
        <button class="orderButton" onclick="orderProductDirectly('${product.id}')">Замовити</button>
        <button class="add-to-cart" onclick="addToCart('${product.id}')"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAAAXNSR0IArs4c6QAAAapJREFUSEu1lD9IVlEYxn8PiDbZaEJlm+QmQX+G2itwc1GEwskWE0SiyMGGiE+hBqXNRUFsFhxcghAscSvaRANBRShwUIyezpF74fLZ/W7XT1+4cLjnPb/35Tnvc8Q5hc6JyzHY9gXgdlJkR9K3egum4GvAegY2LGmiHngKvgTMJaDY+RHQKmn/tPATGtueBh4BTyW9O0twJ7AGbAKxSJk4BKYk/frnVNheBu6UIWZyK5JG8sC9wEzJrh8DV4H7khbzwA3ANtAMXJYU17lh+yKwm3xXJP3JNYjtMeAl8CokjhaAB4G3wBtJz2JuLXALsBWm4yfQIul3Htz2d6AduC4prvPBiSPngW6gT1LU/ETYvgGsBm1XgrapewvB94CPwGdJt3LAk8CTcCcDkt6nOYWPkO2vQEfB6B0kTo2yHcf/gLuAD0BjDfhrSc+z+4XgROt4kbtxjKrh4Qlok7RR/b8QbLsHmAV+AJ2S9lKI7YWg/4M4asHGQ6U6tl0BhpNDdyV9yoCjtk3AF0k3y4KjDOPR3pJeZA/b7g/Qh8nDs1QKXDANuduFGp8W/BffmpAX4jz4fgAAAABJRU5ErkJggg=="/></button>
        </div>
    `;

    // Додаємо позначку "б/у", якщо товар вживаний
    if (product.type === "used") {
        const usedLabel = document.createElement('span');
        usedLabel.className = 'used';
        usedLabel.textContent = 'б/у';
        productElement.appendChild(usedLabel);
    }

    return productElement;
}

// Відображення всіх товарів із фільтрами
async function displayProducts() {
    const productsList = document.getElementById('products-list');
    const typeFilter = document.getElementById('type-filter').value;
    const categoryFilter = document.getElementById('category-filter').value;
    const querySnapshot = await getDocs(collection(db, "products"));
    let products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (typeFilter) products = products.filter(p => p.type === typeFilter);
    if (categoryFilter) products = products.filter(p => p.category === categoryFilter);

    productsList.innerHTML = '';
    products.forEach(product => {
        const productElement = createProductElement(product);
        productsList.appendChild(productElement);
    });
}

// Відображення товарів за категорією
async function displayCategoryProducts() {
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');
    document.getElementById('category-title').textContent = category.charAt(0).toUpperCase() + category.slice(1);
    const categoryProducts = document.getElementById('category-products');
    const querySnapshot = await getDocs(collection(db, "products"));
    const products = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(product => product.category === category);

    categoryProducts.innerHTML = '';
    products.forEach(product => {
        const productElement = createProductElement(product);
        categoryProducts.appendChild(productElement);
    });
}

// Додавання в кошик з повідомленням
window.addToCart = function(productId) {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    cart.push(productId);
    localStorage.setItem('cart', JSON.stringify(cart));

    const notification = document.getElementById('notification');
    notification.style.display = 'block';
    setTimeout(() => {
        notification.style.display = 'none';
    }, 2000);
};

// Пряме замовлення товару
window.orderProductDirectly = function(productId) {
    localStorage.setItem('cart', JSON.stringify([productId]));
    window.location.href = 'checkout.html';
};

// Видалення з кошика
window.removeFromCart = function(productId) {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    cart = cart.filter(id => id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    displayCart();
};

// Відображення кошика
async function displayCart() {
    const cartItemsDiv = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    const cartItems = JSON.parse(localStorage.getItem('cart') || '[]');
    cartItemsDiv.innerHTML = '';
    const currencyTotals = {}; // Для зберігання сум по валютах

    for (const productId of cartItems) {
        const productDoc = await getDoc(doc(db, "products", productId));
        const product = productDoc.data();
        if (!product) {
            console.warn(`Товар з ID ${productId} не знайдено в базі даних`);
            continue;
        }
        const productElement = document.createElement('div');
        productElement.classList.add('product');
        productElement.innerHTML = `
            <div class="image-wrapper">
                <img src="${product.photo}" alt="${product.name}">
            </div>
            <h3>${product.name}</h3>
            <p>${product.description}</p>
            <p>${product.price} ${product.currency}</p>
            <button class="removeFromCart" onclick="removeFromCart('${productId}')">Видалити з кошику</button>
        `;
        cartItemsDiv.appendChild(productElement);

        // Підраховуємо суму для кожної валюти
        if (currencyTotals[product.currency]) {
            currencyTotals[product.currency] += product.price;
        } else {
            currencyTotals[product.currency] = product.price;
        }
    }

    // Формуємо рядок із сумами для кожної валюти
    const totalText = Object.entries(currencyTotals)
        .map(([currency, total]) => `${total} ${currency}`)
        .join(' + ');
    totalPriceElement.textContent = totalText || '0 UAH';

    document.getElementById('checkout')?.addEventListener('click', () => {
        window.location.href = 'checkout.html';
    });
}

// Обробка оформлення замовлення
async function handleCheckout() {
    const checkoutForm = document.getElementById('checkout-form');
    const orderSummary = document.getElementById('order-summary');
    const cartItems = JSON.parse(localStorage.getItem('cart') || '[]');
    let items = [];
    const currencyTotals = {}; // Для зберігання сум по валютах

    for (const productId of cartItems) {
        const productDoc = await getDoc(doc(db, "products", productId));
        const product = productDoc.data();
        if (product) {
            items.push({
                id: productId,
                name: product.name,
                price: product.price,
                currency: product.currency
            });
            // Підраховуємо суму для кожної валюти
            if (currencyTotals[product.currency]) {
                currencyTotals[product.currency] += product.price;
            } else {
                currencyTotals[product.currency] = product.price;
            }
        }
    }

    // Формуємо рядок із сумами для кожної валюти
    const totalText = Object.entries(currencyTotals)
        .map(([currency, total]) => `${total} ${currency}`)
        .join(' + ');

    orderSummary.innerHTML = `
        <h3>Ваше замовлення</h3>
        ${items.map(item => `<p>${item.name} - ${item.price} ${item.currency}</p>`).join('')}
        <h3>Загальна сума: ${totalText || '0 UAH'}</h3>
    `;

    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!Object.keys(currencyTotals).length) {
            alert('Помилка: виберіть хоча б один товар для замовлення!');
            return;
        }

        const order = {
            customer: {
                fullName: document.getElementById('fullName').value,
                phone: document.getElementById('phone').value,
                wishes: document.getElementById('wishes').value || ''
            },
            items: items,
            total: totalText, // Зберігаємо як рядок із сумами по валютах
            status: 'active',
            timestamp: new Date().toISOString()
        };
        await addDoc(collection(db, "orders"), order);
        alert('Замовлення оформлено!');
        localStorage.removeItem('cart');
        window.location.href = 'cart.html';
    });
}

// Обробка входу
function handleLogin() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorElement = document.getElementById('login-error');

        try {
            await signInWithEmailAndPassword(auth, email, password);
            sessionStorage.setItem('adminLoggedIn', 'true'); // Зберігаємо в sessionStorage
            window.location.href = 'admin.html';
        } catch (error) {
            errorElement.textContent = 'Неправильний email або пароль!';
        }
    });
}

// Перевірка автентифікації для адмін-панелі
function checkAdminAccess() {
    const adminPages = ['admin.html', 'admin-orders.html', 'completed-orders.html', 'deleted-orders.html'];
    const currentPage = window.location.pathname.split('/').pop();

    if (adminPages.includes(currentPage)) {
        onAuthStateChanged(auth, (user) => {
            if (!user) { // Якщо користувач не автентифікований
                sessionStorage.removeItem('adminLoggedIn');
                window.location.href = 'login.html';
            }
        });
    }
}

// Вихід із адмін-панелі
window.logout = async function() {
    await signOut(auth);
    sessionStorage.removeItem('adminLoggedIn');
    window.location.href = 'login.html';
};

// Виклик функцій залежно від сторінки
if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
    // Нічого не відображаємо
} else if (window.location.pathname.endsWith('products.html')) {
    document.getElementById('apply-filters')?.addEventListener('click', displayProducts);
    displayProducts();
} else if (window.location.pathname.endsWith('category.html')) {
    displayCategoryProducts();
} else if (window.location.pathname.endsWith('cart.html')) {
    displayCart();
} else if (window.location.pathname.endsWith('checkout.html')) {
    handleCheckout();
} else if (window.location.pathname.endsWith('login.html')) {
    handleLogin();
}

// Перевірка доступу до адмін-панелі
checkAdminAccess();