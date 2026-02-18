// API helpers
async function fetchServices(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`/api/services?${query}`);
  if (!res.ok) throw new Error('Failed to load services');
  return res.json();
}

async function fetchReviews(serviceId) {
  const res = await fetch(`/api/services/${serviceId}/reviews`);
  if (!res.ok) throw new Error('Failed to load reviews');
  return res.json();
}

// ---------- Rendering ----------

function renderAllServices(services) {
  const container = document.getElementById('allServicesContainer');
  container.innerHTML = '';

  if (!services.length) {
    container.innerHTML =
      '<p class="text-muted small mb-0">No services found for this search.</p>';
    return;
  }

  services.forEach((service) => {
    const col = document.createElement('div');
    col.className = 'col';

    const avgRating =
      typeof service.avgRating === 'number'
        ? service.avgRating.toFixed(1)
        : 'New';

    col.innerHTML = `
      <div class="card shadow-sm h-100 border-0">
        <div class="card-body d-flex flex-column">
          <h5 class="card-title mb-1">${service.name}</h5>
          <p class="text-muted mb-1">
            ${service.category || 'Service'} · ${service.city || ''}
          </p>
          ${
            service.address
              ? `<p class="mb-2 small text-truncate">${service.address}</p>`
              : ''
          }
          <div class="mt-auto d-flex justify-content-between align-items-center">
            <span class="badge bg-success">${avgRating}</span>
            <button
              class="btn btn-sm btn-outline-primary view-reviews-btn"
              data-id="${service._id}"
              data-name="${service.name}"
            >
              View reviews
            </button>
          </div>
        </div>
      </div>
    `;

    container.appendChild(col);
  });
}

function renderReviewsForService(serviceName, reviews) {
  const container = document.getElementById('reviewsContainer');
  container.innerHTML = '';

  const titleEl = document.querySelector('#reviewsSection h3');
  titleEl.textContent = `Reviews for ${serviceName}`;

  if (!reviews.length) {
    container.innerHTML =
      '<p class="text-muted small mb-0">No reviews yet. Be the first to review.</p>';
    return;
  }

  reviews.forEach((review) => {
    const item = document.createElement('div');
    item.className = 'list-group-item';
    item.innerHTML = `
      <div class="d-flex justify-content-between mb-1">
        <strong>${'★'.repeat(review.rating)}${'☆'.repeat(
      5 - review.rating
    )}</strong>
        <span class="text-muted small">${
          review.createdAt
            ? new Date(review.createdAt).toLocaleDateString()
            : ''
        }</span>
      </div>
      <p class="mb-0">${review.comment || ''}</p>
    `;
    container.appendChild(item);
  });
}

// ---------- Category Tabs & Search ----------

async function loadAllServicesInitial() {
  try {
    const data = await fetchServices(); // no filters
    renderAllServices(data.services || data); // support both shapes
  } catch (err) {
    console.error(err);
  }
}

async function handleSearch() {
  const city = document.getElementById('searchCity').value.trim();
  const pincode = document.getElementById('searchPincode').value.trim();

  const params = {};
  if (city) params.city = city;
  if (pincode) params.pincode = pincode;

  try {
    const data = await fetchServices(params);
    renderAllServices(data.services || data);
  } catch (err) {
    console.error(err);
  }
}

function setupSearch() {
  const btn = document.getElementById('searchBtn');
  btn.addEventListener('click', handleSearch);
}

// Category tabs (All / Hospitals / etc.)
async function handleCategoryClick(category) {
  const allSection = document.getElementById('all-services');
  const categorySection = document.getElementById('category-services');
  const categoryTitle = document.getElementById('categoryTitle');
  const categoryContainer = document.getElementById('categoryServicesContainer');

  // Highlight active tab
  document.querySelectorAll('.category-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.category === category);
  });

  if (category === 'all') {
    allSection.classList.remove('d-none');
    categorySection.classList.add('d-none');
    await loadAllServicesInitial();
    return;
  }

  allSection.classList.add('d-none');
  categorySection.classList.remove('d-none');
  categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1);

  categoryContainer.innerHTML =
    '<p class="text-muted small mb-0">Loading...</p>';

  try {
    const data = await fetchServices({ category });
    categoryContainer.innerHTML = '';
    const services = data.services || data;

    if (!services.length) {
      categoryContainer.innerHTML =
        '<p class="text-muted small mb-0">No services in this category yet.</p>';
      return;
    }

    services.forEach((service) => {
      const col = document.createElement('div');
      col.className = 'col';

      const avgRating =
        typeof service.avgRating === 'number'
          ? service.avgRating.toFixed(1)
          : 'New';

      col.innerHTML = `
        <div class="card shadow-sm h-100 border-0">
          <div class="card-body d-flex flex-column">
            <h5 class="card-title mb-1">${service.name}</h5>
            <p class="text-muted mb-1">
              ${service.category || 'Service'} · ${service.city || ''}
            </p>
            ${
              service.address
                ? `<p class="mb-2 small text-truncate">${service.address}</p>`
                : ''
            }
            <div class="mt-auto d-flex justify-content-between align-items-center">
              <span class="badge bg-success">${avgRating}</span>
              <button
                class="btn btn-sm btn-outline-primary view-reviews-btn"
                data-id="${service._id}"
                data-name="${service.name}"
              >
                View reviews
              </button>
            </div>
          </div>
        </div>
      `;
      categoryContainer.appendChild(col);
    });
  } catch (err) {
    console.error(err);
    categoryContainer.innerHTML =
      '<p class="text-danger small mb-0">Failed to load services.</p>';
  }
}

function setupCategoryTabs() {
  document.querySelectorAll('.category-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const category = btn.dataset.category;
      handleCategoryClick(category);
    });
  });
}

// ---------- Reviews click handling ----------

function setupReviewsClick() {
  document.addEventListener('click', async (e) => {
    if (!e.target.classList.contains('view-reviews-btn')) return;

    const serviceId = e.target.dataset.id;
    const serviceName = e.target.dataset.name || 'Service';

    try {
      const data = await fetchReviews(serviceId);
      renderReviewsForService(serviceName, data.reviews || data);
    } catch (err) {
      console.error(err);
    }
  });
}

// ---------- Init ----------

document.addEventListener('DOMContentLoaded', () => {
  loadAllServicesInitial();
  setupSearch();
  setupCategoryTabs();
  setupReviewsClick();
});
