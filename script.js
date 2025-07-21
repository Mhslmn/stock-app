// رمز عبور دلخواهت رو اینجا بذار:
const LOGIN_CODE = "123";

// بررسی ورود هنگام بارگذاری صفحه
window.onload = async () => {
  if (getCookie("loggedIn") === "true") {
    document.getElementById("loginPage").style.display = "none";
    await populateNames();
  }
};


// بررسی کد ورود
function checkLogin() {
  const code = document.getElementById("loginCode").value;
  if (code === LOGIN_CODE) {
    setCookie("loggedIn", "true", 7); // ۷ روز معتبر بمونه
    document.getElementById("loginPage").style.display = "none";
    populateNames(); // پر کردن لیست بعد از لاگین موفق
  } else {
    document.getElementById("loginError").classList.remove("hidden");
  }
}


// اتصال به Back4App
Parse.initialize("tund8tdbVKxaXczBJTAcscOG8lHTyNUd1rVb2AAr", "LJZQ8wzYf6L1cMRdINnhwRcxU845xQ5HfUyVwAjy");
Parse.serverURL = "https://parseapi.back4app.com";

const Stock = Parse.Object.extend("Stock");


async function loadUsers() {
  const select = document.getElementById("nameSelect");
  const table = document.getElementById("userTable");
  select.innerHTML = "";
  table.innerHTML = "";

  const query = new Parse.Query(Stock);
  const results = await query.find();

  results.forEach(user => {
    const name = user.get("name");
    const amount = user.get("amount") || 0;

    // Dropdown
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);

    // Table
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="border px-2 py-1">${name}</td>
      <td class="border px-2 py-1">${amount}</td>
    `;
    table.appendChild(row);
  });
}

async function updateStock(direction) {
  const name = document.getElementById("nameSelect").value;
  const delta = direction * parseInt(document.getElementById("amount").value || "0");

  if (!name || isNaN(delta)) return alert("ورودی معتبر وارد کنید");

  const query = new Parse.Query(Stock);
  query.equalTo("name", name);
  const result = await query.first();

  if (result) {
    result.increment("amount", delta);
    await result.save();
    document.getElementById("result").textContent = `✅ موجودی جدید: ${result.get("amount")}`;
  }
  loadUsers();
}

async function checkStock() {
  const name = document.getElementById("nameSelect").value;
  const query = new Parse.Query(Stock);
  query.equalTo("name", name);
  const result = await query.first();

  if (result) {
    const val = result.get("amount");
    document.getElementById("result").textContent = `📦 دارایی فعلی: ${val}`;
  }
}

async function addUser() {
  const name = document.getElementById("newUser").value.trim();
  if (!name) return alert("نام را وارد کن");

  const query = new Parse.Query(Stock);
  query.equalTo("name", name);
  const exists = await query.first();
  if (exists) return alert("این نام از قبل وجود دارد");

  const newUser = new Stock();
  newUser.set("name", name);
  newUser.set("amount", 0);
  await newUser.save();
  document.getElementById("newUser").value = "";
  loadUsers();
}

async function removeUser() {
  const name = document.getElementById("newUser").value.trim();
  if (!name) return alert("نام را وارد کن");

  const query = new Parse.Query(Stock);
  query.equalTo("name", name);
  const user = await query.first();
  if (!user) return alert("کاربری با این نام پیدا نشد");

  await user.destroy();
  document.getElementById("newUser").value = "";
  loadUsers();
}

async function showAllUsers() {
  const tableBody = document.getElementById("fullTableBody");
  const tableWrapper = document.getElementById("fullUserTable");

  tableBody.innerHTML = ""; // پاکسازی قبلی

  const query = new Parse.Query("Stock");
  const results = await query.find();

  results.forEach(user => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="border px-2 py-1">${user.get("name")}</td>
      <td class="border px-2 py-1">${user.get("amount") || 0}</td>
    `;
    tableBody.appendChild(row);
  });

  // نمایش جدول
  tableWrapper.classList.remove("hidden");
  tableWrapper.scrollIntoView({ behavior: "smooth" });
}

async function populateNames() {
  const nameSelect = document.getElementById("nameSelect");
  nameSelect.innerHTML = ""; // پاک کردن قبلی

  const query = new Parse.Query("Stock");
  const results = await query.find();

  results.forEach(user => {
    const option = document.createElement("option");
    option.value = user.get("name");
    option.textContent = user.get("name");
    nameSelect.appendChild(option);
  });
}

// ذخیره کوکی (نام، مقدار، مدت انقضا برحسب روز)
function setCookie(name, value, days) {
  const d = new Date();
  d.setTime(d.getTime() + (days*24*60*60*1000));
  const expires = "expires=" + d.toUTCString();
  document.cookie = `${name}=${value}; ${expires}; path=/`;
}

// خواندن کوکی
function getCookie(name) {
  const cname = name + "=";
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');
  for (let c of ca) {
    while (c.charAt(0) === ' ') c = c.substring(1);
    if (c.indexOf(cname) === 0) return c.substring(cname.length, c.length);
  }
  return "";
}


window.onload = loadUsers;
