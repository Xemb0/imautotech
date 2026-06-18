const BUCKET = 'product-assets';
let currentProductId = null;

// ── Toast ──
function toast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast toast-${type} show`;
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Auth ──
async function checkAuth() {
  const { data: { session } } = await _supabase.auth.getSession();
  if (session) {
    showDashboard(session.user);
  }
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');

  const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
  if (error) {
    errEl.textContent = error.message;
    errEl.classList.remove('hidden');
    return;
  }
  showDashboard(data.user);
});

function showDashboard(user) {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  document.getElementById('user-email').textContent = user.email;
  loadProductsTable();
}

async function logout() {
  await _supabase.auth.signOut();
  location.reload();
}

// ── Products Table ──
async function loadProductsTable() {
  const { data: products } = await _supabase
    .from('products')
    .select('id, slug, title, type, organization, is_visible, display_order, icon_url')
    .order('display_order');

  const table = document.getElementById('products-table');
  if (!products || products.length === 0) {
    table.innerHTML = '<div class="p-8 text-center text-gray-400">No products yet.</div>';
    return;
  }

  table.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-800 text-gray-400 text-left">
          <tr>
            <th class="px-4 py-3">#</th>
            <th class="px-4 py-3">Product</th>
            <th class="px-4 py-3">Type</th>
            <th class="px-4 py-3">Org</th>
            <th class="px-4 py-3">Visible</th>
            <th class="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-800">
          ${products.map(p => `
            <tr class="hover:bg-gray-800/50 transition-colors">
              <td class="px-4 py-3 text-gray-400">${p.display_order}</td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  ${p.icon_url ? `<img src="${p.icon_url}" class="w-8 h-8 rounded-lg object-cover">` : '<div class="w-8 h-8 rounded-lg bg-gray-700"></div>'}
                  <div>
                    <div class="font-medium">${p.title}</div>
                    <div class="text-gray-500 text-xs">${p.slug}</div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 text-gray-400">${p.type || '-'}</td>
              <td class="px-4 py-3"><span class="px-2 py-0.5 text-xs rounded-full ${p.organization === 'imautotech' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-teal-500/20 text-teal-400'}">${p.organization}</span></td>
              <td class="px-4 py-3">${p.is_visible ? '<span class="text-emerald-400">Yes</span>' : '<span class="text-red-400">No</span>'}</td>
              <td class="px-4 py-3 text-right space-x-2">
                <button onclick="editProduct('${p.id}')" class="text-indigo-400 hover:text-indigo-300 text-sm">Edit</button>
                <button onclick="deleteProduct('${p.id}','${p.title}')" class="text-red-400 hover:text-red-300 text-sm">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ── Product Form ──
function openProductForm() {
  currentProductId = null;
  document.getElementById('modal-title').textContent = 'Add Product';
  document.getElementById('product-form').reset();
  document.getElementById('f-id').value = '';
  document.getElementById('f-visible').checked = true;
  document.getElementById('screenshots-manager').classList.add('hidden');
  document.getElementById('f-custompath-wrap').classList.add('hidden');
  document.getElementById('product-modal').classList.remove('hidden');
  document.getElementById('product-modal').classList.add('flex');
}

function closeProductForm() {
  document.getElementById('product-modal').classList.add('hidden');
  document.getElementById('product-modal').classList.remove('flex');
}

async function editProduct(id) {
  const { data: p } = await _supabase.from('products').select('*').eq('id', id).single();
  if (!p) return;

  currentProductId = id;
  document.getElementById('modal-title').textContent = 'Edit: ' + p.title;
  document.getElementById('f-id').value = p.id;
  document.getElementById('f-title').value = p.title;
  document.getElementById('f-slug').value = p.slug;
  document.getElementById('f-type').value = p.type || 'Android';
  document.getElementById('f-org').value = p.organization;
  document.getElementById('f-platforms').value = (p.platforms || []).join(', ');
  document.getElementById('f-desc').value = p.description || '';
  document.getElementById('f-longdesc').value = p.long_description || '';
  document.getElementById('f-features').value = (p.features || []).join(', ');
  document.getElementById('f-tech').value = (p.tech || []).join(', ');
  document.getElementById('f-gradient').value = p.gradient || '';
  document.getElementById('f-order').value = p.display_order || 0;
  document.getElementById('f-playstore').value = p.play_store_url || '';
  document.getElementById('f-appstore').value = p.app_store_url || '';
  document.getElementById('f-github').value = p.github_url || '';
  document.getElementById('f-stats').value = p.stats || '';
  document.getElementById('f-visible').checked = p.is_visible;
  document.getElementById('f-custompage').checked = p.has_custom_page;
  document.getElementById('f-custompath').value = p.custom_page_path || '';
  document.getElementById('f-custompath-wrap').classList.toggle('hidden', !p.has_custom_page);

  document.getElementById('screenshots-manager').classList.remove('hidden');
  loadScreenshots(id);

  document.getElementById('product-modal').classList.remove('hidden');
  document.getElementById('product-modal').classList.add('flex');
}

