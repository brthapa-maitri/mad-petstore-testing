// Prototype only: an in-memory pet store in localStorage so both pages share data.
const KEY = 'petstore-prototype-pets';
const SEED = [
  { id: '1', name: 'Rex', status: 'available', category: { name: 'Dogs' } },
  { id: '2', name: 'Tom', status: 'sold', category: { name: 'Cats' } },
  { id: '3', name: 'Pip', status: 'pending' },
];
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) ?? SEED; } catch { return SEED; } };
const save = pets => localStorage.setItem(KEY, JSON.stringify(pets));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function initList() {
  const filter = document.querySelector('[data-testid="status-filter"]');
  const list = document.querySelector('[data-testid="pet-list"]');
  const empty = document.querySelector('[data-testid="pet-list-empty"]');
  const render = () => {
    const pets = load().filter(p => p.status === filter.value);
    list.innerHTML = pets.map(p => `<tr data-testid="pet-row"><td data-testid="pet-row-name">${esc(p.name)}</td><td data-testid="pet-row-status">${p.status}</td></tr>`).join('');
    empty.hidden = pets.length > 0;
  };
  filter.addEventListener('change', render);
  render();
}

export function initAdd() {
  const form = document.querySelector('[data-testid="add-pet-form"]');
  const error = document.querySelector('[data-testid="form-error"]');
  const created = document.querySelector('[data-testid="created-pet"]');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    const category = String(data.get('category') ?? '').trim();
    if (!name || name.length > 100) { error.textContent = 'Name is required (1–100 characters).'; error.hidden = false; return; }
    const pet = { id: String(Date.now()), name, status: String(data.get('status')), ...(category && { category: { name: category } }) };
    save([...load(), pet]);
    error.hidden = true;
    created.querySelector('[data-testid="created-pet-id"]').textContent = pet.id;
    created.querySelector('[data-testid="created-pet-name"]').textContent = pet.name;
    created.querySelector('[data-testid="created-pet-status"]').textContent = pet.status;
    created.hidden = false;
  });
}
