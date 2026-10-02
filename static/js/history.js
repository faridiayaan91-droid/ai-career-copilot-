const searchBox = document.getElementById("searchBox");
const items = document.querySelectorAll(".history-item");

if (searchBox) {
    searchBox.addEventListener("input", () => {
        const q = searchBox.value.toLowerCase().trim();
        items.forEach(item => {
            item.style.display = item.textContent.toLowerCase().includes(q) ? "" : "none";
        });
    });
}