const API = {
  jobs: '/api/jobs',
  signup: '/api/signup',
  login: '/api/login'
};

function saveToken(t) { localStorage.setItem('jb_token', t); document.getElementById('token').value = t; }
function clearToken() { localStorage.removeItem('jb_token'); document.getElementById('token').value = ''; }

function setUserUI(user){
  const area = document.getElementById('userArea');
  if(!area) return;
  area.innerHTML = `
    <div class="user-badge" id="userBadge" tabindex="0">
      <div class="initial">${(user.username||'').charAt(0).toUpperCase()}</div>
      <div>Hi, ${user.username}</div>
      <div class="user-arrow">▾</div>
      <div class="user-dropdown" id="userDropdown" style="display:none">
        <button id="profileBtn" class="dropdown-item">My Profile</button>
        <button id="logoutBtn" class="dropdown-item">Logout</button>
      </div>
    </div>
  `;
  // hide auth forms and showAuth button
  const authForms = document.querySelector('.auth-forms'); if(authForms) authForms.style.display = 'none';
  const showAuthBtn = document.getElementById('showAuth'); if(showAuthBtn) showAuthBtn.style.display = 'none';

  // wire dropdown
  const badge = document.getElementById('userBadge');
  const dropdown = document.getElementById('userDropdown');
  const profileBtn = document.getElementById('profileBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  function toggleDropdown(){ dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block'; }
  badge.addEventListener('click', (e)=>{ e.stopPropagation(); toggleDropdown(); });
  profileBtn.addEventListener('click', (e)=>{ e.stopPropagation(); dropdown.style.display='none'; showProfile(); });
  logoutBtn.addEventListener('click', (e)=>{ e.stopPropagation(); dropdown.style.display='none'; doLogout(); });
  // close on outside click
  document.addEventListener('click', (e)=>{ if(!badge.contains(e.target)) dropdown.style.display='none'; });
}

function removeUserUI(){
  const area = document.getElementById('userArea'); if(area) area.innerHTML = '';
  const authForms = document.querySelector('.auth-forms'); if(authForms) authForms.style.display = 'block';
  const showAuthBtn = document.getElementById('showAuth'); if(showAuthBtn) showAuthBtn.style.display = 'inline-block';
}

let currentPage = 1;
const pageSize = 5;

async function fetchJobs(page = 1) {
  currentPage = page;
  const q = document.getElementById('search') ? document.getElementById('search').value.trim() : '';
  const limit = pageSize + 1; // fetch one extra to detect next page
  const offset = (page - 1) * pageSize;
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  params.set('limit', limit);
  params.set('offset', offset);
  const res = await fetch(API.jobs + '?' + params.toString());
  const jobs = await res.json();
  const hasNext = jobs.length > pageSize;
  const pageItems = hasNext ? jobs.slice(0, pageSize) : jobs;
  const list = document.getElementById('list');
  list.innerHTML = '';
  pageItems.forEach(j => list.appendChild(renderJobCard(j)));
  renderPagination(hasNext);
}

function renderPagination(hasNext) {
  const container = document.getElementById('pagination');
  container.innerHTML = '';
  const prev = document.createElement('button');
  prev.className = 'btn secondary';
  prev.textContent = 'Prev';
  prev.disabled = currentPage === 1;
  prev.addEventListener('click', () => fetchJobs(currentPage - 1));

  const next = document.createElement('button');
  next.className = 'btn secondary';
  next.textContent = 'Next';
  next.disabled = !hasNext;
  next.addEventListener('click', () => fetchJobs(currentPage + 1));

  const info = document.createElement('div');
  info.className = 'page-info';
  info.textContent = `Page ${currentPage}`;

  container.appendChild(prev);
  container.appendChild(info);
  container.appendChild(next);
}

function renderJobCard(j) {
  const div = document.createElement('div');
  div.className = 'job';
  div.innerHTML = `
    <div class="job-head">
      <div class="logoCircle">${(j.company||'').charAt(0).toUpperCase()}</div>
      <div class="job-info">
        <h3>${j.title}</h3>
        <div class="meta">${j.company} · ${j.location || 'Remote'}</div>
      </div>
      <div class="job-actions">
        <button class="apply btn primary" data-id="${j.id}">Apply</button>
        <button class="details btn secondary" data-id="${j.id}">Details</button>
      </div>
    </div>
    <p class="desc">${j.description || ''}</p>
  `;
  return div;
}

