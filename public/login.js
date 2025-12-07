const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

const usernameError = document.getElementById("username-error");
const passwordError = document.getElementById("password-error");

const rememberCheckbox = document.getElementById("rememberMe");
const formIdentification = document.getElementById("identification-Form");

// =========================
// COOKIE HELPERS
// =========================
function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days*24*60*60*1000));
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${date.toUTCString()}; path=/`;
}

function deleteCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
}

function getCookie(name) {
    const cookies = document.cookie.split("; ");
    for (let cookie of cookies) {
        const [key, value] = cookie.split("=");
        if (key === name) return decodeURIComponent(value);
    }
    return null;
}


// Charger cookies au chargement page
function chargerDonneesDepuisCookies() {
  const savedUsername = getCookie("username");
  const savedPassword = getCookie("password");

  if (savedUsername) usernameInput.value = savedUsername;
  if (savedPassword) passwordInput.value = savedPassword;

  if (savedUsername || savedPassword) rememberCheckbox.checked = true;
}

chargerDonneesDepuisCookies();

// Validation en temps réel
[usernameInput, passwordInput].forEach(input => {
  input.addEventListener("input", () => {
    clearFieldError(input, input === usernameInput ? usernameError : passwordError);
  });
});

// Fonctions erreurs
function showFieldError(input, errorElem, message) {
  input.classList.add("is-danger");
  errorElem.style.display = "block";
  errorElem.textContent = message;
}

function clearFieldError(input, errorElem) {
  input.classList.remove("is-danger");
  errorElem.style.display = "none";
  errorElem.textContent = "";
}

// Gestion formulaire login
if (formIdentification) {
  formIdentification.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    const remember = rememberCheckbox.checked;

    let hasError = false;

    if (!username) {
      showFieldError(usernameInput, usernameError, "Le nom d'utilisateur est requis.");
      hasError = true;
    } else {
      clearFieldError(usernameInput, usernameError);
    }

    if (!password) {
      showFieldError(passwordInput, passwordError, "Le mot de passe est requis.");
      hasError = true;
    } else {
      clearFieldError(passwordInput, passwordError);
    }

    if (hasError) return;

    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.error && data.error.toLowerCase().includes("utilisateur")) {
          showFieldError(usernameInput, usernameError, data.error);
        } else {
          showFieldError(passwordInput, passwordError, data.error || "Erreur d'identification");
        }
        return;
      }

      console.log("Identification réussie :", data);

      // Gestion des cookies selon la case "Se souvenir de moi"
      if (remember) {
        // Sauvegarder les cookies pour 30 jours
        setCookie("username", username, 30);
        setCookie("password", password, 30);
      }
      // Si remember n'est pas coché, on ne fait rien (on garde les cookies existants si présents)

      window.location.href = "/index.html";

    } catch (err) {
      console.error("Impossible de s'identifier", err);
      showFieldError(usernameInput, usernameError, "Erreur serveur.");
    }
  });
}