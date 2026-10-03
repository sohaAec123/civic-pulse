/**
 * CivicPulse - Community Needs Prioritization Platform
 * Frontend Controller + Flask Backend Integration
 */

document.addEventListener('DOMContentLoaded', () => {

  // Initialize Lucide icons if loaded
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Element selectors
  const problemForm = document.getElementById('problemForm');
  const resultSection = document.getElementById('resultSection');
  const jsonOutputModal = document.getElementById('jsonOutputModal');
  const jsonPayloadCode = document.getElementById('jsonPayloadCode');

  // Custom option groups
  setupOptionGroup('frequencyGroup', 'frequencyInput');
  setupOptionGroup('severityGroup', 'severityInput');
  setupOptionGroup('alternativeGroup', 'alternativeInput');

  // Form submit
  if (problemForm) {
    problemForm.addEventListener('submit', handleFormSubmit);
  }

  // Example cards
  setupExampleCards();

  // Edition metadata
  updateEditionMetadata();
});


/**
 * Custom option group selector
 */
function setupOptionGroup(groupId, inputId) {

  const group = document.getElementById(groupId);
  const hiddenInput = document.getElementById(inputId);

  if (!group || !hiddenInput) return;

  const buttons = group.querySelectorAll('.option-btn');

  buttons.forEach(btn => {

    btn.addEventListener('click', (e) => {

      e.preventDefault();

      buttons.forEach(b => {
        b.classList.remove('selected', 'bg-black', 'text-white');
        b.classList.add('bg-white', 'text-black');
      });

      btn.classList.add('selected', 'bg-black', 'text-white');
      btn.classList.remove('bg-white', 'text-black');

      hiddenInput.value = btn.dataset.value;

      const errorMsg =
        group.parentElement.querySelector('.error-message');

      if (errorMsg) {
        errorMsg.classList.add('hidden');
      }
    });

  });
}


/**
 * Handle form submission
 */
async function handleFormSubmit(event) {

  event.preventDefault();

  const titleInput = document.getElementById('problemTitle');
  const categoryInput = document.getElementById('problemCategory');
  const peopleInput = document.getElementById('peopleAffected');
  const frequencyInput = document.getElementById('frequencyInput');
  const severityInput = document.getElementById('severityInput');
  const alternativeInput = document.getElementById('alternativeInput');

  let isValid = true;


  // Validate title
  if (!titleInput.value.trim()) {

    showFieldError(
      titleInput,
      'Please specify the problem title.'
    );

    isValid = false;

  } else {

    clearFieldError(titleInput);

  }


  // Validate category
  if (!categoryInput.value) {

    showFieldError(
      categoryInput,
      'Select a category for this issue.'
    );

    isValid = false;

  } else {

    clearFieldError(categoryInput);

  }


  // Validate people affected
  if (
    !peopleInput.value ||
    Number(peopleInput.value) < 1
  ) {

    showFieldError(
      peopleInput,
      'Enter a valid number of people affected.'
    );

    isValid = false;

  } else {

    clearFieldError(peopleInput);

  }


  // Validate frequency
  if (!frequencyInput.value) {

    showGroupError(
      'frequencyGroup',
      'Select frequency of occurrence.'
    );

    isValid = false;
  }


  // Validate severity
  if (!severityInput.value) {

    showGroupError(
      'severityGroup',
      'Select a severity level.'
    );

    isValid = false;
  }


  // Validate alternative
  if (!alternativeInput.value) {

    showGroupError(
      'alternativeGroup',
      'Select if an alternative is available.'
    );

    isValid = false;
  }


  // Stop if invalid
  if (!isValid) {

    const firstError = document.querySelector(
      '.border-red-600, .error-message:not(.hidden)'
    );

    if (firstError) {

      firstError.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

    }

    return;
  }


  /**
   * Data sent to Flask
   */
  const payload = {

    title: titleInput.value.trim(),

    problem: titleInput.value.trim(),

    category: categoryInput.value,

    people_affected: parseInt(
      peopleInput.value,
      10
    ),

    frequency: frequencyInput.value,

    severity: severityInput.value,

    alternative_available:
      alternativeInput.value,

    timestamp:
      new Date().toISOString()
  };


  // Submit button
  const submitBtn =
    document.getElementById('submitBtn');

  const originalBtnContent =
    submitBtn.innerHTML;


  submitBtn.disabled = true;

  submitBtn.innerHTML = `
    <span class="inline-flex items-center gap-2">

      <svg
        class="animate-spin h-5 w-5 text-white"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >

        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        ></circle>

        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>

      </svg>

      EVALUATING NEED DISPATCH...

    </span>
  `;


  try {

    // Send data to Flask
    const resultData =
      await submitToFlaskBackend(payload);


    // Render result
    renderPriorityResult(
      resultData,
      payload
    );


    // Restore button
    submitBtn.disabled = false;

    submitBtn.innerHTML =
      originalBtnContent;


    // Show result section
    if (resultSection) {

      resultSection.classList.remove('hidden');

      resultSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

    }


    // Show JSON payload
    if (jsonPayloadCode) {

      jsonPayloadCode.textContent =
        JSON.stringify(
          payload,
          null,
          2
        );

    }

  } catch (err) {

    console.error(
      'Error in prioritization workflow:',
      err
    );

    submitBtn.disabled = false;

    submitBtn.innerHTML =
      originalBtnContent;

    alert(
      'Unable to connect to CivicPulse backend. Please make sure the Flask server is running.'
    );
  }
}


