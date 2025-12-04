/*const username   = document.getElementById("username");
const password  = document.getElementById("password");

const submitBtn     = document.getElementById("submitBtn");
//const form = document.getElementById("userForm")*/
/* inscription.html  h*/
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const submitBtn = document.getElementById("submitBtn");
// formulaire d'ajout d'utilisateur dans inscription.html
const formInscription = document.getElementById("inscription-Form");

const idu = document.getElementById("uId");
/*inscription.html  b*/

/* indentification.html  h*/
const formIdentification = document.getElementById("identification-Form");
/*indentification.html  b*/

let utilisateurs = [];

async function loadProducts() {
  try {
    const res = await fetch("/toutUtilisateur");
    if (!res.ok) throw new Error("Erreur chargement utilisateurs");

    utilisateurs = await res.json();
    // you can update the UI here if needed
  } catch (err) {
    console.error("Impossible de charger les utilisateurs", err);
  }
}

if (formInscription) {
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
}

// Identification (login) — server sets a session cookie
if (formIdentification) {
  formIdentification.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = usernameInput.value;
    const password = passwordInput.value;

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