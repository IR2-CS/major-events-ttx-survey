const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwfwwdt9mgcPFef9W_BX2_Scnvm3Lr1kKGIPYQhD2g8mI6U7MfWiJsJIF1zRxix62ENGQ/exec";

const form = document.querySelector("#surveyForm");
const submitButton = form.querySelector(".submit-button");
const formStatus = document.querySelector("#formStatus");
const thankYou = document.querySelector("#thankYou");
const surveyTitle = document.querySelector("#surveyTitle");
const introCopy = document.querySelector("#introCopy");

// "Other" radio → enable text input
const bgOtherRadio = document.getElementById("bgOtherRadio");
const bgOtherInput = document.getElementById("bgOtherInput");
const intOtherRadio = document.getElementById("intOtherRadio");
const intOtherInput = document.getElementById("intOtherInput");

bgOtherRadio.addEventListener("change", () => {
  bgOtherInput.disabled = false;
  bgOtherInput.focus();
});

const bgRadios = document.querySelectorAll('input[name="background"]');
bgRadios.forEach((r) => {
  if (r !== bgOtherRadio) {
    r.addEventListener("change", () => {
      bgOtherInput.disabled = true;
      bgOtherInput.value = "";
    });
  }
});

intOtherRadio.addEventListener("change", () => {
  intOtherInput.disabled = false;
  intOtherInput.focus();
});

const intRadios = document.querySelectorAll('input[name="interest"]');
intRadios.forEach((r) => {
  if (r !== intOtherRadio) {
    r.addEventListener("change", () => {
      intOtherInput.disabled = true;
      intOtherInput.value = "";
    });
  }
});

// Validation error messages
const errorMessages = {
  background: "請選擇你的職業背景。",
  TTX_helpfulness: "請評價桌上演練內容對你的幫助程度。",
  TTX_difficulty: "請評價你對桌上演練內容的理解程度。",
  Seminar_helpfulness: "請評價研討會內容對你的幫助程度。",
  Seminar_difficulty: "請評價你對研討會內容的理解程度。",
  interest: "請選擇你感興趣的主題。",
};

function setError(field, message) {
  const element = document.querySelector(`[data-error-for="${field}"]`);
  if (element) element.textContent = message || "";
}

function clearErrors() {
  document.querySelectorAll(".field-error").forEach((el) => (el.textContent = ""));
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.classList.toggle("is-loading", isLoading);
  submitButton.querySelector(".button-text").textContent = isLoading ? "提交中..." : "提交問卷";
}

function setStatus(message, type = "") {
  formStatus.textContent = message;
  formStatus.className = `form-status${type ? ` is-${type}` : ""}`;
}

function getFormData() {
  const data = new FormData(form);

  let background = String(data.get("background") || "").trim();
  let bgOther = String(data.get("bgOther") || "").trim();
  if (background === "其他" && bgOther) {
    background = `其他：${bgOther}`;
  }

  let interest = String(data.get("interest") || "").trim();
  let intOther = String(data.get("intOther") || "").trim();
  if (interest === "其他" && intOther) {
    interest = `其他：${intOther}`;
  }

  return {
    background,
    TTX_helpfulness: String(data.get("TTX_helpfulness") || "").trim(),
    TTX_difficulty: String(data.get("TTX_difficulty") || "").trim(),
    Seminar_helpfulness: String(data.get("Seminar_helpfulness") || "").trim(),
    Seminar_difficulty: String(data.get("Seminar_difficulty") || "").trim(),
    interest,
    comments: String(data.get("comments") || "").trim(),
  };
}

function validate(data) {
  const errors = {};

  if (!data.background) errors.background = errorMessages.background;
  if (!data.TTX_helpfulness) errors.TTX_helpfulness = errorMessages.TTX_helpfulness;
  if (!data.TTX_difficulty) errors.TTX_difficulty = errorMessages.TTX_difficulty;
  if (!data.Seminar_helpfulness) errors.Seminar_helpfulness = errorMessages.Seminar_helpfulness;
  if (!data.Seminar_difficulty) errors.Seminar_difficulty = errorMessages.Seminar_difficulty;
  if (!data.interest) errors.interest = errorMessages.interest;

  return errors;
}

async function submitSurvey(data) {
  if (GOOGLE_SCRIPT_URL.includes("PASTE_YOUR")) {
    throw new Error("Google Apps Script URL is not configured.");
  }

  await fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(data),
  });

  return { ok: true };
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("");
  clearErrors();

  const data = getFormData();
  const errors = validate(data);

  if (Object.keys(errors).length > 0) {
    Object.entries(errors).forEach(([field, message]) => setError(field, message));
    setStatus("請先填寫所有必答題（標示 *）。", "error");
    const firstError = document.querySelector(`[data-error-for="${Object.keys(errors)[0]}"]`);
    if (firstError) {
      firstError.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return;
  }

  try {
    setLoading(true);

    /*
     * Optimistic UI update.
     * With mode:"no-cors" we can NEVER read the server response (it's
     * opaque), so there is no point waiting for fetch to resolve before
     * switching to the thank-you screen.  Moving the UI change BEFORE
     * the fetch guarantees the user always sees the result, even if the
     * network request throws a TypeError (common with Google Apps
     * Script 302-redirects in no-cors mode).
     */
    form.hidden = true;
    surveyTitle.hidden = true;
    introCopy.innerHTML =
      "多謝你參與是次香港大型活動桌上演練暨網絡安全研討會！<br>" +
      "你的寶貴意見將會作為日後舉辦課程的重要參考。";
    thankYou.hidden = false;
    thankYou.scrollIntoView({ behavior: "smooth", block: "center" });

    // Fire the POST in the background — don't await (opaque response)
    submitSurvey(data).catch((err) =>
      console.error("Submit error (data may still have been sent):", err)
    );
  } catch (error) {
    setStatus("暫時未能提交，請稍後再試或聯絡主辦方。", "error");
    console.error(error);
  } finally {
    setLoading(false);
  }
});
