const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

const usernameError = document.getElementById("username-error");
const passwordError = document.getElementById("password-error");

const submitBtn = document.getElementById("submitBtn");

const formInscription = document.getElementById("inscription-Form");

[usernameInput, passwordInput].forEach(input => {
  input.addEventListener("input", () => {
    clearFieldError(input, input === usernameInput ? usernameError : passwordError);
  });
});

formInscription.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = usernameInput.value;
  const password = passwordInput.value;

  let hasError = false;

  if (!username) {
    showFieldError(usernameInput, usernameError, "Veuillez utiliser un nom d'utilisateur.");
    hasError = true;
  } else {
    clearFieldError(usernameInput, usernameError);
  }

  if (!password) {
    showFieldError(passwordInput, passwordError, "Veuillez utiliser un mot de passe.");
    hasError = true;
  } else {
    clearFieldError(passwordInput, passwordError);
  }

  if (hasError) {
    return;
  }

  try {
    const res = await fetch("/addUser", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showFieldError(usernameInput, usernameError, data.error || "Erreur lors de la création de l'utilisateur.");
      return;
    }

    alert("Compte créé avec succès !");
    formInscription.reset();

    window.location.href = "/login.html";

  } catch (err) {
    console.error("Erreur serveur :", err);
    showFieldError(usernameInput, usernameError, "Impossible de créer l'utilisateur (erreur serveur).");
  }
});

function showFieldError(input, errorElement, message) {
    input.classList.add("is-danger");
    errorElement.textContent = message;
    errorElement.style.display = "block";
}
function clearFieldError(input, errorElement) {
    input.classList.remove("is-danger");
    errorElement.textContent = "";
    errorElement.style.display = "none";
}