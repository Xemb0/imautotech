const SHEETDB_URL = 'https://sheetdb.io/api/v1/jrmqrr3j0yon2';

// ── Ticket Creation ──
async function createTicket(productSlug, name, email, category, subject, message) {
  // Get product
  let productId = null;
  let productTitle = productSlug;
  if (productSlug) {
    const { data: prod } = await _supabase.from('products').select('id, title').eq('slug', productSlug).single();
    if (prod) { productId = prod.id; productTitle = prod.title; }
  }

  // Insert ticket
  const { data: ticket, error } = await _supabase
    .from('support_tickets')
    .insert({
      ticket_number: '',
      product_id: productId,
      name, email, category, subject,
      status: 'open',
      priority: category === 'account_deletion' ? 'high' : 'medium',
    })
    .select()
    .single();

  if (error) throw error;

  // Insert first message
  await _supabase.from('ticket_messages').insert({
    ticket_id: ticket.id,
    sender_type: 'user',
    message: message,
  });

  // Post to SheetDB for Google Sheets notification
  try {
    await fetch(SHEETDB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [{
        timestamp: new Date().toISOString(),
        ticket: ticket.ticket_number,
        product: productTitle,
        category: category,
        name: name,
        email: email,
        subject: subject,
        message: message.substring(0, 500),
      }]}),
    });
  } catch (_) { /* SheetDB is best-effort */ }

  return ticket;
}

// ── Load Ticket Thread ──
async function loadTicketThread(ticketId) {
  const { data: messages } = await _supabase
    .from('ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at');
  return messages || [];
}

// ── Send Message ──
async function sendMessage(ticketId, message, senderType) {
  senderType = senderType || 'user';
  const { error } = await _supabase.from('ticket_messages').insert({
    ticket_id: ticketId,
    sender_type: senderType,
    message: message,
  });
  if (error) throw error;
}

// ── Subscribe to Realtime Messages ──
function subscribeToMessages(ticketId, callback) {
  return _supabase
    .channel('ticket-' + ticketId)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'ticket_messages',
      filter: 'ticket_id=eq.' + ticketId,
    }, (payload) => callback(payload.new))
    .subscribe();
}

// ── Render Chat Message ──
function renderMessage(msg) {
  const isAdmin = msg.sender_type === 'admin';
  const time = new Date(msg.created_at).toLocaleString();
  return `
    <div class="flex ${isAdmin ? 'justify-start' : 'justify-end'} mb-3">
      <div class="max-w-[80%] ${isAdmin ? 'bg-indigo-600/20 border-indigo-500/30' : 'bg-white/5 border-white/10'} border rounded-2xl px-4 py-3">
        <div class="text-xs ${isAdmin ? 'text-indigo-400' : 'text-white/40'} mb-1">${isAdmin ? 'Support Team' : 'You'} &middot; ${time}</div>
        <div class="text-sm text-white/80 whitespace-pre-wrap">${msg.message}</div>
      </div>
    </div>
  `;
}
