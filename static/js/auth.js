const pwd = document.getElementById("password");
const fill = document.getElementById("strengthFill");
const text = document.getElementById("strengthText");
const signupForm = document.getElementById("signupForm");

if (pwd && fill && text) {
    pwd.addEventListener("input", () => {
        const v = pwd.value;
        let score = 0;
        if (v.length >= 6) score++;
        if (v.length >= 10) score++;
        if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
        if (/\d/.test(v)) score++;
        if (/[^A-Za-z0-9]/.test(v)) score++;

        const levels = [
            { w: "0%",   color: "transparent", label: "Use at least 6 characters" },
            { w: "20%",  color: "#ef4444",     label: "Bahut weak" },
            { w: "40%",  color: "#f97316",     label: "Weak" },
            { w: "60%",  color: "#eab308",     label: "Theek hai" },
            { w: "80%",  color: "#22c55e",     label: "Strong" },
            { w: "100%", color: "#16a34a",     label: "Bahut strong" }
        ];

        const lvl = v.length === 0 ? levels[0] : levels[Math.max(score, 1)];
        fill.style.width = lvl.w;
        fill.style.background = lvl.color;
        text.textContent = lvl.label;
    });
}

if (signupForm) {
    signupForm.addEventListener("submit", (e) => {
        if (pwd.value.length < 6) {
            e.preventDefault();
            text.textContent = "Password kam se kam 6 characters ka hona chahiye";
            text.style.color = "#ef4444";
        }
    });
}