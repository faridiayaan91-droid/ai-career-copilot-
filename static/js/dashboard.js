const form = document.getElementById("analyzeForm");
const btn = document.getElementById("analyzeBtn");
const spinner = document.getElementById("spinner");
const loadingText = document.getElementById("loadingText");
const resultBox = document.getElementById("resultBox");
const errorBox = document.getElementById("errorBox");
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");

let chartInstance = null;
let lastResult = null;
let lastGoal = "";

// ---------- helpers ----------
function esc(text) {
    const div = document.createElement("div");
    div.textContent = text == null ? "" : String(text);
    return div.innerHTML;
}

function listHTML(items) {
    if (!items || !items.length) return "<p class='score-feedback'>Kuch nahi mila</p>";
    return "<ul>" + items.map(i => `<li>${esc(i)}</li>`).join("") + "</ul>";
}

function chipsHTML(items, cls) {
    if (!items || !items.length) return "<p class='score-feedback'>Kuch nahi mila</p>";
    return "<div class='chips'>" + items.map(i => `<span class="chip ${cls}">${esc(i)}</span>`).join("") + "</div>";
}

function companiesHTML(companies) {
    if (!companies || !companies.length) return "<p class='score-feedback'>Kuch nahi mila</p>";
    return companies.map(c => {
        const safe = /^https?:\/\//i.test(c.apply_link || "");
        const link = safe ? `<a href="${esc(c.apply_link)}" target="_blank" rel="noopener">Apply ↗</a>` : "";
        return `
        <div class="company">
            <div><strong>${esc(c.name)}</strong><br><small>${esc(c.role)}</small></div>
            ${link}
        </div>`;
    }).join("");
}

// ---------- drag & drop ----------
dropzone.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {
    fileName.textContent = fileInput.files.length ? "✅ " + fileInput.files[0].name : "";
});

["dragenter", "dragover"].forEach(ev =>
    dropzone.addEventListener(ev, e => {
        e.preventDefault();
        dropzone.classList.add("dragover");
    })
);

["dragleave", "drop"].forEach(ev =>
    dropzone.addEventListener(ev, e => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
    })
);

dropzone.addEventListener("drop", e => {
    if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        fileName.textContent = "✅ " + fileInput.files[0].name;
    }
});

// ---------- submit (AJAX) ----------
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    errorBox.innerHTML = "";
    resultBox.innerHTML = "";
    btn.disabled = true;
    btn.textContent = "⏳ Analysing...";
    spinner.style.display = "block";
    loadingText.style.display = "block";

    try {
        const formData = new FormData(form);
        lastGoal = formData.get("role") || "";

        const response = await fetch("/api/analyze", { method: "POST", body: formData });

        if (response.status === 401) {
            window.location.href = "/login";
            return;
        }

        const data = await response.json();

        if (!response.ok || data.error) {
            errorBox.innerHTML = `<div class="alert alert-error">${esc(data.error || "Kuch galat hua")}</div>`;
            return;
        }

        lastResult = data;
        renderResult(data);
        resultBox.scrollIntoView({ behavior: "smooth" });

    } catch (err) {
        errorBox.innerHTML = `<div class="alert alert-error">Network error: ${esc(err.message)}</div>`;
    } finally {
        btn.disabled = false;
        btn.textContent = "🔍 Analyse";
        spinner.style.display = "none";
        loadingText.style.display = "none";
    }
});

// ---------- render ----------
function renderResult(r) {
    const score = Number(r.score) || 0;
    const skills = r.skills || [];
    const missing = r.missing_skills || [];

    resultBox.innerHTML = `
    <div class="result">
        <div class="score-wrap">
            <div class="score-ring" style="background: conic-gradient(var(--primary) ${score}%, var(--border) 0);">
                <span>${score}</span>
            </div>
            <p class="score-feedback">${esc(r.score_feedback)}</p>
        </div>

        <div class="chart-box"><canvas id="skillChart"></canvas></div>

        <h3>✅ Skills</h3>
        ${chipsHTML(skills, "chip-green")}

        <h3>❌ Missing Skills</h3>
        ${chipsHTML(missing, "chip-red")}

        <h3>🗺️ Roadmap</h3>
        ${listHTML(r.roadmap)}

        <h3>🎯 Interview Questions</h3>
        ${listHTML(r.interview_questions)}

        <h3>🏢 Companies Hiring</h3>
        ${companiesHTML(r.companies)}

        <button class="btn" id="pdfBtn" style="margin-top:20px;">📥 Download PDF Report</button>
    </div>`;

    // Chart
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(document.getElementById("skillChart"), {
        type: "doughnut",
        data: {
            labels: ["Skills you have", "Missing skills"],
            datasets: [{
                data: [skills.length, missing.length],
                backgroundColor: ["#22c55e", "#ef4444"],
                borderWidth: 0
            }]
        },
        options: { plugins: { legend: { position: "bottom" } } }
    });

    document.getElementById("pdfBtn").addEventListener("click", downloadPDF);
}

// ---------- PDF ----------
function downloadPDF() {
    if (!lastResult) return;
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    let y = 15;

    function add(text, size = 11, bold = false) {
        pdf.setFontSize(size);
        pdf.setFont("helvetica", bold ? "bold" : "normal");
        pdf.splitTextToSize(String(text), 180).forEach(line => {
            if (y > 280) { pdf.addPage(); y = 15; }
            pdf.text(line, 15, y);
            y += size * 0.5 + 2;
        });
    }

    function section(title, items) {
        y += 4;
        add(title, 13, true);
        (items || []).forEach(i => add("- " + i));
    }

    add("AI Career Copilot - Resume Report", 17, true);
    add("Goal: " + lastGoal);
    add("Score: " + (lastResult.score || 0) + "/100", 13, true);
    add(lastResult.score_feedback || "");

    section("Skills", lastResult.skills);
    section("Missing Skills", lastResult.missing_skills);
    section("Roadmap", lastResult.roadmap);
    section("Interview Questions", lastResult.interview_questions);
    section("Companies Hiring", (lastResult.companies || []).map(c => `${c.name} - ${c.role} (${c.apply_link})`));

    pdf.save("resume-report.pdf");
}