/**
 * Send request to Flask backend
 */
async function submitToFlaskBackend(payload) {

  const response = await fetch(
    'http://127.0.0.1:5000/api/prioritize',
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json'
      },

      body: JSON.stringify(payload)
    }
  );


  if (!response.ok) {

    const errorData =
      await response
        .json()
        .catch(() => ({}));

    throw new Error(
      errorData.error ||
      `Flask server error: ${response.status}`
    );
  }


  const backendData =
    await response.json();


  /**
   * Convert Flask response
   * into the format expected
   * by the existing UI.
   */

  const score =
    backendData.score;


  let priorityLevel =
    'LOW PRIORITY';

  let badgeColorClass =
    'bg-gray-200 text-gray-900 border-gray-900';


  if (backendData.priority === 'Critical') {

    priorityLevel =
      'CRITICAL URGENCY';

    badgeColorClass =
      'bg-red-700 text-white border-black';

  } else if (backendData.priority === 'High') {

    priorityLevel =
      'HIGH PRIORITY';

    badgeColorClass =
      'bg-amber-500 text-black border-black';

  } else if (backendData.priority === 'Medium') {

    priorityLevel =
      'MODERATE PRIORITY';

    badgeColorClass =
      'bg-yellow-400 text-black border-black';
  }


  const factors =
    backendData.key_factors;


  return {

    priority_level:
      priorityLevel,

    priority_score:
      Math.round(
        (score / 15) * 100
      ),

    badge_class:
      badgeColorClass,

    category:
      backendData.category,

    people_affected:
      factors.people_affected,


    key_factors: {

      severity_impact:
        `${factors.severity} Impact`,

      frequency_rate:
        `${factors.frequency} Interruption`,

      population_affected:
        `${factors.people_affected.toLocaleString()} Citizens Impacted`,

      alternative_status:
        factors.alternative_available === 'Yes'
          ? 'Alternative Route/Source Exists'
          : 'CRITICAL: No Viable Alternative Available'
    },


    /**
     * Temporary explanation.
     * Gemma will replace this later.
     */
    ai_explanation: backendData.ai_explanation,

    /**
     * Temporary recommendation.
     * Later this can also be generated by Gemma.
     */
    recommended_action:

      backendData.priority === 'Critical'

        ? 'Immediate attention and resource allocation should be considered.'

        : backendData.priority === 'High'

          ? 'Schedule this issue for priority resolution.'

          : 'Add this issue to the community maintenance queue.'
  };
}


/**
 * Render priority result
 */
