// Cookie notice bar — same pattern as pagespeed.web.dev's Google cookie
// notice: a dismissible bottom bar with a message, a "learn more" link to
// the site's own privacy policy, and a single acknowledge button. It does
// not gate or block any other script (analytics/ads keep loading exactly as
// before) — it's a disclosure notice, not a consent manager.
(function () {
  "use strict";

  var STORAGE_KEY = "cookieNoticeDismissed_v1";
  try {
    if (localStorage.getItem(STORAGE_KEY)) return;
  } catch (e) {
    return;
  }

  var T = {
    en: { text: "This site uses cookies to improve your experience and analyze traffic.", learnMore: "Learn more", accept: "Got it" },
    pt: { text: "Este site usa cookies para melhorar sua experiência e analisar o tráfego.", learnMore: "Saiba mais", accept: "Entendi" },
    es: { text: "Este sitio usa cookies para mejorar tu experiencia y analizar el tráfico.", learnMore: "Más información", accept: "Entendido" },
    fr: { text: "Ce site utilise des cookies pour améliorer votre expérience et analyser le trafic.", learnMore: "En savoir plus", accept: "J'ai compris" },
    de: { text: "Diese Website verwendet Cookies, um Ihre Erfahrung zu verbessern und den Traffic zu analysieren.", learnMore: "Mehr erfahren", accept: "Verstanden" },
    it: { text: "Questo sito utilizza cookie per migliorare la tua esperienza e analizzare il traffico.", learnMore: "Scopri di più", accept: "Ho capito" },
    nl: { text: "Deze site gebruikt cookies om uw ervaring te verbeteren en het verkeer te analyseren.", learnMore: "Meer informatie", accept: "Begrepen" },
    pl: { text: "Ta strona używa plików cookie, aby poprawić Twoje wrażenia i analizować ruch.", learnMore: "Dowiedz się więcej", accept: "Rozumiem" },
    ru: { text: "Этот сайт использует файлы cookie для улучшения вашего опыта и анализа трафика.", learnMore: "Подробнее", accept: "Понятно" },
    uk: { text: "Цей сайт використовує файли cookie для покращення вашого досвіду та аналізу трафіку.", learnMore: "Дізнатися більше", accept: "Зрозуміло" },
    cs: { text: "Tento web používá soubory cookie ke zlepšení vašeho zážitku a analýze návštěvnosti.", learnMore: "Zjistit více", accept: "Rozumím" },
    da: { text: "Dette websted bruger cookies til at forbedre din oplevelse og analysere trafik.", learnMore: "Læs mere", accept: "Forstået" },
    sv: { text: "Den här webbplatsen använder cookies för att förbättra din upplevelse och analysera trafik.", learnMore: "Läs mer", accept: "Jag förstår" },
    no: { text: "Dette nettstedet bruker informasjonskapsler for å forbedre opplevelsen din og analysere trafikk.", learnMore: "Les mer", accept: "Forstått" },
    fi: { text: "Tämä sivusto käyttää evästeitä käyttökokemuksen parantamiseksi ja liikenteen analysoimiseksi.", learnMore: "Lue lisää", accept: "Selvä" },
    el: { text: "Αυτός ο ιστότοπος χρησιμοποιεί cookies για να βελτιώσει την εμπειρία σας και να αναλύσει την επισκεψιμότητα.", learnMore: "Μάθετε περισσότερα", accept: "Το κατάλαβα" },
    ro: { text: "Acest site folosește cookie-uri pentru a-ți îmbunătăți experiența și a analiza traficul.", learnMore: "Află mai multe", accept: "Am înțeles" },
    hu: { text: "Ez a webhely sütiket használ élményed javítása és a forgalom elemzése érdekében.", learnMore: "Tudj meg többet", accept: "Értem" },
    tr: { text: "Bu site, deneyiminizi geliştirmek ve trafiği analiz etmek için çerezler kullanır.", learnMore: "Daha fazla bilgi", accept: "Anladım" },
    ar: { text: "يستخدم هذا الموقع ملفات تعريف الارتباط لتحسين تجربتك وتحليل حركة المرور.", learnMore: "معرفة المزيد", accept: "فهمت" },
    he: { text: "אתר זה משתמש בעוגיות כדי לשפר את חווייתך ולנתח את התנועה.", learnMore: "למידע נוסף", accept: "הבנתי" },
    hi: { text: "यह साइट आपके अनुभव को बेहतर बनाने और ट्रैफ़िक का विश्लेषण करने के लिए कुकीज़ का उपयोग करती है।", learnMore: "और जानें", accept: "समझ गया" },
    th: { text: "เว็บไซต์นี้ใช้คุกกี้เพื่อปรับปรุงประสบการณ์ของคุณและวิเคราะห์การเข้าชม", learnMore: "เรียนรู้เพิ่มเติม", accept: "เข้าใจแล้ว" },
    vi: { text: "Trang web này sử dụng cookie để cải thiện trải nghiệm của bạn và phân tích lưu lượng truy cập.", learnMore: "Tìm hiểu thêm", accept: "Đã hiểu" },
    id: { text: "Situs ini menggunakan cookie untuk meningkatkan pengalaman Anda dan menganalisis lalu lintas.", learnMore: "Pelajari lebih lanjut", accept: "Mengerti" },
    ms: { text: "Laman ini menggunakan kuki untuk menambah baik pengalaman anda dan menganalisis trafik.", learnMore: "Ketahui lebih lanjut", accept: "Faham" },
    zh: { text: "本网站使用 Cookie 来改善您的体验并分析流量。", learnMore: "了解更多", accept: "知道了" },
    ja: { text: "このサイトはお客様の体験向上とトラフィック解析のためにCookieを使用しています。", learnMore: "詳細", accept: "了解" },
    ko: { text: "이 사이트는 사용자 경험 개선과 트래픽 분석을 위해 쿠키를 사용합니다.", learnMore: "자세히 알아보기", accept: "확인" }
  };

  function init() {
    var lang = (document.documentElement.lang || "en").slice(0, 2).toLowerCase();
    var t = T[lang] || T.en;

    var style = document.createElement("style");
    style.textContent =
      "#cookie-notice{position:fixed;left:0;right:0;bottom:0;z-index:9999;" +
      "background:#202124;color:#f8f9fa;font:14px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;" +
      "display:flex;align-items:center;justify-content:space-between;gap:16px;" +
      "padding:14px 20px;box-shadow:0 -2px 8px rgba(0,0,0,.25);" +
      "transform:translateY(100%);transition:transform .3s ease;flex-wrap:wrap}" +
      "#cookie-notice.is-visible{transform:translateY(0)}" +
      "#cookie-notice a{color:#8ab4f8;text-decoration:underline}" +
      "#cookie-notice a:hover{color:#aecbfa}" +
      "#cookie-notice .cookie-notice__btn{flex:0 0 auto;background:transparent;color:#f8f9fa;" +
      "border:1px solid rgba(255,255,255,.4);border-radius:4px;padding:8px 18px;" +
      "font:inherit;font-weight:600;cursor:pointer;white-space:nowrap}" +
      "#cookie-notice .cookie-notice__btn:hover{background:rgba(255,255,255,.1)}" +
      "#cookie-notice .cookie-notice__text{flex:1 1 260px;margin:0}" +
      "@media (max-width:520px){#cookie-notice{padding:14px 16px}}";
    document.head.appendChild(style);

    var bar = document.createElement("div");
    bar.id = "cookie-notice";
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-live", "polite");

    var textEl = document.createElement("p");
    textEl.className = "cookie-notice__text";
    textEl.textContent = t.text + " ";
    var link = document.createElement("a");
    link.href = "/privacy.html";
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = t.learnMore;
    textEl.appendChild(link);

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cookie-notice__btn";
    btn.textContent = t.accept;
    btn.addEventListener("click", function () {
      bar.classList.remove("is-visible");
      setTimeout(function () {
        if (bar.parentNode) bar.parentNode.removeChild(bar);
      }, 300);
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch (e) {}
    });

    bar.appendChild(textEl);
    bar.appendChild(btn);
    document.body.appendChild(bar);

    // setTimeout (not rAF) so the slide-in still fires if the tab loads in
    // the background — rAF callbacks are paused on non-visible tabs.
    setTimeout(function () {
      bar.classList.add("is-visible");
    }, 20);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
