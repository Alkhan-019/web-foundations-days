const textInput = document.getElementById("text-input");
const charCount = document.getElementById("char-count");
const wordCount = document.getElementById("word-count");
const remainingCount = document.getElementById("remaining-count");
const message = document.getElementById("message");
const themeToggle = document.getElementById("theme-toggle");
const clearBtn = document.getElementById("clear-btn");

const maxCharacters = 200;

function updateCounter() {
    const text = textInput.value;
    const characters = text.length;
    const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
    const remaining = maxCharacters - characters;

    charCount.textContent = characters;
    wordCount.textContent = words;
    remainingCount.textContent = remaining;

    message.classList.remove("warning", "over");

    if (remaining < 0) {
        message.textContent = "You have exceeded the character limit!";
        message.classList.add("over");
    } else if (remaining <= 20) {
        message.textContent = "You are approaching the character limit.";
        message.classList.add("warning");
    } else {
        message.textContent = "You are within the character limit.";
    }
}

textInput.addEventListener("input", updateCounter);

themeToggle.addEventListener("click", function () {
    document.body.classList.toggle("dark");

    if (document.body.classList.contains("dark")) {
        themeToggle.textContent = "Switch to Light Mode";
    } else {
        themeToggle.textContent = "Switch to Dark Mode";
    }
});

clearBtn.addEventListener("click", function () {
    textInput.value = "";
    updateCounter();
});

updateCounter();