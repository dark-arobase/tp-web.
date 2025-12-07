
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const submitBtn = document.getElementById("submitBtn");

const formInscription = document.getElementById("inscription-Form");

const idu = document.getElementById("uId");

const formIdentification = document.getElementById("identification-Form");

let utilisateurs = [];

async function loadUsers() {
  try {
    const res = await fetch("/alluser");
    if (!res.ok) throw new Error("Erreur chargement utilisateurs");

    utilisateurs = await res.json();
    // you can update the UI here if needed
  } catch (err) {
    console.error("Impossible de charger les utilisateurs", err);
  }
}

formInscription.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = usernameInput.value;
    const password = passwordInput.value;

    if (!username || !password) {
      console.error("username et password sont requis");
      return;
    }

    try {
      const res = await fetch(`/addUser`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username, password: password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erreur lors de l'ajout de l'utilisateur");
      }

      formInscription.reset();
      idu.value = "";
      await loadProducts();

      // Redirection vers la page de connexion (page racine /login.html)
      window.location.href = "/login.html";

    } catch (err) {
      console.error("Impossible d'ajouter l'utilisateur", err);
    }
});


// =========================
// CONNEXION (LOGIN) AVEC COOKIES
// =========================
// Identification (login) — server sets a session cookie
if (formIdentification) {
  // Pré-remplir depuis les cookies si "Se souvenir de moi" était coché
  const savedUsername = getCookie('username');
  const savedPassword = getCookie('password');
  
  if (savedUsername && savedPassword) {
    if (usernameInput) usernameInput.value = savedUsername;
    if (passwordInput) passwordInput.value = savedPassword;
    const rememberCheckbox = document.getElementById('rememberMe');
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }

  formIdentification.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = usernameInput.value;
    const password = passwordInput.value;

    const remember = document.getElementById('rememberMe') && document.getElementById('rememberMe').checked;

    if (!username) {
      alert("Le nom d'utilisateur est requis.");
      return;
    }

    if (!password) {
      alert("Le mot de passe est requis.");
      return;
    }

    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username, password: password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || "Erreur lors de l'identification");
        return;
      }

      console.log("Identification réussie :", data);

      // Sauvegarder les identifiants dans les cookies si "Se souvenir" est coché
      if (remember) {
        setCookie('username', username, 30); // 30 jours
        setCookie('password', password, 30); // 30 jours
      } else {
        // Supprimer les cookies si non coché
        deleteCookie('username');
        deleteCookie('password');
      }

      // Redirection vers la page d'accueil (index.html)
      formIdentification.reset();
      window.location.href = "/index.html";

    } catch (err) {
      console.error("Impossible de s'identifier", err);
      alert("Erreur serveur.");
    }
  });
}

// Logout helper (can be called from UI)
async function logout() {
  try {
    // Supprimer les cookies de connexion
    deleteCookie('username');
    deleteCookie('password');
    
    const res = await fetch('/logout', { method: 'POST' });
    if (res.ok) {
      window.location.href = '/login.html';
    } else {
      alert('Erreur lors de la déconnexion');
    }
  } catch (err) {
    console.error(err);
    alert('Erreur serveur');
  }
}

loadProducts();