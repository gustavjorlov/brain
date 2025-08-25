// Brain CLI Website Interactive Functionality

// Terminal Demo Animation
class TerminalDemo {
  constructor(element) {
    this.element = element;
    this.lines = [
      {
        prompt: "$ ",
        command:
          'brain save "debugging auth middleware - tokens expiring randomly"',
        output: [
          "📝 Context saved successfully!",
          "🧠 AI analysis complete",
          "✨ Ready to resume anytime",
        ],
      },
      {
        prompt: "$ ",
        command: "cd ~/work && git checkout feature/payment-flow",
        output: ['Switched to branch "feature/payment-flow"'],
      },
      {
        prompt: "$ ",
        command: "brain resume",
        output: [
          "🧠 Last saved: 2 hours ago on main",
          "",
          '💭 Your thoughts: "debugging auth middleware - tokens expiring randomly"',
          "",
          "🤖 AI Analysis:",
          "   Working on authentication flow issues with token expiry",
          "",
          "📋 Technical Context:",
          "   Recent commits show modifications to auth middleware and",
          "   token validation logic",
          "",
          "🎯 Suggested Next Steps:",
          "   1. Check token expiry configuration in config/jwt.js",
          "   2. Review async/await handling in middleware",
          "   3. Add timing logs to track token lifecycle",
        ],
      },
      { prompt: "$ ", command: "", output: [] },
    ];
    this.currentLine = 0;
    this.currentChar = 0;
    this.isTyping = false;
    this.init();
  }

  init() {
    this.element.innerHTML = "";
    this.startDemo();
  }

  async startDemo() {
    for (let i = 0; i < this.lines.length - 1; i++) {
      await this.typeLine(this.lines[i]);
      await this.wait(800);
    }

    // Add cursor at the end
    const cursorLine = document.createElement("div");
    cursorLine.className = "terminal-line";
    cursorLine.innerHTML =
      '<span class="terminal-prompt">$ </span><span class="terminal-cursor"></span>';
    this.element.appendChild(cursorLine);

    // Restart demo after delay
    setTimeout(() => this.init(), 5000);
  }

  async typeLine(line) {
    const lineElement = document.createElement("div");
    lineElement.className = "terminal-line";
    this.element.appendChild(lineElement);

    // Type prompt
    lineElement.innerHTML =
      `<span class="terminal-prompt">${line.prompt}</span>`;

    // Type command
    for (const _char of line.command) {
      await this.wait(50 + Math.random() * 50);
      lineElement.innerHTML =
        `<span class="terminal-prompt">${line.prompt}</span><span class="terminal-command">${
          line.command.substring(
            0,
            lineElement.textContent.length - line.prompt.length + 1,
          )
        }</span>`;
    }

    await this.wait(300);

    // Show output
    for (const output of line.output) {
      await this.wait(200);
      const outputElement = document.createElement("div");
      outputElement.className = "terminal-line";
      outputElement.innerHTML =
        `<span class="terminal-output">${output}</span>`;
      this.element.appendChild(outputElement);
    }
  }

  wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Installation Tabs
class InstallTabs {
  constructor(container) {
    this.container = container;
    this.buttons = container.querySelectorAll(".tab-button");
    this.contents = container.querySelectorAll(".tab-content");
    this.init();
  }

  init() {
    this.buttons.forEach((button, index) => {
      button.addEventListener("click", () => this.showTab(index));
    });

    // Add copy functionality to code blocks
    this.addCopyButtons();
  }

  showTab(index) {
    // Remove active classes
    this.buttons.forEach((btn) => btn.classList.remove("active"));
    this.contents.forEach((content) => content.classList.remove("active"));

    // Add active classes
    this.buttons[index].classList.add("active");
    this.contents[index].classList.add("active");
  }

  addCopyButtons() {
    const codeBlocks = this.container.querySelectorAll(".code-block");

    codeBlocks.forEach((block) => {
      const copyBtn = document.createElement("button");
      copyBtn.className = "copy-btn";
      copyBtn.textContent = "Copy";

      copyBtn.addEventListener("click", async () => {
        const code = block.textContent.trim();

        try {
          await navigator.clipboard.writeText(code);
          copyBtn.textContent = "Copied!";
          copyBtn.style.background = "rgba(16, 185, 129, 0.2)";
          copyBtn.style.borderColor = "rgba(16, 185, 129, 0.4)";

          setTimeout(() => {
            copyBtn.textContent = "Copy";
            copyBtn.style.background = "rgba(255, 255, 255, 0.1)";
            copyBtn.style.borderColor = "rgba(255, 255, 255, 0.2)";
          }, 2000);
        } catch (_err) {
          copyBtn.textContent = "Failed";
          setTimeout(() => {
            copyBtn.textContent = "Copy";
          }, 2000);
        }
      });

      block.appendChild(copyBtn);
    });
  }
}

// Smooth Scrolling for Navigation
class SmoothScroll {
  constructor() {
    this.init();
  }

  init() {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const targetId = link.getAttribute("href");
        const targetElement = document.querySelector(targetId);

        if (targetElement) {
          const headerHeight = document.querySelector(".header").offsetHeight;
          const targetPosition = targetElement.offsetTop - headerHeight - 20;

          globalThis.scrollTo({
            top: targetPosition,
            behavior: "smooth",
          });
        }
      });
    });
  }
}

// Scroll-based Header Background
class HeaderScroll {
  constructor() {
    this.header = document.querySelector(".header");
    this.init();
  }

