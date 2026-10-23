import { defaultSiteData } from "./data.js";

const app = document.querySelector("#app");
const savedTheme = localStorage.getItem("it-kerek-theme");
if (savedTheme === "dark") document.body.dataset.theme = "dark";
const numberFormat = new Intl.NumberFormat("ru-RU");
const path = window.location.pathname.replace(/\/+$/, "") || "/";
let siteData = structuredClone(defaultSiteData);
const link = (href, text, className = "") => `<a class="${className}" href="${href}">${text}</a>`;
const money = (amount) => `${numberFormat.format(amount)} сом`;
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}[character]));

function header() {
  const navigation = [
    { href: "/services/", label: "Услуги", active: path === "/services" || path.startsWith("/services/") },
    { href: "/cameras/", label: "Камеры", active: path === "/cameras" },
    { href: "/prices/", label: "Цены", active: path === "/prices" },
    { href: "/portfolio/", label: "Проекты", active: path === "/portfolio" },
  ];
  const themeToggle = `
    <button class="theme-toggle" type="button" aria-label="Включить тёмную тему" title="Включить тёмную тему">
      <span class="theme-icon" aria-hidden="true">☾</span>
    </button>`;
  const menu = `
    <nav class="main-nav" id="main-navigation" aria-label="Основная навигация">
      ${navigation.map(({ href, label, active }) => `<a href="${href}"${active ? ' aria-current="page"' : ""}>${label}</a>`).join("")}
    </nav>`;
  return `
    <header class="site-header" id="top">
      <a class="brand" href="/" aria-label="IT-Kerek — главная">
        <span class="brand-mark brand-mark-logo" aria-hidden="true"><svg viewBox="0 0 64 48" fill="none"><path d="M20 3 3 20l17 17 11-11-6-6-5 5-5-5 11-11 11 11-7 7 6 6 13-13L32 3 20 15 8 27" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="m43 3 17 17-17 17-11-11 6-6 5 5 5-5-11-11-11 11 7 7-6 6L14 20 31 3l12 12 12 12" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/></svg></span>
        <span>IT-KEREK</span>
      </a>
      ${menu}
      <div class="header-actions">
        ${themeToggle}
        <a class="button button-dark header-cta" href="/contact/#consultation" aria-label="Обсудить проект">
          <span class="header-cta-label">Обсудить проект</span><span class="header-cta-short-label">Связаться</span><span aria-hidden="true">→</span>
        </a>
        <button class="menu-toggle" type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="main-navigation">
          <span></span><span></span>
        </button>
      </div>
    </header>`;
}

function footer() {
  const year = new Date().getFullYear();
  return `
    <footer class="site-footer">
      <div class="footer-main">
        <div class="footer-brand-column">
          <a class="brand footer-brand" href="/" aria-label="IT-Kerek — главная">
            <span class="brand-mark" aria-hidden="true">N</span><span>IT-Kerek</span>
          </a>
          <p class="footer-description">IT-KEREK — технологии для бизнеса и современной недвижимости. Разрабатываем цифровые решения, автоматизируем процессы и устанавливаем технологическую инфраструктуру.</p>
          <p class="footer-location"><span aria-hidden="true">⌖</span> Бишкек</p>
        </div>
        <nav class="footer-column" aria-label="Услуги">
          <h2>Услуги</h2>
          ${link("/services/web-development/", "Разработка сайтов")}
          ${link("/services/automation/", "CRM и автоматизация бизнеса")}
          ${link("/cameras/", "Видеонаблюдение")}
          ${link("/services/infrastructure/", "Сети и инфраструктура")}
          ${link("/services/security-systems/", "Домофоны и системы доступа")}
          ${link("/services/bots/", "Telegram-боты")}
          ${link("/services/mobile-development/", "Мобильные приложения")}
        </nav>
        <nav class="footer-column" aria-label="Компания">
          <h2>Компания</h2>
          ${link("/", "Главная")}
          ${link("/portfolio/", "Проекты")}
          ${link("/prices/", "Цены")}
          ${link("/#faq", "Частые вопросы")}
          ${link("/contact/", "Контакты")}
        </nav>
        <div class="footer-column footer-contact">
          <h2>Связаться</h2>
          <p>Обсудите задачу через форму обратной связи.</p>
          ${link("/contact/#consultation", "Обсудить проект <span aria-hidden=\"true\">→</span>", "button button-lime footer-cta")}
        </div>
      </div>
      <div class="footer-bottom">
        <span>© ${year} IT-KEREK</span>
        <span class="footer-note">Бишкек · IT-команда</span>
        <a class="back-to-top" href="#top">Наверх <span aria-hidden="true">↑</span></a>
      </div>
    </footer>`;
}

