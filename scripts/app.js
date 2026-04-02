document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("app");
  const archive = window.WALKING_MAN_ARCHIVE;

  if (!root || !archive) return;

  const collections = [
    {
      key: "self",
      label: "셀프",
      description: "강영선이 직접 촬영하는 기록",
      episodes: (archive.episodes || []).map((episode) => ({ ...episode, track: "self" }))
    },
    {
      key: "interview",
      label: "인터뷰",
      description: "김태형이 질문하고 촬영하는 인터뷰 기록",
      episodes: (archive.interviews || []).map((episode) => ({ ...episode, track: "interview" }))
    }
  ].filter((collection) => collection.episodes.length);

  let currentView = "script";

  function escapeHTML(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getStatusClass(status) {
    if (status === "완성") return "is-complete";
    if (status === "초안") return "is-draft";
    return "is-upcoming";
  }

  function getAllEpisodes() {
    return collections.flatMap((collection) => collection.episodes);
  }

  function getEpisodeById(id) {
    return getAllEpisodes().find((episode) => episode.id === id) || getAllEpisodes()[0];
  }

  function getCollectionByEpisodeId(id) {
    return collections.find((collection) => collection.episodes.some((episode) => episode.id === id)) || collections[0];
  }

  function getCurrentEpisodeId() {
    const hash = window.location.hash.replace(/^#/, "");
    return getAllEpisodes().some((episode) => episode.id === hash) ? hash : getAllEpisodes()[0]?.id;
  }

  function formatDialogueLine(line) {
    return `\"${line.text}\"`;
  }

  function buildDirectionIntent(scene) {
    const parts = [scene.direction, scene.intent].filter(Boolean);
    return parts.join(" ");
  }

  function buildEpisodeText(episode, collection) {
    const blocks = [];

    blocks.push(`[${archive.project.title} ${collection.label} ${episode.number}] ${episode.title}`);

    if (episode.subtitle) blocks.push(`설명\n${episode.subtitle}`);
    if (episode.runtime) blocks.push(`러닝타임\n${episode.runtime}`);
    if (episode.summary) blocks.push(`요약\n${episode.summary}`);

    if (episode.questions?.length) {
      blocks.push(["인터뷰 질문", ...episode.questions.map((question, index) => `${index + 1}. ${question}`)].join("\n"));
    }

    if (episode.script?.overview) {
      const overviewRows = [
        ["핵심 질문", episode.script.overview.question],
        ["감정 상태", episode.script.overview.emotion],
        ["촬영 원칙", episode.script.overview.approach],
        ["증거", episode.script.overview.evidence],
        ["엔딩 감정", episode.script.overview.ending]
      ].filter(([, value]) => value);

      if (overviewRows.length) {
        blocks.push(["개요", ...overviewRows.map(([label, value]) => `${label}: ${value}`)].join("\n"));
      }
    }

    if (episode.script?.meta?.length) {
      blocks.push(["촬영 기본 정보", ...episode.script.meta.map(([label, value]) => `${label}: ${value}`)].join("\n"));
    }

    if (episode.note) {
      blocks.push(`기획 메모\n${episode.note}`);
    }

    if (episode.script?.scenes?.length) {
      const scenesText = episode.script.scenes
        .map((scene) => {
          const parts = [`${scene.slug}. ${scene.title} (${scene.time})`];
          if (scene.camera) parts.push(`카메라\n${scene.camera}`);
          if (scene.visual) parts.push(`화면\n${scene.visual}`);
          if (buildDirectionIntent(scene)) parts.push(`연출\n${buildDirectionIntent(scene)}`);
          if (scene.lines?.length) {
            parts.push(["대사", ...scene.lines.map((line, index) => `${index + 1}. ${formatDialogueLine(line)}`)].join("\n"));
          }
          return parts.join("\n\n");
        })
        .join("\n\n-----------\n\n");

      blocks.push(scenesText);
    }

    return blocks.join("\n\n");
  }

  function renderCollectionTabs(currentKey) {
    return `
      <div class="archive-tabs" role="tablist" aria-label="촬영 구분">
        ${collections
          .map(
            (collection) => `
              <button
                type="button"
                class="archive-tab ${collection.key === currentKey ? "active" : ""}"
                data-collection="${collection.key}"
                role="tab"
                aria-selected="${collection.key === currentKey}"
              >
                ${escapeHTML(collection.label)}
              </button>
            `
          )
          .join("")}
      </div>
    `;
  }

  function renderSidebar(currentCollection, currentEpisodeId) {
    return `
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-header-top">
            <div class="brand-block">
              <div class="brand-title">${escapeHTML(archive.project.title)}</div>
              <div class="brand-logline">${escapeHTML(archive.project.logline)}</div>
            </div>
            <div class="sidebar-header-tabs">
              ${renderCollectionTabs(currentCollection.key)}
            </div>
          </div>
        </div>
        <nav class="sidebar-nav" aria-label="에피소드 목록">
          ${currentCollection.episodes
            .map(
              (episode) => `
                <a href="#${escapeHTML(episode.id)}" class="episode-item ${episode.id === currentEpisodeId ? "active" : ""}">
                  <div class="ep-meta">
                    <span class="ep-number">${escapeHTML(episode.number)}</span>
                    <span class="ep-status ${getStatusClass(episode.status)}">${escapeHTML(episode.status)}</span>
                  </div>
                  <div class="ep-title">${escapeHTML(episode.title)}</div>
                  <div class="ep-subtitle">${escapeHTML(episode.subtitle || "")}</div>
                </a>
              `
            )
            .join("")}
        </nav>
      </aside>
    `;
  }

  function renderDocSection(title, body, extraClass = "") {
    if (!body) return "";
    return `
      <section class="section-card section-framed ${extraClass}">
        <div class="section-head">
          <div class="section-title">${escapeHTML(title)}</div>
        </div>
        <div class="section-body">${body}</div>
      </section>
    `;
  }

  function renderDetailRows(rows, rowClass, labelClass, valueClass) {
    return rows
      .filter(([, value]) => value)
      .map(
        ([label, value]) => `
          <div class="${rowClass}">
            <div class="${labelClass}">${escapeHTML(label)}</div>
            <div class="${valueClass}">${escapeHTML(value)}</div>
          </div>
        `
      )
      .join("");
  }

  function renderDialogues(lines) {
    return `
      <div class="dialogue-wrapper">
        ${lines
          .map(
            (line, index) => `
              <div class="dialogue-line">
                <div class="dialogue-num">${index + 1}.</div>
                <div class="dialogue-text">${escapeHTML(line.text)}</div>
              </div>
            `
          )
          .join("")}
      </div>
    `;
  }

  function renderStructuredSceneRow(label, content, extraClass = "") {
    if (!content) return "";
    return `
      <div class="scene-row ${extraClass}">
        <div class="scene-row-label">${escapeHTML(label)}</div>
        <div class="scene-row-value">${content}</div>
      </div>
    `;
  }

  function renderStructuredOverview(overview) {
    if (!overview) return "";
    const body = renderDetailRows(
      [
        ["핵심 질문", overview.question],
        ["감정 상태", overview.emotion],
        ["촬영 원칙", overview.approach],
        ["증거", overview.evidence],
        ["엔딩 감정", overview.ending]
      ],
      "overview-row",
      "overview-label",
      "overview-value"
    );
    return renderDocSection("개요", `<div class="overview-grid">${body}</div>`);
  }

  function renderStructuredQuestions(questions) {
    if (!questions?.length) return "";
    const body = questions
      .map(
        (question, index) => `
          <div class="question-item">
            <div class="question-number">Q${index + 1}</div>
            <div class="question-text">${escapeHTML(question)}</div>
          </div>
        `
      )
      .join("");
    return renderDocSection("인터뷰 질문", `<div class="question-list">${body}</div>`, "section-emphasis");
  }

  function renderStructuredMeta(meta) {
    if (!meta?.length) return "";
    const body = renderDetailRows(meta, "meta-row", "meta-tag-label", "meta-tag-value");
    return renderDocSection("촬영 기본 정보", `<div class="meta-tags">${body}</div>`);
  }

  function renderStructuredScenes(scenes) {
    if (!scenes?.length) return "";
    const body = scenes
      .map(
        (scene) => `
          <article class="scene-item scene-framed">
            <div class="scene-header">
              <div class="scene-heading">
                <span class="scene-slug">${escapeHTML(scene.slug)}</span>
                <span class="scene-title">${escapeHTML(scene.title)}</span>
              </div>
              <span class="scene-time">${escapeHTML(scene.time || "")}</span>
            </div>
            <div class="scene-content">
              ${renderStructuredSceneRow("카메라", scene.camera ? `<div class="scene-row-text">${escapeHTML(scene.camera)}</div>` : "")}
              ${renderStructuredSceneRow("화면", scene.visual ? `<div class="scene-row-text">${escapeHTML(scene.visual)}</div>` : "")}
              ${renderStructuredSceneRow("연출", buildDirectionIntent(scene) ? `<div class="scene-row-text">${escapeHTML(buildDirectionIntent(scene))}</div>` : "")}
              ${renderStructuredSceneRow("대사", scene.lines?.length ? renderDialogues(scene.lines) : "", "is-dialogue")}
            </div>
          </article>
        `
      )
      .join("");
    return renderDocSection("씬 구성", `<div class="scene-list">${body}</div>`);
  }

  function renderTextView(episode, collection) {
    const text = buildEpisodeText(episode, collection);
    return renderDocSection(
      "텍스트 보기",
      `
        <div class="text-view-actions">
          <p class="text-view-help">카카오톡이나 메모에 바로 붙여넣을 수 있게 단락 구분을 정리한 복사용 텍스트입니다.</p>
          <button type="button" class="copy-button" data-copy-text>텍스트 복사</button>
        </div>
        <textarea class="text-copy-box" readonly aria-label="시나리오 텍스트 보기">${escapeHTML(text)}</textarea>
      `,
      "text-view-card"
    );
  }

  function renderViewSwitch() {
    return `
      <div class="view-switch" role="tablist" aria-label="보기 전환">
        <button type="button" class="view-switch-button ${currentView === "script" ? "active" : ""}" data-view="script" role="tab" aria-selected="${currentView === "script"}">대본 보기</button>
        <button type="button" class="view-switch-button ${currentView === "text" ? "active" : ""}" data-view="text" role="tab" aria-selected="${currentView === "text"}">텍스트 보기</button>
      </div>
    `;
  }

  function renderMain(currentCollection, episode) {
    const content = currentView === "text"
      ? renderTextView(episode, currentCollection)
      : [
          renderStructuredOverview(episode.script?.overview),
          renderStructuredQuestions(episode.questions),
          renderStructuredMeta(episode.script?.meta),
          episode.note ? renderDocSection("기획 메모", `<div class="section-note">${escapeHTML(episode.note)}</div>`) : "",
          renderStructuredScenes(episode.script?.scenes)
        ].join("");

    return `
      <main class="main-content">
        <div class="script-container">
          <header class="script-header">
            <div class="script-header-top">
              <div>
                <div class="script-eyebrow">${escapeHTML(currentCollection.label)} · EP.${escapeHTML(episode.number)} · ${escapeHTML(episode.subtitle || episode.status)}${episode.runtime ? ` · ${escapeHTML(episode.runtime)}` : ""}</div>
                <h1 class="script-title">${escapeHTML(episode.title)}</h1>
                <p class="script-summary">${escapeHTML(episode.summary || "")}</p>
                <p class="script-mode-note">장면 상세와 대사는 대본 보기에서, 복사용 정리본은 텍스트 보기에서 확인할 수 있습니다.</p>
              </div>
              ${renderViewSwitch()}
            </div>
          </header>
          ${content || `<div class="empty-script">아직 작성된 내용이 없습니다.</div>`}
        </div>
      </main>
    `;
  }

  function render() {
    const currentEpisodeId = getCurrentEpisodeId();
    const episode = getEpisodeById(currentEpisodeId);
    const currentCollection = getCollectionByEpisodeId(currentEpisodeId);

    root.innerHTML = `
      ${renderSidebar(currentCollection, currentEpisodeId)}
      ${renderMain(currentCollection, episode)}
    `;

    root.querySelectorAll("[data-collection]").forEach((button) => {
      button.addEventListener("click", () => {
        const targetCollection = collections.find((collection) => collection.key === button.dataset.collection);
        if (!targetCollection?.episodes[0]) return;
        window.location.hash = targetCollection.episodes[0].id;
      });
    });

    root.querySelectorAll("[data-view]").forEach((button) => {
      button.addEventListener("click", () => {
        currentView = button.dataset.view;
        render();
      });
    });

    const copyButton = root.querySelector("[data-copy-text]");
    const textarea = root.querySelector(".text-copy-box");
    if (copyButton && textarea) {
      copyButton.addEventListener("click", async () => {
        textarea.focus();
        textarea.select();
        try {
          await navigator.clipboard.writeText(textarea.value);
        } catch {
          document.execCommand("copy");
        }
      });
    }
  }

  window.addEventListener("hashchange", () => {
    render();
    window.scrollTo({ top: 0, behavior: "auto" });
    const pane = document.querySelector(".main-content");
    if (pane) pane.scrollTo({ top: 0, behavior: "auto" });
  });

  let lastScrollY = 0;
  window.addEventListener("scroll", () => {
    const sidebar = document.querySelector(".sidebar");
    if (!sidebar || window.innerWidth > 900) return;
    const currentY = window.scrollY;
    if (currentY > lastScrollY && currentY > 60) {
      sidebar.classList.add("is-hidden");
    } else {
      sidebar.classList.remove("is-hidden");
    }
    lastScrollY = currentY;
  });

  render();
});