function renderPriorityResult(
  data,
  payload
) {

  const priorityLevel =
    document.getElementById(
      'resPriorityLevel'
    );

  if (priorityLevel) {
    priorityLevel.textContent =
      data.priority_level;
  }


  const priorityScore =
    document.getElementById(
      'resPriorityScore'
    );

  if (priorityScore) {

    priorityScore.textContent =
      `${data.priority_score}/100`;
  }


  const levelBadge =
    document.getElementById(
      'resLevelBadge'
    );

  if (levelBadge) {

    levelBadge.className =
      `editorial-stamp px-3 py-1 text-sm font-bold border-2 ${data.badge_class}`;
  }


  const problemTitle =
    document.getElementById(
      'resProblemTitle'
    );

  if (problemTitle) {
    problemTitle.textContent =
      payload.title;
  }


  const categoryHeader =
    document.getElementById(
      'resCategoryHeader'
    );

  if (categoryHeader) {
    categoryHeader.textContent =
      payload.category;
  }


  const categoryGrid =
    document.getElementById(
      'resCategoryGrid'
    );

  if (categoryGrid) {
    categoryGrid.textContent =
      payload.category;
  }


  const peopleCount =
    document.getElementById(
      'resPeopleCount'
    );

  if (peopleCount) {

    peopleCount.textContent =
      payload.people_affected.toLocaleString();
  }


  const frequency =
    document.getElementById(
      'resFrequency'
    );

  if (frequency) {
    frequency.textContent =
      payload.frequency;
  }


  const severity =
    document.getElementById(
      'resSeverity'
    );

  if (severity) {
    severity.textContent =
      payload.severity;
  }


  const alternative =
    document.getElementById(
      'resAlternative'
    );

  if (alternative) {

    const isAltYes =
      payload.alternative_available === 'Yes' ||
      payload.alternative_available === true;

    alternative.textContent =
      isAltYes
        ? 'Yes (Available)'
        : 'No (Critical Deficiency)';
  }


  // Key factors

  const factorSeverity =
    document.getElementById(
      'resFactorSeverity'
    );

  if (factorSeverity) {

    factorSeverity.textContent =
      data.key_factors.severity_impact;
  }


  const factorFrequency =
    document.getElementById(
      'resFactorFrequency'
    );

  if (factorFrequency) {

    factorFrequency.textContent =
      data.key_factors.frequency_rate;
  }


  const factorPeople =
    document.getElementById(
      'resFactorPeople'
    );

  if (factorPeople) {

    factorPeople.textContent =
      data.key_factors.population_affected;
  }


  const factorAlternative =
    document.getElementById(
      'resFactorAlternative'
    );

  if (factorAlternative) {

    factorAlternative.textContent =
      data.key_factors.alternative_status;
  }


  // Explanation

  const explanation =
    document.getElementById(
      'resAIExplanation'
    );

  if (explanation) {

    explanation.textContent =
      data.ai_explanation;
  }


  // Recommended action

  const recommendedAction =
    document.getElementById(
      'resRecommendedAction'
    );

  if (recommendedAction) {

    recommendedAction.innerText =
      data.recommended_action;
  }


  // Timestamp

  const timestamp =
    document.getElementById(
      'resTimestamp'
    );

  if (timestamp) {

    timestamp.textContent =
      new Date().toLocaleString(
        'en-US',
        {
          dateStyle: 'full',
          timeStyle: 'medium'
        }
      );
  }
}


/**
 * Show field error
 */
function showFieldError(
  inputElem,
  message
) {

  inputElem.classList.add(
    'border-red-600'
  );


  let err =
    inputElem.parentElement
      .querySelector(
        '.error-message'
      );


  if (!err) {

    err =
      document.createElement(
        'div'
      );

    err.className =
      'error-message text-red-600 font-mono-meta text-xs mt-1 font-bold';

    inputElem.parentElement
      .appendChild(err);
  }


  err.textContent =
    `▲ ${message}`;

  err.classList.remove(
    'hidden'
  );
}


/**
 * Clear field error
 */
function clearFieldError(
  inputElem
) {

  inputElem.classList.remove(
    'border-red-600'
  );


  const err =
    inputElem.parentElement
      .querySelector(
        '.error-message'
      );


  if (err) {

    err.classList.add(
      'hidden'
    );
  }
}


/**
 * Show option group error
 */
function showGroupError(
  groupId,
  message
) {

  const group =
    document.getElementById(
      groupId
    );


  if (!group) return;


  let err =
    group.parentElement
      .querySelector(
        '.error-message'
      );


  if (!err) {

    err =
      document.createElement(
        'div'
      );

    err.className =
      'error-message text-red-600 font-mono-meta text-xs mt-1 font-bold';

    group.parentElement
      .appendChild(err);
  }


  err.textContent =
    `▲ ${message}`;

  err.classList.remove(
    'hidden'
  );
}


/**
 * Example cards
 */
