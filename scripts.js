// app.js
// API Configuration
const APP_ID = "ncekn7VRIJNsmirVuvocKRhznshe4Zn0mD68ipB3";
const JS_KEY = "oikoKqNjQ2PaDRRuP8ZL1fUcnoghOjnzwTS2sFLD";
const REST_KEY = "WrV8d6K53Huo5PR4VYi8ZnOjINEexK9Onpp5Lcqg";
const headers = {
  "X-Parse-Application-Id": APP_ID,
  "X-Parse-JavaScript-Key": JS_KEY,
  "X-Parse-REST-API-Key": REST_KEY,
  "Content-Type": "application/json"
};

// Global system settings
let systemSettings = {
  adminPassword: "1234",
  masterPassword: "master123",
  penaltyRules: [
    { maxDelay: 0, penalty: 0 },
    { maxDelay: 5, penalty: -500 },
    { maxDelay: 10, penalty: -1000 },
    { maxDelay: 20, penalty: -2000 },
    { maxDelay: 30, penalty: -3000 },
    { maxDelay: 9999, penalty: -4000 }
  ],
  absentPenalty: -5000,
  dailyReward: 10000,
  tax: 1000
};

// Data caching
const cache = {
  assets: null,
  persons: null,
  settings: null,
  attendance: null
};

// DOM Elements
const loginSection = document.getElementById("loginSection");
const mainSection = document.getElementById("mainSection");
const masterPasswordModal = document.getElementById("masterPasswordModal");

// ====================== CORE FUNCTIONS ====================== //

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  loadSystemSettings();
  
  if (localStorage.getItem("loggedIn") === "true") {
    loginSection.classList.add("hidden");
    mainSection.classList.remove("hidden");
    init();
  }
});

// Load system settings
async function loadSystemSettings() {
  try {
    const res = await fetch("https://parseapi.back4app.com/classes/SystemSettings", { headers });
    const data = await res.json();
    
    if (data.results.length > 0) {
      const settings = data.results[0];
      systemSettings = {
        ...systemSettings,
        adminPassword: settings.adminPassword,
        masterPassword: settings.masterPassword,
        dailyReward: settings.dailyReward || 10000,
        tax: settings.tax || 1000,
        absentPenalty: settings.absentPenalty || -5000
      };
    }
  } catch (e) {
    console.error("Error loading settings:", e);
  }
}

// Handle login
async function handleLogin() {
  const code = document.getElementById("accessCode").value;
  
  try {
    const res = await fetch("https://parseapi.back4app.com/classes/SystemSettings", { headers });
    const data = await res.json();
    
    if (data.results.length > 0) {
      const settings = data.results[0];
      systemSettings = {
        ...systemSettings,
        adminPassword: settings.adminPassword,
        masterPassword: settings.masterPassword
      };
      
      if (code === settings.adminPassword) {
        localStorage.setItem("loggedIn", "true");
        loginSection.classList.add("hidden");
        mainSection.classList.remove("hidden");
        init();
        showAlert("ورود با موفقیت انجام شد", "success");
      } else {
        showAlert("کد ورود نامعتبر است", "danger");
      }
    } else {
      if (code === systemSettings.adminPassword) {
        localStorage.setItem("loggedIn", "true");
        loginSection.classList.add("hidden");
        mainSection.classList.remove("hidden");
        init();
        showAlert("ورود با موفقیت انجام شد", "success");
      } else {
        showAlert("کد ورود نامعتبر است", "danger");
      }
    }
  } catch (error) {
    console.error("Error loading system settings:", error);
    showAlert("خطا در ارتباط با سرور", "danger");
  }
}

// Initialize application
async function init() {
  await Promise.all([
    fetchAssets(),
    fetchPersons(),
    loadPenaltyRules(),
    loadRewardSettings()
  ]);
  
  await populateAllGroupSelects();
  await loadTodaysRecords();
}

// ====================== DATA FETCHING & CACHING ====================== //

// Fetch assets with caching
async function fetchAssets() {
  try {
    const [assetsRes, personsRes] = await Promise.all([
      fetch("https://parseapi.back4app.com/classes/Assets", { headers }),
      fetch("https://parseapi.back4app.com/classes/Persons", { headers })
    ]);
    
    const assetsData = await assetsRes.json();
    const personsData = await personsRes.json();
    
    // Count members per group
    const countMap = {};
    personsData.results.forEach(p => {
      countMap[p.group] = (countMap[p.group] || 0) + 1;
    });
    
    // Merge data
    const assets = assetsData.results.map(a => ({
      ...a,
      memberCount: countMap[a.name] || 0
    }));
    
    cache.assets = assets;
    renderAssetsTable();
    showAlert("اطلاعات دارایی با موفقیت به‌روزرسانی شد", "success");
  } catch (error) {
    console.error("Error fetching assets:", error);
    showAlert("خطا در دریافت اطلاعات دارایی", "danger");
  }
}

// Fetch persons with caching
async function fetchPersons() {
  try {
    const res = await fetch("https://parseapi.back4app.com/classes/Persons", { headers });
    const data = await res.json();
    cache.persons = data.results;
    return cache.persons;
  } catch (error) {
    console.error("Error fetching persons:", error);
    showAlert("خطا در دریافت لیست اعضا", "danger");
    return [];
  }
}

// ====================== RENDERING FUNCTIONS ====================== //

