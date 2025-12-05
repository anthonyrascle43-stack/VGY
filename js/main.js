// DISABLE HORIZONTAL SCROLL ON MOBILE
const isMobile = window.matchMedia("(max-width: 768px)").matches;

// Register GSAP
gsap.registerPlugin(ScrollTrigger);

// Make hScroll accessible everywhere
let hScroll = null;

window.addEventListener("load", () => {
  const panels = gsap.utils.toArray(".panel");
  const container = document.querySelector(".panels");
  const ticks = gsap.utils.toArray(".guide-ticks .tick");

  if (!panels.length || !container) return;

  // ================================
  // DESKTOP ONLY — horizontal scroll
  // ================================
  if (!isMobile) {
    hScroll = gsap.to(panels, {
      xPercent: -100 * (panels.length - 1),
      ease: "none",
      scrollTrigger: {
        id: "hscroll",
        trigger: ".scroll-shell",
        pin: true,
        scrub: 1,
        snap: 1 / (panels.length - 1),
        end: () => "+=" + container.offsetWidth
      }
    });

    // COUNTDOWN ZOOM EFFECT (desktop only)
    const overlay = document.getElementById("countdown-overlay");
    const overlayVal = document.getElementById("countdown-overlay-value");
    const liveCount  = document.getElementById("countdown");

    if (overlay && overlayVal && liveCount) {
      gsap.ticker.add(() => {
        overlayVal.textContent = liveCount.textContent;
      });

      const MAX_SCALE = 1.05;

      ScrollTrigger.create({
        trigger: ".panel-countdown",
        containerAnimation: hScroll,
        start: "center 60%",
        end: "center 40%",
        scrub: true,
        onUpdate: (self) => {
          const p = self.progress;

          if (p <= 0 || p >= 1) {
            overlay.style.display = "none";
            return;
          }

          overlay.style.display = "flex";

          gsap.to(overlay, {
            opacity: p * 0.9,
            duration: 0.1,
            overwrite: true
          });

          gsap.to(overlay.children[0], {
            scale: 1 + p * (MAX_SCALE - 1),
            duration: 0.1,
            overwrite: true
          });
        }
      });
    }

    // Subtle vertical drift per panel
    panels.forEach((panel, index) => {
      const direction = index % 2 === 0 ? -1 : 1;
      gsap.to(panel, {
        yPercent: 6 * direction,
        ease: "sine.inOut",
        scrollTrigger: {
          trigger: ".scroll-shell",
          start: "top top",
          end: () => "+=" + container.offsetWidth,
          scrub: true
        }
      });
    });
  }

  // ================================
  // Active tick per frame
  // ================================
  const setActiveTick = (i) => {
    ticks.forEach((tick, idx) => {
      tick.classList.toggle("active", idx === i);
    });
  };

  panels.forEach((panel, index) => {
    ScrollTrigger.create({
      trigger: panel,
      containerAnimation: hScroll,
      start: "left center",
      end: "right center",
      onEnter: () => setActiveTick(index),
      onEnterBack: () => setActiveTick(index)
    });
  });

  // ================================
  // Clickable ticks → jump to frame
  // ================================
  if (ticks.length) {
    ticks.forEach((tick, index) => {
      tick.style.cursor = "pointer";

      tick.addEventListener("click", () => {
        const st = ScrollTrigger.getById("hscroll");
        if (!st) return;

        const total = st.end - st.start;
        const target = st.start + total * (index / (panels.length - 1));

        window.scrollTo({
          top: target,
          behavior: "smooth"
        });
      });
    });
  }

  // ================================
  // COUNTDOWN
  // ================================
  const countdownEl = document.getElementById("countdown");
  if (countdownEl) {
    const launchDate = new Date(2026, 0, 18, 0, 0, 0, 0).getTime();

    const updateCountdown = () => {
      const now = Date.now();
      let diff = launchDate - now;
      if (diff < 0) diff = 0;

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      const ms = Math.floor(diff % 1000);

      const pad = (n) => n.toString().padStart(2, "0");
      const msStr = ms.toString().padStart(3, "0");

      countdownEl.innerHTML =
        `${pad(days)}D  ${pad(hours)}H  ${pad(minutes)}M  ${pad(seconds)}S  <span class="ms">${msStr}MS</span>`;
    };

    setInterval(updateCountdown, 33);
    updateCountdown();
  }

  // ================================
  // WAVEFORM LOADER
  // ================================
  const canvas = document.getElementById("waveCanvas");
  const ctx = canvas ? canvas.getContext("2d") : null;

  if (canvas && ctx) {
    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    let progress = 0; // 0 → 1, controls left→right reveal

    function drawWave() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const midY   = canvas.height * 0.5;
      const pairs  = 9;
      const maxAmp = canvas.height * 0.16;
      const spacing = 8;
      const maxX = canvas.width * progress;

      for (let p = 0; p < pairs; p++) {
        const amp = maxAmp * (1 - p * 0.07);
        const offset = spacing * (p + 1);

        // upper line
        ctx.beginPath();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = `rgba(235,235,235,${0.95 - p * 0.03})`;

        for (let x = 0; x <= maxX; x++) {
          const nx = x / canvas.width;
          const envelope = Math.exp(-((nx - 0.5) ** 2) * 18);
          const carrier =
            Math.sin(nx * 8 * Math.PI) * 0.85 +
            Math.sin(nx * 16 * Math.PI) * 0.35;

          const y = midY - (carrier * envelope * amp) - offset;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // lower mirrored line
        ctx.beginPath();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = `rgba(235,235,235,${0.95 - p * 0.03})`;

        for (let x = 0; x <= maxX; x++) {
          const nx = x / canvas.width;
          const envelope = Math.exp(-((nx - 0.5) ** 2) * 18);
          const carrier =
            Math.sin(nx * 8 * Math.PI) * 0.85 +
            Math.sin(nx * 16 * Math.PI) * 0.35;

          const y = midY + (carrier * envelope * amp) + offset;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      progress += 0.012;
      if (progress > 1) progress = 1;

      requestAnimationFrame(drawWave);
    }

    drawWave();

    // Fade out loader after a bit
    setTimeout(() => {
      const loader = document.getElementById("loader");
      if (!loader) return;

      loader.style.transition = "opacity 1s ease";
      loader.style.opacity = "0";

      setTimeout(() => {
        loader.style.pointerEvents = "none";
        loader.style.visibility = "hidden";
        loader.style.display = "none";
      }, 1000);
    }, 2500);
  }

  // ------------------------------
  // WAITLIST FORM → GOOGLE SHEETS
  // ------------------------------
  const waitlistForm = document.getElementById("waitlist-form");
  const waitlistLoader = document.getElementById("waitlist-loader");
  const waitlistSuccess = document.getElementById("waitlist-success");

  if (waitlistForm) {
    waitlistForm.addEventListener("submit", (e) => {
      e.preventDefault();

      if (waitlistLoader) {
        waitlistLoader.style.display = "flex";
        gsap.to(waitlistLoader, { opacity: 1, duration: 0.2 });
      }

      waitlistForm.submit();

      setTimeout(() => {
        finishWaitlist(waitlistForm, waitlistLoader, waitlistSuccess);
      }, 350);
    });
  }

  function finishWaitlist(form, loaderEl, successEl) {
    if (!form || !successEl) return;

    gsap.to(loaderEl, {
      opacity: 0,
      duration: 0.3,
      onComplete: () => {
        if (loaderEl) loaderEl.style.display = "none";

        form.style.display = "none";
        successEl.style.display = "block";

        gsap.fromTo(
          successEl,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.4 }
        );
      }
    });
  }
});

