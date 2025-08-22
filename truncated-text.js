// Enhanced class to handle text truncation functionality with smooth loading transitions
class TextTruncation {
  constructor() {
    this.observers = new Map(); // Track MutationObservers for rich text elements
    this.pendingContainers = new Set(); // Track containers waiting to be shown
    this.init();
  }

  init() {
    // Initialize on DOM content loaded
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    // Find all parent containers and set up their functionality
    const containers = document.querySelectorAll('[truncated-text="parent"]');

    if (containers.length === 0) {
      return;
    }

    // Track total containers for completion checking
    this.totalContainers = containers.length;
    this.processedContainers = 0;

    containers.forEach((container) => {
      this.pendingContainers.add(container);
      this.setupContainer(container);
    });

    // Fallback to show containers after a maximum wait time
    setTimeout(() => {
      this.showAllPendingContainers();
    }, 1500); // 1.5 second max wait
  }

  setupContainer(container) {
    // Get elements within the container
    const textElement = container.querySelector('[truncated-text="active"]');
    const readMoreBtn = container.querySelector('[truncated-text="read-more"]');
    const readLessBtn = container.querySelector('[truncated-text="read-less"]');

    // Check if this is a button-less truncation (buttons are optional now)
    const hasButtons = readMoreBtn && readLessBtn;

    // Ensure text element exists (this is the only required element)
    if (!textElement) {
      console.warn(
        "Missing text element in truncated text container:",
        container
      );
      this.markContainerReady(container);
      return;
    }

    // Check if this is a rich text editor element
    const isRichText = this.isRichTextElement(textElement);

    // Check if data-max-chars is set and valid
    const maxChars = textElement.getAttribute("data-max-chars");
    const hasValidMaxChars =
      maxChars && maxChars.trim() !== "" && parseInt(maxChars) > 0;

    // If buttons exist, hide them initially
    if (hasButtons) {
      readMoreBtn.style.display = "none";
      readLessBtn.style.display = "none";

      // If no valid max-chars, hide buttons permanently
      if (!hasValidMaxChars) {
        readMoreBtn.style.display = "none !important";
        readLessBtn.style.display = "none !important";
        readMoreBtn.setAttribute("data-disabled", "true");
        readLessBtn.setAttribute("data-disabled", "true");
      }
    }

    // For rich text elements, we need to wait for them to be fully initialized
    if (isRichText) {
      this.setupRichTextElement(
        textElement,
        readMoreBtn,
        readLessBtn,
        hasButtons && hasValidMaxChars,
        container
      );
    } else {
      // Regular text element setup
      const needsTruncation = this.truncateText(textElement);

      // Only show read more button if text was actually truncated AND buttons exist AND max-chars is valid
      if (needsTruncation && hasButtons && hasValidMaxChars) {
        readMoreBtn.style.display = "inline";
      }

      // Mark this container as ready
      this.markContainerReady(container);
    }

    // Add event listeners only if buttons exist AND max-chars is valid
    if (hasButtons && hasValidMaxChars) {
      readMoreBtn.addEventListener("click", () => {
        this.expandText(textElement);
        readMoreBtn.style.display = "none";
        readLessBtn.style.display = "inline";
      });

      readLessBtn.addEventListener("click", () => {
        this.truncateText(textElement);
        readMoreBtn.style.display = "inline";
        readLessBtn.style.display = "none";
      });
    }
  }

  // Mark a container as ready and show it
  markContainerReady(container) {
    if (this.pendingContainers.has(container)) {
      this.pendingContainers.delete(container);
      this.showContainer(container);
      this.processedContainers++;
    }
  }

  // Show a single container with smooth transition
  showContainer(container) {
    // Remove the loading class which should have opacity: 0 and visibility: hidden
    container.classList.remove("truncation-loading");

    // Alternative approach: If you prefer to override styles directly
    // container.style.opacity = '1';
    // container.style.visibility = 'visible';
  }

  // Show all pending containers (fallback)
  showAllPendingContainers() {
    this.pendingContainers.forEach((container) => {
      this.showContainer(container);
    });
    this.pendingContainers.clear();
  }