// Render assets table
function renderAssetsTable() {
  const tbody = document.querySelector("#assetTable tbody");
  tbody.innerHTML = "";
  
  if (!cache.assets || cache.assets.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center">داده‌ای موجود نیست</td></tr>`;
    return;
  }
  
  cache.assets.forEach(a => {
    const amount = new Intl.NumberFormat('fa-IR').format(a.amount);
    tbody.innerHTML += `
      <tr>
        <td>${a.name}</td>
        <td>${amount}</td>
        <td>${a.memberCount}</td>
      </tr>
    `;
  });
}

// Populate all group selects
async function populateAllGroupSelects() {
  if (!cache.assets) await fetchAssets();
  
  const groupNames = cache.assets.map(a => a.name);
  const selectors = [
    "groupSelect",
    "groupForAttendance",
    "memberGroupSelect",
    "memberListGroupSelect"
  ];
  
  selectors.forEach(selector => {
    const select = document.getElementById(selector);
    select.innerHTML = "";
    
    groupNames.forEach(name => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
  });
  
  updateCurrentAssetDisplay();
}

// Update current asset display
async function updateCurrentAssetDisplay() {
  const groupSelect = document.getElementById("groupSelect");
  const groupName = groupSelect.value;
  
  if (!groupName) return;
  
  if (!cache.assets) await fetchAssets();
  
  const asset = cache.assets.find(a => a.name === groupName);
  if (asset) {
    const amount = new Intl.NumberFormat('fa-IR').format(asset.amount);
    document.getElementById("currentAsset").innerHTML = `
      <i class="fas fa-info-circle"></i>
      دارایی فعلی گروه ${groupName}: ${amount} تومان
    `;
  }
}

// ====================== ASSET MANAGEMENT ====================== //

// Change asset amount
async function changeAsset(increase) {
  const name = document.getElementById("groupSelect").value;
  const amountInput = document.getElementById("amountInput");
  const amount = parseInt(amountInput.value);
  
  if (!name) {
    showAlert("لطفاً یک گروه انتخاب کنید", "danger");
    return;
  }
  
  if (!amount || amount <= 0) {
    showAlert("مقدار نامعتبر است. لطفاً یک عدد مثبت وارد کنید", "danger");
    return;
  }

  try {
    // Find asset in cache
    const asset = cache.assets.find(a => a.name === name);
    if (!asset) {
      showAlert("گروه مورد نظر یافت نشد", "danger");
      return;
    }
    
    const newAmount = asset.amount + (increase ? amount : -amount);
    
    // Update in database
    await fetch(`https://parseapi.back4app.com/classes/Assets/${asset.objectId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ amount: newAmount })
    });
    
    // Update cache
    asset.amount = newAmount;
    
    showAlert(`دارایی گروه ${name} با موفقیت بروزرسانی شد`, "success");
    renderAssetsTable();
    updateCurrentAssetDisplay();
    amountInput.value = "";
  } catch (error) {
    console.error("Error changing asset:", error);
    showAlert("خطا در بروزرسانی دارایی", "danger");
  }
}

// Add a new group
async function addGroup() {
  const nameInput = document.getElementById("newGroupName");
  const name = nameInput.value.trim();
  
  if (!name) {
    showAlert("لطفاً نام گروه را وارد کنید", "danger");
    return;
  }

  try {
    // Check if group already exists
    if (cache.assets && cache.assets.some(a => a.name === name)) {
      showAlert("گروه با این نام قبلاً ایجاد شده است", "danger");
      return;
    }

    // Add new group
    const res = await fetch("https://parseapi.back4app.com/classes/Assets", {
      method: "POST",
      headers,
      body: JSON.stringify({ name, amount: 0 })
    });
    
    const newGroup = await res.json();
    
    // Update cache
    if (!cache.assets) cache.assets = [];
    cache.assets.push({ ...newGroup, memberCount: 0 });
    
    nameInput.value = "";
    showAlert(`گروه ${name} با موفقیت ایجاد شد`, "success");
    await populateAllGroupSelects();
  } catch (error) {
    console.error("Error adding group:", error);
    showAlert("خطا در ایجاد گروه جدید", "danger");
  }
}

// Remove a group
async function removeGroup() {
  const nameInput = document.getElementById("newGroupName");
  const name = nameInput.value.trim();
  
  if (!name) {
    showAlert("لطفاً نام گروه را وارد کنید", "danger");
    return;
  }

  try {
    // Find group in cache
    const assetIndex = cache.assets.findIndex(a => a.name === name);
    if (assetIndex === -1) {
      showAlert("گروه مورد نظر یافت نشد", "danger");
      return;
    }
    
    const asset = cache.assets[assetIndex];
    
    // Delete all members in this group
    const personsInGroup = cache.persons.filter(p => p.group === name);
    const deletePromises = personsInGroup.map(person => 
      fetch(`https://parseapi.back4app.com/classes/Persons/${person.objectId}`, {
        method: "DELETE",
        headers
      })
    );
    
    await Promise.all(deletePromises);
    
    // Delete the group
    await fetch(`https://parseapi.back4app.com/classes/Assets/${asset.objectId}`, {
      method: "DELETE",
      headers
    });
    
    // Update cache
    cache.assets.splice(assetIndex, 1);
    cache.persons = cache.persons.filter(p => p.group !== name);
    
    nameInput.value = "";
    showAlert(`گروه ${name} و تمام اعضای آن با موفقیت حذف شد`, "success");
    await populateAllGroupSelects();
    await loadMembers();
    renderAssetsTable();
  } catch (error) {
    console.error("Error removing group:", error);
    showAlert("خطا در حذف گروه", "danger");
  }
}

// ====================== ATTENDANCE MANAGEMENT ====================== //

