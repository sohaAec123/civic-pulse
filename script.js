document.addEventListener("DOMContentLoaded", function () {
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }

  const form = document.getElementById("problemForm");
  const resultSection = document.getElementById("resultSection");
  const submitBtn = document.getElementById("submitBtn");
  const frequencyInput = document.getElementById("frequencyInput");
  const severityInput = document.getElementById("severityInput");
  const alternativeInput = document.getElementById("alternativeInput");

  function applyOptionSelection(buttons, selectedButton) {
    buttons.forEach(function (btn) {
      btn.classList.remove("bg-black", "text-white");
      btn.classList.add("bg-white", "text-black");
    });

    selectedButton.classList.remove("bg-white", "text-black");
    selectedButton.classList.add("bg-black", "text-white");
  }

  function setupOptionGroup(groupId, inputId) {
    const group = document.getElementById(groupId);
    const input = document.getElementById(inputId);

    if (!group || !input) {
      return;
    }

    const buttons = group.querySelectorAll(".option-btn");

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        applyOptionSelection(buttons, button);
        input.value = button.dataset.value || "";
      });
    });
  }

  setupOptionGroup("frequencyGroup", "frequencyInput");
  setupOptionGroup("severityGroup", "severityInput");
  setupOptionGroup("alternativeGroup", "alternativeInput");

  function getRecommendedAction(payload, priority) {
    const category = payload.category || "community issue";

    if (priority === "Critical") {
      return [
        "1. Deploy emergency response coordination with municipal leadership.",
        "2. Activate temporary public services, alternative routes, and emergency communications.",
        "3. Secure funding and begin repair or mitigation work within 24 hours."
      ].join("\n");
    }

    if (priority === "High") {
      return [
        "1. Prioritize inspections and rapid intervention within the next 72 hours.",
        "2. Coordinate local departments to reduce public risk and service disruption.",
        "3. Prepare a community update and schedule follow-up monitoring."
      ].join("\n");
    }

    if (priority === "Medium") {
      return [
        "1. Schedule regular municipal review and maintenance planning.",
        "2. Assign community liaison updates to residents and stakeholders.",
        "3. Review service alternatives and mitigation options before escalation."
      ].join("\n");
    }

    return [
      "1. Log the issue for routine maintenance and reporting.",
      "2. Monitor conditions and collect citizen impact data.",
      "3. Reassess the issue if the category or scale changes significantly."
    ].join("\n");
  }

  function displayResult(result, payload) {
    const resultFields = {
      resProblemTitle: payload.problem || "Problem Title",
      resCategoryHeader: payload.category || "Category",
      resPeopleCount: String(result.people_affected || 0),
      resPriorityScore: `${result.priority_score || 0}/100`,
      resPriorityLevel: result.priority_level || "LOW PRIORITY",
      resCategoryGrid: payload.category || "--",
      resFrequency: payload.frequency || "--",
      resSeverity: payload.severity || "--",
      resAlternative: payload.alternative || "--",
      resFactorSeverity: result.key_factors?.severity_impact || "Severity Impact",
      resFactorFrequency: result.key_factors?.frequency_rate || "Frequency Rate",
      resFactorPeople: result.key_factors?.population_affected || "Population Impact",
      resFactorAlternative: result.key_factors?.alternative_status || "Alternative Status",
      resAIExplanation: result.ai_explanation || "CivicPulse assessment is unavailable.",
      resRecommendedAction: getRecommendedAction(payload, result.priority)
    };

    Object.entries(resultFields).forEach(function ([id, value]) {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    });

    const badge = document.getElementById("resLevelBadge");
    if (badge) {
      badge.classList.remove(
        "bg-red-700",
        "bg-amber-500",
        "bg-yellow-400",
        "bg-gray-200",
        "text-white",
        "text-black",
        "text-gray-900"
      );

      if (result.priority === "Critical") {
        badge.classList.add("bg-red-700", "text-white");
      } else if (result.priority === "High") {
        badge.classList.add("bg-amber-500", "text-black");
      } else if (result.priority === "Medium") {
        badge.classList.add("bg-yellow-400", "text-black");
      } else {
        badge.classList.add("bg-gray-200", "text-gray-900");
      }
    }

    if (resultSection) {
      resultSection.classList.remove("hidden");
      resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  async function submitToFlaskBackend(payload) {
    const response = await fetch("/api/prioritize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Backend error");
    }

    const score = Number(data.score) || 0;
    let priorityLevel = "LOW PRIORITY";

    if (data.priority === "Critical") {
      priorityLevel = "CRITICAL URGENCY";
    } else if (data.priority === "High") {
      priorityLevel = "HIGH PRIORITY";
    } else if (data.priority === "Medium") {
      priorityLevel = "MODERATE PRIORITY";
    }

    const factors = data.key_factors || {};
    const peopleAffected = Number(factors.people_affected) || 0;

    return {
      priority_level: priorityLevel,
      priority_score: Math.round((score / 15) * 100),
      raw_score: score,
      priority: data.priority,
      problem: data.problem,
      category: data.category,
      people_affected: peopleAffected,
      frequency: factors.frequency || "",
      severity: factors.severity || "",
      alternative: factors.alternative_available || "",
      key_factors: {
        severity_impact: `${factors.severity || "Unknown"} Impact`,
        frequency_rate: `${factors.frequency || "Unknown"} Interruption`,
        population_affected: `${peopleAffected.toLocaleString()} Citizens Impacted`,
        alternative_status: String(factors.alternative_available || "").toLowerCase() === "yes"
          ? "Alternative Route/Source Exists"
          : "CRITICAL: No Viable Alternative Available"
      },
      ai_explanation: data.ai_explanation || "CivicPulse has calculated the priority of this community issue."
    };
  }

  if (form) {
    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      const problemTitle = document.getElementById("problemTitle");
      const problemCategory = document.getElementById("problemCategory");
      const peopleAffected = document.getElementById("peopleAffected");

      const problem = problemTitle ? problemTitle.value.trim() : "";
      const category = problemCategory ? problemCategory.value : "";
      const people = peopleAffected ? peopleAffected.value : "";
      const selectedFrequency = frequencyInput ? frequencyInput.value : "";
      const selectedSeverity = severityInput ? severityInput.value : "";
      const selectedAlternative = alternativeInput ? alternativeInput.value : "";

      if (!problem) {
        alert("Please enter the problem title.");
        return;
      }

      if (!category) {
        alert("Please select a category.");
        return;
      }

      if (!people || Number(people) < 1) {
        alert("Please enter the number of people affected.");
        return;
      }

      if (!selectedFrequency) {
        alert("Please select the frequency.");
        return;
      }

      if (!selectedSeverity) {
        alert("Please select the severity.");
        return;
      }

      if (!selectedAlternative) {
        alert("Please select whether an alternative is available.");
        return;
      }

      const payload = {
        problem: problem,
        category: category,
        people_affected: Number(people),
        frequency: selectedFrequency,
        severity: selectedSeverity,
        alternative_available: selectedAlternative
      };

      const originalButtonHTML = submitBtn ? submitBtn.innerHTML : "";

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = "<span>ANALYZING...</span>";
      }

      try {
        const result = await submitToFlaskBackend(payload);
        displayResult(result, payload);
        window.lastSubmittedPayload = payload;
      } catch (error) {
        console.error("CivicPulse Error:", error);
        alert("Could not connect to the CivicPulse backend.\n\n" + (error.message || "Unknown error"));
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalButtonHTML;
        }

        if (typeof lucide !== "undefined") {
          lucide.createIcons();
        }
      }
    });
  }

  function resetOptionButtons() {
    document.querySelectorAll(".option-btn").forEach(function (btn) {
      btn.classList.remove("bg-black", "text-white");
      btn.classList.add("bg-white", "text-black");
    });

    if (frequencyInput) frequencyInput.value = "";
    if (severityInput) severityInput.value = "";
    if (alternativeInput) alternativeInput.value = "";
  }

  window.resetFormAndResult = function () {
    const formNode = document.getElementById("problemForm");
    if (formNode) {
      formNode.reset();
    }

    resetOptionButtons();

    const fieldsToClear = [
      "resProblemTitle",
      "resCategoryHeader",
      "resPeopleCount",
      "resPriorityScore",
      "resPriorityLevel",
      "resCategoryGrid",
      "resFrequency",
      "resSeverity",
      "resAlternative",
      "resFactorSeverity",
      "resFactorFrequency",
      "resFactorPeople",
      "resFactorAlternative",
      "resAIExplanation",
      "resRecommendedAction"
    ];

    fieldsToClear.forEach(function (id) {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = "";
      }
    });

    if (resultSection) {
      resultSection.classList.add("hidden");
    }
  };

  window.toggleJsonModal = function () {
    const existing = document.getElementById("jsonModal");
    if (existing) {
      existing.remove();
      return;
    }

    const modal = document.createElement("div");
    modal.id = "jsonModal";
    modal.style.position = "fixed";
    modal.style.inset = "0";
    modal.style.background = "rgba(0,0,0,0.7)";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.zIndex = "1000";

    const panel = document.createElement("div");
    panel.style.width = "min(720px, 90vw)";
    panel.style.maxHeight = "80vh";
    panel.style.overflowY = "auto";
    panel.style.background = "#fff";
    panel.style.border = "2px solid #000";
    panel.style.boxShadow = "0 20px 40px rgba(0,0,0,0.35)";
    panel.style.padding = "24px";

    const title = document.createElement("h3");
    title.textContent = "JSON Payload Preview";
    title.style.margin = "0 0 16px";
    title.style.fontFamily = "sans-serif";

    const payload = document.createElement("pre");
    payload.textContent = JSON.stringify(window.lastSubmittedPayload || {}, null, 2);
    payload.style.whiteSpace = "pre-wrap";
    payload.style.wordBreak = "break-word";
    payload.style.fontFamily = "monospace";
    payload.style.fontSize = "12px";
    payload.style.lineHeight = "1.6";

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Close";
    closeBtn.style.marginTop = "16px";
    closeBtn.style.padding = "10px 16px";
    closeBtn.style.border = "2px solid #000";
    closeBtn.style.background = "#000";
    closeBtn.style.color = "#fff";
    closeBtn.style.cursor = "pointer";
    closeBtn.style.fontWeight = "700";
    closeBtn.addEventListener("click", function () {
      modal.remove();
    });

    panel.appendChild(title);
    panel.appendChild(payload);
    panel.appendChild(closeBtn);
    modal.appendChild(panel);
    document.body.appendChild(modal);

    modal.addEventListener("click", function (event) {
      if (event.target === modal) {
        modal.remove();
      }
    });
  };

  document.querySelectorAll(".load-example-btn").forEach(function (button) {
    button.addEventListener("click", function () {
      const preset = {
        problem: "Drinking Water Contamination in Ward 4",
        category: "Water",
        people_affected: 2800,
        frequency: "Daily",
        severity: "High",
        alternative_available: "No"
      };

      const title = document.getElementById("problemTitle");
      const category = document.getElementById("problemCategory");
      const people = document.getElementById("peopleAffected");

      if (title) title.value = preset.problem;
      if (category) category.value = preset.category;
      if (people) people.value = preset.people_affected;

      if (frequencyInput) frequencyInput.value = preset.frequency;
      if (severityInput) severityInput.value = preset.severity;
      if (alternativeInput) alternativeInput.value = preset.alternative_available;

      document.querySelectorAll(".option-btn").forEach(function (btn) {
        const isSelected = (btn.dataset.value || "") === preset.frequency ||
          (btn.dataset.value || "") === preset.severity ||
          (btn.dataset.value || "") === preset.alternative_available;

        btn.classList.toggle("bg-black", isSelected);
        btn.classList.toggle("text-white", isSelected);
        btn.classList.toggle("bg-white", !isSelected);
        btn.classList.toggle("text-black", !isSelected);
      });
    });
  });
});