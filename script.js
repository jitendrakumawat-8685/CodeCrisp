/* Utility helpers */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from((ctx || document).querySelectorAll(sel));
const formatCurrency = (n) => `₹ ${Number(n).toFixed(2)}`;

/* Year in footer */
$('#year').textContent = new Date().getFullYear();

/* Nav toggle (mobile) */
const navToggle = $('.nav-toggle');
const navList = $('.nav-list');
if (navToggle){
  navToggle.addEventListener('click', () => {
    const open = navList.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}

/* Initialize dynamic star ratings from data-rating attribute */
$$('.stars').forEach(el => {
  const rating = parseFloat(el.dataset.rating || '4.5');
  el.style.setProperty('--rating', rating);
});

/* Search: filter featured notes by keywords or subject */
const searchForm = $('#searchForm');
const searchInput = $('#searchInput');
const notesGrid = $('#notesGrid');

const filterNotes = () => {
  const q = (searchInput?.value || '').trim().toLowerCase();
  const cards = notesGrid ? $$('.note-card', notesGrid) : [];
  if (!q){
    cards.forEach(c => c.style.display = '');
    return;
  }
  cards.forEach(card => {
    const hay = [
      card.dataset.keywords || '',
      card.dataset.subject || '',
      $('h3', card)?.textContent || '',
      $('.note-meta', card)?.textContent || ''
    ].join(' ').toLowerCase();
    card.style.display = hay.includes(q) ? '' : 'none';
  });
};

// Only wire up search on pages that have it
if (searchForm && searchInput && notesGrid) {
  searchForm.addEventListener('submit', (e) => { e.preventDefault(); filterNotes(); });
  searchInput.addEventListener('input', filterNotes);
}

/* Cart state */
const CART_KEY = 'notehaven_cart_v1';
let cart = [];

const loadCart = () => {
  try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { cart = []; }
};
const saveCart = () => localStorage.setItem(CART_KEY, JSON.stringify(cart));

/* Cart UI refs */
const cartButton = $('#cartButton');
const cartCountBadge = $('.cart-count', cartButton);
const cartDrawer = $('#cartDrawer');
const drawerBackdrop = $('#drawerBackdrop');
const closeCartBtn = $('#closeCart');
const cartItemsEl = $('#cartItems');
const cartTotalEl = $('#cartTotal');
const clearCartBtn = $('#clearCart');
const checkoutCartBtn = $('#checkoutCart');
const toast = $('#toast');

const showToast = (msg, ms = 1800) => {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), ms);
};

/* Drawer control */
const openCart = () => {
  cartDrawer.classList.add('open');
  drawerBackdrop.classList.add('show');
  cartDrawer.setAttribute('aria-hidden', 'false');
};
const closeCart = () => {
  cartDrawer.classList.remove('open');
  drawerBackdrop.classList.remove('show');
  cartDrawer.setAttribute('aria-hidden', 'true');
};

cartButton.addEventListener('click', openCart);
closeCartBtn.addEventListener('click', closeCart);
drawerBackdrop.addEventListener('click', closeCart);

/* Render cart */
const renderCart = () => {
  cartItemsEl.innerHTML = '';
  let total = 0;
  if (cart.length === 0){
    cartItemsEl.innerHTML = `<div style="padding:16px;color:#64748b">Your cart is empty.</div>`;
  } else {
    cart.forEach(item => {
      total += item.price * item.qty;
      const row = document.createElement('div');
      row.className = 'cart-item';
      row.innerHTML = `
        <img src="${item.image}" alt="">
        <div>
          <div class="title">${item.name}</div>
          <div class="muted">${item.qty} × ${formatCurrency(item.price)}</div>
        </div>
        <button class="remove" aria-label="Remove item">Remove</button>
      `;
      $('.remove', row).addEventListener('click', () => {
        cart = cart.filter(x => x.id !== item.id);
        saveCart(); updateCartBadge(); renderCart();
        showToast('Item removed');
      });
      cartItemsEl.appendChild(row);
    });
  }
  cartTotalEl.textContent = formatCurrency(total);
};

const updateCartBadge = () => {
  const count = cart.reduce((sum, x) => sum + x.qty, 0);
  cartCountBadge.textContent = String(count);
  cartButton.dataset.count = String(count);
};

/* Add to cart */
const getCardImage = (btn) => {
  const card = btn.closest('.note-card');
  return card ? $('img', card)?.src || '' : '';
};

$$('.add-to-cart').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.id;
    const price = parseFloat(btn.dataset.price);
    const name = btn.dataset.name;
    const image = getCardImage(btn);

    const existing = cart.find(x => x.id === id);
    if (existing) existing.qty += 1;
    else cart.push({ id, name, price, qty: 1, image });

    saveCart(); updateCartBadge(); renderCart();
    showToast('Added to cart');
    openCart();
  });
});

/* Clear and checkout */
clearCartBtn.addEventListener('click', () => {
  cart = []; saveCart(); updateCartBadge(); renderCart();
  showToast('Cart cleared');
});
checkoutCartBtn.addEventListener('click', () => {
  if (!cart.length) return showToast('Your cart is empty');
  showToast('Redirecting to secure checkout...');
  setTimeout(() => alert('Demo checkout: This is a front-end only example.\nImplement server-side payments to complete purchase.'), 800);
});

/* Boot */
loadCart(); updateCartBadge(); renderCart();

/* Testimonials slider */
const slidesWrap = $('.slides');
const slides = slidesWrap ? $$('.slide', slidesWrap) : [];
const prevBtn = $('.ts-prev');
const nextBtn = $('.ts-next');
let idx = 0;

const goTo = (i) => {
  idx = slides.length ? (i + slides.length) % slides.length : 0;
  if (slidesWrap) slidesWrap.style.transform = `translateX(${-idx * 100}%)`;
};

if (prevBtn) prevBtn.addEventListener('click', () => goTo(idx - 1));
if (nextBtn) nextBtn.addEventListener('click', () => goTo(idx + 1));

// Auto-play testimonials only if slider exists
let auto = slidesWrap ? setInterval(() => goTo(idx + 1), 4500) : null;
[prevBtn, nextBtn, slidesWrap].forEach(el => {
  if (!el || !auto) return;
  el.addEventListener('mouseenter', () => clearInterval(auto));
  el.addEventListener('mouseleave', () => auto = setInterval(() => goTo(idx + 1), 4500));
});

/* Accessibility: close cart with Escape */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && cartDrawer.classList.contains('open')) closeCart();
});


// Expose core cart functions so details.js can call them safely
window.openCart = openCart;
window.closeCart = closeCart;
window.updateCartBadge = updateCartBadge;
window.renderCart = renderCart;
window.saveCart = saveCart;
window.showToast = showToast;


/* Persist selected note id before navigating to details */
$$('a.btn.btn-outline[href^="details.html"]').forEach(a => {
  a.addEventListener('click', () => {
    const href = a.getAttribute('href') || '';
    try {
      const url = new URL(href, location.href);
      const id = url.searchParams.get('id');
      if (id) sessionStorage.setItem('notehaven_last_id', id);
    } catch {}
  });
});
