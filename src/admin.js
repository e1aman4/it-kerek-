const app = document.querySelector("#admin-app");
const numberFormat = new Intl.NumberFormat("ru-RU");
let config = null;
let activeTab = "overview";
let analyticsPeriod = 30;
let mustChangePassword = false;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[character]));
}

function formatNumber(value) {
  return numberFormat.format(value || 0);
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body) headers["Content-Type"] = "application/json";
  if (options.method && options.method !== "GET") headers["X-Admin-Request"] = "1";
  const response = await fetch(path, { ...options, headers, credentials: "same-origin" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || `Ошибка сервера (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return body;
}

async function start() {
  try {
    await api("/api/admin/analytics?days=30");
    await showDashboard();
  } catch (error) {
    if (error.status === 401) showLogin();
    else showFatal(error);
  }
}

function showFatal(error) {
  app.innerHTML = `<section class="admin-login"><div class="login-card"><p class="admin-kicker">IT-KEREK / ADMIN</p><h1>Не удалось подключиться</h1><p class="admin-muted">${escapeHtml(error.message)}</p><a class="admin-link" href="/">Вернуться на сайт</a></div></section>`;
}

function showLogin(errorMessage = "") {
  app.innerHTML = `
    <section class="admin-login">
      <form class="login-card" id="login-form">
        <a class="admin-brand" href="/"><img class="admin-mark" src="/assets/it-kerek-logo.png" alt="" /><span>IT-Kerek <i>ADMIN</i></span></a>
        <p class="admin-kicker">ЗАЩИЩЁННЫЙ ДОСТУП</p>
        <h1>Вход в панель</h1>
        <p class="admin-muted">Аналитика сайта и управление контентом.</p>
        <label>Пароль администратора<input name="password" type="password" autocomplete="current-password" required autofocus /></label>
        <button class="admin-button admin-button-primary" type="submit">Войти в панель <span>→</span></button>
        <p class="login-error" role="alert">${escapeHtml(errorMessage)}</p>
        <a class="admin-link" href="/">← Вернуться на сайт</a>
      </form>
    </section>`;
  document.querySelector("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button");
    const message = form.querySelector(".login-error");
    button.disabled = true;
    message.textContent = "Проверка доступа…";
    try {
      await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ password: new FormData(form).get("password") }),
      });
      await showDashboard();
    } catch (error) {
      message.textContent = error.message;
      button.disabled = false;
    }
  });
}

async function showDashboard() {
  try {
    mustChangePassword = Boolean((await api("/api/admin/security")).mustChangePassword);
  } catch (error) {
    showFatal(error);
    return;
  }
  app.innerHTML = `
    <div class="admin-shell">
      <aside class="admin-sidebar">
        <a class="admin-brand" href="/"><img class="admin-mark" src="/assets/it-kerek-logo.png" alt="" /><span>IT-Kerek <i>ADMIN</i></span></a>
        <p class="sidebar-label">РАБОЧАЯ ОБЛАСТЬ</p>
        <nav class="admin-nav" aria-label="Разделы панели">
          <button data-tab="overview">◫ <span>Обзор</span></button>
          <button data-tab="home">⌂ <span>Главная страница</span></button>
          <button data-tab="services">▤ <span>Услуги</span></button>
          <button data-tab="calculator">⊞ <span>Цены и калькулятор</span></button>
          <button data-tab="projects">▧ <span>Портфолио</span></button>
          <button data-tab="security">◇ <span>Безопасность</span></button>
        </nav>
        <div class="sidebar-bottom">
          <span class="server-status"><i></i> Локальный сервер</span>
          <a href="/">Открыть сайт ↗</a>
          <button id="logout-button">Выйти из панели</button>
        </div>
      </aside>
      <section class="admin-main">
        <header class="admin-topbar"><div><p class="admin-kicker">ПАНЕЛЬ УПРАВЛЕНИЯ</p><h1 id="page-title">Обзор</h1></div><div class="topbar-right"><span class="live-badge">● АНАЛИТИКА АКТИВНА</span><span id="current-date"></span></div></header>
        <div id="dashboard-content" class="dashboard-content"></div>
      </section>
    </div>`;
  document.querySelector("#current-date").textContent = new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date());
  document.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => switchTab(button.dataset.tab)));
  document.querySelector("#logout-button").addEventListener("click", logout);
  await switchTab(activeTab);
}

async function logout() {
  try {
    await api("/api/admin/logout", { method: "POST", body: "{}" });
    showLogin("Вы вышли из панели.");
  } catch (error) {
    showFatal(error);
  }
}

async function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll("[data-tab]").forEach((button) => button.classList.toggle("is-active", button.dataset.tab === tab));
  const titles = { overview: "Обзор", home: "Главная страница", services: "Услуги", calculator: "Цены и калькулятор", projects: "Портфолио", security: "Безопасность" };
  document.querySelector("#page-title").textContent = titles[tab];
  const content = document.querySelector("#dashboard-content");
  content.innerHTML = `<div class="panel-loading">Загрузка…</div>`;
  if (tab === "overview") return renderAnalytics();
  if (tab === "security") return renderSecurity();
  try {
    config = await api("/api/admin/data");
    if (tab === "home") renderHomeEditor();
    if (tab === "services") renderServicesEditor();
    if (tab === "calculator") renderCalculatorEditor();
    if (tab === "projects") renderProjectsEditor();
  } catch (error) {
    content.innerHTML = `<div class="error-card">${escapeHtml(error.message)}</div>`;
  }
}

async function renderAnalytics() {
  const content = document.querySelector("#dashboard-content");
  try {
    const stats = await api(`/api/admin/analytics?days=${analyticsPeriod}`);
    const previous = stats.previous;
    const changeLabel = (current, before) => {
      if (!before) return current ? "Новый период" : "Без изменений";
      const change = Math.round(((current - before) / before) * 100);
      return `${change > 0 ? "+" : ""}${change}% к предыдущему периоду`;
    };
    const max = Math.max(1, ...stats.daily.map((day) => day.views + day.clicks));
    const bars = stats.daily.map((day) => `
      <div class="chart-column" title="${escapeHtml(day.date)}: ${day.views} просмотров, ${day.clicks} кликов">
        <div class="chart-bars"><span class="chart-view" style="height:${Math.max(2, day.views / max * 100)}%"></span><span class="chart-click" style="height:${Math.max(2, day.clicks / max * 100)}%"></span></div>
        <span class="chart-date">${escapeHtml(day.shortDate)}</span>
      </div>`).join("");
    const pages = stats.topPages.length
      ? stats.topPages.map((item, index) => `<div class="rank-row"><span class="rank-number">${String(index + 1).padStart(2, "0")}</span><span class="rank-title">${escapeHtml(item.path)}</span><b>${formatNumber(item.views)}</b></div>`).join("")
      : `<p class="empty-state">Данные появятся, когда на сайт начнут заходить посетители.</p>`;
    const clicks = stats.topClicks.length
      ? stats.topClicks.map((item, index) => `<div class="rank-row"><span class="rank-number">${String(index + 1).padStart(2, "0")}</span><span class="rank-title"><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.path)}</small></span><b>${formatNumber(item.count)}</b></div>`).join("")
      : `<p class="empty-state">Клики ещё не зарегистрированы.</p>`;
    const recent = stats.recent.length
      ? stats.recent.map((item) => `<tr><td>${escapeHtml(item.time)}</td><td><span class="event-pill ${item.type === "click" ? "event-click" : ""}">${item.type === "click" ? "Клик" : "Просмотр"}</span></td><td>${escapeHtml(item.path)}</td><td>${escapeHtml(item.label || "—")}</td></tr>`).join("")
      : `<tr><td colspan="4" class="empty-state">Событий пока нет.</td></tr>`;
    content.innerHTML = `
      ${mustChangePassword ? `<div class="notice-banner security-warning"><span class="notice-icon">!</span><p>Используется временный пароль. Откройте раздел «Безопасность» и задайте новый пароль длиной не менее 12 символов.</p><button type="button" data-security-link>Сменить пароль →</button></div>` : ""}
      <div class="notice-banner"><span class="notice-icon">i</span><p>Собираем только просмотры страниц и нажатия на ссылки/кнопки. Имена, телефоны, IP-адреса и идентификаторы посетителей не сохраняются.</p></div>
      <section class="analytics-toolbar"><div><p class="section-overline">ПОКАЗАТЕЛИ САЙТА</p><h2>Активность и вовлечённость</h2></div><label>Период <select id="period-select"><option value="7" ${analyticsPeriod === 7 ? "selected" : ""}>7 дней</option><option value="30" ${analyticsPeriod === 30 ? "selected" : ""}>30 дней</option><option value="90" ${analyticsPeriod === 90 ? "selected" : ""}>90 дней</option></select></label></section>
      <section class="metric-grid">
        <article class="metric-card"><span>Просмотры страниц</span><strong>${formatNumber(stats.views)}</strong><small>${changeLabel(stats.views, previous.views)}</small><i>◉</i></article>
        <article class="metric-card"><span>Клики по элементам</span><strong>${formatNumber(stats.clicks)}</strong><small>${changeLabel(stats.clicks, previous.clicks)}</small><i>↗</i></article>
        <article class="metric-card"><span>Доля кликов</span><strong>${stats.clickRate}%</strong><small>Клики от просмотров страниц</small><i>％</i></article>
        <article class="metric-card metric-accent"><span>Переходы по CTA</span><strong>${formatNumber(stats.ctaClicks)}</strong><small>Кнопки и призывы к действию</small><i>✳</i></article>
      </section>
      <section class="analytics-grid">
        <article class="admin-card chart-card"><div class="card-heading"><div><p class="section-overline">ДИНАМИКА</p><h3>Просмотры и клики</h3></div><div class="chart-legend"><span><i></i>Просмотры</span><span><i></i>Клики</span></div></div>        <div class="chart" style="grid-template-columns:repeat(${stats.daily.length},minmax(2px,1fr))">${bars}</div></article>
        <article class="admin-card"><div class="card-heading"><div><p class="section-overline">ПОПУЛЯРНОСТЬ</p><h3>Страницы сайта</h3></div><span class="card-corner">↗</span></div><div class="rank-list">${pages}</div></article>
      </section>
      <section class="analytics-grid lower-grid">
        <article class="admin-card"><div class="card-heading"><div><p class="section-overline">ВЗАИМОДЕЙСТВИЕ</p><h3>Часто нажимают</h3></div></div><div class="rank-list">${clicks}</div></article>
        <article class="admin-card"><div class="card-heading"><div><p class="section-overline">В РЕАЛЬНОМ ВРЕМЕНИ</p><h3>Последние события</h3></div><button class="refresh-button" id="refresh-analytics">Обновить ↻</button></div><div class="table-scroll"><table><thead><tr><th>Время</th><th>Тип</th><th>Страница</th><th>Элемент</th></tr></thead><tbody>${recent}</tbody></table></div></article>
      </section>`;
    document.querySelector("#period-select").addEventListener("change", (event) => {
      analyticsPeriod = Number(event.target.value);
      renderAnalytics();
    });
    document.querySelector("#refresh-analytics").addEventListener("click", renderAnalytics);
    document.querySelector("[data-security-link]")?.addEventListener("click", () => switchTab("security"));
  } catch (error) {
    if (error.status === 401) return showLogin("Сеанс истёк. Войдите снова.");
    content.innerHTML = `<div class="error-card">${escapeHtml(error.message)}</div>`;
  }
}

function field(label, value, path, type = "text", options = {}) {
  const escaped = escapeHtml(value ?? "");
  return `<label class="editor-field${options.wide ? " field-wide" : ""}"><span>${escapeHtml(label)}</span>${options.multiline
    ? `<textarea data-path="${path}" rows="${options.rows || 3}">${escaped}</textarea>`
    : `<input data-path="${path}" type="${type}" value="${escaped}" ${type === "number" ? `min="0" step="${options.step || 1}"` : ""} ${options.required ? "required" : ""} />`}</label>`;
}

function editorHeader(kicker, title, description) {
  return `<div class="editor-intro"><p class="section-overline">${escapeHtml(kicker)}</p><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div>`;
}

function editorActions(section) {
  return `<div class="editor-actions"><span class="save-status" id="save-status" role="status">Изменения публикуются для всех посетителей сайта.</span><button type="button" class="admin-button admin-button-primary" data-save="${section}">Сохранить изменения <span>→</span></button></div>`;
}

function renderHomeEditor() {
  const content = document.querySelector("#dashboard-content");
  content.innerHTML = `${editorHeader("КОНТЕНТ / ГЛАВНАЯ", "Первый экран и показатели", "Правки сохраняются на сервере и отображаются посетителям на главной странице.")}
    <form class="editor-form" data-editor="home"><section class="admin-card editor-card"><div class="card-heading"><div><p class="section-overline">HERO-БЛОК</p><h3>Заголовок и описание</h3></div></div><div class="editor-grid">
      ${field("Метка над заголовком", config.home.eyebrow, "home.eyebrow")}
      ${field("Заголовок — первая строка", config.home.headline, "home.headline")}
      ${field("Слоган — вторая строка", config.home.tagline, "home.tagline")}
      ${field("Описание", config.home.description, "home.description", "text", { wide: true, multiline: true, rows: 4 })}
    </div></section>
    <section class="admin-card editor-card"><div class="card-heading"><div><p class="section-overline">ЦИФРЫ</p><h3>Показатели на главной</h3></div></div><div class="editor-grid stats-editor">${config.home.stats.map((item, index) => `${field(`Показатель ${index + 1}`, item.value, `home.stats.${index}.value`)}${field(`Подпись ${index + 1}`, item.label, `home.stats.${index}.label`)}`).join("")}</div></section>
    ${editorActions("home")}</form>`;
  bindSave("home");
}

function renderServicesEditor() {
  const content = document.querySelector("#dashboard-content");
  content.innerHTML = `${editorHeader("КАТАЛОГ / УСЛУГИ", "Услуги и стартовые цены", "Редактируйте названия, описания и цифры карточек услуг. Нулевой бюджет означает «по запросу».")}
    <form class="editor-form" data-editor="services">${config.services.map((item, index) => `<section class="admin-card editor-card record-card"><div class="record-heading"><span class="record-index">${escapeHtml(item.number)}</span><div><p class="section-overline">${escapeHtml(item.slug)}</p><h3>${escapeHtml(item.title)}</h3></div></div><div class="editor-grid">${field("Название", item.title, `services.${index}.title`, "text", { required: true })}${field("Цена (сом)", item.price, `services.${index}.price`, "number", { required: true })}${field("Подпись цены", item.from, `services.${index}.from`)}${field("Описание", item.description, `services.${index}.description`, "text", { wide: true, multiline: true })}</div></section>`).join("")}
    ${editorActions("services")}</form>`;
  bindSave("services");
}

function renderCalculatorEditor() {
  const content = document.querySelector("#dashboard-content");
  content.innerHTML = `${editorHeader("БИЗНЕС-ПРАВИЛА / РАСЧЁТ", "Цены и калькулятор", "Цены продуктов синхронно обновляются в прайс-листе и калькуляторе. Настройте пакеты камер и дополнительные опции.")}
    <form class="editor-form" data-editor="calculator">
      <section class="admin-card editor-card"><div class="card-heading"><div><p class="section-overline">IT-ПРОЕКТЫ</p><h3>Продукты калькулятора и прайса</h3></div></div><div class="record-table-heading"><span>Название продукта</span><span>Название в прайсе</span><span>Цена, сом</span><span>Срок</span></div>
        ${config.products.map((item, index) => `<div class="product-editor-row"><span class="id-badge">${escapeHtml(item.id)}</span>${field("Продукт", item.title, `products.${index}.title`, "text", { required: true })}${field("Название в прайсе", item.priceLabel, `products.${index}.priceLabel`, "text", { required: true })}${field("Цена (сом)", item.price, `products.${index}.price`, "number", { required: true })}${field("Срок реализации", item.timing, `products.${index}.timing`, "text", { required: true })}</div>`).join("")}
      </section>
      <section class="admin-card editor-card"><div class="card-heading"><div><p class="section-overline">КАМЕРЫ / CCTV</p><h3>Стартовая стоимость комплекта</h3></div></div><div class="editor-grid">${field("4 камеры, сом", config.cameraPricing["4"], "cameraPricing.4", "number", { required: true })}${field("8 камер, сом", config.cameraPricing["8"], "cameraPricing.8", "number", { required: true })}${field("16 камер (пусто — после осмотра)", config.cameraPricing["16"], "cameraPricing.16", "number")}</div><p class="field-hint">Если для конфигурации нет подтверждённой цены, оставьте поле пустым. Тогда калькулятор покажет «После осмотра».</p></section>
      <section class="admin-card editor-card"><div class="card-heading"><div><p class="section-overline">ДОПОЛНИТЕЛЬНЫЕ ОПЦИИ</p><h3>Функции калькулятора</h3></div></div><div class="record-table-heading addon-table"><span>Название функции</span><span>Стоимость, сом</span></div>
        ${config.addOns.map((item, index) => `<div class="addon-editor-row"><span class="id-badge">${escapeHtml(item.id)}</span>${field("Опция", item.title, `addOns.${index}.title`, "text", { required: true })}${field("Стоимость (сом)", item.price, `addOns.${index}.price`, "number", { required: true })}</div>`).join("")}
      </section>
      ${editorActions("calculator")}
    </form>`;
  bindSave("calculator");
}

function renderProjectsEditor() {
  const content = document.querySelector("#dashboard-content");
  content.innerHTML = `${editorHeader("КЕЙСЫ / ПОРТФОЛИО", "Карточки проектов", "Обновляйте карточки кейсов. Категории также формируют фильтры на странице портфолио.")}
    <form class="editor-form" data-editor="projects">${config.projects.map((item, index) => `<section class="admin-card editor-card record-card"><div class="record-heading"><span class="record-index">${String(index + 1).padStart(2, "0")}</span><div><p class="section-overline">ПРОЕКТ ${index + 1}</p><h3>${escapeHtml(item.name)}</h3></div></div><div class="editor-grid">${field("Название проекта", item.name, `projects.${index}.name`)}${field("Категория", item.category, `projects.${index}.category`)}${field("Краткое обозначение", item.id, `projects.${index}.id`)}${field("Срок реализации", item.time, `projects.${index}.time`)}${field("Описание", item.description, `projects.${index}.description`, "text", { wide: true, multiline: true })}${field("Технологии", item.tech, `projects.${index}.tech`, "text", { wide: true })}${field("Функциональность", item.features, `projects.${index}.features`, "text", { wide: true, multiline: true })}</div></section>`).join("")}
    ${editorActions("projects")}</form>`;
  bindSave("projects");
}

function updateAtPath(object, path, value) {
  const parts = path.split(".");
  let target = object;
  for (const part of parts.slice(0, -1)) target = target[part];
  target[parts.at(-1)] = value;
}

function bindSave(section) {
  document.querySelector(`[data-save="${section}"]`).addEventListener("click", async (event) => {
    const button = event.currentTarget;
    const form = button.closest("form");
    if (!form.reportValidity()) return;
    const next = structuredClone(config);
    form.querySelectorAll("[data-path]").forEach((input) => {
      const value = input.type === "number" ? (input.value === "" ? null : Number(input.value)) : input.value.trim();
      updateAtPath(next, input.dataset.path, value);
    });
    button.disabled = true;
    const status = form.querySelector("#save-status");
    status.textContent = "Сохраняем изменения…";
    status.className = "save-status";
    try {
      config = await api("/api/admin/data", { method: "PUT", body: JSON.stringify(next) });
      status.textContent = "Изменения сохранены и опубликованы.";
      status.classList.add("is-saved");
      document.querySelector("#save-status").textContent = status.textContent;
      if (section === "services") renderServicesEditor();
      if (section === "calculator") renderCalculatorEditor();
      if (section === "projects") renderProjectsEditor();
      if (section === "home") renderHomeEditor();
    } catch (error) {
      status.textContent = `Не удалось сохранить: ${error.message}`;
      status.classList.add("is-error");
    } finally {
      const currentButton = form.querySelector(`[data-save="${section}"]`);
      if (currentButton) currentButton.disabled = false;
    }
  });
}

function renderSecurity() {
  const content = document.querySelector("#dashboard-content");
  content.innerHTML = `${editorHeader("ДОСТУП / АУТЕНТИФИКАЦИЯ", "Настройки безопасности", "Задайте новый пароль администратора. Используйте длинную уникальную комбинацию.")}
    <section class="admin-card security-card"><div><p class="section-overline">УЧЁТНАЯ ЗАПИСЬ</p><h3>Сменить пароль</h3><p class="admin-muted">Пароль хранится только в виде стойкого хеша. Новая длина — не менее 12 символов. После смены сохранённая копия текущего пароля больше не подойдёт.</p></div>
    <form id="password-form" class="password-form"><label>Текущий пароль<input name="currentPassword" type="password" autocomplete="current-password" required /></label><label>Новый пароль<input name="newPassword" type="password" minlength="12" autocomplete="new-password" required /></label><label>Повторите новый пароль<input name="confirmPassword" type="password" minlength="12" autocomplete="new-password" required /></label><button class="admin-button admin-button-primary" type="submit">Обновить пароль →</button><p class="login-error" id="password-message" role="status"></p></form>
    <div class="security-facts"><span>Доступен только с этого компьютера</span><span>Сессия закрывается через 8 часов</span><span>Попытки входа ограничены</span><span>Телеметрия не хранит IP и ID посетителей</span></div></section>`;
  document.querySelector("#password-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const message = document.querySelector("#password-message");
    if (values.newPassword !== values.confirmPassword) {
      message.textContent = "Новые пароли не совпадают.";
      return;
    }
    try {
      await api("/api/admin/password", { method: "PUT", body: JSON.stringify({ currentPassword: values.currentPassword, newPassword: values.newPassword }) });
      mustChangePassword = false;
      form.reset();
      message.textContent = "Пароль успешно обновлён.";
      message.className = "login-error is-success";
    } catch (error) {
      message.textContent = error.message;
    }
  });
}

start();