function faqSection() {
  const questions = [
    {
      question: "Какие услуги предоставляет IT-KEREK?",
      answer: "Мы занимаемся разработкой сайтов и цифровых решений, внедрением CRM-систем, автоматизацией бизнеса, монтажом видеонаблюдения, настройкой сетевой инфраструктуры и установкой домофонов. Подбираем решение под конкретную задачу.",
    },
    {
      question: "Сколько стоят ваши услуги?",
      answer: "Стоимость зависит от объёма работ, сложности проекта и необходимого оборудования. Мы уточним задачу, подготовим подходящий вариант и согласуем стоимость до начала работ.",
    },
    {
      question: "Сколько времени занимает выполнение проекта?",
      answer: "Срок зависит от типа и масштаба проекта. После обсуждения задачи мы определим объём работ, согласуем этапы и сообщим предполагаемые сроки.",
    },
    {
      question: "Вы работаете с бизнесом и частными клиентами?",
      answer: "Да, мы подбираем технологические решения для бизнеса, коммерческих помещений и жилой недвижимости. Конкретный состав работ зависит от вашей задачи.",
    },
    {
      question: "Можно ли заказать несколько услуг одновременно?",
      answer: "Да. Можно объединить разработку сайта, CRM, сетевую инфраструктуру и системы безопасности в рамках одного проекта. Мы поможем определить последовательность работ и совместимость решений.",
    },
    {
      question: "Устанавливаете ли вы видеонаблюдение и домофоны в существующих зданиях?",
      answer: "Да, возможность установки зависит от состояния объекта, существующей проводки, оборудования и требований к системе. Перед началом работ необходимо оценить условия монтажа.",
    },
    {
      question: "Можно ли заказать сайт, Telegram-бота или мобильное приложение?",
      answer: "Да, мы разрабатываем цифровые решения под конкретные задачи. Состав проекта, поддерживаемые платформы, функциональность и сроки согласовываются до начала разработки.",
    },
    {
      question: "Как оставить заявку?",
      answer: "Вы можете воспользоваться кнопкой «Обсудить проект» или существующей формой обратной связи на сайте. Опишите задачу и оставьте актуальные контактные данные, чтобы мы могли связаться с вами.",
    },
  ];
  return `
    <section class="faq-section" id="faq" aria-labelledby="faq-title">
      <div class="faq-inner">
        <div class="faq-heading">
          <p class="eyebrow">FAQ / ПОМОГАЕМ РАЗОБРАТЬСЯ</p>
          <h2 id="faq-title">Частые вопросы</h2>
          <p>Ответы на главные вопросы о наших услугах, стоимости и процессе работы.</p>
        </div>
        <div class="faq-list">
          ${questions.map((item, index) => {
            const answerId = `faq-answer-${index + 1}`;
            return `
              <article class="faq-item">
                <h3>
                  <button class="faq-question" type="button" aria-expanded="false" aria-controls="${answerId}">
                    <span>${escapeHtml(item.question)}</span><span class="faq-indicator" aria-hidden="true"></span>
                  </button>
                </h3>
                <div class="faq-answer" id="${answerId}" hidden><p>${escapeHtml(item.answer)}</p></div>
              </article>`;
          }).join("")}
        </div>
        <div class="faq-cta-row">
          <p>Не нашли ответ на свой вопрос?</p>
          ${link("/contact/#consultation", "Обсудить проект →", "button button-lime")}
        </div>
      </div>
    </section>`;
}

function pageIntro(label, title, description) {
  return `<section class="page-intro wrap">
    <p class="eyebrow">${label}</p>
    <h1>${title}</h1>
    <p class="intro-copy">${description}</p>
  </section>`;
}

