(() => {
  /* Read note id from URL */
  const params = new URLSearchParams(location.search);
  const qsId = params.get('id');
  const lastId = sessionStorage.getItem('notehaven_last_id');
  const noteId = qsId || lastId || 'chem-001';
  try { sessionStorage.setItem('notehaven_last_id', noteId); } catch { }

  const DATA = Array.isArray(window.NOTES_DATA) ? window.NOTES_DATA : [];
  const note = DATA.find(n => n.id === noteId) || DATA[0] || {
    id: 'unknown',
    title: 'Unavailable',
    price: 0,
    rating: 0,
    author: 'Author',
    // university: 'University',
    pages: 0,
    format: 'PDF',
    cover: '',
    about: '',
    previews: []
  };

  /* Helpers */
  const setText = (sel, txt) => { const el = document.querySelector(sel); if (el) el.textContent = txt; };
  const setAttr = (sel, name, val) => { const el = document.querySelector(sel); if (el) el.setAttribute(name, val); };
  const applyStars = () => {
    document.querySelectorAll('.stars').forEach(el => {
      el.style.setProperty('--rating', parseFloat(el.dataset.rating || '4.5'));
    });
  };

  /* Populate header and meta */
  // setText('#crumbTitle', note.title);
  setText('#productTitle', note.title);
  setText('#buyPrice', `₹ ${note.price.toFixed(2)}`);
  setAttr('#coverImage', 'src', note.cover);
  setAttr('#authorAvatar', 'src', 'assets/avatarimage.jpeg');
  setText('#authorName', note.author);
  // setText('#authorUni', note.university);
  const ratingEl = document.querySelector('#ratingStars');
  if (ratingEl) ratingEl.dataset.rating = String(note.rating);
  setText('#pages', String(note.pages));
  setText('#format', note.format);
  setText('#aboutText', note.about);
  setText('#reviewCount', String(note.reviews?.length || 0));
  setText('#authorBio', note.authorBio);
  applyStars();

  /* Hook up cart datasets so the global cart handlers in script.js work */
  ['#addToCart'].forEach(sel => {
    const btn = document.querySelector(sel);
    if (!btn) return;
    btn.dataset.id = note.id;
    btn.dataset.name = note.title;
    btn.dataset.price = String(note.price);
  });

  /* Hook up whatsapp dataset so the global cart handlers in script.js work */
  ['#buyNow'].forEach(sel => {
    const btn = document.querySelector(sel);
    if (!btn) return;
    btn.dataset.id = note.id;
    btn.dataset.name = note.title;
    btn.dataset.price = String(note.price);
  });

  /* Wishlist (Save for Later) */
  const WL_KEY = 'notehaven_wishlist_v1';
  const wishlistBtn = document.querySelector('#saveForLater');
  const getWishlist = () => {
    try { return JSON.parse(localStorage.getItem(WL_KEY)) || []; } catch { return []; }
  };
  const setWishlist = (arr) => localStorage.setItem(WL_KEY, JSON.stringify(arr));
  const isInWishlist = () => getWishlist().includes(note.id);

  const updateWishlistUI = () => {
    if (!wishlistBtn) return;
    const active = isInWishlist();
    wishlistBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
    wishlistBtn.textContent = active ? 'Saved' : 'Save for Later';
  };
  wishlistBtn?.addEventListener('click', () => {
    const wl = getWishlist();
    const idx = wl.indexOf(note.id);
    if (idx >= 0) wl.splice(idx, 1); else wl.push(note.id);
    setWishlist(wl);
    updateWishlistUI();
    const toastEl = document.querySelector('#toast');
    if (toastEl) {
      toastEl.textContent = isInWishlist() ? 'Saved for later' : 'Removed from saved';
      toastEl.classList.add('show');
      setTimeout(() => toastEl.classList.remove('show'), 1600);
    }
  });
  updateWishlistUI();

  /* === Quantity controls synced with cart === */
  const CART_KEY = 'notehaven_cart_v1';
  const getCart = () => {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
  };
  const setCart = (arr) => localStorage.setItem(CART_KEY, JSON.stringify(arr));

  const qtyControl = document.querySelector('#qtyControl');
  const qtyMinus = document.querySelector('#qtyMinus');
  const qtyPlus = document.querySelector('#qtyPlus');
  const qtyCountEl = document.querySelector('#qtyCount');
  const viewCartBtn = document.querySelector('#viewCart');

  function refreshQtyUI() {
    const cart = getCart();
    const item = cart.find(x => x.id === note.id);
    if (item) {
      if (qtyCountEl) qtyCountEl.textContent = String(item.qty);
      qtyControl?.setAttribute('aria-hidden', 'false');
    } else {
      if (qtyCountEl) qtyCountEl.textContent = '0';
      qtyControl?.setAttribute('aria-hidden', 'true');
    }
  }

  function commitCart(cart, toastMsg) {
    setCart(cart);
    // Use helpers from script.js if available
    window.saveCart?.();
    window.updateCartBadge?.();
    window.renderCart?.();
    window.showToast?.(toastMsg || 'Updated cart');
    refreshQtyUI();
  }

  qtyPlus?.addEventListener('click', () => {
    const cart = getCart();
    const existing = cart.find(x => x.id === note.id);
    if (existing) existing.qty += 1;
    else cart.push({ id: note.id, name: note.title, price: note.price, qty: 1, image: document.querySelector('#coverImage')?.src || '' });
    commitCart(cart, 'Increased quantity');
  });

  qtyMinus?.addEventListener('click', () => {
    const cart = getCart();
    const existing = cart.findIndex(x => x.id === note.id);
    if (existing >= 0) {
      if (cart[existing].qty > 1) cart[existing].qty -= 1;
      else cart.splice(existing, 1);
      commitCart(cart, 'Decreased quantity');
    }
  });

  viewCartBtn?.addEventListener('click', () => window.openCart?.());

  document.querySelector('#addToCart')?.addEventListener('click', () => {
    // Let script.js add the item, then refresh qty and show cart badge
    setTimeout(refreshQtyUI, 15);
  });


  // Boot quantity UI
  refreshQtyUI();

  /* Preview rendering: prefer a simple responsive grid (#previewGrid). Fallback to the slider if grid isn't present. */
  const grid = document.querySelector('#previewGrid');
  const track = document.querySelector('#previewTrack');
  const dotsWrap = document.querySelector('#previewDots');
  const prevBtn = document.querySelector('.ps-prev');
  const nextBtn = document.querySelector('.ps-next');

  if (Array.isArray(note.previews) && note.previews.length) {
    if (grid) {
      // Render a simple grid of thumbnails
      note.previews.forEach((src, i) => {
        const fig = document.createElement('figure');
        fig.className = 'preview-thumb';
        const img = document.createElement('img');
        img.src = src;
        img.alt = `Preview page ${i + 1}`;
        img.loading = 'lazy';
        fig.appendChild(img);
        grid.appendChild(fig);
      });
    } else if (track && dotsWrap) {
      // Fallback: original slider behaviour
      note.previews.forEach((src, i) => {
        const fig = document.createElement('figure');
        fig.className = 'preview-item';
        fig.innerHTML = `<img src="${src}" alt="Preview page ${i + 1}">`;
        track.appendChild(fig);

        const dot = document.createElement('button');
        dot.className = 'dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
        dot.addEventListener('click', () => goTo(i));
        dotsWrap.appendChild(dot);
      });

      let pIdx = 0;
      const goTo = (i) => {
        pIdx = (i + note.previews.length) % note.previews.length;
        track.style.transform = `translateX(${-pIdx * 100}%)`;
        dotsWrap.querySelectorAll('.dot').forEach((d, di) => d.classList.toggle('active', di === pIdx));
      };

      prevBtn?.addEventListener('click', () => goTo(pIdx - 1));
      nextBtn?.addEventListener('click', () => goTo(pIdx + 1));

      let previewAuto = setInterval(() => goTo(pIdx + 1), 4500);
      [prevBtn, nextBtn, track].forEach(el => {
        if (!el) return;
        el.addEventListener('mouseenter', () => clearInterval(previewAuto));
        el.addEventListener('mouseleave', () => previewAuto = setInterval(() => goTo(pIdx + 1), 4500));
      });
    }
  } else {
    // No previews: hide slider and show placeholder if desired
    document.querySelector('.preview-slider')?.setAttribute('hidden', '');
    if (grid) grid.innerHTML = '<div class="muted">No preview available.</div>';
  }

  /* Tabs */
  const tabs = Array.from(document.querySelectorAll('.tab'));
  const panels = {
    toc: document.querySelector('#tab-toc'),
    reviews: document.querySelector('#tab-reviews'),
    author: document.querySelector('#tab-author'),
  };
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    Object.values(panels).forEach(p => p.classList.remove('active'));
    panels[t.dataset.tab]?.classList.add('active');
  }));

  /* Fill TOC */
  const tocList = document.querySelector('#tocList');
  if (tocList && Array.isArray(note.toc)) {
    note.toc.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      tocList.appendChild(li);
    });
  }

  /* Fill Reviews */
  const reviewsWrap = document.querySelector('#reviewsWrap');
  (note.reviews || []).forEach(r => {
    if (!reviewsWrap) return;
    const div = document.createElement('div');
    div.className = 'review';
    div.innerHTML = `<strong>${r.name}</strong><p class="muted">${r.text}</p>`;
    reviewsWrap.appendChild(div);
  });

  /* Related notes (create cards) */
  const relatedGrid = document.querySelector('#relatedGrid');
  const others = DATA.filter(n => n.id !== note.id).slice(0, 4);
  others.forEach(n => {
    if (!relatedGrid) return;
    const card = document.createElement('article');
    card.className = 'note-card';
    card.innerHTML = `
      <img src="${n.cover}" alt="${n.title}">
      <div class="note-body">
        <h3>${n.title}</h3>
        <p class="note-meta">By: ${n.author}</p>
        <div class="price-rating">
          <span class="price">₹ ${n.price.toFixed(2)}</span>
          <div class="stars" data-rating="${n.rating}" aria-label="Rating ${n.rating}"></div>
        </div>
        <div class="note-actions">
          <a class="btn btn-outline" href="details.html?id=${n.id}">View Details</a>
          <button class="btn btn-success add-to-cart" data-id="${n.id}" data-name="${n.title}" data-price="${n.price}">Add to Cart</button>
        </div>
      </div>
    `;
    relatedGrid.appendChild(card);
  });
  applyStars();

  /* Delegate Add to Cart clicks for dynamically created Related Notes buttons */
  relatedGrid?.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-to-cart');
    if (!btn) return;
    const id = btn.dataset.id;
    const name = btn.dataset.name;
    const price = parseFloat(btn.dataset.price);
    const image = btn.closest('.note-card')?.querySelector('img')?.src || '';

    const cart = getCart();
    const existing = cart.find(x => x.id === id);
    if (existing) existing.qty += 1;
    else cart.push({ id, name, price, qty: 1, image });

    commitCart(cart, 'Added to cart');
    window.openCart?.();
  });
})();