// Populate attendance table
async function populateAttendance() {
  const group = document.getElementById("groupForAttendance").value;
  
  if (!group) {
    showAlert("لطفاً یک گروه انتخاب کنید", "danger");
    return;
  }

  if (!cache.persons) {
    await fetchPersons();
  }
  
  const personsInGroup = cache.persons.filter(p => p.group === group);
  let html = `
    <div style="margin: 1rem 0; font-weight: bold; text-align: center; color: var(--primary);">
      اعضای گروه ${group}
    </div>
    <table class="table">
      <thead>
        <tr>
          <th>نام عضو</th>
          <th>تاخیر (دقیقه)</th>
          <th>غیبت</th>
          <th>حضور</th>
        </tr>
      </thead>
      <tbody>`;
  
  if (personsInGroup.length === 0) {
    html += `<tr><td colspan="4" class="text-center">هیچ عضوی در این گروه یافت نشد</td></tr>`;
  } else {
    personsInGroup.forEach(p => {
      html += `
        <tr>
          <td>${p.name}</td>
          <td>
            <input type="number" 
                   id="delay-${p.objectId}" 
                   placeholder="0"
                   min="0"
                   class="form-control"
                   style="max-width: 120px; margin: 0 auto;">
          </td>
          <td class="text-center">
            <button onclick="markAbsent('${p.objectId}', '${p.name}')" 
                    class="btn btn-danger"
                    style="padding: 8px 12px;">
              <i class="fas fa-user-times"></i>
              غیبت
            </button>
          </td>
          <td class="text-center">
            <button onclick="submitAttendance('${p.objectId}')" 
                    class="btn btn-success"
                    style="padding: 8px 12px;">
              <i class="fas fa-user-check"></i>
             حضور
            </button>
          </td>
        </tr>`;
    });
  }
  
  html += `</tbody></table>`;
  document.getElementById("attendanceTable").innerHTML = html;
}

// Submit attendance
async function submitAttendance(personId) {
  const delayInput = document.getElementById(`delay-${personId}`);
  const delay = delayInput.value ? parseInt(delayInput.value) : 0;
  
  if (isNaN(delay) || delay < 0) {
    showAlert("لطفاً زمان تأخیر را به صورت عدد صحیح وارد کنید", "danger");
    return;
  }
  
  const penalty = calculatePenalty(delay);
  
  try {
    // Find person in cache
    const person = cache.persons.find(p => p.objectId === personId);
    if (!person) {
      showAlert("عضو مورد نظر یافت نشد", "danger");
      return;
    }
    
    const group = person.group;
    
    // Find asset in cache
    const asset = cache.assets.find(a => a.name === group);
    if (!asset) {
      showAlert("گروه مربوطه یافت نشد", "danger");
      return;
    }
    
    const newAmount = asset.amount + penalty;
    
    // Update group assets in DB
    await fetch(`https://parseapi.back4app.com/classes/Assets/${asset.objectId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ amount: newAmount })
    });
    
    // Update cache
    asset.amount = newAmount;
    
    // Create attendance record
    await fetch("https://parseapi.back4app.com/classes/Attendance", {
      method: "POST",
      headers,
      body: JSON.stringify({
        person: {
          __type: "Pointer",
          className: "Persons",
          objectId: personId
        },
        personName: person.name,
        group: group,
        status: "حاضر",
        delay: delay,
        penalty: penalty,
        date: new Date().toISOString().split('T')[0]
      })
    });
    
    showAlert(`حضور ${person.name} ثبت شد. ${Math.abs(penalty)} تومان ${penalty < 0 ? 'جریمه' : 'پاداش'} اعمال شد`, "success");
    renderAssetsTable();
    loadTodaysRecords();
    delayInput.value = "";
  } catch (error) {
    console.error("Error submitting attendance:", error);
    showAlert("خطا در ثبت حضور", "danger");
  }
}

// Mark member as absent
async function markAbsent(personId, personName) {
  const penalty = systemSettings.absentPenalty;
  
  try {
    // Find person in cache
    const person = cache.persons.find(p => p.objectId === personId);
    if (!person) {
      showAlert("عضو مورد نظر یافت نشد", "danger");
      return;
    }
    
    const group = person.group;
    
    // Find asset in cache
    const asset = cache.assets.find(a => a.name === group);
    if (!asset) {
      showAlert("گروه مربوطه یافت نشد", "danger");
      return;
    }
    
    const newAmount = asset.amount + penalty;
    
    // Update group assets in DB
    await fetch(`https://parseapi.back4app.com/classes/Assets/${asset.objectId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ amount: newAmount })
    });
    
    // Update cache
    asset.amount = newAmount;
    
    // Create attendance record
    await fetch("https://parseapi.back4app.com/classes/Attendance", {
      method: "POST",
      headers,
      body: JSON.stringify({
        person: {
          __type: "Pointer",
          className: "Persons",
          objectId: personId
        },
        personName: personName,
        group: group,
        status: "غایب",
        delay: -1,
        penalty: penalty,
        date: new Date().toISOString().split('T')[0]
      })
    });
    
    showAlert(`غیبت ${personName} ثبت شد. ۵,۰۰۰ تومان جریمه اعمال شد`, "success");
    renderAssetsTable();
    loadTodaysRecords();
  } catch (error) {
    console.error("Error marking absent:", error);
    showAlert("خطا در ثبت غیبت", "danger");
  }
}