function homePage() {
  return `
    <main>
      <section class="hero home-hero">
        <div class="hero-copy">
          <p class="eyebrow">${escapeHtml(siteData.home.eyebrow)}</p>
          <h1><span class="hero-slogan">${escapeHtml(siteData.home.headline)}</span> <em>${escapeHtml(siteData.home.tagline)}</em></h1>
          <p class="lead">${escapeHtml(siteData.home.description)}</p>
          <div class="hero-actions">
            ${link("#services", "Выбрать решение <span>→</span>", "button button-dark")}
            ${link("/contact/#consultation", "Обсудить задачу ↗", "button button-outline")}
          </div>
          <div class="stats">${siteData.home.stats.map((item) => `<span><b>${escapeHtml(item.value)}</b> ${escapeHtml(item.label)}</span>`).join("")}</div>
        </div>
        <div class="hero-visual">
          <img class="hero-photo-backdrop" src="/assets/smart-building-photo.jpg" alt="" aria-hidden="true" width="735" height="686" />
          <img class="hero-photo-detail" src="/assets/smart-building-photo.jpg" alt="" aria-hidden="true" width="735" height="686" />
          <nav class="visual-links" aria-label="Направления IT-Kerek">
            ${link("/cameras/", '<span class="visually-hidden">Видеонаблюдение</span>', "hotspot hotspot-camera")}
            ${link("/services/automation/", '<span class="visually-hidden">CRM и автоматизация</span>', "hotspot hotspot-crm")}
            ${link("/services/web-development/", '<span class="visually-hidden">Разработка и IT-решения</span>', "hotspot hotspot-development")}
            ${link("/services/security-systems/", '<span class="visually-hidden">Домофоны и системы доступа</span>', "hotspot hotspot-access")}
            ${link("/cameras/", '<span class="visually-hidden">Камеры</span>', "hotspot hotspot-cameras-tab")}
            ${link("/services/infrastructure/", '<span class="visually-hidden">Сети</span>', "hotspot hotspot-networks-tab")}
            ${link("/services/automation/", '<span class="visually-hidden">CRM</span>', "hotspot hotspot-crm-tab")}
          </nav>
        </div>
      </section>
      <section class="section wrap" id="services">
        <div class="section-heading"><div><p class="eyebrow">01 / НАПРАВЛЕНИЯ</p><h2>Чем можем помочь</h2></div><p>Выберите направление — внутри примеры, состав работ и расчёт.</p></div>
        <div class="feature-grid">
          ${homeServiceCard("01", "CCTV", "/cameras/", "Камеры и безопасность", "Подбор, монтаж, архив и доступ с телефона.", siteData.cameraPricing["4"] ? `от ${money(siteData.cameraPricing["4"])}` : "точная смета после осмотра")}
          ${homeServiceCard("02", "WEB", "/services/web-development/", "Сайты и сервисы", "Лендинги, магазины и личные кабинеты.", siteData.services.find((item) => item.slug === "web-development")?.from || "по запросу")}
          ${homeServiceCard("03", "NETWORK", "/services/infrastructure/", "Сети и инфраструктура", "Wi-Fi, серверы, VPN и поддержка офиса.", siteData.services.find((item) => item.slug === "infrastructure")?.from || "по запросу")}
          ${homeServiceCard("04", "SYSTEMS", "/services/automation/", "CRM и автоматизация", "Заявки, продажи и контроль в одной системе.", siteData.services.find((item) => item.slug === "automation")?.from || "по запросу")}
        </div>
        <div class="section-link"><span>${siteData.services.length} категорий доступны в каталоге</span>${link("/services/", "Все услуги →")}</div>
      </section>
      <section class="section wrap result-section">
        <div class="section-heading"><div><p class="eyebrow">02 / РЕЗУЛЬТАТ</p><h2>Не презентация, а рабочая система</h2></div><p>Проектируем, устанавливаем, запускаем и поддерживаем после сдачи.</p></div>
        <div class="result-links">
          ${link("/cameras/#camera-calc", "<span>01</span> Рассчитать камеры <b>→</b>")}
          ${link("/prices/#project-calculator", "<span>02</span> Рассчитать IT-проект <b>→</b>")}
          ${link("/portfolio/", "<span>03</span> Посмотреть проекты <b>→</b>")}
        </div>
      </section>
      <section class="cta-band wrap"><div><p class="eyebrow">ЕСТЬ ЗАДАЧА?</p><h2>Покажем решение и цену.</h2></div>${link("/contact/#consultation", "Обсудить проект →", "button button-light")}</section>
    </main>`;
}

function homeServiceCard(number, category, href, title, description, price) {
  return `<a class="feature-card${category === "CCTV" ? " feature-card-camera" : ""}" href="${href}"><span class="card-kicker">${number} <i>${category}</i></span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p><b>${escapeHtml(price)} <span>↗</span></b></a>`;
}

