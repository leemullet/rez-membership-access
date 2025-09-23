/*
 * Minimal helper for CSS-only ticker:
 * - Ensures structure: .ticker > .ticker-container > .ticker-item*
 * - Duplicates items once so CSS keyframes can scroll seamlessly.
 * - Respects inline CSS variables: --ticker-gap, --ticker-duration
 */
(function(){
  function init(){
    var tickers = document.querySelectorAll('.ticker');
    if(!tickers.length) return;
    tickers.forEach(function(el){
      // Skip if a JS ticker already initialized
      if (el.__basicTickerReady) return;

      var container = el.querySelector(':scope > .ticker-container');
      if(!container){
        container = document.createElement('div');
        container.className = 'ticker-container';

        // Move existing direct children into container
        var children = Array.prototype.slice.call(el.childNodes);
        children.forEach(function(node){
          if(node.nodeType === 1 || (node.nodeType === 3 && node.textContent.trim() !== '')){
            container.appendChild(node);
          }
        });
        el.appendChild(container);
      }

      // If items are not present, do nothing
      var items = container.querySelectorAll('.ticker-item');
      if(!items.length) { el.__basicTickerReady = true; return; }

      // Duplicate one set if not already duplicated
      if(!container.__basicDuplicated){
        var frag = document.createDocumentFragment();
        items.forEach(function(item){
          var clone = item.cloneNode(true);
          clone.setAttribute('aria-hidden','true');
          frag.appendChild(clone);
        });
        container.appendChild(frag);
        container.__basicDuplicated = true;
      }

      // Apply gap inline if provided via CSS var fallback
      var styles = getComputedStyle(el);
      var gap = styles.getPropertyValue('--ticker-gap').trim();
      if(gap){ container.style.columnGap = gap; container.style.gap = gap; }

      el.__basicTickerReady = true;
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