// Calculate penalty based on delay
function calculatePenalty(delayMinutes) {
  if (delayMinutes === -1) return systemSettings.absentPenalty;
  
  // Find the appropriate penalty rule
  for (const rule of systemSettings.penaltyRules) {
    if (delayMinutes <= rule.maxDelay) {
      return rule.penalty;
    }
  }
  
  return systemSettings.penaltyRules[systemSettings.penaltyRules.length - 1].penalty;
}

// Load today's attendance records
async function loadTodaysRecords() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`https://parseapi.back4app.com/classes/Attendance?where=${encodeURIComponent(JSON.stringify({ date: today }))}`, { headers });
    const data = await res.json();
    const tbody = document.querySelector("#attendanceRecordsTable tbody");
    tbody.innerHTML = "";
    
    if (data.results.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center">هیچ رکوردی برای امروز ثبت نشده است</td></tr>`;
      return;
    }
    
    data.results.forEach(record => {
      let statusClass = "status-present";
      let statusText = "حاضر";
      
      if (record.status === "غایب") {
        statusClass = "status-absent";
        statusText = "غایب";
      } else if (record.delay > 0) {
        statusClass = "status-late";
        statusText = "تأخیر";
      }
      
      const penalty = new Intl.NumberFormat('fa-IR').format(record.penalty);
      const personName = record.personName || "نامشخص";
      
      tbody.innerHTML += `
        <tr>
          <td>${personName}</td>
          <td>${record.group}</td>
          <td class="${statusClass}">${statusText}</td>
          <td>${record.delay >= 0 ? record.delay : '۰'}</td>
          <td>${penalty}</td>
          <td class="text-center">
            <button onclick="deleteAttendanceRecord('${record.objectId}', '${personName}', ${record.penalty})" 
                    class="btn btn-danger"
                    style="padding: 6px 10px;">
              <i class="fas fa-trash-alt"></i>
              حذف
            </button>
          </td>
        </tr>
      `;
    });
  } catch (error) {
    console.error("Error loading attendance records:", error);
    showAlert("خطا در دریافت سوابق حضور و غیاب", "danger");
  }
}

// Delete attendance record
async function deleteAttendanceRecord(recordId, personName, penalty) {
  if (!confirm(`آیا مطمئن هستید که می‌خواهید رکورد ${personName} را حذف کنید؟`)) return;
  
  try {
    // Get the record to get group information
    const recordRes = await fetch(`https://parseapi.back4app.com/classes/Attendance/${recordId}`, { headers });
    const record = await recordRes.json();
    
    // Find group in cache
    const asset = cache.assets.find(a => a.name === record.group);
    if (asset) {
      // Reverse the penalty
      const newAmount = asset.amount - penalty;
      
      // Update group assets in DB
      await fetch(`https://parseapi.back4app.com/classes/Assets/${asset.objectId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ amount: newAmount })
      });
      
      // Update cache
      asset.amount = newAmount;
    }
    
    // Delete the attendance record
    await fetch(`https://parseapi.back4app.com/classes/Attendance/${recordId}`, {
      method: "DELETE",
      headers
    });
    
    showAlert(`رکورد ${personName} با موفقیت حذف شد`, "success");
    renderAssetsTable();
    loadTodaysRecords();
  } catch (error) {
    console.error("Error deleting attendance record:", error);
    showAlert("خطا در حذف رکورد", "danger");
  }
}

// ====================== MEMBER MANAGEMENT ====================== //

// Add a new member
async function addMember() {
  const nameInput = document.getElementById("newMemberName");
  const name = nameInput.value.trim();
  const group = document.getElementById("memberGroupSelect").value;
  
  if (!name) {
    showAlert("لطفاً نام عضو را وارد کنید", "danger");
    return;
  }
  
  if (!group) {
    showAlert("لطفاً یک گروه انتخاب کنید", "danger");
    return;
  }

  try {
    // Check if member already exists
    if (cache.persons && cache.persons.some(p => p.name === name && p.group === group)) {
      showAlert("این عضو قبلاً در گروه ثبت شده است", "danger");
      return;
    }

    // Add new member
    const res = await fetch("https://parseapi.back4app.com/classes/Persons", {
      method: "POST",
      headers,
      body: JSON.stringify({ name, group })
    });
    
    const newMember = await res.json();
    
    // Update cache
    if (!cache.persons) cache.persons = [];
    cache.persons.push(newMember);
    
    // Update group member count in cache
    const asset = cache.assets.find(a => a.name === group);
    if (asset) {
      asset.memberCount = (asset.memberCount || 0) + 1;
    }
    
    nameInput.value = "";
    showAlert(`عضو ${name} با موفقیت به گروه ${group} اضافه شد`, "success");
    await loadMembers();
    renderAssetsTable();
  } catch (error) {
    console.error("Error adding member:", error);
    showAlert("خطا در افزودن عضو جدید", "danger");
  }
}

// Load members
async function loadMembers() {
  const group = document.getElementById("memberListGroupSelect").value;
  
  if (!cache.persons) {
    await fetchPersons();
  }
  
  let members = cache.persons;
  if (group) {
    members = members.filter(m => m.group === group);
  }
  
  const tbody = document.querySelector("#membersTable tbody");
  tbody.innerHTML = "";
  
  if (members.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center">هیچ عضوی یافت نشد</td></tr>`;
    return;
  }
  
  members.forEach(member => {
    tbody.innerHTML += `
      <tr>
        <td>${member.name}</td>
        <td>${member.group}</td>
        <td class="text-center">
          <button onclick="deleteMember('${member.objectId}', '${member.name}')" 
                  class="btn btn-danger"
                  style="padding: 6px 10px;">
            <i class="fas fa-trash-alt"></i>
            حذف
          </button>
        </td>
      </tr>
    `;
  });
}