function servicesPage() {
  const cards = siteData.services.map((service) => `
    <article class="service-card">
      <span class="service-number">${escapeHtml(service.number)}</span>
      <h2>${link(`/services/${service.slug}/`, escapeHtml(service.title))}</h2>
      <p>${escapeHtml(service.description)}</p>
      ${link(`/services/${service.slug}/`, "Подробнее →", "text-link")}
    </article>`).join("");
  return `<main>
    ${pageIntro("УСЛУГИ / 8 НАПРАВЛЕНИЙ", "Выберите нужное решение", "Каждое направление открывается отдельно: состав работ, сроки, цена и форма заказа.")}
    <div class="wrap">
      <a class="priority-card" href="/cameras/">
        <div class="priority-copy"><p class="eyebrow">ПРИОРИТЕТНОЕ НАПРАВЛЕНИЕ</p><h2>Монтаж камер и систем безопасности</h2><p>Осмотр объекта, оборудование, монтаж, архив и доступ с телефона.</p><b>Рассчитать камеры →</b></div>
        <img src="https://nova-code-bishkek.nova-code-kg.workers.dev/cctv-installation-hero.png" alt="Монтаж камеры видеонаблюдения" />
      </a>
      <section class="service-grid">${cards}</section>
    </div>
  </main>`;
}

function pricesPage() {
  const rowsData = [
    { title: "Видеонаблюдение на 4 камеры", price: siteData.cameraPricing[4], href: "/cameras/" },
    ...siteData.products.map((product) => ({ title: product.priceLabel || product.title, price: product.price, product: product.id })),
  ];
  const rows = rowsData.map((item) => {
    const action = item.href
      ? link(item.href, "Заказать →", "text-link")
      : link(`/prices/?product=${item.product}#project-calculator`, "Заказать →", "text-link");
    const priceLabel = item.price ? `от ${money(item.price)}` : "После осмотра";
    return `<div class="price-row"><strong>${escapeHtml(item.title)}</strong><b>${priceLabel}</b>${action}</div>`;
  }).join("");
  const productButtons = siteData.products.map((product) => `
    <button type="button" class="choice-button product-choice" data-product="${product.id}" aria-pressed="${product.id === "corporate"}">
      <span>${product.title}</span><b>от ${money(product.price)}</b>
    </button>`).join("");
  const options = siteData.addOns.map((option) => `
    <label class="option-row">
      <input type="checkbox" name="addon" value="${option.id}" ${option.id === "admin" ? "checked" : ""} />
      <span class="custom-check" aria-hidden="true">✓</span>
      <span class="option-title">${option.title}</span>
      <b>+ ${money(option.price)}</b>
    </label>`).join("");
  return `<main>
    ${pageIntro("PRICING / БЕЗ СКРЫТЫХ ПУНКТОВ", "Стоимость услуг", "Стартовые цены для планирования бюджета. Точную смету фиксируем после обсуждения или осмотра объекта.")}
    <section class="wrap price-list">
      <div class="price-head"><span>Услуга</span><span>Цена</span><span>Действие</span></div>
      ${rows}
    </section>
    <section class="wrap calculator-section" id="project-calculator">
      <div class="section-heading calculator-heading">
        <div><p class="eyebrow">РАСЧЁТ / IT-ПРОЕКТ</p><h2>Быстрый расчёт</h2></div>
        <p>Выберите тип проекта и функции — ориентир изменится прямо на странице.</p>
      </div>
      <div class="calculator-layout">
        <div class="calculator-options">
          <p class="eyebrow">01 / ЧТО РАЗРАБАТЫВАЕМ</p>
          <div class="choice-list" role="group" aria-label="Тип проекта">${productButtons}</div>
          <p class="eyebrow addon-label">02 / ДОПОЛНИТЕЛЬНО</p>
          <div class="option-list">${options}</div>
        </div>
        <aside class="estimate-card" aria-live="polite">
          <p class="eyebrow">ВАШ ОРИЕНТИР</p>
          <span class="estimate-label">Предварительная стоимость</span>
          <strong class="estimate-total" id="estimate-total"></strong>
          <div class="estimate-divider"></div>
          <span class="estimate-label">Срок реализации</span><b class="estimate-time" id="estimate-time"></b>
          <div class="estimate-divider"></div>
          <span class="estimate-label">В расчёт входит</span><ul class="estimate-items" id="estimate-items"></ul>
          ${link("/contact/#consultation", "Получить точный расчёт →", "button button-lime estimate-cta")}
          <small>Предварительная оценка. Итоговая смета зависит от состава и требований проекта.</small>
        </aside>
      </div>
    </section>
    <section class="wrap no-match"><div><p class="eyebrow">НУЖНО ИНДИВИДУАЛЬНОЕ РЕШЕНИЕ?</p><h2>Не нашли нужный вариант?</h2><p>Опишите задачу своими словами — предложим состав первой версии и бюджет.</p></div>${link("/contact/#consultation", "Обсудить проект →", "button button-dark")}</section>
  </main>`;
}

