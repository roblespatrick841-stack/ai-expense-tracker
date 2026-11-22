/**
 * Class: ExpenseItem
 * Models an individual meal or food expense entry.
 */
class ExpenseItem {
  constructor(id, name, price, category, day) {
    this.id = id;
    this.name = name.trim();
    this.price = Number(price);
    this.category = category;
    this.day = day;
  }
}

/**
 * Class: CurrencyFormatter
 * Formats numbers into Philippine Peso (PHP).
 */
class CurrencyFormatter {
  static toPeso(value) {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }
}

/**
 * Class: FoodExpenseTracker
 * Stores weekly allowance and an array of ExpenseItem objects,
 * computes totals and breakdowns, and persists state in localStorage.
 */
class FoodExpenseTracker {
  constructor(storageKey = "food_expense_tracker_v1") {
    this.storageKey = storageKey;
    this.days = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday"
    ];
    this.categories = [
      "Breakfast",
      "Lunch",
      "Dinner",
      "Snacks",
      "Drinks",
      "Groceries"
    ];

    this.weeklyAllowance = 1500;
    this.meals = [];
    this.loadData();
  }

  setWeeklyAllowance(amount) {
    const numeric = Number(amount);
    if (Number.isNaN(numeric) || numeric < 0) {
      return false;
    }
    this.weeklyAllowance = numeric;
    this.saveData();
    return true;
  }

  addMeal(name, price, category, day) {
    const id = ${Date.now()}-${Math.random().toString(36).slice(2, 7)};
    const meal = new ExpenseItem(id, name, price, category, day);
    this.meals.unshift(meal);
    this.saveData();
    return meal;
  }

  deleteMeal(id) {
    this.meals = this.meals.filter((meal) => meal.id !== id);
    this.saveData();
  }

  clearMeals() {
    this.meals = [];
    this.saveData();
  }

  getTotalExpenses() {
    return this.meals.reduce((total, meal) => total + meal.price, 0);
  }

  getRemainingBalance() {
    return this.weeklyAllowance - this.getTotalExpenses();
  }

  getAllowanceUsagePercent() {
    if (this.weeklyAllowance <= 0) {
      return this.getTotalExpenses() > 0 ? 100 : 0;
    }
    return (this.getTotalExpenses() / this.weeklyAllowance) * 100;
  }

  getDailyAverageSpend() {
    const uniqueDays = new Set(this.meals.map((meal) => meal.day)).size;
    const divisor = uniqueDays > 0 ? uniqueDays : 7;
    return this.getTotalExpenses() / divisor;
  }

  getCategorySummary() {
    const totalSpent = this.getTotalExpenses();

    return this.categories.map((category) => {
      const subtotal = this.meals
        .filter((meal) => meal.category === category)
        .reduce((sum, meal) => sum + meal.price, 0);

      const shareOfSpend = totalSpent > 0 ? (subtotal / totalSpent) * 100 : 0;
      const shareOfAllowance =
        this.weeklyAllowance > 0 ? (subtotal / this.weeklyAllowance) * 100 : 0;

      return {
        category,
        subtotal,
        shareOfSpend,
        shareOfAllowance
      };
    });
  }

  getTopCategory() {
    const active = this.getCategorySummary().filter((item) => item.subtotal > 0);
    if (active.length === 0) return null;
    return active.reduce((best, current) =>
      current.subtotal > best.subtotal ? current : best
    );
  }

  getDailySpendingSummary() {
    return this.days.map((day) => {
      const subtotal = this.meals
        .filter((meal) => meal.day === day)
        .reduce((sum, meal) => sum + meal.price, 0);

      return {
        day,
        shortLabel: day.slice(0, 3),
        subtotal
      };
    });
  }

  getFilteredMeals(selectedCategory = "All") {
    if (selectedCategory === "All") {
      return this.meals;
    }
    return this.meals.filter((meal) => meal.category === selectedCategory);
  }

  saveData() {
    const payload = {
      weeklyAllowance: this.weeklyAllowance,
      meals: this.meals
    };
    localStorage.setItem(this.storageKey, JSON.stringify(payload));
  }

  loadData() {
    const saved = localStorage.getItem(this.storageKey);
    if (!saved) {
      this.meals = [
        new ExpenseItem("m-1", "Tapsilog & Coffee", 110, "Breakfast", "Monday"),
        new ExpenseItem("m-2", "Chicken Adobo w/ Rice", 135, "Lunch", "Monday"),
        new ExpenseItem("m-3", "Banana Cue & Iced Tea", 40, "Snacks", "Tuesday")
      ];
      this.saveData();
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      this.weeklyAllowance =
        typeof parsed.weeklyAllowance === "number" ? parsed.weeklyAllowance : 1500;
      this.meals = Array.isArray(parsed.meals)
        ? parsed.meals.map(
            (m) => new ExpenseItem(m.id, m.name, m.price, m.category, m.day)
          )
        : [];
    } catch {
      this.meals = [];
    }
  }
}