// Delete a member
async function deleteMember(memberId, memberName) {
  if (!confirm(`آیا مطمئن هستید که می‌خواهید ${memberName} را حذف کنید؟`)) return;
  
  try {
    // Find member in cache
    const memberIndex = cache.persons.findIndex(p => p.objectId === memberId);
    if (memberIndex === -1) {
      showAlert("عضو مورد نظر یافت نشد", "danger");
      return;
    }
    
    const member = cache.persons[memberIndex];
    const group = member.group;
    
    // Delete member from DB
    await fetch(`https://parseapi.back4app.com/classes/Persons/${memberId}`, {
      method: "DELETE",
      headers
    });
    
    // Update cache
    cache.persons.splice(memberIndex, 1);
    
    // Update group member count in cache
    const asset = cache.assets.find(a => a.name === group);
    if (asset) {
      asset.memberCount = Math.max((asset.memberCount || 0) - 1, 0);
    }
    
    showAlert(`عضو ${memberName} با موفقیت حذف شد`, "success");
    await loadMembers();
    renderAssetsTable();
  } catch (error) {
    console.error("Error deleting member:", error);
    showAlert("خطا در حذف عضو", "danger");
  }
}

// ====================== REPORTS & SETTINGS ====================== //

// Show print preview
function showPrintPreview(tableId, title) {
  const table = document.getElementById(tableId).cloneNode(true);
  table.classList.add("print-table");
  
  document.getElementById("printTitle").textContent = title;
  document.getElementById("printDate").textContent = new Date().toLocaleDateString('fa-IR');
  document.getElementById("printTableContainer").innerHTML = "";
  document.getElementById("printTableContainer").appendChild(table);
  
  document.getElementById("printPreview").classList.add("active");
}

// Close print preview
function closePrintPreview() {
  document.getElementById("printPreview").classList.remove("active");
}

// End of day process
async function endOfDayProcess() {
  const classCount = parseInt(document.getElementById("classCount").value);
  const rewardAmount = parseInt(document.getElementById("rewardAmount").value);
  const taxAmount = parseInt(document.getElementById("taxAmount").value);
  
  if (!classCount || classCount <= 0) {
    showAlert("لطفاً تعداد کلاس‌های برگزار شده را وارد کنید", "danger");
    return;
  }
  
  if (!rewardAmount || rewardAmount <= 0) {
    showAlert("لطفاً مقدار پاداش را وارد کنید", "danger");
    return;
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`https://parseapi.back4app.com/classes/Attendance?where=${encodeURIComponent(JSON.stringify({ date: today }))}`, { headers });
    const data = await res.json();
    
    // Group records by person
    const attendanceByPerson = {};
    data.results.forEach(record => {
      const personId = record.person.objectId;
      if (!attendanceByPerson[personId]) {
        attendanceByPerson[personId] = {
          name: record.personName,
          group: record.group,
          presentCount: 0,
          totalCount: 0
        };
      }
      
      attendanceByPerson[personId].totalCount++;
      if (record.status === "حاضر") {
        attendanceByPerson[personId].presentCount++;
      }
    });
    
    // Prepare report and reward eligible members
    const reportBody = document.querySelector("#fullAttendanceTable tbody");
    reportBody.innerHTML = "";
    
    let eligibleCount = 0;
    
    for (const personId in attendanceByPerson) {
      const person = attendanceByPerson[personId];
      const isEligible = person.presentCount >= classCount;
      
      if (isEligible) {
        eligibleCount++;
        const netReward = rewardAmount - taxAmount;
        reportBody.innerHTML += `
          <tr>
            <td>${person.name}</td>
            <td>${person.group}</td>
            <td>${person.presentCount}</td>
            <td>${new Intl.NumberFormat('fa-IR').format(netReward)}</td>
          </tr>
        `;
        
        // Find group in cache
        const asset = cache.assets.find(a => a.name === person.group);
        if (asset) {
          const newAmount = asset.amount + netReward;
          
          // Update group assets in DB
          await fetch(`https://parseapi.back4app.com/classes/Assets/${asset.objectId}`, {
            method: "PUT",
            headers,
            body: JSON.stringify({ amount: newAmount })
          });
          
          // Update cache
          asset.amount = newAmount;
        }
      }
    }
    
    // Delete today's attendance records
    const deletePromises = data.results.map(record => 
      fetch(`https://parseapi.back4app.com/classes/Attendance/${record.objectId}`, {
        method: "DELETE",
        headers
      })
    );
    
    await Promise.all(deletePromises);
    
    showAlert(`پایان روز با موفقیت انجام شد. ${eligibleCount} عضو واجد شرایط پاداش بودند.`, "success");
    renderAssetsTable();
    loadTodaysRecords();
  } catch (error) {
    console.error("Error in end of day process:", error);
    showAlert("خطا در انجام عملیات پایان روز", "danger");
  }
}

// Helper function to update rules from form inputs
function updateRulesFromForm() {
  for (let i = 0; i < systemSettings.penaltyRules.length; i++) {
    const maxDelayInput = document.getElementById(`maxDelay${i}`);
    const penaltyInput = document.getElementById(`penalty${i}`);
    
    if (maxDelayInput && penaltyInput) {
      // Only update maxDelay for editable rows (not the last one)
      if (!maxDelayInput.disabled) {
        systemSettings.penaltyRules[i].maxDelay = parseInt(maxDelayInput.value) || 0;
      }
      systemSettings.penaltyRules[i].penalty = parseInt(penaltyInput.value) || 0;
    }
  }
}