function setupExampleCards() {

  const examples = [

    {
      title:
        'Contaminated Well Water in Ward 4 Market',

      category:
        'Water',

      people:
        2800,

      frequency:
        'Daily',

      severity:
        'High',

      alternative:
        'No'
    },


    {
      title:
        'Darkness Hazard on Main Commercial Boulevard',

      category:
        'Streetlights',

      people:
        950,

      frequency:
        'Daily',

      severity:
        'Medium',

      alternative:
        'Yes'
    },


    {
      title:
        'Severe Pothole Ridge on School Bus Transit Route',

      category:
        'Roads',

      people:
        3400,

      frequency:
        'Daily',

      severity:
        'High',

      alternative:
        'No'
    },


    {
      title:
        'Monsoon Overflow & Sewage Stagnation in South Suburb',

      category:
        'Drainage',

      people:
        4100,

      frequency:
        'Weekly',

      severity:
        'High',

      alternative:
        'No'
    }

  ];


  document
    .querySelectorAll(
      '.load-example-btn'
    )
    .forEach(
      (btn, index) => {

        btn.addEventListener(
          'click',
          () => {

            const data =
              examples[index];

            if (!data) return;


            document.getElementById(
              'problemTitle'
            ).value =
              data.title;


            document.getElementById(
              'problemCategory'
            ).value =
              data.category;


            document.getElementById(
              'peopleAffected'
            ).value =
              data.people;


            selectOptionButton(
              'frequencyGroup',
              'frequencyInput',
              data.frequency
            );


            selectOptionButton(
              'severityGroup',
              'severityInput',
              data.severity
            );


            selectOptionButton(
              'alternativeGroup',
              'alternativeInput',
              data.alternative
            );


            const form =
              document.getElementById(
                'submit-form'
              );

            if (form) {

              form.scrollIntoView({
                behavior: 'smooth'
              });

            }

          }
        );

      }
    );
}


/**
 * Select option button
 */
function selectOptionButton(
  groupId,
  inputId,
  value
) {

  const group =
    document.getElementById(
      groupId
    );

  const hiddenInput =
    document.getElementById(
      inputId
    );


  if (!group || !hiddenInput) {
    return;
  }


  hiddenInput.value =
    value;


  const buttons =
    group.querySelectorAll(
      '.option-btn'
    );


  buttons.forEach(
    btn => {

      if (
        btn.dataset.value === value
      ) {

        btn.classList.add(
          'selected',
          'bg-black',
          'text-white'
        );

        btn.classList.remove(
          'bg-white',
          'text-black'
        );

      } else {

        btn.classList.remove(
          'selected',
          'bg-black',
          'text-white'
        );

        btn.classList.add(
          'bg-white',
          'text-black'
        );
      }

    }
  );


  const err =
    group.parentElement
      .querySelector(
        '.error-message'
      );


  if (err) {

    err.classList.add(
      'hidden'
    );
  }
}


/**
 * JSON modal
 */
function toggleJsonModal() {

  const modal =
    document.getElementById(
      'jsonOutputModal'
    );


  if (modal) {

    modal.classList.toggle(
      'hidden'
    );
  }
}


/**
 * Reset form and result
 */
function resetFormAndResult() {

  const form =
    document.getElementById(
      'problemForm'
    );


  if (form) {
    form.reset();
  }


  document
    .querySelectorAll(
      '.option-btn'
    )
    .forEach(
      btn => {

        btn.classList.remove(
          'selected',
          'bg-black',
          'text-white'
        );

        btn.classList.add(
          'bg-white',
          'text-black'
        );
      }
    );


  const frequency =
    document.getElementById(
      'frequencyInput'
    );

  const severity =
    document.getElementById(
      'severityInput'
    );

  const alternative =
    document.getElementById(
      'alternativeInput'
    );


  if (frequency) {
    frequency.value = '';
  }

  if (severity) {
    severity.value = '';
  }

  if (alternative) {
    alternative.value = '';
  }


  document
    .querySelectorAll(
      '.error-message'
    )
    .forEach(
      el => el.classList.add(
        'hidden'
      )
    );


  document
    .querySelectorAll(
      '.border-red-600'
    )
    .forEach(
      el => el.classList.remove(
        'border-red-600'
      )
    );


  const resultSection =
    document.getElementById(
      'resultSection'
    );


  if (resultSection) {

    resultSection.classList.add(
      'hidden'
    );
  }


  const formSection =
    document.getElementById(
      'submit-form'
    );


  if (formSection) {

    formSection.scrollIntoView({
      behavior: 'smooth'
    });
  }
}


/**
 * Dynamic edition metadata
 */
function updateEditionMetadata() {

  const dateStr =
    new Date().toLocaleDateString(
      'en-US',
      {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }
    ).toUpperCase();


  const headerDate =
    document.getElementById(
      'headerDateText'
    );


  if (headerDate) {

    headerDate.textContent =
      dateStr;
  }
}