/**
 * Class: TrackerView
 * Connects FoodExpenseTracker state to DOM elements and handles user interactions.
 */
class TrackerView {
  constructor(tracker) {
    this.tracker = tracker;
    this.activeCategoryFilter = "All";

    this.allowanceInput = document.getElementById("allowanceInput");
    this.updateAllowanceBtn = document.getElementById("updateAllowanceBtn");
    this.mealForm = document.getElementById("mealForm");
    this.mealNameInput = document.getElementById("mealName");
    this.mealPriceInput = document.getElementById("mealPrice");
    this.mealCategoryInput = document.getElementById("mealCategory");
    this.mealDayInput = document.getElementById("mealDay");
    this.formAlert = document.getElementById("formAlert");

    this.allowanceDisplay = document.getElementById("allowanceDisplay");
    this.totalExpensesDisplay = document.getElementById("totalExpensesDisplay");
    this.mealCountDisplay = document.getElementById("mealCountDisplay");
    this.remainingBalanceDisplay = document.getElementById("remainingBalanceDisplay");
    this.allowanceProgressBar = document.getElementById("allowanceProgressBar");
    this.usagePercentDisplay = document.getElementById("usagePercentDisplay");
    this.dailyAverageDisplay = document.getElementById("dailyAverageDisplay");
    this.topCategoryDisplay = document.getElementById("topCategoryDisplay");

    this.categoryBreakdownEl = document.getElementById("categoryBreakdown");
    this.dailySpendingChartEl = document.getElementById("dailySpendingChart");
    this.peakDayBadge = document.getElementById("peakDayBadge");
    this.mealsTableBody = document.getElementById("mealsTableBody");
    this.categoryFilter = document.getElementById("categoryFilter");
    this.resetMealsBtn = document.getElementById("resetMealsBtn");

    this.init();
  }

  init() {
    this.allowanceInput.value = this.tracker.weeklyAllowance.toFixed(2);
    this.setCurrentDayDefault();
    this.attachEvents();
    this.renderAll();
  }