// Load penalty rules
async function loadPenaltyRules() {
  try {
    const res = await fetch("https://parseapi.back4app.com/classes/PenaltyRules", { headers });
    const data = await res.json();
    
    if (data.results.length > 0) {
      systemSettings.penaltyRules = data.results.map(r => ({
        maxDelay: r.maxDelay,
        penalty: r.penalty
      }));
    }
    
    renderPenaltyRulesTable();
    loadPenaltySettings();
  } catch (e) {
    console.error("Error loading penalty rules:", e);
  }
}

// Render penalty rules table
function renderPenaltyRulesTable() {
  const tbody = document.querySelector("#penaltyRulesTable tbody");
  tbody.innerHTML = "";
  
  systemSettings.penaltyRules.forEach(rule => {
    const penalty = new Intl.NumberFormat('fa-IR').format(rule.penalty);
    const maxDelay = rule.maxDelay === 9999 ? "بیش از ۳۰ دقیقه" : rule.maxDelay;
    
    tbody.innerHTML += `
      <tr>
        <td>${maxDelay}</td>
        <td>${penalty}</td>
      </tr>
    `;
  });
}

// Load penalty settings for editing
function loadPenaltySettings() {
  const tbody = document.querySelector("#penaltySettingsTable tbody");
  tbody.innerHTML = "";
  
  systemSettings.penaltyRules.forEach((rule, index) => {
    const isLast = index === systemSettings.penaltyRules.length - 1;
    tbody.innerHTML += `
      <tr>
        <td>
          <input type="number" class="form-control" id="maxDelay${index}" 
                 value="${rule.maxDelay}" min="0" ${isLast ? 'disabled' : ''}
                 onchange="handleRuleChange(${index}, 'maxDelay')">
        </td>
        <td>
          <input type="number" class="form-control" id="penalty${index}" 
                 value="${rule.penalty}"
                 onchange="handleRuleChange(${index}, 'penalty')">
        </td>
        <td>
          <button class="btn btn-danger" 
                  ${isLast ? 'disabled' : ''}
                  onclick="removeRule(${index})">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });
}

// Handle rule changes in form
function handleRuleChange(index, type) {
  const value = parseInt(document.getElementById(`${type}${index}`).value) || 0;
  
  if (type === 'maxDelay') {
    systemSettings.penaltyRules[index].maxDelay = value;
  } else {
    systemSettings.penaltyRules[index].penalty = value;
  }
}

// Add a new rule
function addRule() {
  // Use previous rule as base or default values
  const prevIndex = systemSettings.penaltyRules.length - 2;
  const baseRule = prevIndex >= 0 ? 
    {...systemSettings.penaltyRules[prevIndex]} : 
    { maxDelay: 15, penalty: -1500 };
  
  // Add 5 minutes to delay
  baseRule.maxDelay += 5;
  
  // Add before the last rule
  systemSettings.penaltyRules.splice(
    systemSettings.penaltyRules.length - 1, 
    0, 
    baseRule
  );
  
  loadPenaltySettings();
}

// Remove a rule
function removeRule(index) {
  //if (index === 0 || index === systemSettings.penaltyRules.length - 1) return;
  systemSettings.penaltyRules.splice(index-1, 1);
  loadPenaltySettings();
}

// Save rules to database
async function saveRules() {
  const masterPassword = document.getElementById("ruleMasterPassword").value;
  
  if (masterPassword !== systemSettings.masterPassword) {
    showAlert("رمز ویژه وارد شده صحیح نیست", "danger");
    return;
  }
  
  try {
    // Ensure we have latest values
    updateRulesFromForm();
    
    // Delete all existing rules
    const existing = await fetch("https://parseapi.back4app.com/classes/PenaltyRules", { headers })
                          .then(r => r.json());
    const deletePromises = existing.results.map(r => 
      fetch(`https://parseapi.back4app.com/classes/PenaltyRules/${r.objectId}`, {
        method: "DELETE",
        headers
      })
    );
    
    await Promise.all(deletePromises);
    
    // Save new rules
    const savePromises = systemSettings.penaltyRules.map(rule => 
      fetch("https://parseapi.back4app.com/classes/PenaltyRules", {
        method: "POST",
        headers,
        body: JSON.stringify(rule)
      })
    );
    
    await Promise.all(savePromises);
    
    showAlert("قوانین با موفقیت ذخیره شدند", "success");
    renderPenaltyRulesTable();
    loadPenaltySettings();
  } catch (err) {
    console.error("Error saving rules:", err);
    showAlert("خطا در ذخیره قوانین", "danger");
  }
}