  init() {
    globalThis.addEventListener("scroll", () => {
      const scrollY = globalThis.scrollY;

      if (scrollY > 50) {
        this.header.style.backgroundColor = "rgba(255, 255, 255, 0.95)";
        this.header.style.backdropFilter = "blur(15px)";
      } else {
        this.header.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
        this.header.style.backdropFilter = "blur(10px)";
      }
    });
  }
}

// Intersection Observer for Animations
class ScrollAnimations {
  constructor() {
    this.init();
  }

  init() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.animationPlayState = "running";
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
      },
    );

    // Observe feature cards
    const featureCards = document.querySelectorAll(".feature-card");
    featureCards.forEach((card) => {
      card.style.animationPlayState = "paused";
      observer.observe(card);
    });
  }
}

// GitHub Stars Counter (if needed in future)
class _GitHubStats {
  constructor() {
    this.repoUrl = "anthropics/brain-cli"; // Update when real repo exists
  }

  async fetchStats() {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${this.repoUrl}`,
      );
      const data = await response.json();
      return {
        stars: data.stargazers_count,
        forks: data.forks_count,
      };
    } catch (_error) {
      console.log("GitHub stats not available");
      return { stars: 0, forks: 0 };
    }
  }
}

// Mobile Menu Handler
class MobileMenu {
  constructor() {
    this.init();
  }

  init() {
    const nav = document.querySelector(".nav");
    const navLinks = document.querySelector(".nav-links");

    // Create mobile menu button
    const menuButton = document.createElement("button");
    menuButton.className = "mobile-menu-btn";
    menuButton.innerHTML = "☰";
    menuButton.style.display = "none";
    menuButton.style.background = "none";
    menuButton.style.border = "none";
    menuButton.style.fontSize = "1.5rem";
    menuButton.style.cursor = "pointer";
    menuButton.style.color = "var(--text-primary)";

    nav.appendChild(menuButton);

    // Handle responsive behavior
    const handleResize = () => {
      if (globalThis.innerWidth <= 768) {
        menuButton.style.display = "block";
        navLinks.style.display = "none";
      } else {
        menuButton.style.display = "none";
        navLinks.style.display = "flex";
      }
    };

    menuButton.addEventListener("click", () => {
      const isVisible = navLinks.style.display === "flex";
      navLinks.style.display = isVisible ? "none" : "flex";

      if (!isVisible) {
        navLinks.style.position = "absolute";
        navLinks.style.top = "100%";
        navLinks.style.left = "0";
        navLinks.style.right = "0";
        navLinks.style.backgroundColor = "white";
        navLinks.style.flexDirection = "column";
        navLinks.style.padding = "1rem";
        navLinks.style.boxShadow = "var(--shadow)";
      }
    });

    globalThis.addEventListener("resize", handleResize);
    handleResize();
  }
}

// Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Initialize terminal demo
  const terminalContent = document.querySelector(".terminal-content");
  if (terminalContent) {
    new TerminalDemo(terminalContent);
  }

  // Initialize installation tabs
  const installTabs = document.querySelector(".install-tabs");
  if (installTabs) {
    new InstallTabs(installTabs);
  }

  // Initialize upgrade tabs
  initUpgradeTabs();

  // Initialize smooth scrolling
  new SmoothScroll();

  // Initialize header scroll effects
  new HeaderScroll();

  // Initialize scroll animations
  new ScrollAnimations();

  // Initialize mobile menu
  new MobileMenu();

  // Add some interactive enhancements
  addInteractiveEnhancements();
});

// Additional Interactive Enhancements
function addInteractiveEnhancements() {
  // Add hover effects to buttons
  const buttons = document.querySelectorAll(".btn");
  buttons.forEach((btn) => {
    btn.addEventListener("mouseenter", () => {
      btn.style.transform = "translateY(-2px)";
    });

    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "translateY(0)";
    });
  });

  // Add click ripple effect to primary buttons
  const primaryButtons = document.querySelectorAll(".btn-primary");
  primaryButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const ripple = document.createElement("span");
      ripple.style.position = "absolute";
      ripple.style.borderRadius = "50%";
      ripple.style.background = "rgba(255, 255, 255, 0.3)";
      ripple.style.transform = "scale(0)";
      ripple.style.animation = "ripple 0.6s linear";
      ripple.style.left = (e.clientX - btn.getBoundingClientRect().left) + "px";
      ripple.style.top = (e.clientY - btn.getBoundingClientRect().top) + "px";
      ripple.style.width = "20px";
      ripple.style.height = "20px";
      ripple.style.marginLeft = "-10px";
      ripple.style.marginTop = "-10px";

      btn.appendChild(ripple);

      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  });

  // Add CSS for ripple animation
  const style = document.createElement("style");
  style.textContent = `
    @keyframes ripple {
      to {
        transform: scale(2);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

// Upgrade Tabs Functionality
function initUpgradeTabs() {
  const upgradeTabButtons = document.querySelectorAll(".upgrade-tab-button");
  const upgradeTabPanels = document.querySelectorAll(".upgrade-tab-panel");

  upgradeTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetTab = button.getAttribute("data-upgrade-tab");

      // Remove active class from all buttons and panels
      upgradeTabButtons.forEach((btn) => btn.classList.remove("active"));
      upgradeTabPanels.forEach((panel) => panel.classList.remove("active"));

      // Add active class to clicked button and corresponding panel
      button.classList.add("active");
      const targetPanel = document.getElementById(targetTab);
      if (targetPanel) {
        targetPanel.classList.add("active");
      }
    });
  });
}

// Performance optimization: Debounce scroll events
function _debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
