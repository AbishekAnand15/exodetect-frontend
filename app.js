// Dynamic backend API selection: fallback to localhost for local development, or use the Vercel deployment URL.
const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:' || !window.location.hostname
  ? 'http://localhost:8000'
  : 'https://exodetect-backend-iota.vercel.app';

let rawChart = null;
let foldedChart = null;
function binData(x, y, binSize = 10) {
  const bx = [];
  const by = [];

  for (let i = 0; i < x.length; i += binSize) {
    let xs = x.slice(i, i + binSize);
    let ys = y.slice(i, i + binSize);

    bx.push(xs.reduce((a, b) => a + b, 0) / xs.length);
    by.push(ys.reduce((a, b) => a + b, 0) / ys.length);
  }
  return { bx, by };
}
async function analyze() {
  document.getElementById("transit-visualizer")?.classList.add("hidden");
    
if (rawChart) {
    rawChart.destroy();
    rawChart = null;
  }

  if (foldedChart) {
    foldedChart.destroy();
    foldedChart = null;
  }

  const tic = document.getElementById("tic").value;
  const output = document.getElementById("output");

  output.classList.remove("hidden");
  output.innerText = "Analyzing TESS data…";

  try {
    const res = await fetch(`${BACKEND_URL}/analyze/${tic}`);

    const data = await res.json();

    console.log("Backend response:", data);

    // 🚨 SAFETY CHECK (THIS FIXES YOUR ERROR)
    if (!data || data.error) {
      output.innerHTML = `
        <strong>Error:</strong><br/>
        ${data?.error || "Invalid response from backend"}
      `;
      return;
    }

    // 🧾 Text output
  // Show metrics section
document.getElementById("metrics").classList.remove("hidden");

// Fill metric cards
document.getElementById("m-period").innerText =
  data.period.toFixed(4) + " days";

document.getElementById("m-depth").innerText =
  data.depth.toExponential(2);

document.getElementById("m-snr").innerText =
  data.snr.toFixed(2);

document.getElementById("m-star-radius").innerText =
  data.star_radius.toFixed(2) + " R\u2299";

document.getElementById("m-planet-radius").innerText =
  data.planet_radius.toFixed(2) + " R\u2295";

document.getElementById("m-semi-major").innerText =
  data.semi_major_axis.toFixed(4) + " AU";

document.getElementById("m-eq-temp").innerText =
  Math.round(data.equilibrium_temp) + " K";

document.getElementById("m-planet-density").innerText =
  data.planet_density.toFixed(2) + " g/cm\u00B3";

const profileVal = document.getElementById("m-profile");
if (profileVal) {
  profileVal.innerText = data.is_v_shape ? "V-Shape (Binary)" : "U-Shape (Planet)";
  profileVal.style.color = data.is_v_shape ? "#ff5252" : "#00e676";
}

document.getElementById("m-confidence").innerText =
  data.confidence.toFixed(1) + "%";

// Update and show dynamic transit visualizer
const ratio = Math.sqrt(data.depth);
const visPlanet = document.getElementById("vis-planet");
const visRatio = document.getElementById("vis-ratio");
const visualizerBox = document.getElementById("transit-visualizer");

if (visPlanet && visRatio && visualizerBox) {
  // Base diameter of star is 80px
  // Planet diameter is proportional to sqrt(depth)
  // Clamp between 6px (min visible) and 50px (max star eclipse)
  const diameter = Math.max(6, Math.min(50, 80 * ratio));
  visPlanet.style.width = diameter + "px";
  visPlanet.style.height = diameter + "px";
  visPlanet.style.top = `-${diameter / 2}px`;
  
  visRatio.innerText = ratio.toFixed(4);
  visualizerBox.classList.remove("hidden");
}

// Keep interpretation text
const isAi = data.ai_used;
const verdictVal = isAi ? data.ai_verdict : data.verdict;
const confidenceVal = isAi ? data.ai_confidence : data.confidence;
const interpretationVal = isAi ? data.ai_interpretation : data.interpretation;

if (isAi) {
  output.classList.add("ai-active");
  output.innerHTML = `
    <strong>Status (AI-Enhanced):</strong> ${verdictVal}<br/><br/>
    <strong>Interpretation (AI Scientific Analysis):</strong><br/>
    ${interpretationVal}
  `;
} else {
  output.classList.remove("ai-active");
  output.innerHTML = `
    <strong>Status:</strong> ${verdictVal}<br/><br/>
    <strong>Interpretation:</strong><br/>
    ${interpretationVal}
  `;
}

const confEl = document.getElementById("m-confidence");
confEl.innerText = confidenceVal.toFixed(1) + "%";

confEl.classList.remove("confidence-high", "confidence-mid", "confidence-low");

if (confidenceVal >= 80) {
  confEl.classList.add("confidence-high");
} else if (confidenceVal >= 50) {
  confEl.classList.add("confidence-mid");
} else {
  confEl.classList.add("confidence-low");
}



    // 📈 Plot raw light curve
    plotLightCurve(data.time, data.flux);

    // 📉 Plot folded transit
    plotFoldedCurve(data.phase, data.folded_flux);

  } catch (err) {
    console.error(err);
    output.innerText = "Frontend error. Check console.";
  }
}
function plotLightCurve(time, flux) {
  const ctx = document.getElementById("lightcurve").getContext("2d");

  if (rawChart) rawChart.destroy();

  const { bx, by } = binData(time, flux, 30);


  rawChart = new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [{
        label: "Raw Light Curve (binned)",
        data: bx.map((t, i) => ({ x: t, y: by[i] })),
        pointRadius: 1.5,
        pointHoverRadius: 2,
        pointBackgroundColor: "rgba(93,220,255,0.55)",

      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      devicePixelRatio: window.devicePixelRatio || 1,
      animation: false,
      parsing: false,
      normalized: true,
      plugins: {
  title: {
    display: true,
    text: "Raw Light Curve (Binned)",
    color: "#5ddcff",
    font: {
      size: 20,
      weight: "700"
    },
    padding: {
      top: 10,
      bottom: 20
    }
  },
  legend: {
    labels: {
      color: "#e6f0ff",
      font: {
        size: 14,
        weight: "600"
      }
    }
  }
}
 ,
      scales: {
  x: {
    title: {
      display: true,
      text: "Time (days)",
      color: "#5ddcff",
      font: {
        size: 25,        // ⬅ bigger
        weight: "700"    // ⬅ bold
      }
    },
    ticks: {
      color: "#e6f0ff",
      font: {
        size: 14,
        weight: "600"
      }
    },
    grid: {
      color: "rgba(255,255,255,0.06)"
    }
  },

  y: {
    min: Math.min(...by) - 0.001,
    max: Math.max(...by) + 0.001,
    title: {
      display: true,
      text: "Normalized Flux",
      color: "#5ddcff",
      font: {
        size: 25,
        weight: "700"
      }
    },
    ticks: {
      color: "#e6f0ff",
      font: {
        size: 14,
        weight: "600"
      }
    },
    grid: {
      color: "rgba(255,255,255,0.06)"
    }
  }
}
    }
  });
}


