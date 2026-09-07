const SUPABASE_URL = "https://bbpvmuelhajelrrdvruh.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJicHZtdWVsaGFqZWxycmR2cnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3ODQ4MzYsImV4cCI6MjEwNDM2MDgzNn0.4s0zPmn0qA0b-WxUKFSGIoV0Y54fHP1k1r0wv29RjR4";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let isAdmin = false;

document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  loadProjects();
  loadSkills();
  loadCareers();
  setupScrollSpy();
  setupLogin();
  setupForms();
  initBackground();
  initScrollReveal();
});

// --- Background Wave Animation ---
function initBackground() {
  const canvas = document.getElementById("bg-canvas");
  const ctx = canvas.getContext("2d");
  let w, h, cols, rows, grid, prev;
  const spacing = 28;
  const damping = 0.97;
  const spread = 0.3;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    cols = Math.ceil(w / spacing) + 2;
    rows = Math.ceil(h / spacing) + 2;
    grid = Array.from({ length: rows }, () => new Float32Array(cols));
    prev = Array.from({ length: rows }, () => new Float32Array(cols));
  }

  resize();
  window.addEventListener("resize", resize);

  function drop() {
    const cx = Math.floor(Math.random() * cols);
    const cy = Math.floor(Math.random() * rows);
    const strength = 1.5 + Math.random() * 2;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const r = cy + dy;
        const c = cx + dx;
        if (r >= 0 && r < rows && c >= 0 && c < cols) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          grid[r][c] += strength * Math.max(0, 1 - dist / 2.5);
        }
      }
    }
  }

  let dropTimer = 0;
  function update() {
    dropTimer++;
    if (dropTimer > 90) {
      drop();
      dropTimer = 0;
    }

    const next = Array.from({ length: rows }, () => new Float32Array(cols));
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        const avg =
          (grid[r - 1][c] + grid[r + 1][c] + grid[r][c - 1] + grid[r][c + 1]) * spread;
        next[r][c] = (avg - prev[r][c]) * damping;
      }
    }
    prev = grid;
    grid = next;
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const val = grid[r][c];
        if (Math.abs(val) < 0.01) continue;

        const x = c * spacing;
        const y = r * spacing;
        const brightness = Math.min(255, Math.abs(val) * 40);
        const alpha = Math.min(0.15, Math.abs(val) * 0.06);

        ctx.beginPath();
        ctx.arc(x, y, 1.5 + Math.abs(val) * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness}, ${alpha})`;
        ctx.fill();
      }
    }
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  drop();
  loop();
}

// --- Scroll Reveal ---
function initScrollReveal() {
  const revealEls = document.querySelectorAll(".reveal, .reveal-children");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  revealEls.forEach((el) => observer.observe(el));
}

// --- Auth ---
async function checkAuth() {
  const { data } = await sb.auth.getSession();
  setAdmin(!!data.session);
}

function setAdmin(val) {
  isAdmin = val;
  document.getElementById("login-btn").hidden = val;
  document.getElementById("logout-btn").hidden = !val;
  document.querySelectorAll(".admin-only").forEach((el) => {
    el.hidden = !val;
  });
  document.querySelectorAll(".delete-btn").forEach((el) => {
    el.hidden = !val;
  });
  document.querySelectorAll(".delete-tag").forEach((el) => {
    el.hidden = !val;
  });
}

function setupLogin() {
  document.getElementById("login-btn").addEventListener("click", () => {
    document.getElementById("login-modal").hidden = false;
    document.getElementById("login-email").focus();
  });

  document.getElementById("login-cancel").addEventListener("click", closeModal);
  document.querySelector(".modal-backdrop").addEventListener("click", closeModal);

  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-pw").value;

    const { error } = await sb.auth.signInWithPassword({ email, password });

    if (!error) {
      setAdmin(true);
      closeModal();
      loadProjects();
      loadSkills();
      loadCareers();
    } else {
      document.getElementById("login-error").hidden = false;
    }
  });

  document.getElementById("logout-btn").addEventListener("click", async () => {
    await sb.auth.signOut();
    setAdmin(false);
    document.querySelectorAll(".inline-form").forEach((f) => (f.hidden = true));
    loadProjects();
    loadSkills();
    loadCareers();
  });
}

function closeModal() {
  document.getElementById("login-modal").hidden = true;
  document.getElementById("login-form").reset();
  document.getElementById("login-error").hidden = true;
}

// --- Forms ---
function toggleForm(formId) {
  const form = document.getElementById(formId);
  form.hidden = !form.hidden;
  if (!form.hidden) form.querySelector("input, textarea").focus();
}

function setupForms() {
  document.getElementById("project-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));
    await sb.from("projects").insert({
      name: data.name,
      description: data.description,
      github_url: data.github_url || null,
      image_url: data.image_url || null,
    });
    form.reset();
    form.hidden = true;
    loadProjects();
  });

  document.getElementById("skill-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));
    await sb.from("skills").insert({
      name: data.name,
      category: data.category,
    });
    form.reset();
    form.hidden = true;
    loadSkills();
  });

  document.getElementById("career-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));
    await sb.from("careers").insert({
      title: data.title,
      description: data.description,
      link: data.link || null,
      image_url: data.image_url || null,
    });
    form.reset();
    form.hidden = true;
    loadCareers();
  });
}

// --- Data Loading ---
async function loadProjects() {
  const { data: projects } = await sb
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  const grid = document.getElementById("project-grid");

  if (!projects || projects.length === 0) {
    grid.innerHTML = '<div class="empty-state">등록된 프로젝트가 없습니다.</div>';
    return;
  }

  grid.innerHTML = projects
    .map(
      (p) => `
    <div class="project-card">
      ${
        p.image_url
          ? `<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy">`
          : '<div class="no-image">P</div>'
      }
      <div class="card-body">
        <h3>${escapeHtml(p.name)}</h3>
        <p>${escapeHtml(p.description)}</p>
        <div class="card-actions">
          ${
            p.github_url
              ? `<a href="${escapeHtml(p.github_url)}" target="_blank" rel="noopener" class="github-link">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                  GitHub
                </a>`
              : ""
          }
          <button class="delete-btn" ${isAdmin ? "" : "hidden"} onclick="deleteProject(${p.id})">삭제</button>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