  // Check if element is a rich text editor
  isRichTextElement(element) {
    return (
      element.hasAttribute("contenteditable") ||
      element.closest("[contenteditable]") ||
      element.hasAttribute("data-rich-text") ||
      element.classList.contains("rich-text") ||
      element.classList.contains("wysiwyg") ||
      element.querySelector("[contenteditable]") ||
      // Check for common rich text editor class names
      element.classList.contains("ql-editor") || // Quill
      element.classList.contains("tox-edit-area") || // TinyMCE
      element.classList.contains("cke_editable") || // CKEditor
      element.classList.contains("fr-element") || // Froala
      // Check for Webflow rich text classes
      element.classList.contains("w-richtext") ||
      element.querySelector(".w-richtext")
    );
  }

  // Special handling for rich text elements
  setupRichTextElement(
    textElement,
    readMoreBtn,
    readLessBtn,
    hasButtons,
    container
  ) {
    // Wait for rich text editor to initialize
    const checkInitialization = () => {
      // Try truncation after a short delay to ensure editor is ready
      setTimeout(() => {
        const needsTruncation = this.truncateText(textElement);

        if (needsTruncation && hasButtons) {
          readMoreBtn.style.display = "inline";
        }

        // Set up mutation observer to watch for editor changes
        if (needsTruncation) {
          this.setupRichTextObserver(textElement);
        }

        // Mark container as ready
        this.markContainerReady(container);
      }, 100);
    };

    // If element is already loaded, proceed immediately
    if (textElement.innerHTML.trim()) {
      checkInitialization();
    } else {
      // Wait for content to load
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === "childList" && textElement.innerHTML.trim()) {
            observer.disconnect();
            checkInitialization();
          }
        });
      });

      observer.observe(textElement, { childList: true, subtree: true });

      // Fallback timeout
      setTimeout(() => {
        observer.disconnect();
        checkInitialization();
      }, 1000);
    }
  }

  // Set up observer for rich text elements to prevent editor from overriding truncation
  setupRichTextObserver(element) {
    if (this.observers.has(element)) {
      this.observers.get(element).disconnect();
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "childList" ||
          mutation.type === "characterData"
        ) {
          // Check if the change restored full content when we want it truncated
          if (element.classList.contains("truncated")) {
            const currentText = this.getTextContent(element);
            const maxChars =
              parseInt(element.getAttribute("data-max-chars")) || 100;

            // If content is longer than it should be, re-truncate
            if (currentText.length > maxChars + 10) {
              // +10 for ellipsis tolerance
              setTimeout(() => this.truncateText(element), 50);
            }
          }
        }
      });
    });

    observer.observe(element, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    this.observers.set(element, observer);
  }

  truncateText(element) {
    // Get the maximum characters from the attribute or use default
    const maxCharsAttr = element.getAttribute("data-max-chars");

    // If data-max-chars is empty, null, or invalid, don't truncate
    if (
      !maxCharsAttr ||
      maxCharsAttr.trim() === "" ||
      parseInt(maxCharsAttr) <= 0
    ) {
      element.classList.remove("truncated");
      return false;
    }

    const maxChars = parseInt(maxCharsAttr);

    // Check if this is a rich text element that needs special handling
    const isRichText = this.isRichTextElement(element);

    // Get original HTML content (preserves formatting)
    const fullHTML =
      element.getAttribute("data-full-html") || element.innerHTML.trim();

    // Store full HTML if not already stored
    if (!element.hasAttribute("data-full-html")) {
      element.setAttribute("data-full-html", fullHTML);
    }

    // Get text content for length calculation
    const textOnly = this.getTextContent(element, fullHTML);

    // Only truncate if text is longer than max chars
    if (textOnly.length > maxChars) {
      const truncatedHTML = this.truncateHTML(element, fullHTML, maxChars);
      const finalHTML = this.addEllipsis(truncatedHTML, isRichText);

      // For rich text elements, we need to be more careful about how we set content
      if (isRichText) {
        this.setRichTextContent(element, finalHTML);
      } else {
        element.innerHTML = finalHTML;
      }

      element.classList.add("truncated");
      return true;
    }

    // Text doesn't need truncation
    if (isRichText) {
      this.setRichTextContent(element, fullHTML);
    } else {
      element.innerHTML = fullHTML;
    }

    element.classList.remove("truncated");
    return false;
  }

  // Get text content with proper spacing handling
  getTextContent(element, html = null) {
    const content = html || element.innerHTML;

    // Check if paragraph spacing is enabled (default: true)
    const spacingEnabled = this.isParagraphSpacingEnabled(element);

    if (!spacingEnabled) {
      // Simple text extraction without paragraph spacing
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = content;
      return tempDiv.textContent || tempDiv.innerText || "";
    }

    // For paragraph spacing, we need to handle it differently
    return this.getTextWithParagraphSpacing(content);
  }

  // Check if paragraph spacing is enabled based on HTML attribute
  isParagraphSpacingEnabled(element) {
    const spacingAttr = element.getAttribute("truncate-spacing");

    // If attribute is not set, default to true (spacing enabled)
    if (spacingAttr === null) {
      return true;
    }

    // Check for explicit false values
    const lowerValue = spacingAttr.toLowerCase().trim();
    return !(
      lowerValue === "false" ||
      lowerValue === "0" ||
      lowerValue === "off" ||
      lowerValue === "no"
    );
  }

  // Get text content with paragraph spacing - simplified approach
  getTextWithParagraphSpacing(html) {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    // Get all paragraphs and block elements
    const paragraphs = tempDiv.querySelectorAll(
      "p, div, h1, h2, h3, h4, h5, h6, blockquote, pre, li"
    );

    let combinedText = "";

    if (paragraphs.length > 0) {
      // Process each paragraph
      paragraphs.forEach((p, index) => {
        const paragraphText = (p.textContent || "").trim();
        if (paragraphText) {
          // Add space between paragraphs (except for the first one)
          if (combinedText.length > 0) {
            combinedText += " ";
          }
          combinedText += paragraphText;
        }
      });
    }

    // If no paragraphs found or no text extracted, fall back to simple text content
    if (!combinedText.trim()) {
      combinedText = tempDiv.textContent || tempDiv.innerText || "";
    }

    return combinedText;
  }

  // Special method for setting content in rich text editors
  setRichTextContent(element, html) {
    // Temporarily disable contenteditable to prevent editor interference
    const wasEditable = element.getAttribute("contenteditable");
    if (wasEditable) {
      element.setAttribute("contenteditable", "false");
    }

    // Set the content
    element.innerHTML = html;

    // Re-enable contenteditable if it was enabled
    if (wasEditable) {
      setTimeout(() => {
        element.setAttribute("contenteditable", wasEditable);
      }, 10);
    }
  }

  expandText(element) {
    const fullHTML = element.getAttribute("data-full-html");
    if (fullHTML) {
      const isRichText = this.isRichTextElement(element);

      if (isRichText) {
        this.setRichTextContent(element, fullHTML);
      } else {
        element.innerHTML = fullHTML;
      }

      element.classList.remove("truncated");
    }
  }

  // Simplified method to truncate HTML while preserving structure
  truncateHTML(element, html, maxChars) {
    const spacingEnabled = this.isParagraphSpacingEnabled(element);

    if (!spacingEnabled) {
      // Simple character-based truncation without paragraph spacing
      return this.simpleHTMLTruncate(html, maxChars);
    }

    // Handle paragraph spacing truncation
    return this.paragraphSpacingHTMLTruncate(html, maxChars);
  }

  // Simple HTML truncation without paragraph spacing considerations
  simpleHTMLTruncate(html, maxChars) {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    const result = this.walkAndTruncate(tempDiv, maxChars, { count: 0 });
    return result.innerHTML;
  }

  // HTML truncation with paragraph spacing considerations
  paragraphSpacingHTMLTruncate(html, maxChars) {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    // Get all paragraphs
    const paragraphs = tempDiv.querySelectorAll(
      "p, div, h1, h2, h3, h4, h5, h6, blockquote, pre, li"
    );

    if (paragraphs.length === 0) {
      // No paragraphs, use simple truncation
      return this.simpleHTMLTruncate(html, maxChars);
    }

    let currentLength = 0;
    const resultDiv = document.createElement("div");

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      const paragraphText = (paragraph.textContent || "").trim();

      if (!paragraphText) continue;

      // Add space for paragraph spacing (except for first paragraph)
      const spaceNeeded = currentLength > 0 ? 1 : 0;

      // Check if we can fit this entire paragraph
      if (currentLength + spaceNeeded + paragraphText.length <= maxChars) {
        // Clone the entire paragraph
        const clonedParagraph = paragraph.cloneNode(true);
        resultDiv.appendChild(clonedParagraph);
        currentLength += spaceNeeded + paragraphText.length;
      } else {
        // We need to truncate within this paragraph
        const availableChars = maxChars - currentLength - spaceNeeded;

        if (availableChars > 0) {
          const truncatedParagraph = this.truncateParagraph(
            paragraph,
            availableChars
          );
          if (truncatedParagraph) {
            resultDiv.appendChild(truncatedParagraph);
          }
        }
        break;
      }
    }

    return resultDiv.innerHTML;
  }

  // Truncate a single paragraph to fit within character limit
  truncateParagraph(paragraph, maxChars) {
    const clonedParagraph = paragraph.cloneNode(false);
    const result = this.walkAndTruncate(paragraph, maxChars, { count: 0 });

    // Copy the truncated content to the cloned paragraph
    clonedParagraph.innerHTML = result.innerHTML;

    return clonedParagraph;
  }

  // Walk through nodes and truncate text content
  walkAndTruncate(node, maxChars, counter) {
    const result = node.cloneNode(false);

    for (let child of node.childNodes) {
      if (counter.count >= maxChars) break;

      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent;
        const remainingChars = maxChars - counter.count;

        if (text.length <= remainingChars) {
          result.appendChild(child.cloneNode());
          counter.count += text.length;
        } else {
          // Truncate at last space to avoid cutting words
          const truncateIndex = text.lastIndexOf(" ", remainingChars);
          const cutIndex = truncateIndex > 0 ? truncateIndex : remainingChars;

          if (cutIndex > 0) {
            const truncatedText = text.substring(0, cutIndex);
            result.appendChild(document.createTextNode(truncatedText));
            counter.count += truncatedText.length;
          }
          break;
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const processedChild = this.walkAndTruncate(child, maxChars, counter);

        // Only add if it has content
        if (
          processedChild.textContent.trim().length > 0 ||
          processedChild.querySelector(
            "img, br, hr, input, video, audio, canvas, svg"
          )
        ) {
          result.appendChild(processedChild);
        }
      }
    }

    return result;
  }

  // Smart ellipsis addition that handles rich text properly
  addEllipsis(html, isRichText) {
    if (!html.trim()) return html;

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    // Find the last text node to add ellipsis
    const lastTextNode = this.findLastTextNode(tempDiv);

    if (lastTextNode && lastTextNode.nodeType === Node.TEXT_NODE) {
      // Add ellipsis directly to the text content
      lastTextNode.textContent = lastTextNode.textContent.trimEnd() + "...";
    } else {
      // Fallback: add ellipsis span
      const ellipsisSpan = document.createElement("span");
      ellipsisSpan.className = "truncation-ellipsis";
      ellipsisSpan.textContent = "...";
      tempDiv.appendChild(ellipsisSpan);
    }

    return tempDiv.innerHTML;
  }

  // Find the last text node in the HTML structure
  findLastTextNode(element) {
    let lastTextNode = null;

    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        return node.textContent.trim().length > 0
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      },
    });

    let node;
    while ((node = walker.nextNode())) {
      lastTextNode = node;
    }

    return lastTextNode;
  }
}

// Initialize the truncation system
const textTruncation = new TextTruncation();
