(function () {
  const platformIcons = {
    Android: '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.523 2.23l1.644-1.644a.53.53 0 00-.75-.75L16.55 1.7C15.14.955 13.576.5 12 .5S8.86.955 7.45 1.7L5.583.836a.53.53 0 00-.75.75L6.477 2.23C4.343 3.63 2.883 5.893 2.648 8.5h18.704c-.235-2.607-1.695-4.87-3.829-6.27zM8.5 6a1 1 0 110-2 1 1 0 010 2zm7 0a1 1 0 110-2 1 1 0 010 2zM3 10v8a2 2 0 002 2h1v3.5a1.5 1.5 0 003 0V20h6v3.5a1.5 1.5 0 003 0V20h1a2 2 0 002-2v-8H3zm-3 1.5a1.5 1.5 0 013 0v5a1.5 1.5 0 01-3 0v-5zm21 0a1.5 1.5 0 013 0v5a1.5 1.5 0 01-3 0v-5z"/></svg>',
    iOS: '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>',
    macOS: '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>',
    Windows: '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/></svg>',
    Linux: '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.368 1.884 1.43.868.07 1.726-.28 2.373-.936.921-.93.915-2.037.715-2.802-.157-.6-.386-1.124-.598-1.554-.21-.429-.35-.865-.267-1.187.134-.533.666-.869 1.02-1.468.354-.601.456-1.266.157-2.134a3.001 3.001 0 00-.2-.47c.071-.06.143-.12.215-.187.39-.378.661-.805.757-1.377.098-.573-.05-1.27-.39-2.08-.342-.812-.883-1.332-1.458-1.674-.578-.339-1.178-.491-1.636-.536-.38-.17-.716-.3-1.025-.396a5.64 5.64 0 00-.453-.142c-.04-.182-.093-.358-.07-.428-.14-1.065-.738-1.927-1.423-2.604-.966-.953-2.073-1.596-2.833-2.117l-.008-.006c-.569-.39-1.016-.71-1.252-.982-.14-.157-.24-.291-.283-.467a.876.876 0 01-.012-.302c.025-.188.065-.377.077-.58.011-.202.015-.42-.016-.66C13.394.202 12.927 0 12.504 0z"/></svg>',
    Desktop: '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
  };

  function renderProductCard(p) {
    const link = p.has_custom_page && p.custom_page_path
      ? p.custom_page_path
      : `our_products/product.html?slug=${p.slug}`;

    const platforms = (p.platforms || []).map(pl =>
      `<span class="inline-flex items-center gap-1 text-xs text-white/70">${platformIcons[pl] || ''}${pl}</span>`
    ).join('');

    const iconBg = p.icon_url
      ? `<img src="${p.icon_url}" alt="${p.title}" class="w-16 h-16 rounded-2xl object-cover shadow-lg">`
      : `<div class="w-16 h-16 rounded-2xl bg-gradient-to-br ${p.gradient || 'from-gray-600 to-gray-500'} flex items-center justify-center text-white text-2xl font-bold shadow-lg">${p.title[0]}</div>`;

    return `
      <a href="${link}" class="group block">
        <div class="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:-translate-y-1" style="box-shadow: 0 0 0 transparent;">
          <div class="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style="box-shadow: 0 0 40px ${p.glow_color || 'rgba(99,102,241,0.2)'}"></div>
          <div class="relative z-10">
            <div class="flex items-start gap-4 mb-4">
              ${iconBg}
              <div class="flex-1 min-w-0">
                <h3 class="text-xl font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:${p.gradient || 'from-blue-400 to-cyan-400'} transition-all">${p.title}</h3>
                <span class="inline-block px-2 py-0.5 text-xs rounded-full bg-white/10 text-white/60 mt-1">${p.type || 'App'}</span>
                ${p.stats ? `<span class="inline-block px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400 ml-1">${p.stats}</span>` : ''}
              </div>
            </div>
            <p class="text-white/60 text-sm mb-4 line-clamp-2">${p.description || ''}</p>
            <div class="flex items-center justify-between">
              <div class="flex gap-2">${platforms}</div>
              <span class="text-xs text-white/40 group-hover:text-white/70 transition-colors">Explore &rarr;</span>
            </div>
          </div>
        </div>
      </a>
    `;
  }

  function renderSkeleton() {
    return Array(6).fill(`
      <div class="bg-white/5 border border-white/10 rounded-2xl p-6 animate-pulse">
        <div class="flex items-start gap-4 mb-4">
          <div class="w-16 h-16 rounded-2xl bg-white/10"></div>
          <div class="flex-1"><div class="h-5 bg-white/10 rounded w-2/3 mb-2"></div><div class="h-3 bg-white/10 rounded w-1/3"></div></div>
        </div>
        <div class="h-3 bg-white/10 rounded w-full mb-2"></div>
        <div class="h-3 bg-white/10 rounded w-4/5"></div>
      </div>
    `).join('');
  }

  window.loadProducts = async function (containerId, org) {
    containerId = containerId || 'products-showcase';
    org = org || 'imautotech';
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">${renderSkeleton()}</div>`;

    const { data: products, error } = await _supabase
      .from('products')
      .select('*')
      .eq('organization', org)
      .eq('is_visible', true)
      .order('display_order');

    if (error || !products) {
      container.innerHTML = '<p class="text-white/60 text-center">Unable to load products.</p>';
      return;
    }

    container.innerHTML = `
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${products.map(renderProductCard).join('')}
      </div>
    `;
  };
})();
