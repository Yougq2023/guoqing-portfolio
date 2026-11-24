// ==========================================================================
// BLACK × LAVA ORANGE PORTFOLIO RUNTIME (REAL MEDIA EDITION)
// ==========================================================================

(async function () {
  const profile = window.PORTFOLIO_PROFILE;
  let allProjects = [];
  let featuredProjects = [];
  let archiveProjects = [];
  let lightboxImages = [];
  let lightboxIndex = 0;

  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  // 1. Hydrate Profile
  setText("navMonogram", profile.monogram);
  setText("heroSubtitle", profile.heroSubtitle);
  setText("aboutLead", profile.aboutLead);
  setText("aboutBio", profile.aboutBio);
  setText("contactPhone", profile.contact.phoneDisplay);
  setText("footerName", profile.name);
  const qrImg = document.getElementById("contactQrImg");
  if (qrImg && profile.contact.qrImage) qrImg.src = profile.contact.qrImage;

  // Endorsement bar
  document.getElementById("endorsementBar").innerHTML = profile.endorsements
    .map((b) => `<div class="endorsement-item">${b}</div>`)
    .join("");

  // Client tags
  document.getElementById("clientTags").innerHTML = profile.clients
    .map((c) => `<span class="micro-tag">${c}</span>`)
    .join("");

  // Experience
  document.getElementById("experienceList").innerHTML = profile.experience
    .map(
      (item) => `
      <li class="experience-item">
        <span class="experience-item__year">${item.year}</span>
        <span class="experience-item__role">${item.role}</span>
        <span class="experience-item__org">${item.org}</span>
      </li>
    `
    )
    .join("");

  // Capabilities (with center fiery orange highlight card)
  document.getElementById("capabilitiesGrid").innerHTML = profile.capabilities
    .map(
      (c) => `
      <article class="capability-card ${c.featured ? "capability-card--highlight" : ""} reveal">
        <span class="capability-card__idx">${c.index}</span>
        <h3 class="capability-card__title">${c.title}</h3>
        <span class="capability-card__en">${c.en}</span>
        <p class="capability-card__desc">${c.desc}</p>
        <div class="tag-row">
          ${c.tags.map((t) => `<span class="micro-tag">${t}</span>`).join("")}
        </div>
      </article>
    `
    )
    .join("");

  // 2. Load Portfolio Manifest (Local API first, automatic fallback to Static JSON)
  let isStaticMode = false;
  try {
    let res = await fetch("/api/portfolio");
    if (!res.ok) throw new Error("No local API");
    const data = await res.json();
    featuredProjects = data.featured || [];
    archiveProjects = data.archive || [];
    allProjects = [...featuredProjects, ...archiveProjects];
    setText("metricProjects", `${data.meta.totalProjects}+`);
    setText("metricImages", `${data.meta.totalImages}+`);
    setText("metricVideos", `${data.meta.totalVideos}`);
  } catch {
    isStaticMode = true;
    try {
      const res = await fetch(`./portfolio-data.json?t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      featuredProjects = data.featured || [];
      archiveProjects = data.archive || [];
      allProjects = [...featuredProjects, ...archiveProjects];
      setText("metricProjects", `${data.meta.totalProjects}+`);
      setText("metricImages", `${data.meta.totalImages}+`);
      setText("metricVideos", `${data.meta.totalVideos}`);
    } catch (err) {
      console.error("Failed to load portfolio data:", err);
    }
  }

  // 3. Render Featured 10 Works
  const worksGrid = document.getElementById("worksGrid");
  const filterBar = document.getElementById("filterBar");

  function formatCounts(counts) {
    const parts = [];
    if (counts.videos > 0) parts.push(`${counts.videos} 视频`);
    if (counts.images > 0) parts.push(`${counts.images} 图`);
    return parts.join(" · ") || "ARCHIVE";
  }

  function renderFeatured(filter = "all") {
    const list =
      filter === "all"
        ? featuredProjects
        : featuredProjects.filter((p) => p.categories.includes(filter));

    worksGrid.innerHTML = list
      .map((p) => {
        const isWide = filter === "all" && p.span === "wide";
        const hasVideo = p.media.counts.videos > 0;
        let coverHtml = "";
        if (p.media.coverImage) {
          coverHtml = `<img src="${p.media.coverImage}" alt="${p.title}" loading="lazy" />`;
        } else if (p.media.coverVideo) {
          coverHtml = `<video src="${p.media.coverVideo}#t=2" muted playsinline preload="metadata" loop></video>`;
        } else {
          coverHtml = `
            <div class="video-reel-cover">
              <span class="video-reel-cover__tag">FILM REEL // ${p.year}</span>
              <strong class="video-reel-cover__title">${p.client}</strong>
              <span class="video-reel-cover__sub">${p.subtitle}</span>
            </div>
          `;
        }

        return `
          <article class="work-card ${isWide ? "work-card--wide" : ""}" data-id="${p.id}" tabindex="0" role="button" aria-label="查看项目 ${p.title}">
            <div class="work-card__media">
              ${coverHtml}
              <div class="work-card__overlay">
                <div class="work-card__top-tags">
                  <span class="pill-tag">${p.categoryLabel}</span>
                  <span class="work-card__counts">${formatCounts(p.media.counts)}</span>
                </div>
                ${hasVideo ? `<span class="work-card__play-badge">▶ 含可播成片</span>` : ""}
              </div>
            </div>
            <div class="work-card__body">
              <div class="work-card__meta">
                <span>NO.${p.index}</span>
                <span>${p.year}</span>
              </div>
              <h3 class="work-card__title">${p.title}</h3>
              <p class="work-card__subtitle">${p.subtitle}</p>
              <span class="work-card__cta">进入项目档案 →</span>
            </div>
          </article>
        `;
      })
      .join("");

    worksGrid.querySelectorAll(".work-card").forEach((card) => {
      const vid = card.querySelector("video");
      if (vid) {
        card.addEventListener("mouseenter", () => vid.play().catch(() => {}));
        card.addEventListener("mouseleave", () => vid.pause());
      }
      card.addEventListener("click", () => openModal(card.dataset.id));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openModal(card.dataset.id);
        }
      });
    });
  }

  filterBar.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    filterBar.querySelectorAll(".filter-btn").forEach((b) => {
      b.classList.remove("is-active");
      b.setAttribute("aria-selected", "false");
    });
    btn.classList.add("is-active");
    btn.setAttribute("aria-selected", "true");
    renderFeatured(btn.dataset.filter);
  });

  renderFeatured("all");

  // 4. Render Complete Archive List
  const archiveList = document.getElementById("archiveList");
  archiveList.innerHTML = archiveProjects
    .map(
      (p) => `
      <div class="archive-row" data-id="${p.id}" tabindex="0" role="button">
        <span class="archive-row__idx">${p.index}</span>
        <div class="archive-row__thumb">
          ${p.media.coverImage ? `<img src="${p.media.coverImage}" alt="${p.title}" loading="lazy" />` : ""}
        </div>
        <span class="archive-row__title">${p.title}</span>
        <span class="archive-row__tag">${p.categoryLabel}</span>
        <span class="archive-row__action">${formatCounts(p.media.counts)} ↗</span>
      </div>
    `
    )
    .join("");

  archiveList.querySelectorAll(".archive-row").forEach((row) => {
    row.addEventListener("click", () => openModal(row.dataset.id));
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openModal(row.dataset.id);
      }
    });
  });

  // 5. Project Detail Modal
  const modal = document.getElementById("projectModal");
  const modalBackdrop = document.getElementById("modalBackdrop");
  const modalClose = document.getElementById("modalClose");
  const videoSection = document.getElementById("modalVideoSection");
  const videoPlayer = document.getElementById("modalVideoPlayer");
  const videoPlaylist = document.getElementById("modalVideoPlaylist");
  const gallerySection = document.getElementById("modalGallerySection");
  const galleryGrid = document.getElementById("modalGalleryGrid");

  function openModal(projectId) {
    const p = allProjects.find((item) => item.id === projectId);
    if (!p) return;

    setText("modalIndex", `ARCHIVE // ${p.index}`);
    setText("modalCategory", p.categoryLabel);
    setText("modalYear", p.year);
    setText("modalTitle", p.title);
    setText("modalSubtitle", p.subtitle);
    setText("modalSummary", p.summary);
    setText("modalClient", p.client);
    setText("modalRole", p.role);

    document.getElementById("modalHighlights").innerHTML = p.highlights
      .map((h) => `<li>${h}</li>`)
      .join("");
    document.getElementById("modalTools").innerHTML = p.tools
      .map((t) => `<span class="micro-tag">${t}</span>`)
      .join("");

    const videoStage = document.querySelector(".video-stage");

    function renderVideoItem(v) {
      if (v.embedUrl) {
        videoStage.innerHTML = `<iframe src="${v.embedUrl}" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true" referrerpolicy="no-referrer" style="width:100%;height:100%;border:0;"></iframe>`;
      } else if (v.url) {
        videoStage.innerHTML = `<video id="modalVideoPlayer" controls playsinline preload="metadata" src="${v.url}"></video>`;
      } else {
        videoStage.innerHTML = `
          <div class="video-pending-box">
            <span class="mono-label txt-orange">BILIBILI EMBED READY</span>
            <h4>${v.label}</h4>
            <p>该高清影片已在本地归档，将 B站 BV 号填入 video-links.json 后重新打包即可在公网秒开播放。</p>
          </div>
        `;
      }
    }

    if (p.media.videos.length > 0) {
      videoSection.hidden = false;
      setText("modalVideoCount", `共 ${p.media.videos.length} 条影片`);
      renderVideoItem(p.media.videos[0]);

      videoPlaylist.innerHTML = p.media.videos
        .map(
          (v, idx) => `
          <button class="playlist-btn ${idx === 0 ? "is-active" : ""}" data-vidx="${idx}" type="button">
            ▶ ${v.label}${v.sizeMB ? ` (${v.sizeMB} MB)` : ""}
          </button>
        `
        )
        .join("");

      videoPlaylist.querySelectorAll(".playlist-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          videoPlaylist.querySelectorAll(".playlist-btn").forEach((b) => b.classList.remove("is-active"));
          btn.classList.add("is-active");
          const item = p.media.videos[Number(btn.dataset.vidx)];
          renderVideoItem(item);
          const vEl = videoStage.querySelector("video");
          if (vEl) vEl.play().catch(() => {});
        });
      });
    } else {
      videoSection.hidden = true;
      videoStage.innerHTML = `<video id="modalVideoPlayer" controls playsinline preload="metadata"></video>`;
    }

    if (p.media.images.length > 0) {
      gallerySection.hidden = false;
      setText("modalImageCount", `共 ${p.media.images.length} 张`);
      lightboxImages = p.media.images;
      galleryGrid.innerHTML = p.media.images
        .map(
          (img, idx) => `
          <div class="gallery-thumb" data-idx="${idx}" title="${img.label}">
            <img src="${img.url}" alt="${img.label}" loading="lazy" />
          </div>
        `
        )
        .join("");

      galleryGrid.querySelectorAll(".gallery-thumb").forEach((thumb) => {
        thumb.addEventListener("click", () => openLightbox(Number(thumb.dataset.idx)));
      });
    } else {
      gallerySection.hidden = true;
      lightboxImages = [];
    }

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    modal.querySelector(".modal__dialog").scrollTop = 0;
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    const activeVideo = document.querySelector(".video-stage video");
    if (activeVideo) activeVideo.pause();
    const activeIframe = document.querySelector(".video-stage iframe");
    if (activeIframe) activeIframe.src = "";
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  modalBackdrop.addEventListener("click", closeModal);
  modalClose.addEventListener("click", closeModal);

  // 6. Fullscreen Image Lightbox
  const lightbox = document.getElementById("imageLightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxCaption = document.getElementById("lightboxCaption");

  function openLightbox(idx) {
    if (!lightboxImages.length) return;
    lightboxIndex = (idx + lightboxImages.length) % lightboxImages.length;
    const item = lightboxImages[lightboxIndex];
    lightboxImg.src = item.url;
    lightboxImg.alt = item.label;
    lightboxCaption.textContent = `${lightboxIndex + 1} / ${lightboxImages.length} — ${item.name}`;
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
  }

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
  }

  document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
  document.getElementById("lightboxPrev").addEventListener("click", () => openLightbox(lightboxIndex - 1));
  document.getElementById("lightboxNext").addEventListener("click", () => openLightbox(lightboxIndex + 1));
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (lightbox.classList.contains("is-open")) {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") openLightbox(lightboxIndex - 1);
      if (e.key === "ArrowRight") openLightbox(lightboxIndex + 1);
      return;
    }
    if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  });

  // 7. Real Analytics Tracking + Access Log Modal
  let latestAnalytics = { totalPageViews: 0, todayPageViews: 0, projectViews: {}, logs: [] };

  function updateAnalyticsUI(stats) {
    if (!stats) return;
    latestAnalytics = stats;
    setText("navPvCount", String(stats.totalPageViews || 0));
    setText("footerPvCount", String(stats.totalPageViews || 0));
    setText("footerTodayCount", String(stats.todayPageViews || 0));
    setText("statTotalPv", String(stats.totalPageViews || 0));
    setText("statTodayPv", String(stats.todayPageViews || 0));
    setText("statLogCount", String((stats.logs || []).length));

    const logBody = document.getElementById("analyticsLogBody");
    if (logBody) {
      logBody.innerHTML = (stats.logs || [])
        .map(
          (row) => `
          <tr>
            <td>${row.time}</td>
            <td style="color:#fff;">${row.action}</td>
            <td>${row.device}</td>
            <td>${row.ip}</td>
          </tr>
        `
        )
        .join("");
    }
  }

  function localTrackFallback(payload) {
    const key = "guoqing_portfolio_analytics_v1";
    const today = new Date().toISOString().slice(0, 10);
    let data = { totalPageViews: 0, dailyViews: {}, projectViews: {}, logs: [] };
    try {
      const raw = localStorage.getItem(key);
      if (raw) data = JSON.parse(raw);
    } catch {}
    const timeStr = new Date().toLocaleString("zh-CN", { hour12: false });
    const device = /mobile|android|iphone|ipad/i.test(navigator.userAgent) ? "移动端" : "桌面端";
    if (payload.type === "project" && payload.projectId) {
      data.projectViews[payload.projectId] = (data.projectViews[payload.projectId] || 0) + 1;
      data.logs.unshift({ time: timeStr, action: `浏览作品 · ${payload.projectTitle || payload.projectId}`, device, ip: "公网访客" });
    } else {
      data.totalPageViews += 1;
      data.dailyViews[today] = (data.dailyViews[today] || 0) + 1;
      data.logs.unshift({ time: timeStr, action: "访问个人网站首页", device, ip: "公网访客" });
    }
    data.logs = data.logs.slice(0, 50);
    try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
    return {
      totalPageViews: data.totalPageViews,
      todayPageViews: data.dailyViews[today] || 0,
      projectViews: data.projectViews,
      logs: data.logs
    };
  }

  async function trackVisit(payload) {
    if (isStaticMode) {
      updateAnalyticsUI(localTrackFallback(payload));
      return;
    }
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Static fallback");
      const stats = await res.json();
      updateAnalyticsUI(stats);
    } catch {
      isStaticMode = true;
      updateAnalyticsUI(localTrackFallback(payload));
    }
  }

  // Record initial page visit
  trackVisit({ type: "page" });

  // Hook into project clicks for project view tracking
  const origOpenModal = openModal;
  openModal = function (projectId) {
    const p = allProjects.find((item) => item.id === projectId);
    if (p) trackVisit({ type: "project", projectId: p.id, projectTitle: p.title });
    origOpenModal(projectId);
  };

  // Analytics Modal Controls
  const analyticsModal = document.getElementById("analyticsModal");
  async function openAnalyticsModal() {
    try {
      const res = await fetch("/api/analytics");
      const stats = await res.json();
      updateAnalyticsUI(stats);
    } catch (e) {}
    analyticsModal.classList.add("is-open");
    analyticsModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeAnalyticsModal() {
    analyticsModal.classList.remove("is-open");
    analyticsModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  document.getElementById("openAnalyticsBtn").addEventListener("click", openAnalyticsModal);
  document.getElementById("footerOpenAnalyticsBtn").addEventListener("click", openAnalyticsModal);
  document.getElementById("analyticsBackdrop").addEventListener("click", closeAnalyticsModal);
  document.getElementById("analyticsClose").addEventListener("click", closeAnalyticsModal);

  // Copy + Toast
  const toast = document.getElementById("toast");
  let toastTimer = null;

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
  }

  async function copyText(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label}已复制：${text}`);
    } catch {
      showToast(`${label}：${text}`);
    }
  }

  document.getElementById("copyPhoneBtn").addEventListener("click", () => copyText(profile.contact.phone, "联系电话"));

  // 8. Ambient Cursor Spotlight
  const spotlight = document.getElementById("cursorSpotlight");
  window.addEventListener(
    "pointermove",
    (e) => {
      spotlight.style.opacity = "1";
      spotlight.style.left = `${e.clientX}px`;
      spotlight.style.top = `${e.clientY}px`;
    },
    { passive: true }
  );

  // 9. Scroll Reveal
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08 }
  );

  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
})();