/*

// Load penalty rules
async function loadPenaltyRules() {
  try {
    const res = await fetch("https://parseapi.back4app.com/classes/PenaltyRules", { headers });
    const data = await res.json();
    
    if (data.results.length > 0) {
      systemSettings.penaltyRules = data.results.map(r => ({
        maxDelay: r.maxDelay,
        penalty: r.penalty
      }));
    }
    
    renderPenaltyRulesTable();
    loadPenaltySettings();
  } catch (e) {
    console.error("Error loading penalty rules:", e);
  }
}

// Render penalty rules table
function renderPenaltyRulesTable() {
  const tbody = document.querySelector("#penaltyRulesTable tbody");
  tbody.innerHTML = "";
  
  systemSettings.penaltyRules.forEach(rule => {
    const penalty = new Intl.NumberFormat('fa-IR').format(rule.penalty);
    const maxDelay = rule.maxDelay === 9999 ? "بیش از ۳۰ دقیقه" : rule.maxDelay;
    
    tbody.innerHTML += `
      <tr>
        <td>${maxDelay}</td>
        <td>${penalty}</td>
      </tr>
    `;
  });
}

// Load penalty settings for editing
function loadPenaltySettings() {
  const tbody = document.querySelector("#penaltySettingsTable tbody");
  tbody.innerHTML = "";
  const rule = {maxDelay : 0, penalty : 0}
  systemSettings.penaltyRules.forEach((rule, index) => {
    const isLast = index === systemSettings.penaltyRules.length - 1;
    tbody.innerHTML += `
      <tr>
        <td>
          <input type="number" class="form-control" id="maxDelay${index}" 
                 value="${rule.maxDelay}" min="0" ${isLast ? 'disabled' : ''}>
        </td>
        <td>
          <input type="number" class="form-control" id="penalty${index}" 
                 value="${rule.penalty}">
        </td>
        <td>
          <button class="btn btn-danger" 
                  ${isLast ? 'disabled' : ''}
                  onclick="removeRule(${index})">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });
}

// Add a new rule
function addRule() {
  systemSettings.penaltyRules.splice(systemSettings.penaltyRules.length - 1, 0, {
    maxDelay: rule.maxDelay ,
    penalty: rule.penalty
  });
  loadPenaltySettings();
}

// Remove a rule
function removeRule(index) {
  if (index === 0 || index === systemSettings.penaltyRules.length - 1) return;
  systemSettings.penaltyRules.splice(index, 1);
  loadPenaltySettings();
}

// Save rules to database
async function saveRules() {
  const masterPassword = document.getElementById("ruleMasterPassword").value;
  
  if (masterPassword !== systemSettings.masterPassword) {
    showAlert("رمز ویژه وارد شده صحیح نیست", "danger");
    return;
  }
  
  try {
    // Delete all existing rules
    const existing = await fetch("https://parseapi.back4app.com/classes/PenaltyRules", { headers })
                          .then(r => r.json());
    const deletePromises = existing.results.map(r => 
      fetch(`https://parseapi.back4app.com/classes/PenaltyRules/${r.objectId}`, {
        method: "DELETE",
        headers
      })
    );
    
    await Promise.all(deletePromises);
    
    // Save new rules
    const savePromises = systemSettings.penaltyRules.map(rule => 
      fetch("https://parseapi.back4app.com/classes/PenaltyRules", {
        method: "POST",
        headers,
        body: JSON.stringify(rule)
      })
    );
    
    await Promise.all(savePromises);
    
    showAlert("قوانین با موفقیت ذخیره شدند", "success");
    renderPenaltyRulesTable();
    loadPenaltySettings();
  } catch (err) {
    console.error("Error saving rules:", err);
    showAlert("خطا در ذخیره قوانین", "danger");
  }
}

*/

// Load reward settings
async function loadRewardSettings() {
  try {
    const res = await fetch("https://parseapi.back4app.com/classes/SystemSettings", { headers });
    const data = await res.json();
    
    if (data.results.length > 0) {
      const settings = data.results[0];
      
      // Update form fields
      document.getElementById("dailyReward").value = settings.dailyReward || 10000;
      document.getElementById("taxAmount").value = settings.tax || 1000;
      document.getElementById("rewardAmount").value = settings.dailyReward || 10000;
      document.getElementById("taxAmountSettings").value = settings.tax || 1000;
      document.getElementById("absentPenalty").value = Math.abs(settings.absentPenalty || 5000);
    }
  } catch (error) {
    console.error("Error loading reward settings:", error);
  }
}

// Save reward settings
async function saveRewardSettings() {
  const dailyReward = parseInt(document.getElementById("dailyReward").value) || 10000;
  const tax = parseInt(document.getElementById("taxAmountSettings").value) || 1000;
  const absentPenalty = -Math.abs(parseInt(document.getElementById("absentPenalty").value)) || -5000;
  
  try {
    const res = await fetch("https://parseapi.back4app.com/classes/SystemSettings", { headers });
    const data = await res.json();
    
    let updatePromise;
    
    if (data.results.length > 0) {
      const settings = data.results[0];
      updatePromise = fetch(`https://parseapi.back4app.com/classes/SystemSettings/${settings.objectId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          dailyReward: dailyReward,
          tax: tax,
          absentPenalty: absentPenalty
        })
      });
    } else {
      updatePromise = fetch("https://parseapi.back4app.com/classes/SystemSettings", {
        method: "POST",
        headers,
        body: JSON.stringify({
          adminPassword: systemSettings.adminPassword,
          masterPassword: systemSettings.masterPassword,
          dailyReward: dailyReward,
          tax: tax,
          absentPenalty: absentPenalty
        })
      });
    }
    
    await updatePromise;
    
    // Update local settings
    systemSettings.dailyReward = dailyReward;
    systemSettings.tax = tax;
    systemSettings.absentPenalty = absentPenalty;
    
    showAlert("تنظیمات پاداش و مالیات با موفقیت ذخیره شد", "success");
  } catch (error) {
    console.error("Error saving reward settings:", error);
    showAlert("خطا در ذخیره تنظیمات", "danger");
  }
}

// ====================== UTILITY FUNCTIONS ====================== //

// Show alert message
function showAlert(message, type) {
  const alertDiv = document.createElement("div");
  alertDiv.className = `alert alert-${type}`;
  alertDiv.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
    ${message}
  `;
  
  const container = document.querySelector(".container");
  if (container) container.prepend(alertDiv);
  
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.parentNode.removeChild(alertDiv);
    }
  }, 5000);
}