async function loadSkills() {
  const { data: skills } = await sb
    .from("skills")
    .select("*")
    .order("category")
    .order("name");

  const container = document.getElementById("skills-container");

  if (!skills || skills.length === 0) {
    container.innerHTML = '<div class="empty-state">등록된 스킬이 없습니다.</div>';
    return;
  }

  const grouped = {};
  skills.forEach((s) => {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  });

  container.innerHTML = Object.entries(grouped)
    .map(
      ([category, items]) => `
    <div class="skill-category">
      <h3>${escapeHtml(category)}</h3>
      <div class="skill-tags">
        ${items
          .map(
            (s) => `
          <span class="skill-tag">
            ${escapeHtml(s.name)}
            <button class="delete-tag" ${isAdmin ? "" : "hidden"} onclick="deleteSkill(${s.id})">x</button>
          </span>`
          )
          .join("")}
      </div>
    </div>
  `
    )
    .join("");
}

async function loadCareers() {
  const { data: careers } = await sb
    .from("careers")
    .select("*")
    .order("created_at", { ascending: false });

  const grid = document.getElementById("career-grid");

  if (!careers || careers.length === 0) {
    grid.innerHTML = '<div class="empty-state">등록된 항목이 없습니다.</div>';
    return;
  }

  grid.innerHTML = careers
    .map(
      (c) => `
    <div class="career-card">
      ${
        c.image_url
          ? `<img src="${escapeHtml(c.image_url)}" alt="${escapeHtml(c.title)}" loading="lazy">`
          : '<div class="no-image">C</div>'
      }
      <div class="card-body">
        <h3>${escapeHtml(c.title)}</h3>
        <p>${escapeHtml(c.description)}</p>
        <div class="card-actions">
          ${
            c.link
              ? `<a href="${escapeHtml(c.link)}" target="_blank" rel="noopener" class="career-link">자료 보기 &rarr;</a>`
              : ""
          }
          <button class="delete-btn" ${isAdmin ? "" : "hidden"} onclick="deleteCareer(${c.id})">삭제</button>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

// --- Delete ---
async function deleteProject(id) {
  if (!confirm("정말 삭제하시겠습니까?")) return;
  await sb.from("projects").delete().eq("id", id);
  loadProjects();
}

async function deleteSkill(id) {
  if (!confirm("정말 삭제하시겠습니까?")) return;
  await sb.from("skills").delete().eq("id", id);
  loadSkills();
}

async function deleteCareer(id) {
  if (!confirm("정말 삭제하시겠습니까?")) return;
  await sb.from("careers").delete().eq("id", id);
  loadCareers();
}

// --- Utils ---
function setupScrollSpy() {
  const sections = document.querySelectorAll("section");
  const navLinks = document.querySelectorAll(".nav-links a");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          navLinks.forEach((link) => link.classList.remove("active"));
          const activeLink = document.querySelector(
            `.nav-links a[href="#${entry.target.id}"]`
          );
          if (activeLink) activeLink.classList.add("active");
        }
      });
    },
    { threshold: 0.3 }
  );

  sections.forEach((section) => observer.observe(section));
}

function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