document.getElementById('f-custompage').addEventListener('change', (e) => {
  document.getElementById('f-custompath-wrap').classList.toggle('hidden', !e.target.checked);
});

// Auto-generate slug from title
document.getElementById('f-title').addEventListener('input', (e) => {
  if (!currentProductId) {
    document.getElementById('f-slug').value = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
});

document.getElementById('product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('f-id').value;
  const slug = document.getElementById('f-slug').value;

  const row = {
    title: document.getElementById('f-title').value,
    slug: slug,
    type: document.getElementById('f-type').value,
    organization: document.getElementById('f-org').value,
    platforms: document.getElementById('f-platforms').value.split(',').map(s => s.trim()).filter(Boolean),
    description: document.getElementById('f-desc').value,
    long_description: document.getElementById('f-longdesc').value,
    features: document.getElementById('f-features').value.split(',').map(s => s.trim()).filter(Boolean),
    tech: document.getElementById('f-tech').value.split(',').map(s => s.trim()).filter(Boolean),
    gradient: document.getElementById('f-gradient').value,
    display_order: parseInt(document.getElementById('f-order').value) || 0,
    play_store_url: document.getElementById('f-playstore').value || null,
    app_store_url: document.getElementById('f-appstore').value || null,
    github_url: document.getElementById('f-github').value || null,
    stats: document.getElementById('f-stats').value || null,
    is_visible: document.getElementById('f-visible').checked,
    has_custom_page: document.getElementById('f-custompage').checked,
    custom_page_path: document.getElementById('f-custompath').value || null,
  };

  // Upload icon
  const iconFile = document.getElementById('f-icon').files[0];
  if (iconFile) {
    const ext = iconFile.name.split('.').pop();
    const path = `${slug}/icon.${ext}`;
    await _supabase.storage.from(BUCKET).upload(path, iconFile, { upsert: true, contentType: iconFile.type });
    const { data: { publicUrl } } = _supabase.storage.from(BUCKET).getPublicUrl(path);
    row.icon_url = publicUrl;
  }

  // Upload hero
  const heroFile = document.getElementById('f-hero').files[0];
  if (heroFile) {
    const ext = heroFile.name.split('.').pop();
    const path = `${slug}/hero.${ext}`;
    await _supabase.storage.from(BUCKET).upload(path, heroFile, { upsert: true, contentType: heroFile.type });
    const { data: { publicUrl } } = _supabase.storage.from(BUCKET).getPublicUrl(path);
    row.hero_image_url = publicUrl;
  }

  let error;
  if (id) {
    ({ error } = await _supabase.from('products').update(row).eq('id', id));
  } else {
    ({ error } = await _supabase.from('products').insert(row));
  }

  if (error) {
    toast('Error: ' + error.message, 'error');
    return;
  }

  toast(id ? 'Product updated!' : 'Product created!', 'success');
  closeProductForm();
  loadProductsTable();
});

async function deleteProduct(id, title) {
  if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
  const { error } = await _supabase.from('products').delete().eq('id', id);
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast('Product deleted', 'success');
  loadProductsTable();
}

// ── Screenshots ──
async function loadScreenshots(productId) {
  const { data: screenshots } = await _supabase
    .from('product_screenshots')
    .select('*')
    .eq('product_id', productId)
    .order('display_order');

  const grid = document.getElementById('ss-grid');
  if (!screenshots || screenshots.length === 0) {
    grid.innerHTML = '<p class="text-gray-500 text-sm col-span-full">No screenshots yet. Upload some above.</p>';
    return;
  }

  grid.innerHTML = screenshots.map(s => `
    <div class="relative group rounded-lg overflow-hidden border border-gray-700">
      ${s.media_type === 'video'
        ? `<video src="${s.url}" class="w-full h-32 object-cover"></video>`
        : `<img src="${s.url}" alt="${s.alt_text || ''}" class="w-full h-32 object-cover">`}
      <button onclick="deleteScreenshot('${s.id}','${s.storage_path}')" class="absolute top-1 right-1 bg-red-600 hover:bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">&times;</button>
      <div class="absolute bottom-0 left-0 right-0 bg-black/60 text-xs text-gray-300 px-2 py-1">#${s.display_order}</div>
    </div>
  `).join('');
}