function plotFoldedCurve(phase, flux) {
  const ctx = document.getElementById("foldedcurve").getContext("2d");

  if (foldedChart) foldedChart.destroy();

  foldedChart = new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [{
        label: "Folded Transit",
        data: phase.map((p, i) => ({ x: p, y: flux[i] })),
        pointRadius: 1,
        pointBackgroundColor: "rgba(120,220,255,0.35)",
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      devicePixelRatio: window.devicePixelRatio || 1,
      animation: false,
      parsing: false,
      normalized: true,
      plugins: {
  title: {
    display: true,
    text: "Phase-folded Transit Curve",
    color: "#5ddcff",
    font: {
      size: 20,
      weight: "700"
    },
    padding: {
      top: 10,
      bottom: 20
    }
  },
  legend: {
    labels: {
      color: "#e6f0ff",
      font: {
        size: 14,
        weight: "600"
      }
    }
  }
}
    ,
      scales: {
  x: {
    min: -0.5,
    max: 0.5,
    grid: {
  color: (ctx) =>
    Math.abs(ctx.tick.value) < 0.02
      ? "rgba(93,220,255,0.25)"
      : "rgba(255,255,255,0.05)"
}
    ,
    title: {
      display: true,
      text: "Phase",
      color: "#5ddcff",
      font: {
        size: 25,
        weight: "700"
        
      }
    },
    ticks: {
      color: "#e6f0ff",
      font: {
        size: 14,
        weight: "600"
      }
    },
    grid: {
      color: "rgba(255,255,255,0.06)"
    }
  },

  y: {
    title: {
      display: true,
      text: "Normalized Flux",
      color: "#5ddcff",
      font: {
        size: 25,
        weight: "700"
      }
    },
    ticks: {
      color: "#e6f0ff",
      font: {
        size: 14,
        weight: "600"
      }
    },
    grid: {
      color: "rgba(255,255,255,0.06)"
    }
  }
}

    }
  });
}

// ---------- FAQ ACCORDION LOGIC ----------
document.addEventListener("DOMContentLoaded", () => {
  const faqQuestions = document.querySelectorAll(".faq-question");
  
  faqQuestions.forEach(q => {
    q.addEventListener("click", () => {
      const item = q.parentElement;
      const answer = item.querySelector(".faq-answer");
      
      // Close other active FAQ items
      document.querySelectorAll(".faq-item").forEach(otherItem => {
        if (otherItem !== item && otherItem.classList.contains("active")) {
          otherItem.classList.remove("active");
          otherItem.querySelector(".faq-answer").style.maxHeight = null;
        }
      });
      
      // Toggle current item
      const isActive = item.classList.toggle("active");
      if (isActive) {
        answer.style.maxHeight = answer.scrollHeight + "px";
      } else {
        answer.style.maxHeight = null;
      }
    });
  });
});

// ---------- MODAL CONTROLLERS ----------
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden"; // Disable scroll when modal is active
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("hidden");
    document.body.style.overflow = ""; // Re-enable scroll
  }
}

function closeModalOnOverlay(event, modalId) {
  if (event.target.id === modalId) {
    closeModal(modalId);
  }
}

// ---------- QUICK SELECT TARGETS ----------
function selectTarget(ticId) {
  const ticInput = document.getElementById("tic");
  if (ticInput) {
    ticInput.value = ticId;
    // We trigger the global analyze wrapper if defined, or original analyze
    if (window.analyze) {
      window.analyze();
    } else {
      analyze();
    }
  }
}