  setCurrentDayDefault() {
    const dayIndex = new Date().getDay();
    const weekOrder = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday"
    ];
    this.mealDayInput.value = weekOrder[dayIndex];
  }

  attachEvents() {
    this.updateAllowanceBtn.addEventListener("click", () => this.onAllowanceUpdate());

    this.allowanceInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        this.onAllowanceUpdate();
      }
    });

    this.mealForm.addEventListener("submit", (event) => {
      event.preventDefault();
      this.onMealSubmit();
    });

    this.categoryFilter.addEventListener("change", (event) => {
      this.activeCategoryFilter = event.target.value;
      this.renderMealsTable();
    });

    this.resetMealsBtn.addEventListener("click", () => {
      if (this.tracker.meals.length === 0) return;
      this.tracker.clearMeals();
      this.renderAll();
    });

    this.mealsTableBody.addEventListener("click", (event) => {
      const deleteBtn = event.target.closest(".remove-btn");
      if (!deleteBtn) return;
      this.tracker.deleteMeal(deleteBtn.dataset.id);
      this.renderAll();
    });
  }

  onAllowanceUpdate() {
    const ok = this.tracker.setWeeklyAllowance(this.allowanceInput.value);
    if (ok) {
      this.allowanceInput.value = this.tracker.weeklyAllowance.toFixed(2);
      this.renderAll();
    }
  }

  onMealSubmit() {
    const name = this.mealNameInput.value.trim();
    const price = Number(this.mealPriceInput.value);
    const category = this.mealCategoryInput.value;
    const day = this.mealDayInput.value;

    if (!name) {
      this.showAlert("Please enter a food or meal name.");
      return;
    }

    if (Number.isNaN(price) || price <= 0) {
      this.showAlert("Please enter a price greater than ₱0.00.");
      return;
    }

    this.hideAlert();
    this.tracker.addMeal(name, price, category, day);

    this.mealNameInput.value = "";
    this.mealPriceInput.value = "";
    this.mealNameInput.focus();

    this.renderAll();
  }

  showAlert(message) {
    this.formAlert.textContent = message;
    this.formAlert.hidden = false;
  }

  hideAlert() {
    this.formAlert.hidden = true;
    this.formAlert.textContent = "";
  }

  renderAll() {
    this.renderSummary();
    this.renderCategoryBreakdown();
    this.renderDailySpending();
    this.renderMealsTable();
  }

  renderSummary() {
    const allowance = this.tracker.weeklyAllowance;
    const totalSpent = this.tracker.getTotalExpenses();
    const remaining = this.tracker.getRemainingBalance();
    const usagePct = this.tracker.getAllowanceUsagePercent();
    const dailyAvg = this.tracker.getDailyAverageSpend();
    const topCategory = this.tracker.getTopCategory();

    this.allowanceDisplay.textContent = CurrencyFormatter.toPeso(allowance);
    this.totalExpensesDisplay.textContent = CurrencyFormatter.toPeso(totalSpent);
    this.mealCountDisplay.textContent = `${this.tracker.meals.length}${
      this.tracker.meals.length === 1 ? "meal" : "meals"
    } recorded`;

    this.remainingBalanceDisplay.textContent = CurrencyFormatter.toPeso(remaining);
    this.remainingBalanceDisplay.className = "metric-value balance-value";

    if (remaining < 0) {
      this.remainingBalanceDisplay.classList.add("is-bad");
      this.allowanceProgressBar.style.backgroundColor = "var(--bad)";
    } else if (usagePct >= 80) {
      this.remainingBalanceDisplay.classList.add("is-warn");
      this.allowanceProgressBar.style.backgroundColor = "var(--warn)";
    } else {
      this.remainingBalanceDisplay.classList.add("is-ok");
      this.allowanceProgressBar.style.backgroundColor = "var(--primary)";
    }

    const barWidth = Math.min(usagePct, 100);
    this.allowanceProgressBar.style.width = ${barWidth.toFixed(1)}\%; this.usagePercentDisplay.textContent = ${usagePct.toFixed(1)}% used;

    this.dailyAverageDisplay.textContent = CurrencyFormatter.toPeso(dailyAvg);
    this.topCategoryDisplay.textContent = topCategory
      ? Top category: ${topCategory.category} (${CurrencyFormatter.toPeso(topCategory.subtotal)})
      : "Top category: None";
  }

  renderCategoryBreakdown() {
    const rows = this.tracker.getCategorySummary();

    this.categoryBreakdownEl.innerHTML = rows
      .map(
        (item) => `
        <div class="category-row">
          <div class="category-meta">
            <span class="category-name">${item.category}</span>
            <span class="category-stats">
              ${CurrencyFormatter.toPeso(item.subtotal)} (${item.shareOfSpend.toFixed(0)}%)
            </span>
          </div>
          <div class="category-bar-track">
            <div class="category-bar-fill" style="width: ${item.shareOfSpend.toFixed(1)}%"></div>
          </div>
        </div>
      `
      )
      .join("");
  }

  renderDailySpending() {
    const daysData = this.tracker.getDailySpendingSummary();
    const maxVal = Math.max(...daysData.map((d) => d.subtotal), 0);

    if (maxVal > 0) {
      const peakDay = daysData.reduce((prev, curr) =>
        curr.subtotal > prev.subtotal ? curr : prev
      );
      this.peakDayBadge.textContent = Highest: ${peakDay.day} (${CurrencyFormatter.toPeso( peakDay.subtotal )}); } else { this.peakDayBadge.textContent = "Highest: —"; }  this.dailySpendingChartEl.innerHTML = daysData .map((item) => { const heightPct = maxVal > 0 ? (item.subtotal / maxVal) * 100 : 0; const isPeak = maxVal > 0 && item.subtotal === maxVal; const shortPeso = item.subtotal > 0 ? ₱${Math.round(item.subtotal)} : "₱0";

        return `
          <div class="day-item" title="${item.day}:${CurrencyFormatter.toPeso(item.subtotal)}">
            <span class="day-val">${shortPeso}</span>
            <div class="day-slot">
              <div class="day-fill ${isPeak ? "is-peak" : ""}" style="height: ${heightPct.toFixed(1)}%"></div>
            </div>
            <span class="day-title">${item.shortLabel}</span>
          </div>
        `;
      })
      .join("");
  }

  renderMealsTable() {
    const meals = this.tracker.getFilteredMeals(this.activeCategoryFilter);

    if (meals.length === 0) {
      this.mealsTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-row">
            No food expenses match this filter yet. Add a meal using the form on the left.
          </td>
        </tr>
      `;
      return;
    }

    this.mealsTableBody.innerHTML = meals
      .map(
        (meal) => `
        <tr>
          <td><strong>${this.escapeText(meal.name)}</strong></td>
          <td><span class="tag">${this.escapeText(meal.category)}</span></td>
          <td>${this.escapeText(meal.day)}</td>
          <td class="align-right price-col">${CurrencyFormatter.toPeso(meal.price)}</td>
          <td class="align-center">
            <button
              type="button"
              class="remove-btn"
              data-id="${meal.id}"
              aria-label="Remove ${this.escapeText(meal.name)}"
              title="Remove meal"
            >
              ✕
            </button>
          </td>
        </tr>
      `
      )
      .join("");
  }

  escapeText(text) {
    const temp = document.createElement("div");
    temp.textContent = text;
    return temp.innerHTML;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const tracker = new FoodExpenseTracker();
  new TrackerView(tracker);
});