document.getElementById('ss-upload').addEventListener('change', async (e) => {
  const files = Array.from(e.target.files);
  if (files.length === 0 || !currentProductId) return;

  const slug = document.getElementById('f-slug').value;
  const progress = document.getElementById('ss-progress');
  const bar = document.getElementById('ss-bar');
  const status = document.getElementById('ss-status');
  progress.classList.remove('hidden');

  // Get current max order
  const { data: existing } = await _supabase
    .from('product_screenshots')
    .select('display_order')
    .eq('product_id', currentProductId)
    .order('display_order', { ascending: false })
    .limit(1);

  let order = (existing && existing.length > 0) ? existing[0].display_order + 1 : 1;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = file.name.split('.').pop();
    const mediaType = file.type.startsWith('video') ? 'video' : 'image';
    const storagePath = `${slug}/screenshots/${Date.now()}_${i}.${ext}`;

    status.textContent = `Uploading ${i + 1}/${files.length}...`;
    bar.style.width = `${((i + 1) / files.length) * 100}%`;

    const { error: uploadError } = await _supabase.storage.from(BUCKET).upload(storagePath, file, { contentType: file.type });
    if (uploadError) { toast('Upload failed: ' + uploadError.message, 'error'); continue; }

    const { data: { publicUrl } } = _supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    await _supabase.from('product_screenshots').insert({
      product_id: currentProductId,
      storage_path: storagePath,
      url: publicUrl,
      alt_text: `Screenshot ${order}`,
      display_order: order++,
      media_type: mediaType,
    });
  }

  progress.classList.add('hidden');
  bar.style.width = '0%';
  e.target.value = '';
  toast(`${files.length} file(s) uploaded!`, 'success');
  loadScreenshots(currentProductId);
});

async function deleteScreenshot(id, storagePath) {
  if (!confirm('Delete this screenshot?')) return;
  await _supabase.storage.from(BUCKET).remove([storagePath]);
  await _supabase.from('product_screenshots').delete().eq('id', id);
  toast('Screenshot deleted', 'success');
  loadScreenshots(currentProductId);
}

// ── Tabs ──
function switchTab(tab) {
  ['products', 'tickets'].forEach(t => {
    document.getElementById('panel-' + t).classList.toggle('hidden', t !== tab);
    const btn = document.getElementById('tab-' + t);
    const active = t === tab;
    btn.classList.toggle('bg-indigo-600', active);
    btn.classList.toggle('text-white', active);
    btn.classList.toggle('text-gray-400', !active);
    btn.classList.toggle('hover:text-white', !active);
  });
  if (tab === 'tickets') loadTicketsTable();
}

// ── Tickets ──
let currentTicketId = null;
let ticketChannel = null;