// Create job
document.getElementById('createForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const token = localStorage.getItem('jb_token') ? `Bearer ${localStorage.getItem('jb_token')}` : '';
  const title = document.getElementById('title').value.trim();
  const company = document.getElementById('company').value.trim();
  const location = document.getElementById('location').value.trim();
  const description = document.getElementById('description').value.trim();
  try {
    const res = await fetch(API.jobs, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ title, company, location, description })
    });
    if (!res.ok) {
      const err = await res.json().catch(()=>({}));
      return alert('Create failed: ' + (err.error||res.statusText));
    }
    e.target.reset();
    fetchJobs();
  } catch (err) { alert('Error creating job. Ensure you are logged in.'); }
});

// Apply / event delegation
document.addEventListener('click', async (e) => {
  if (e.target && e.target.matches('.apply')) {
    const id = e.target.dataset.id;
    const name = prompt('Your name');
    const email = prompt('Your email');
    if (!name || !email) return alert('name and email required');
    await fetch(`/api/jobs/${id}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, resume: '' })
    });
    alert('Application submitted');
    return;
  }

  if (e.target && e.target.matches('.details')) {
    const id = e.target.dataset.id;
    showJobDetails(id);
    return;
  }
});

async function showJobDetails(id) {
  const res = await fetch(`/api/jobs/${id}`);
  if (!res.ok) return alert('Could not load job');
  const j = await res.json();
  document.getElementById('modalTitle').textContent = j.title;
  document.getElementById('modalCompany').textContent = `${j.company} · ${j.location || 'Remote'}`;
  document.getElementById('modalDesc').textContent = j.description || '';
  document.getElementById('modalApply').onclick = async () => {
    const name = prompt('Your name');
    const email = prompt('Your email');
    if (!name || !email) return alert('name and email required');
    await fetch(`/api/jobs/${id}/apply`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ name, email, resume: '' }) });
    alert('Application submitted');
    closeModal();
  };
  document.getElementById('jobModal').style.display = 'block';
}

function closeModal(){ document.getElementById('jobModal').style.display = 'none'; }
document.getElementById('closeModal').addEventListener('click', closeModal);

// Auth: signup/login
document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('su_username').value.trim();
  const password = document.getElementById('su_password').value.trim();
  const res = await fetch(API.signup, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username, password }) });
  const data = await res.json();
  if (res.ok && data.token) { saveToken(data.token); alert('Signed up and logged in'); }
  else alert(data.error || 'Signup failed');
  if (res.ok && data.token) await loadProfile();
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('li_username').value.trim();
  const password = document.getElementById('li_password').value.trim();
  const res = await fetch(API.login, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username, password }) });
  const data = await res.json();
  if (res.ok && data.token) { saveToken(data.token); alert('Logged in'); }
  else alert(data.error || 'Login failed');
  if (res.ok && data.token) await loadProfile();
});

document.getElementById('clearToken').addEventListener('click', () => { clearToken(); });

// show/hide auth panel
document.getElementById('showAuth').addEventListener('click', () => {
  const p = document.getElementById('authPanel');
  p.style.display = p.style.display === 'none' ? 'block' : 'none';
});

// init
document.addEventListener('DOMContentLoaded', () => {
  const t = localStorage.getItem('jb_token') || '';
  document.getElementById('token').value = t;
  fetchJobs();
  // wire search
  const s = document.getElementById('search');
  if (s) s.addEventListener('input', debounce(() => fetchJobs(), 300));
  // load profile when logged in
  if (t) loadProfile();
});

function debounce(fn, ms){ let id; return ()=>{ clearTimeout(id); id = setTimeout(fn, ms); }; }

async function loadProfile(){
  const token = localStorage.getItem('jb_token');
  if (!token) return;
  const res = await fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return;
  const data = await res.json();
  // show in sidebar
  const authPanel = document.getElementById('authPanel');
  // remove any previous profile box
  const prev = authPanel.querySelector('.profile-box'); if(prev) prev.remove();
  const box = document.createElement('div');
  box.className = 'card profile-box';
  box.innerHTML = `<h4>Signed in</h4><div>${data.username}</div><button id="logout" class="btn secondary" style="margin-top:8px">Logout</button>`;
  authPanel.insertBefore(box, authPanel.firstChild);
  document.getElementById('logout').addEventListener('click', ()=>{ clearToken(); box.remove(); removeUserUI(); });
  setUserUI(data);
}

function doLogout(){
  clearToken(); removeUserUI(); // remove sidebar profile box if present
  const authPanel = document.getElementById('authPanel');
  const prev = authPanel.querySelector('.profile-box'); if(prev) prev.remove();
}

function showProfile(){
  const authPanel = document.getElementById('authPanel');
  if(!authPanel) return;
  authPanel.scrollIntoView({behavior:'smooth', block:'center'});
  const box = authPanel.querySelector('.profile-box');
  if(box){
    box.classList.add('highlight');
    setTimeout(()=>box.classList.remove('highlight'), 2200);
  }
}
