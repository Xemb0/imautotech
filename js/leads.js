/* ──────────────────────────────────────────────────────────────
   leads.js — capture customer/sales enquiries straight into Supabase
   (table: public.leads). These are CUSTOMERS, not support tickets,
   and surface in the admin console under the "Leads" tab.

   Usage on a page:
     <div class="lead-form" data-source="home"></div>
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="js/supabase-config.js"></script>
     <script src="js/leads.js"></script>

   Optional data-* attributes on .lead-form:
     data-source   "home" | "pricing" | "querry" | "product:<slug>"  (default "website")
     data-product  product slug (resolves to product_id)
     data-interest free text (e.g. a plan name) prefilled into `interest`
   ────────────────────────────────────────────────────────────── */
(function () {
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Insert one lead. Returns the created row (throws on error).
  async function createLead(payload) {
    if (typeof _supabase === 'undefined') {
      throw new Error('Supabase client not loaded');
    }

    let product_id = null;
    if (payload.product) {
      try {
        const { data: prod } = await _supabase
          .from('products').select('id').eq('slug', payload.product).single();
        if (prod) product_id = prod.id;
      } catch (_) { /* slug may not match a product — fine */ }
    }

    const row = {
      name: (payload.name || '').trim(),
      email: (payload.email || '').trim(),
      phone: (payload.phone || '').trim() || null,
      company: (payload.company || '').trim() || null,
      message: (payload.message || '').trim() || null,
      source: payload.source || 'website',
      interest: (payload.interest || '').trim() || null,
      product_id,
      status: 'new',
    };

    try {
      const { data, error } = await _supabase.from('leads').insert(row).select().single();
      if (error) throw error;
      return data;
    } catch (supaErr) {
      // SAFETY NET: if the Supabase insert fails (e.g. the leads table hasn't
      // been created yet, or a transient error), don't lose the lead — mirror it
      // to the existing SheetDB sheet so it's still captured. Once the leads
      // table is live and stable this branch is never hit and can be removed.
      try {
        await fetch('https://sheetdb.io/api/v1/jrmqrr3j0yon2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: [{
            timestamp: new Date().toISOString(),
            name: row.name, email: row.email, phone: row.phone || '',
            source: row.source, message: row.message || '',
          }] }),
        });
        console.warn('[leads] Supabase insert failed; captured via SheetDB fallback.', supaErr);
        return { fallback: true };
      } catch (sheetErr) {
        throw supaErr; // both failed — surface the original error to the form
      }
    }
  }
  window.createLead = createLead;

  // Render a styled, self-contained form into every .lead-form placeholder.
  function renderLeadForms() {
    document.querySelectorAll('.lead-form').forEach(function (el) {
      if (el.dataset.rendered) return;
      el.dataset.rendered = '1';

      const source = el.dataset.source || 'website';
      const product = el.dataset.product || '';
      const interest = el.dataset.interest || '';

      el.innerHTML = `
        <form class="lf" novalidate style="background:#fff;border-radius:18px;padding:24px;max-width:460px;width:100%;box-shadow:0 18px 50px -20px rgba(0,0,0,.45);font-family:'Inter','Outfit',system-ui,sans-serif;color:#131426">
          <div style="font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#F8B000;margin-bottom:6px">Get in touch</div>
          <div style="font-size:20px;font-weight:800;letter-spacing:-.01em;margin-bottom:16px">Tell us about your project</div>

          <label style="display:block;font-size:12px;font-weight:600;color:#5b6072;margin:0 0 6px">Your name</label>
          <input class="lf-name" type="text" required placeholder="Full name"
                 style="width:100%;box-sizing:border-box;padding:11px 13px;border:1px solid #e2e4ec;border-radius:10px;font-size:14px;margin-bottom:13px;background:#fbfbfd;color:#131426">

          <label style="display:block;font-size:12px;font-weight:600;color:#5b6072;margin:0 0 6px">Email</label>
          <input class="lf-email" type="email" required placeholder="you@example.com"
                 style="width:100%;box-sizing:border-box;padding:11px 13px;border:1px solid #e2e4ec;border-radius:10px;font-size:14px;margin-bottom:13px;background:#fbfbfd;color:#131426">

          <label style="display:block;font-size:12px;font-weight:600;color:#5b6072;margin:0 0 6px">Phone <span style="font-weight:400;color:#9aa0b2">(optional)</span></label>
          <input class="lf-phone" type="tel" placeholder="+91 …"
                 style="width:100%;box-sizing:border-box;padding:11px 13px;border:1px solid #e2e4ec;border-radius:10px;font-size:14px;margin-bottom:13px;background:#fbfbfd;color:#131426">

          <label style="display:block;font-size:12px;font-weight:600;color:#5b6072;margin:0 0 6px">What do you need?</label>
          <textarea class="lf-message" rows="3" placeholder="A short description of your app / website / idea"
                 style="width:100%;box-sizing:border-box;padding:11px 13px;border:1px solid #e2e4ec;border-radius:10px;font-size:14px;margin-bottom:16px;background:#fbfbfd;color:#131426;resize:vertical"></textarea>

          <button type="submit" class="lf-submit"
                 style="width:100%;padding:13px;border:none;border-radius:10px;background:#F8B000;color:#131426;font-weight:700;font-size:14px;cursor:pointer;transition:filter .2s">
            Send request
          </button>
          <p class="lf-error" style="display:none;color:#c0392b;font-size:13px;margin:10px 0 0"></p>
        </form>
        <div class="lf-success" style="display:none;background:#fff;border-radius:18px;padding:30px 24px;max-width:460px;width:100%;text-align:center;box-shadow:0 18px 50px -20px rgba(0,0,0,.45);font-family:'Inter','Outfit',system-ui,sans-serif;color:#131426">
          <div style="width:54px;height:54px;border-radius:50%;background:#eafaf0;display:flex;align-items:center;justify-content:center;margin:0 auto 14px">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1faa59" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
          </div>
          <div style="font-size:20px;font-weight:800;margin-bottom:6px">Thank you! 🎉</div>
          <p style="color:#5b6072;font-size:14px;margin:0">We've received your request and our team will reach out shortly.</p>
        </div>
      `;

      const form = el.querySelector('.lf');
      const btn = el.querySelector('.lf-submit');
      const errEl = el.querySelector('.lf-error');
      btn.addEventListener('mouseenter', () => btn.style.filter = 'brightness(1.06)');
      btn.addEventListener('mouseleave', () => btn.style.filter = 'none');

      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        errEl.style.display = 'none';
        const name = el.querySelector('.lf-name').value.trim();
        const email = el.querySelector('.lf-email').value.trim();
        const phone = el.querySelector('.lf-phone').value.trim();
        const message = el.querySelector('.lf-message').value.trim();

        if (!name || !email) { errEl.textContent = 'Please enter your name and email.'; errEl.style.display = 'block'; return; }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { errEl.textContent = 'Please enter a valid email address.'; errEl.style.display = 'block'; return; }

        btn.disabled = true; btn.textContent = 'Sending…'; btn.style.opacity = '.7';
        try {
          await createLead({ name, email, phone, message, source, product, interest });
          form.style.display = 'none';
          el.querySelector('.lf-success').style.display = 'block';
        } catch (err) {
          btn.disabled = false; btn.textContent = 'Send request'; btn.style.opacity = '1';
          errEl.textContent = 'Something went wrong — please try again, or email support@imautotech.in.';
          errEl.style.display = 'block';
          console.error('[leads] insert failed:', err);
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderLeadForms);
  } else {
    renderLeadForms();
  }
  window.renderLeadForms = renderLeadForms;
})();