async function loadTicketsTable() {
  const status = document.getElementById('ticket-filter-status').value;
  const category = document.getElementById('ticket-filter-category').value;

  let query = _supabase.from('support_tickets').select('*, products(title)').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  if (category) query = query.eq('category', category);

  const { data: tickets } = await query;
  const table = document.getElementById('tickets-table');

  if (!tickets || tickets.length === 0) {
    table.innerHTML = '<div class="p-8 text-center text-gray-400">No tickets found.</div>';
    return;
  }

  const statusColors = { open: 'bg-yellow-500/20 text-yellow-400', in_progress: 'bg-blue-500/20 text-blue-400', resolved: 'bg-emerald-500/20 text-emerald-400', closed: 'bg-gray-500/20 text-gray-400' };
  const catColors = { issue: 'text-red-400', feedback: 'text-blue-400', suggestion: 'text-emerald-400', account_deletion: 'text-orange-400' };

  table.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-800 text-gray-400 text-left">
          <tr>
            <th class="px-4 py-3">Ticket</th>
            <th class="px-4 py-3">Product</th>
            <th class="px-4 py-3">From</th>
            <th class="px-4 py-3">Category</th>
            <th class="px-4 py-3">Subject</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3">Date</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-800">
          ${tickets.map(t => `
            <tr class="hover:bg-gray-800/50 transition-colors cursor-pointer" onclick="openTicketChat('${t.id}')">
              <td class="px-4 py-3 font-mono text-xs text-indigo-400">${t.ticket_number}</td>
              <td class="px-4 py-3 text-gray-400">${t.products?.title || '-'}</td>
              <td class="px-4 py-3"><div class="font-medium">${t.name}</div><div class="text-gray-500 text-xs">${t.email}</div></td>
              <td class="px-4 py-3"><span class="${catColors[t.category] || ''} capitalize">${t.category.replace('_', ' ')}</span></td>
              <td class="px-4 py-3 max-w-[200px] truncate">${t.subject}</td>
              <td class="px-4 py-3"><span class="px-2 py-0.5 text-xs rounded-full capitalize ${statusColors[t.status] || ''}">${t.status.replace('_', ' ')}</span></td>
              <td class="px-4 py-3 text-gray-500 text-xs">${new Date(t.created_at).toLocaleDateString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function openTicketChat(ticketId) {
  currentTicketId = ticketId;
  const { data: ticket } = await _supabase.from('support_tickets').select('*, products(title)').eq('id', ticketId).single();
  if (!ticket) return;

  document.getElementById('tm-subject').textContent = ticket.subject;
  document.getElementById('tm-ticket-num').textContent = ticket.ticket_number;
  document.getElementById('tm-email').textContent = ticket.email;
  document.getElementById('tm-status').value = ticket.status;

  // Load messages
  const { data: messages } = await _supabase.from('ticket_messages').select('*').eq('ticket_id', ticketId).order('created_at');
  const container = document.getElementById('tm-messages');
  container.innerHTML = (messages || []).map(msg => {
    const isAdmin = msg.sender_type === 'admin';
    const time = new Date(msg.created_at).toLocaleString();
    return `
      <div class="flex ${isAdmin ? 'justify-end' : 'justify-start'} mb-3">
        <div class="max-w-[80%] ${isAdmin ? 'bg-indigo-600/20 border-indigo-500/30' : 'bg-white/5 border-white/10'} border rounded-2xl px-4 py-3">
          <div class="text-xs ${isAdmin ? 'text-indigo-400' : 'text-white/40'} mb-1">${isAdmin ? 'You (Admin)' : ticket.name} &middot; ${time}</div>
          <div class="text-sm text-white/80 whitespace-pre-wrap">${msg.message}</div>
        </div>
      </div>
    `;
  }).join('');
  container.scrollTop = container.scrollHeight;

  // Subscribe to realtime
  if (ticketChannel) ticketChannel.unsubscribe();
  ticketChannel = _supabase
    .channel('admin-ticket-' + ticketId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_messages', filter: 'ticket_id=eq.' + ticketId }, (payload) => {
      const msg = payload.new;
      const isAdmin = msg.sender_type === 'admin';
      const time = new Date(msg.created_at).toLocaleString();
      container.innerHTML += `
        <div class="flex ${isAdmin ? 'justify-end' : 'justify-start'} mb-3">
          <div class="max-w-[80%] ${isAdmin ? 'bg-indigo-600/20 border-indigo-500/30' : 'bg-white/5 border-white/10'} border rounded-2xl px-4 py-3">
            <div class="text-xs ${isAdmin ? 'text-indigo-400' : 'text-white/40'} mb-1">${isAdmin ? 'You (Admin)' : 'User'} &middot; ${time}</div>
            <div class="text-sm text-white/80 whitespace-pre-wrap">${msg.message}</div>
          </div>
        </div>
      `;
      container.scrollTop = container.scrollHeight;
    })
    .subscribe();

  document.getElementById('ticket-modal').classList.remove('hidden');
  document.getElementById('ticket-modal').classList.add('flex');
}

function closeTicketModal() {
  document.getElementById('ticket-modal').classList.add('hidden');
  document.getElementById('ticket-modal').classList.remove('flex');
  if (ticketChannel) { ticketChannel.unsubscribe(); ticketChannel = null; }
  currentTicketId = null;
  loadTicketsTable();
}

async function updateTicketStatus() {
  if (!currentTicketId) return;
  const status = document.getElementById('tm-status').value;
  await _supabase.from('support_tickets').update({ status }).eq('id', currentTicketId);
  toast('Status updated', 'success');
}

document.getElementById('tm-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('tm-input');
  const msg = input.value.trim();
  if (!msg || !currentTicketId) return;
  input.value = '';
  await _supabase.from('ticket_messages').insert({ ticket_id: currentTicketId, sender_type: 'admin', message: msg });
});

// ── Init ──
checkAuth();
