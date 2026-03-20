document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("darkModeToggle");

    // 저장된 상태 불러오기
    if (localStorage.getItem("darkMode") === "on") {
        document.body.classList.add("dark");
        if (toggle) toggle.checked = true;
    }

    // 토글 이벤트
    if (toggle) {
        toggle.addEventListener("change", () => {
            if (toggle.checked) {
                document.body.classList.add("dark");
                localStorage.setItem("darkMode", "on");
            } else {
                document.body.classList.remove("dark");
                localStorage.setItem("darkMode", "off");
            }
        });
    }
});
