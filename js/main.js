/* ==========================================================================
   BOXPARK — site interactions
   Plain ES5-friendly JS, no dependencies.
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;

  /* ---------- Sticky nav ---------- */
  var nav = doc.querySelector('.nav');
  var progress = doc.querySelector('.progress');
  var toTop = doc.querySelector('.totop');

  function onScroll() {
    var y = window.pageYOffset;

    if (nav) nav.classList.toggle('is-stuck', y > 30);
    if (toTop) toTop.classList.toggle('is-vis', y > 600);

    if (progress) {
      var h = doc.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- Mobile drawer ---------- */
  var burger = doc.querySelector('.nav__burger');
  var drawer = doc.querySelector('.drawer');

  if (burger && drawer) {
    burger.addEventListener('click', function () {
      var open = drawer.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      doc.body.style.overflow = open ? 'hidden' : '';
    });

    Array.prototype.forEach.call(drawer.querySelectorAll('a'), function (a) {
      a.addEventListener('click', function () {
        drawer.classList.remove('is-open');
        burger.classList.remove('is-open');
        doc.body.style.overflow = '';
      });
    });
  }

  /* ---------- Reveal on scroll ----------
     Two mechanisms on purpose. IntersectionObserver drives the normal case,
     but it does not reliably re-fire when a page is opened directly at an
     anchor (/rules.html#cricket) — the callback can run against pre-scroll
     geometry and never fire again, leaving whole sections stuck at opacity 0.
     The rAF-throttled sweep below is the guarantee: it re-tests real geometry
     on scroll, resize, hashchange and load, and unbinds once everything is in. */
  var revealables = doc.querySelectorAll('[data-reveal]');
  var pending = Array.prototype.slice.call(revealables);

  function sweep() {
    if (!pending.length) return;
    var vh = window.innerHeight || doc.documentElement.clientHeight;
    pending = pending.filter(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.96 && r.bottom > 0) {
        el.classList.add('is-in');
        return false;
      }
      return true;
    });
    if (!pending.length) unbind();
  }

  var sweepQueued = false;
  function queueSweep() {
    if (sweepQueued) return;
    sweepQueued = true;
    requestAnimationFrame(function () { sweepQueued = false; sweep(); });
  }

  function unbind() {
    window.removeEventListener('scroll', queueSweep);
    window.removeEventListener('resize', queueSweep);
    window.removeEventListener('hashchange', queueSweep);
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          pending = pending.filter(function (el) { return el !== entry.target; });
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });

    Array.prototype.forEach.call(revealables, function (el) { io.observe(el); });
  }

  window.addEventListener('scroll', queueSweep, { passive: true });
  window.addEventListener('resize', queueSweep, { passive: true });
  window.addEventListener('hashchange', queueSweep);
  // Settling loop: an anchor jump, a webfont swap or a lazy image can all move
  // the page after load without emitting a scroll event. Rather than guess at
  // timeouts, re-test every frame for the first 3 seconds, then stop.
  function settle() {
    var frames = 180;               // ~3s at 60fps; counted in frames, not
    (function tick() {              // wall-clock, so it survives throttling
      sweep();
      if (pending.length && --frames > 0) requestAnimationFrame(tick);
    })();
  }

  window.addEventListener('load', settle);
  settle();

  /* ---------- Count-up stats ---------- */
  var counters = doc.querySelectorAll('[data-count]');

  function runCounter(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var suffix = el.getAttribute('data-suffix') || '';
    var dur = 1400;
    var start = null;

    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      // easeOutExpo
      var eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  if (counters.length && 'IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          runCounter(entry.target);
          cio.unobserve(entry.target);
        }
      });
    }, { threshold: 0.35 });
    Array.prototype.forEach.call(counters, function (el) { cio.observe(el); });
  }

  /* ---------- Hero parallax ---------- */
  var heroMedia = doc.querySelector('.hero__media img');
  if (heroMedia && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.pageYOffset;
        if (y < window.innerHeight) {
          heroMedia.style.transform = 'translate3d(0,' + (y * 0.12) + 'px,0)';
          heroMedia.style.animationPlayState = y > 4 ? 'paused' : 'running';
        }
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---------- Gallery filters ---------- */
  var filters = doc.querySelectorAll('.filter');
  var figures = doc.querySelectorAll('.grid figure');

  if (filters.length) {
    Array.prototype.forEach.call(filters, function (btn) {
      btn.addEventListener('click', function () {
        var cat = btn.getAttribute('data-filter');

        Array.prototype.forEach.call(filters, function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');

        Array.prototype.forEach.call(figures, function (fig) {
          var show = cat === 'all' || fig.getAttribute('data-cat') === cat;
          fig.classList.toggle('is-hidden', !show);
        });
      });
    });
  }

  /* ---------- Lightbox ---------- */
  var lb = doc.querySelector('.lb');

  if (lb && figures.length) {
    var lbImg = lb.querySelector('img');
    var lbCount = lb.querySelector('.lb__count');
    var current = 0;

    function visibleFigures() {
      return Array.prototype.filter.call(figures, function (f) {
        return !f.classList.contains('is-hidden');
      });
    }

    function show(index) {
      var list = visibleFigures();
      if (!list.length) return;
      current = (index + list.length) % list.length;
      var img = list[current].querySelector('img');
      lbImg.src = img.getAttribute('data-full') || img.src;
      lbImg.alt = img.alt;
      if (lbCount) lbCount.textContent = (current + 1) + ' / ' + list.length;
    }

    function open(index) {
      show(index);
      lb.classList.add('is-open');
      doc.body.style.overflow = 'hidden';
    }

    function close() {
      lb.classList.remove('is-open');
      doc.body.style.overflow = '';
    }

    Array.prototype.forEach.call(figures, function (fig) {
      fig.addEventListener('click', function () {
        open(visibleFigures().indexOf(fig));
      });
    });

    lb.querySelector('.lb__close').addEventListener('click', close);
    lb.querySelector('.lb__nav--prev').addEventListener('click', function (e) {
      e.stopPropagation();
      show(current - 1);
    });
    lb.querySelector('.lb__nav--next').addEventListener('click', function (e) {
      e.stopPropagation();
      show(current + 1);
    });
    lb.addEventListener('click', function (e) {
      if (e.target === lb) close();
    });

    doc.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });
  }

  /* ---------- Year in footer ---------- */
  Array.prototype.forEach.call(doc.querySelectorAll('[data-year]'), function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