function portfolioPage() {
  const categories = ["Все", ...new Set(siteData.projects.map((project) => project.category))];
  const filters = categories.map((category) => `<button type="button" class="filter-button${category === "Все" ? " is-active" : ""}" data-filter="${category}" aria-pressed="${category === "Все"}">${category}</button>`).join("");
  const cards = siteData.projects.map((project) => `<article class="project-card" data-category="${escapeHtml(project.category)}">
    <p class="eyebrow">${escapeHtml(project.id)}</p><h2>${escapeHtml(project.name)}</h2><p>${escapeHtml(project.description)}</p>
    <dl><div><dt>Технологии</dt><dd>${escapeHtml(project.tech)}</dd></div><div><dt>Срок</dt><dd>${escapeHtml(project.time)}</dd></div><div><dt>Функционал</dt><dd>${escapeHtml(project.features)}</dd></div></dl>
    <span class="project-unavailable">Ссылка на проект недоступна</span>
  </article>`).join("");
  return `<main>${pageIntro("PORTFOLIO / 2026", "Решения в работе", "Отдельные кейсы по разработке, автоматизации и инфраструктуре.")}
    <section class="wrap portfolio-section"><div class="filters" role="group" aria-label="Фильтр проектов">${filters}</div><div class="project-grid">${cards}</div></section>
  </main>`;
}

function camerasPage() {
  return `<main>
    <section class="camera-hero wrap">
      <div><p class="eyebrow">CCTV / БИШКЕК</p><h1>Камеры под ключ</h1><p class="intro-copy">Осмотр объекта, оборудование, монтаж, архив и просмотр с телефона.</p>
      <div class="hero-actions">${link("#camera-calc", "Рассчитать стоимость →", "button button-dark")}<span class="guarantee">Гарантия на монтаж · 12 месяцев</span></div></div>
      <div class="camera-image"><img src="https://nova-code-bishkek.nova-code-kg.workers.dev/cctv-installation-hero.png" alt="Монтаж видеонаблюдения на коммерческом объекте" /><span class="image-tag">CAMERA 01 · LIVE</span></div>
    </section>
    <section class="wrap camera-calc" id="camera-calc">
      <div class="section-heading"><div><p class="eyebrow">01 / КАЛЬКУЛЯТОР</p><h2>Смета за минуту</h2></div><p>Выберите объект и количество камер. Покажем ориентир вместе с монтажом.</p></div>
      <div class="camera-calc-layout">
        <div class="camera-controls">
          <p class="eyebrow">01 / ТИП ОБЪЕКТА</p>
          <div class="segmented" role="group" aria-label="Тип объекта">${["Магазин", "Офис", "Склад"].map((x, i) => `<button type="button" data-object="${x}" aria-pressed="${i === 0}">${x}</button>`).join("")}</div>
          <p class="eyebrow">02 / КОЛИЧЕСТВО КАМЕР</p>
          <div class="segmented" role="group" aria-label="Количество камер">${[4, 8, 16].map((x, i) => `<button type="button" data-cameras="${x}" aria-pressed="${i === 0}">${x} ${x === 4 ? "камеры" : "камер"}</button>`).join("")}</div>
          <p class="eyebrow included-label">УЖЕ ВХОДИТ</p>
          <ul class="included-items" id="camera-items"></ul>
        </div>
        <aside class="estimate-card camera-estimate" aria-live="polite"><p class="eyebrow">ВАШ ОРИЕНТИР</p><span class="estimate-label">Ориентировочная стоимость</span><strong class="estimate-total" id="camera-total"></strong><div class="estimate-divider"></div><span class="estimate-label">Срок монтажа</span><b class="estimate-time" id="camera-time"></b>${link("/contact/#consultation", "Получить точную смету →", "button button-lime estimate-cta")}</aside>
      </div>
    </section>
    <section class="wrap steps-section"><div class="section-heading"><div><p class="eyebrow">02 / ЧТО ПОЛУЧИТЕ</p><h2>От проекта до гарантии</h2></div></div><div class="steps-grid">
      <article><b>01</b><h3>Проект</h3><p>Определяем зоны обзора и точки монтажа.</p></article><article><b>02</b><h3>Монтаж</h3><p>Прокладываем кабель аккуратно и без лишних коробов.</p></article><article><b>03</b><h3>Доступ</h3><p>Настраиваем телефон, архив и права сотрудников.</p></article><article><b>04</b><h3>Гарантия</h3><p>Проверяем систему и остаёмся на связи после запуска.</p></article>
    </div></section>
  </main>`;
}

