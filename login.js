const mainBox = document.getElementById("mainBox");
const loginBox = document.getElementById("loginBox");
const loginBtn = document.getElementById("loginBtn");
const loginStatus = document.getElementById("loginStatus");

const savedToken = sessionStorage.getItem("KOBO_TOKEN");
if (savedToken) {
  KOBO_TOKEN = savedToken;
  loginBox.style.display = "none";
  mainBox.style.display = "block";
} else {
  KOBO_TOKEN = null;
  loginBox.style.display = "block";
  mainBox.style.display = "none";
}

loginBtn.addEventListener("click", loginToKobo);

async function loginToKobo (e) {
  e.preventDefault();
  const username = document.getElementById("koboUser").value.trim();
  const password = document.getElementById("koboPass").value.trim();

  if (!username || !password) {
    loginStatus.textContent = "Enter username and password";
    return;
  }

  try {
    loginStatus.textContent = "Authenticating…";

    const basicAuth = btoa(`${username}:${password}`);

    const res = await fetch(
      "https://kf.kobotoolbox.org/token/?format=json",
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${basicAuth}`,
        },
      }
    );

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    if (!data.token) throw new Error("No token returned");

    KOBO_TOKEN = `Token ${data.token}`;

    // store per session
    sessionStorage.setItem("KOBO_TOKEN", KOBO_TOKEN);

    loginStatus.textContent = "✅ Logged in";
  } catch (err) {
    console.error(err);
    loginStatus.textContent = "❌ Login failed";
  }
}

function logoutKobo () {
  KOBO_TOKEN = null;
  sessionStorage.removeItem("KOBO_TOKEN");
}