// Switch between tabs
function switchTab(tabName) {
  // Hide all tabs
  document.querySelectorAll(".tab-content").forEach(tab => {
    tab.classList.remove("active");
  });
  
  // Deactivate all tab buttons
  document.querySelectorAll(".tab").forEach(tab => {
    tab.classList.remove("active");
  });
  
  // Activate selected tab
  document.getElementById(`${tabName}Tab`).classList.add("active");
  
  // Activate tab button
  document.querySelectorAll(".tab").forEach(tab => {
    if (tab.textContent.trim() === document.querySelector(`#${tabName}Tab .card-title`).textContent.trim()) {
      tab.classList.add("active");
    }
  });
}

// Logout function
function logout() {
  localStorage.removeItem("loggedIn");
  loginSection.classList.remove("hidden");
  mainSection.classList.add("hidden");
  document.getElementById("accessCode").value = "";
  showAlert("با موفقیت از سیستم خارج شدید", "success");
}

// Master password modals
function showMasterPasswordModal() {
  masterPasswordModal.style.display = "flex";
}

function closeMasterPasswordModal() {
  masterPasswordModal.style.display = "none";
  document.getElementById("masterPassword").value = "";
  document.getElementById("newMainPassword").value = "";
  document.getElementById("confirmMainPassword").value = "";
}

async function changeMainPassword() {
  const masterPassword = document.getElementById("masterPassword").value;
  const newPassword = document.getElementById("newMainPassword").value;
  const confirmPassword = document.getElementById("confirmMainPassword").value;
  
  if (masterPassword !== systemSettings.masterPassword) {
    showAlert("رمز ویژه وارد شده صحیح نیست", "danger");
    return;
  }
  
  if (newPassword !== confirmPassword) {
    showAlert("رمزهای عبور جدید با هم مطابقت ندارند", "danger");
    return;
  }
  
  if (newPassword.length < 4) {
    showAlert("رمز عبور باید حداقل ۴ کاراکتر باشد", "danger");
    return;
  }
  
  try {
    const res = await fetch("https://parseapi.back4app.com/classes/SystemSettings", { headers });
    const data = await res.json();
    
    if (data.results.length > 0) {
      const settings = data.results[0];
      await fetch(`https://parseapi.back4app.com/classes/SystemSettings/${settings.objectId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ adminPassword: newPassword })
      });
    }
    
    systemSettings.adminPassword = newPassword;
    showAlert("رمز عبور اصلی با موفقیت تغییر یافت", "success");
    closeMasterPasswordModal();
  } catch (error) {
    console.error("Error changing password:", error);
    showAlert("خطا در تغییر رمز عبور", "danger");
  }
}

async function changeAdminPassword() {
  const masterPassword = document.getElementById("currentMasterPassword").value;
  const newPassword = document.getElementById("newAdminPassword").value;
  const confirmPassword = document.getElementById("confirmAdminPassword").value;
  
  if (masterPassword !== systemSettings.masterPassword) {
    showAlert("رمز ویژه وارد شده صحیح نیست", "danger");
    return;
  }
  
  if (newPassword !== confirmPassword) {
    showAlert("رمزهای عبور جدید با هم مطابقت ندارند", "danger");
    return;
  }
  
  if (newPassword.length < 4) {
    showAlert("رمز عبور باید حداقل ۴ کاراکتر باشد", "danger");
    return;
  }
  
  try {
    const res = await fetch("https://parseapi.back4app.com/classes/SystemSettings", { headers });
    const data = await res.json();
    
    if (data.results.length > 0) {
      const settings = data.results[0];
      await fetch(`https://parseapi.back4app.com/classes/SystemSettings/${settings.objectId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ adminPassword: newPassword })
      });
    }
    
    systemSettings.adminPassword = newPassword;
    showAlert("رمز عبور مدیر با موفقیت تغییر یافت", "success");
    
    // Reset fields
    document.getElementById("currentMasterPassword").value = "";
    document.getElementById("newAdminPassword").value = "";
    document.getElementById("confirmAdminPassword").value = "";
  } catch (error) {
    console.error("Error changing password:", error);
    showAlert("خطا در تغییر رمز عبور", "danger");
  }
}

// ====================== GLOBAL EXPORTS ====================== //
// Expose functions to global scope for HTML event handlers
window.handleLogin = handleLogin;
window.logout = logout;
window.showMasterPasswordModal = showMasterPasswordModal;
window.closeMasterPasswordModal = closeMasterPasswordModal;
window.changeMainPassword = changeMainPassword;
window.changeAdminPassword = changeAdminPassword;
window.switchTab = switchTab;
window.fetchAssets = fetchAssets;
window.updateCurrentAssetDisplay = updateCurrentAssetDisplay;
window.changeAsset = changeAsset;
window.addGroup = addGroup;
window.removeGroup = removeGroup;
window.populateAttendance = populateAttendance;
window.submitAttendance = submitAttendance;
window.markAbsent = markAbsent;
window.loadTodaysRecords = loadTodaysRecords;
window.deleteAttendanceRecord = deleteAttendanceRecord;
window.addMember = addMember;
window.loadMembers = loadMembers;
window.deleteMember = deleteMember;
window.showPrintPreview = showPrintPreview;
window.closePrintPreview = closePrintPreview;
window.endOfDayProcess = endOfDayProcess;
window.addRule = addRule;
window.removeRule = removeRule;
window.saveRules = saveRules;
window.saveRewardSettings = saveRewardSettings;

// Add to global scope
window.handleRuleChange = handleRuleChange;