function serviceDetailPage(slug) {
  const service = siteData.services.find((item) => item.slug === slug);
  if (!service) return notFoundPage();
  return `<main>${pageIntro(`УСЛУГА / ${service.number}`, service.title, service.description)}
    <section class="wrap detail-panel"><div><p class="eyebrow">СОСТАВ РАБОТ</p><h2>Решение под задачу бизнеса</h2><p>Обсудим требования, подберём подходящий состав работ и подготовим прозрачную смету до начала проекта.</p></div><div class="detail-price"><span>Стартовая стоимость</span><b>${service.price ? `от ${money(service.price)}` : "Точная стоимость после обсуждения"}</b>${link(`/contact/?service=${encodeURIComponent(service.title)}#consultation`, "Обсудить задачу →", "button button-dark")}</div></section>
    <section class="wrap steps-section"><div class="section-heading"><div><p class="eyebrow">КАК МЫ РАБОТАЕМ</p><h2>Понятные этапы</h2></div></div><div class="steps-grid"><article><b>01</b><h3>Задача</h3><p>Уточняем цели и требования проекта.</p></article><article><b>02</b><h3>План</h3><p>Согласуем решение, состав работ и сроки.</p></article><article><b>03</b><h3>Реализация</h3><p>Выполняем работы и показываем результат.</p></article><article><b>04</b><h3>Запуск</h3><p>Передаём решение и остаёмся на связи.</p></article></div></section>
  </main>`;
}

function contactPage() {
  const params = new URLSearchParams(window.location.search);
  const service = params.get("service") || "";
  const product = siteData.products.find((item) => item.id === params.get("product"));
  const selectedAddOns = (params.get("addons") || "").split(",")
    .map((id) => siteData.addOns.find((item) => item.id === id))
    .filter(Boolean);
  const context = service
    ? service
    : product
      ? [
          `Продукт: ${product.title}`,
          selectedAddOns.length ? `Дополнительно: ${selectedAddOns.map((item) => item.title).join(", ")}` : "",
          `Предварительная стоимость: ${money(product.price + selectedAddOns.reduce((sum, item) => sum + item.price, 0))}`,
          `Срок: ${product.timing}`,
        ].filter(Boolean).join("\n")
      : "";
  return `<main>${pageIntro("КОНТАКТЫ / БИШКЕК", "Обсудим ваш проект", "Оставьте контакты и коротко опишите задачу.")}
    <section class="wrap contact-layout" id="consultation">
      <div class="contact-note"><p class="eyebrow">СЛЕДУЮЩИЙ ШАГ</p><h2>Разберём задачу и предложим решение.</h2><p>Контактные данные команды в исходных материалах не указаны, поэтому здесь не размещены неподтверждённые номера и аккаунты.</p></div>
      <form class="contact-form" id="lead-form">
        <label>Имя<input name="name" autocomplete="name" required /></label>
        <label>Телефон / WhatsApp<input name="phone" autocomplete="tel" type="tel" required /></label>
        <label>Email<input name="email" autocomplete="email" type="email" /></label>
        <label>Комментарий<textarea name="message" rows="4">${context ? `Интересует:\n${escapeHtml(context)}` : ""}</textarea></label>
        <button class="button button-dark" type="submit">Отправить заявку <span>→</span></button>
        <p class="form-status" id="form-status" role="status">Отправка заявок пока не подключена к серверу. Форма не сохранит ваши данные.</p>
      </form>
    </section>
  </main>`;
}

function notFoundPage() {
  return `<main>${pageIntro("404 / СТРАНИЦА НЕ НАЙДЕНА", "Такой страницы нет", "Проверьте адрес или вернитесь на главную.")}<div class="wrap not-found">${link("/", "На главную →", "button button-dark")}</div></main>`;
}

function renderPage() {
  if (path === "/calculator") {
    window.location.replace("/prices/#project-calculator");
    return "";
  }
  if (path === "/") return homePage();
  if (path === "/services") return servicesPage();
  if (path === "/prices") return pricesPage();
  if (path === "/portfolio") return portfolioPage();
  if (path === "/cameras") return camerasPage();
  if (path === "/contact") return contactPage();
  if (path.startsWith("/services/")) return serviceDetailPage(path.split("/").filter(Boolean).at(-1));
  return notFoundPage();
}

async function loadSiteData() {
  try {
    const response = await fetch("/api/public-data");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const remoteData = await response.json();
    if (!Array.isArray(remoteData.services) || !Array.isArray(remoteData.products)) {
      throw new Error("Сервер вернул некорректные данные сайта.");
    }
    siteData = { ...siteData, ...remoteData };
  } catch (error) {
    console.warn("Не удалось загрузить сохранённые настройки сайта; используется встроенная версия.", error);
  }
}

async function startSite() {
  await loadSiteData();
  const pageContent = renderPage();
  if (!pageContent) return;
  app.innerHTML = `${header()}${pageContent}${faqSection()}${footer()}`;
  document.title = path === "/" ? "IT-Kerek — IT-услуги и видеонаблюдение в Бишкеке" : `${path === "/prices" ? "Цены" : path === "/services" ? "Услуги" : path === "/portfolio" ? "Проекты" : path === "/cameras" ? "Видеонаблюдение" : path === "/contact" ? "Контакты" : "Услуга"} — IT-Kerek`;
  initializeCalculators();
  initializePortfolio();
  initializeFaq();
  initializeForm();
  preselectProduct();
  initializeTheme();
  initializeHeader();
  initializeAnalytics();
}

startSite();

function initializeFaq() {
  const items = document.querySelectorAll(".faq-item");
  items.forEach((item) => {
    const button = item.querySelector(".faq-question");
    const answer = item.querySelector(".faq-answer");
    button.addEventListener("click", () => {
      const shouldExpand = button.getAttribute("aria-expanded") !== "true";
      items.forEach((otherItem) => {
        const otherButton = otherItem.querySelector(".faq-question");
        const otherAnswer = otherItem.querySelector(".faq-answer");
        const expanded = otherItem === item && shouldExpand;
        otherButton.setAttribute("aria-expanded", String(expanded));
        otherAnswer.hidden = !expanded;
      });
    });
  });
}

function initializeAnalytics() {
  const sendEvent = (type, label = "") => {
    const payload = JSON.stringify({
      type,
      path: window.location.pathname,
      label: label.slice(0, 80),
      timestamp: new Date().toISOString(),
    });
    const body = new Blob([payload], { type: "application/json" });
    if (!navigator.sendBeacon("/api/analytics", body)) {
      fetch("/api/analytics", { method: "POST", body, keepalive: true }).catch((error) => {
        console.warn("Не удалось сохранить обезличенное событие аналитики.", error);
      });
    }
  };

  sendEvent("page_view");
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const control = event.target.closest("a, button");
    if (!control || control.closest("#lead-form")) return;
    const label = (control.textContent || control.getAttribute("aria-label") || "")
      .replace(/\s+/g, " ")
      .trim();
    if (label) sendEvent("click", label);
  }, { capture: true });
}

function initializeTheme() {
  const toggle = document.querySelector(".theme-toggle");
  if (!toggle) return;

  const theme = document.body.dataset.theme === "dark" ? "dark" : "light";
  document.body.dataset.theme = theme;

  const updateToggle = () => {
    const isDark = document.body.dataset.theme === "dark";
    toggle.setAttribute("aria-pressed", String(isDark));
    toggle.querySelector(".theme-icon").textContent = isDark ? "☀" : "☾";
    toggle.setAttribute("aria-label", isDark ? "Включить светлую тему" : "Включить тёмную тему");
    toggle.title = isDark ? "Включить светлую тему" : "Включить тёмную тему";
  };

  updateToggle();
  toggle.addEventListener("click", () => {
    const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
    document.body.dataset.theme = nextTheme;
    localStorage.setItem("it-kerek-theme", nextTheme);
    updateToggle();
  });
}

function initializeHeader() {
  const headerElement = document.querySelector(".site-header");
  const menuToggle = headerElement.querySelector(".menu-toggle");
  const closeMenu = () => {
    headerElement.classList.remove("is-menu-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Открыть меню");
  };

  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") !== "true";
    headerElement.classList.toggle("is-menu-open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Закрыть меню" : "Открыть меню");
  });
  headerElement.querySelectorAll(".main-nav a").forEach((navigationLink) => {
    navigationLink.addEventListener("click", closeMenu);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
}

function initializeCalculators() {
  const total = document.querySelector("#estimate-total");
  if (total) {
    const update = () => {
      const product = siteData.products.find((item) => item.id === document.querySelector(".product-choice[aria-pressed='true']")?.dataset.product);
      if (!product) return;
      const selected = [...document.querySelectorAll("input[name='addon']:checked")].map((input) => siteData.addOns.find((item) => item.id === input.value)).filter(Boolean);
      total.textContent = money(product.price + selected.reduce((sum, item) => sum + item.price, 0));
      document.querySelector("#estimate-time").textContent = product.timing;
      document.querySelector("#estimate-items").innerHTML = [`<li>${product.title}</li>`, ...selected.map((item) => `<li>${item.title}</li>`)].join("");
      const cta = document.querySelector(".estimate-cta");
      cta.href = `/contact/?product=${product.id}&addons=${selected.map((item) => item.id).join(",")}#consultation`;
    };
    document.querySelectorAll(".product-choice").forEach((button) => button.addEventListener("click", () => {
      document.querySelectorAll(".product-choice").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      update();
    }));
    document.querySelectorAll("input[name='addon']").forEach((input) => input.addEventListener("change", update));
    update();
  }

  const cameraTotal = document.querySelector("#camera-total");
  if (cameraTotal) {
    const updateCamera = () => {
      const cameras = Number(document.querySelector("[data-cameras][aria-pressed='true']")?.dataset.cameras || 4);
      const object = document.querySelector("[data-object][aria-pressed='true']")?.dataset.object || "Магазин";
      const priceByCount = siteData.cameraPricing;
      const price = priceByCount[cameras];
      cameraTotal.textContent = price ? `от ${money(price)}` : "После осмотра";
      document.querySelector("#camera-time").textContent = cameras === 8 ? "1–2 дня" : "Уточним после осмотра";
      const components = [`${cameras} ${cameras === 4 ? "камеры" : "камер"} 4MP`, "регистратор и диск", "кабель и монтаж", "настройка телефона"];
      document.querySelector("#camera-items").innerHTML = components.map((item) => `<li>${item}</li>`).join("");
      const priceLabel = price ? `ориентир ${money(price)}` : "нужен расчёт после осмотра";
      document.querySelector(".camera-estimate .estimate-cta").href = `/contact/?service=${encodeURIComponent(`Видеонаблюдение: ${object}, ${cameras} камер, ${priceLabel}`)}#consultation`;
    };
    document.querySelectorAll("[data-cameras], [data-object]").forEach((button) => button.addEventListener("click", () => {
      const selector = button.hasAttribute("data-cameras") ? "[data-cameras]" : "[data-object]";
      document.querySelectorAll(selector).forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      updateCamera();
    }));
    updateCamera();
  }
}

function preselectProduct() {
  const productId = new URLSearchParams(window.location.search).get("product");
  if (!productId || !document.querySelector(".product-choice")) return;
  const button = [...document.querySelectorAll(".product-choice")].find((item) => item.dataset.product === productId);
  if (button) {
    document.querySelectorAll(".product-choice").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    button.click();
  }
}

function initializePortfolio() {
  const filters = document.querySelectorAll("[data-filter]");
  filters.forEach((filter) => filter.addEventListener("click", () => {
    const category = filter.dataset.filter;
    filters.forEach((item) => {
      const active = item === filter;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll(".project-card").forEach((card) => {
      card.hidden = category !== "Все" && card.dataset.category !== category;
    });
  }));
}

function initializeForm() {
  const form = document.querySelector("#lead-form");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const status = document.querySelector("#form-status");
    status.textContent = "Заявка не отправлена: сервер обработки заявок не настроен. Введённые данные остались только в этой вкладке.";
    status.classList.add("form-status-error");
  });
}
