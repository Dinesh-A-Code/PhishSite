/* ---------- helpers ---------- */
function escapeHtml(str){
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function escapeReg(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}

/* ---------- sample emails ---------- */
const SAMPLES = {
  legit:{
    subject:"Your July invoice from Meridian Cloud Hosting",
    sender:"billing@meridiancloud.com",
    urls:"https://meridiancloud.com/account/invoices",
    metadata:"SPF: pass; DKIM: pass; Reply-To: billing@meridiancloud.com",
    body:"Hi Priya,\n\nYour invoice for July is ready in your account dashboard. The total this month is $84.20, due on the 15th. You can review the full breakdown or update your payment method anytime from your billing page.\n\nIf anything looks off, just reply to this email and our billing team will take a look.\n\nThanks for hosting with us,\nThe Meridian Cloud team"
  },
  human:{
    subject:"Your acount will be suspend today!!",
    sender:"support@paypa1-secure.com",
    urls:"http://paypa1-secure-verify.com/login",
    metadata:"SPF: fail; Reply-To: security-noreply@mail-verify.ru",
    body:"Dear Valued Customer,\n\nWe detect unusual activaty on your acount. You must verifiy your identity immediatly or your acount will be suspend within 24 hours. Click bellow link now to avoid permanant lock:\n\nhttp://paypa1-secure-verify.com/login\n\nFailure to act will result in permanant closure of your acount. This is urgent, please don't ignore.\n\nSecurity Team"
  },
  ai:{
    subject:"Action required: Confirm your account details",
    sender:"accounts@secure-billing-update.com",
    urls:"https://secure-billing-update.com/confirm?id=88213",
    metadata:"SPF: neutral; Reply-To: no-reply@secure-billing-update.com",
    body:"Dear Valued Customer,\n\nI hope this message finds you well. We are reaching out to inform you that we've noticed some unusual activity associated with your account, and as a precaution, we kindly ask that you confirm your details at your earliest convenience.\n\nRest assured, this is simply a routine security measure, and we appreciate your prompt attention to this matter. To avoid any interruption to your account access, please confirm your information within the next 24 hours by following the secure link below.\n\nWe understand the inconvenience this may cause and thank you for your understanding and cooperation.\n\nWarm regards,\nThe Accounts Security Team"
  }
};

document.querySelectorAll('.sample-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const s = SAMPLES[btn.dataset.sample];
    document.getElementById('in-subject').value = s.subject;
    document.getElementById('in-sender').value = s.sender;
    document.getElementById('in-urls').value = s.urls;
    document.getElementById('in-metadata').value = s.metadata;
    document.getElementById('in-body').value = s.body;
  });
});

/* ---------- navigation ---------- */
const VIEW_TITLES = {
  dashboard:"Dashboard", inbox:"Inbox", scan:"Scan Email", results:"Results", history:"History", analytics:"Analytics", lab:"Model Lab", settings:"Settings"
};
function showView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+name).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===name));
  const titleEl = document.querySelector('.topbar-title');
  if(titleEl && VIEW_TITLES[name]) titleEl.textContent = VIEW_TITLES[name];
}
document.querySelectorAll('.nav-item').forEach(btn=>{
  btn.addEventListener('click',()=>{
    if(!btn.disabled) showView(btn.dataset.view);
    const mobileToggle = document.getElementById('mobile-nav-toggle');
    if(mobileToggle) mobileToggle.checked = false;
  });
});
document.getElementById('btn-rescan').addEventListener('click',()=>showView('scan'));
const dashScanBtn = document.getElementById('btn-dash-scan');
if(dashScanBtn) dashScanBtn.addEventListener('click', ()=>showView('scan'));

/* ---------- feature dictionaries ---------- */
const STRONG_URGENCY_WORDS = ["urgent","immediately","immediatly","act now","verify now","failure to act","permanent closure","permanantly","permanant","click below","click bellow","click here","confirm your account","limited time","expire","expires","within the next","right away","avoid"];
const MILD_URGENCY_WORDS = ["suspend","suspended","24 hours","24 hour","locked","restricted","unauthorized"];
const GENERIC_GREETINGS = ["dear valued customer","dear customer","dear user","dear member","dear sir","dear madam","dear account holder"];
const AI_HEDGE_PHRASES = ["i hope this message finds you well","rest assured","we understand the inconvenience","at your earliest convenience","we kindly ask","thank you for your understanding","warm regards","please do not hesitate","we appreciate your","as a precaution","we are reaching out"];
const SPELLING_WORDS = ["acount","verifiy","immediatly","bellow","permanant","recieve","seperate","occured","adress","activaty","cancelation","untill","wich","becuase"];

// Phrases characteristic of a genuine account/security notification (new sign-in alerts,
// 2FA changes, "was this you?" wording). Recognizing 2+ of these is used, together with
// domain trust and the absence of strong phishing indicators, to avoid penalizing the
// urgency/warning language that legitimate security mail always contains. A single phrase
// (e.g. just the subject line "Security alert") is deliberately NOT enough on its own —
// see securityContext below.
const SECURITY_NOTIFICATION_PHRASES = ["security alert","new sign-in","new device","authenticator app","2-step verification","two-step verification","security activity","account activity","if you didn't","if this wasn't you","secure your account","sign-in attempt","verify it's you","recognize this activity","review your account"];

// Explicit requests for credentials or payment details — a strong phishing indicator on its
// own, independent of any URL/domain analysis.
const CREDENTIAL_HARVEST_PHRASES = ["enter your password","confirm your password","re-enter your password","enter your pin","confirm your card number","enter your card number","enter your ssn","social security number","confirm your payment details","enter your cvv","provide your login credentials"];

// Small, documented trusted-domain list, organized by brand. A hostname is trusted if it
// equals one of these entries or is a subdomain of one (e.g. accounts.google.com ->
// google.com). This is intentionally short — it only needs to cover the brands referenced
// in lookalike detection below, not be a comprehensive allowlist. Trusted status never
// marks a message safe on its own; it only suppresses false lookalike/TLD signals for that
// specific domain (see isTrustedHostname / classifyUrls / classifySender).
const TRUSTED_DOMAINS = {
  "Google": ["google.com","accounts.google.com"],
  "Microsoft": ["microsoft.com","office.com"],
  "Apple": ["apple.com"],
  "PayPal": ["paypal.com"],
  "Amazon": ["amazon.com"],
  "LinkedIn": ["linkedin.com"],
  "GitHub": ["github.com"]
};
const TRUSTED_ROOT_DOMAINS = Object.values(TRUSTED_DOMAINS).flat();
const BRAND_KEYWORDS = ["google","microsoft","apple","paypal","amazon","linkedin","github"];
const LEET_MAP = {'0':'o','1':'l','3':'e','5':'s','7':'t','8':'b'};
const RISKY_TLDS = ["ru","xyz","top","click","zip","tk"];

function findMatches(text, list, category){
  const out = [];
  list.forEach(phrase=>{
    const re = new RegExp(escapeReg(phrase),'gi');
    let m;
    while((m = re.exec(text)) !== null){
      out.push({start:m.index, end:m.index+m[0].length, category, match:m[0]});
      if(re.lastIndex === m.index) re.lastIndex++;
    }
  });
  return out;
}

function getHostname(urlLike){
  try{
    return new URL(urlLike.trim()).hostname.toLowerCase();
  }catch(e){
    return null;
  }
}

// normalizeDomain(url) — internal-only helper. Strips protocol, "www.", and any path/query
// (via getHostname's URL parsing), returning a bare lowercase domain.
// e.g. "https://www.Google.com/security" -> "google.com"
function normalizeDomain(urlLike){
  const host = getHostname(urlLike) || getHostname('https://'+String(urlLike||'').trim());
  if(!host) return null;
  return host.replace(/^www\./,'');
}

// Prepends https:// so bare domains (no protocol) can still be parsed by the URL API,
// e.g. "accounts.google.com/path" -> parsable the same way as a full https:// link.
function toParsableUrl(candidate){
  const c = candidate.trim();
  return /^https?:\/\//i.test(c) ? c : 'https://'+c;
}

// Pulls URL-like candidates out of free text, beyond plain "https://..." links: markdown
// links [label](url), HTML anchors with href="...", and bare domains typed without a
// protocol (e.g. "accounts.google.com/path" or "www.example.com"). Purely additive to the
// existing plain-URL matching already used elsewhere — this only feeds the classifier's own
// hostname analysis, it does not change Gmail's own link extraction.
function extractUrlCandidates(text){
  if(!text) return [];
  const candidates = [];
  const mdRe = /\[[^\]]*\]\(([^)\s]+)\)/g;
  let m;
  while((m = mdRe.exec(text)) !== null) candidates.push(m[1]);
  const hrefRe = /href=["']([^"']+)["']/gi;
  while((m = hrefRe.exec(text)) !== null) candidates.push(m[1]);
  const fullRe = /https?:\/\/[^\s"'<>)\]]+/gi;
  while((m = fullRe.exec(text)) !== null) candidates.push(m[0]);
  const bareRe = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s,]*)?\b/gi;
  while((m = bareRe.exec(text)) !== null) candidates.push(m[0]);
  return [...new Set(candidates)];
}

// Flags hostnames stacking an unusual number of subdomain labels in front of the real
// domain — a common phishing pattern (e.g. login.verify.account-security.example.com).
function hasExcessiveSubdomains(host){
  if(!host) return false;
  return host.split('.').length >= 5;
}

// Best-effort "same organization" comparison for sender-vs-link checks: takes the last two
// dot-separated labels (e.g. "accounts.google.com" -> "google.com"). Deliberately simple —
// only used to decide whether a sender and a link plausibly belong to the same domain, never
// as a standalone suspicion signal on its own (see senderLinkMismatch in analyzeEmail).
function rootOf(host){
  if(!host) return null;
  const parts = host.split('.');
  return parts.length>=2 ? parts.slice(-2).join('.') : host;
}

function isTrustedHostname(host){
  if(!host) return false;
  return TRUSTED_ROOT_DOMAINS.some(root => host===root || host.endsWith('.'+root));
}

function isLookalikeHostname(host){
  if(!host || isTrustedHostname(host)) return false;
  const core = host.replace(/\.(com|net|org|co|io|info|biz)$/i,'');
  if(!/[0-9]/.test(core) && !/--/.test(core)) return false; // only real char-substitution/hyphen-stuffing candidates
  const normalized = core.split('').map(ch=>LEET_MAP[ch]||ch).join('').replace(/-/g,'');
  return BRAND_KEYWORDS.some(b => normalized.includes(b));
}

// Parses the real hostname(s) out of a URL field (which may hold several links in plain,
// markdown, HTML-anchor, or bare-domain form) instead of pattern-matching the raw string,
// so query-string/path text never gets mistaken for the domain.
function classifyUrls(urlsField){
  const raw = (urlsField||"").trim();
  if(raw==="") return {hasUrl:false, lookalike:false, riskyTld:false, insecure:false, excessiveSubdomains:false, hosts:[]};
  const candidates = extractUrlCandidates(raw);
  const hosts = [];
  let insecure = false;
  candidates.forEach(c=>{
    const parsable = toParsableUrl(c);
    const host = normalizeDomain(parsable);
    if(host){
      hosts.push(host);
      if(/^http:\/\//i.test(c.trim()) && !isTrustedHostname(host)) insecure = true;
    }
  });
  return {
    hasUrl: hosts.length>0 || candidates.length>0,
    lookalike: hosts.some(isLookalikeHostname),
    riskyTld: hosts.some(h => RISKY_TLDS.some(tld=>h.endsWith('.'+tld))),
    excessiveSubdomains: hosts.some(hasExcessiveSubdomains),
    insecure, hosts
  };
}

// Evaluates the real sender email domain, ignoring the display name entirely — a message
// "from" a well-known brand name is judged only on the domain after @, never the label
// before it, so display-name spoofing and domain legitimacy stay separate concerns.
function classifySender(sender){
  const raw = (sender||"").trim();
  if(raw==="") return {hasSender:false, lookalike:false, riskyTld:false, excessiveSubdomains:false, domain:null};
  const angleMatch = raw.match(/<([^>]+)>/);
  const addr = angleMatch ? angleMatch[1] : raw;
  const at = addr.lastIndexOf('@');
  const rawDomain = at>=0 ? addr.slice(at+1).trim() : null;
  const domain = rawDomain ? normalizeDomain('https://'+rawDomain) : null;
  if(!domain) return {hasSender:true, lookalike:false, riskyTld:false, excessiveSubdomains:false, domain:null};
  return {
    hasSender:true,
    lookalike: isLookalikeHostname(domain),
    riskyTld: RISKY_TLDS.some(tld=>domain.endsWith('.'+tld)),
    excessiveSubdomains: hasExcessiveSubdomains(domain),
    domain
  };
}

function analyzeEmail(fields){
  const subject = fields.subject||"";
  const body = fields.body||"";
  const sender = fields.sender||"";
  const urls = fields.urls||"";
  const full = (subject+" \n "+body);
  const lower = full.toLowerCase();

  const strongUrgencyMatches = findMatches(full, STRONG_URGENCY_WORDS, 'human');
  const mildUrgencyMatches = findMatches(full, MILD_URGENCY_WORDS, 'human');
  const urgencyMatches = [...strongUrgencyMatches, ...mildUrgencyMatches];
  const genericMatches = findMatches(full, GENERIC_GREETINGS, 'neutral');
  const aiMatches = findMatches(full, AI_HEDGE_PHRASES, 'ai');
  const spellingMatches = findMatches(full, SPELLING_WORDS, 'error');
  const securityMatches = findMatches(full, SECURITY_NOTIFICATION_PHRASES, 'security');
  const credentialMatches = findMatches(full, CREDENTIAL_HARVEST_PHRASES, 'human');

  const personalGreeting = /\b(hi|hello|dear)\s+[A-Z][a-z]{1,20},/.test(body);
  const exclaimCount = (full.match(/!!/g)||[]).length;
  // Only a genuine multi-word all-caps run counts as "shouting" — a single capitalized
  // word (a device/OS/brand name, common in real notification emails) no longer does.
  const capsWords = (full.match(/\b[A-Z]{2,}(?:\s+[A-Z]{2,}){1,}\b/g)||[]).length;

  const urlInfo = classifyUrls(urls);
  const senderInfo = classifySender(sender);
  const suspiciousUrl = urlInfo.lookalike || urlInfo.riskyTld || urlInfo.insecure || urlInfo.excessiveSubdomains;
  const suspiciousSender = senderInfo.lookalike || senderInfo.riskyTld || senderInfo.excessiveSubdomains;
  const trustedDomainSeen = urlInfo.hosts.some(isTrustedHostname) || isTrustedHostname(senderInfo.domain);
  const credentialHits = credentialMatches.length;

  // Conservative sender-vs-link mismatch: only meaningful once suspiciousUrl/suspiciousSender
  // is already true (see suspiciousLinkDetail below and its score use) — a plain external
  // link to an unrelated but harmless domain must not, on its own, read as phishing.
  const senderRoot = rootOf(senderInfo.domain);
  const linkRoots = urlInfo.hosts.map(rootOf);
  const senderLinkMismatch = !!senderRoot && linkRoots.length>0 && !linkRoots.includes(senderRoot) &&
    !(isTrustedHostname(senderInfo.domain) && urlInfo.hosts.some(isTrustedHostname));

  // Recognizing 2+ distinct security-notification phrases (not just the subject line) reads
  // as a genuine account/security notice. It only softens scoring when there's no strong
  // contrary evidence — a suspicious sender or domain fully overrides this interpretation.
  const securityContext = securityMatches.length>=2;
  const securityBonusActive = securityContext && !suspiciousUrl && !suspiciousSender && credentialHits===0;
  const securityBonus = securityBonusActive ? (trustedDomainSeen?2.5:1) : 0;

  const urgencyHits = urgencyMatches.length;
  // Strength (not raw count) feeds the score: a mild, protective-sounding word like
  // "unauthorized" contributes far less than a genuinely coercive phrase like "act now".
  const urgencyStrength = strongUrgencyMatches.length + mildUrgencyMatches.length*0.35;
  const genericHits = genericMatches.length;
  const aiHits = aiMatches.length;
  const spellingHits = spellingMatches.length + exclaimCount + capsWords;

  // Weak, generic signals (urgency wording, a generic greeting, spelling slips) should not,
  // by themselves, be enough to call an email Human phishing — only a strong, independently
  // verifiable signal (a suspicious/lookalike domain or explicit credential-harvesting
  // language) should let them fully count. Without one, their contribution toward "human" or
  // "ai" is damped; aiHits (the primary AI-phishing signal) is deliberately left undamped so
  // existing AI-phishing detection is preserved.
  const strongPhishingSignal = suspiciousUrl || suspiciousSender || credentialHits>0;
  const weakSignalDamp = strongPhishingSignal ? 1 : 0.55;
  // Urgency inside a recognized security notice is expected wording, not suspicious —
  // dampen its penalty against "legitimate" specifically in that context.
  const legitUrgencyMultiplier = securityContext ? 0.4 : 1;

  // A recognized trusted domain is a modest, non-overriding nudge toward legitimate — not
  // blanket immunity. It's sized to offset one incidental urgency word or a missing
  // personalized greeting (both common in genuine transactional/security mail), but it
  // stays small next to strong risk signals (suspiciousUrl/suspiciousSender ≈2–3,
  // each spelling issue ≈1.8–2.6) so a trusted-looking sender paired with an independently
  // suspicious/lookalike link, or with heavy spelling/urgency evidence, can still classify
  // as phishing — trustedDomainSeen never suppresses suspiciousUrl/suspiciousSender, it only
  // competes alongside them in the same score.
  let legitScore = 2.2 + (personalGreeting?3:0) + (trustedDomainSeen?2:0) + securityBonus
    - urgencyStrength*1.4*legitUrgencyMultiplier - genericHits*2 - spellingHits*1.8 - aiHits*0.9
    - (suspiciousUrl?3:0) - (suspiciousSender?2:0) - (credentialHits>0?2.5:0);
  let humanScore = (genericHits*2 + urgencyStrength*1.5)*weakSignalDamp + spellingHits*2.6*weakSignalDamp
    + (suspiciousUrl?2.2:0) + (suspiciousSender?2:0) + (credentialHits>0?3:0) + (senderLinkMismatch&&strongPhishingSignal?0.6:0)
    - aiHits*1.6 - (personalGreeting?2.5:0) - (trustedDomainSeen?1.2:0) - securityBonus*0.6;
  let aiScore = (genericHits*1.3 + urgencyStrength*1.1)*weakSignalDamp + aiHits*3.1
    + (suspiciousUrl?1.6:0) + (suspiciousSender?1.2:0) + (credentialHits>0?2:0)
    - spellingHits*2.4 - (personalGreeting?1.6:0) - (trustedDomainSeen?1:0) - securityBonus*0.5;

  if(body.trim()===""){legitScore=0;humanScore=0;aiScore=0;}

  const scores = {legit:legitScore, human:humanScore, ai:aiScore};
  const exps = {};
  const maxScore = Math.max(scores.legit,scores.human,scores.ai);
  let sum=0;
  Object.keys(scores).forEach(k=>{ exps[k]=Math.exp((scores[k]-maxScore)/1.6); sum+=exps[k]; });
  const probs = {}; Object.keys(exps).forEach(k=>probs[k]=exps[k]/sum);

  let label = Object.keys(probs).reduce((a,b)=>probs[a]>probs[b]?a:b);
  const confidence = Math.round(probs[label]*100);

  const LABELS = {legit:"Legitimate", human:"Human phishing", ai:"AI phishing"};
  const COLORS = {legit:"#46C08D", human:"#E3A23C", ai:"#C2467A"};

  // signals
  let signals = [];
  const suspiciousLinkDetail = () => {
    const reasons = [];
    if(urlInfo.lookalike || senderInfo.lookalike) reasons.push("Domain resembles a trusted brand with a character substitution");
    if(urlInfo.riskyTld || senderInfo.riskyTld) reasons.push("Uses a TLD commonly associated with abuse");
    if(urlInfo.excessiveSubdomains || senderInfo.excessiveSubdomains) reasons.push("Unusually deep subdomain structure");
    if(urlInfo.insecure) reasons.push("Uses an insecure (non-HTTPS) connection");
    if(senderLinkMismatch) reasons.push("Sender domain and link domain do not match");
    if(reasons.length===0) reasons.push("Link or sender domain shows signs of potential spoofing");
    return reasons.join('; ');
  };
  if(label==='legit'){
    if(personalGreeting) signals.push({title:"Personalized greeting", detail:"Recipient addressed by name rather than a generic label", weight:80, kind:'trust'});
    if(urgencyHits===0) signals.push({title:"No urgency language found", detail:"Tone is neutral and non-coercive", weight:70, kind:'trust'});
    if(trustedDomainSeen) signals.push({title:"Recognized trusted domain", detail:"Sender or link domain matches a known trusted organization", weight:75, kind:'trust'});
    if(securityBonusActive) signals.push({title:"Recognized security notification", detail:"Wording matches a legitimate account/security notice pattern: "+securityMatches.slice(0,3).map(m=>'"'+m.match+'"').join(', '), weight:70, kind:'trust'});
    if(!suspiciousUrl && urls.trim()!=="") signals.push({title:"Link domain looks consistent", detail:"URL does not match common lookalike patterns", weight:55, kind:'trust'});
    signals.push({title:"Sentence structure", detail:"Clause density and phrasing consistent with routine correspondence", weight:40, kind:'trust'});
  } else if(label==='human'){
    if(credentialHits>0) signals.push({title:"Credential or payment information requested", detail:credentialHits+" phrase(s): "+credentialMatches.slice(0,3).map(m=>'"'+m.match+'"').join(', '), weight:Math.min(95,55+credentialHits*15), kind:'risk'});
    if(spellingHits>0) signals.push({title:"Spelling / grammar irregularities", detail:spellingHits+" issue(s) detected: "+(spellingMatches.slice(0,4).map(m=>'"'+m.match+'"').join(', ')||'formatting anomalies'), weight:Math.min(95, 40+spellingHits*12), kind:'risk'});
    if(urgencyHits>0) signals.push({title:"Urgency cues present", detail:urgencyHits+" phrase(s): "+urgencyMatches.slice(0,3).map(m=>'"'+m.match+'"').join(', '), weight:Math.min(90,35+urgencyHits*10), kind:'risk'});
    if(genericHits>0) signals.push({title:"Generic greeting used", detail:'"'+genericMatches[0].match+'" instead of a personal name', weight:55, kind:'risk'});
    if(suspiciousUrl||suspiciousSender) signals.push({title:"Suspicious sender or link", detail:suspiciousLinkDetail(), weight:65, kind:'risk'});
    if(trustedDomainSeen) signals.push({title:"Recognized trusted domain", detail:"Sender or link domain matches a known trusted organization, but other evidence still outweighs it", weight:35, kind:'trust'});
  } else {
    if(credentialHits>0) signals.push({title:"Credential or payment information requested", detail:credentialHits+" phrase(s): "+credentialMatches.slice(0,3).map(m=>'"'+m.match+'"').join(', '), weight:Math.min(95,55+credentialHits*15), kind:'risk'});
    if(aiHits>0) signals.push({title:"AI-style hedging phrases", detail:aiHits+" phrase(s): "+aiMatches.slice(0,3).map(m=>'"'+m.match+'"').join(', '), weight:Math.min(95,45+aiHits*12), kind:'risk'});
    if(urgencyHits>0) signals.push({title:"Urgency cues present", detail:urgencyHits+" phrase(s), delivered in fluent register", weight:Math.min(85,35+urgencyHits*9), kind:'risk'});
    signals.push({title:"Low spelling-error count despite urgency", detail:"Fluency is consistent with generated rather than hurried human text", weight:60, kind:'risk'});
    if(genericHits>0) signals.push({title:"Generic greeting used", detail:'"'+genericMatches[0].match+'"', weight:45, kind:'risk'});
    if(suspiciousUrl||suspiciousSender) signals.push({title:"Suspicious sender or link", detail:suspiciousLinkDetail(), weight:60, kind:'risk'});
    if(trustedDomainSeen) signals.push({title:"Recognized trusted domain", detail:"Sender or link domain matches a known trusted organization, but other evidence still outweighs it", weight:35, kind:'trust'});
  }
  if(signals.length===0) signals.push({title:"Limited signal", detail:"Not enough distinguishing language was found in this input", weight:20, kind:'risk'});

  // annotated body html
  let allMatches = [...urgencyMatches, ...genericMatches, ...aiMatches, ...spellingMatches, ...credentialMatches, ...securityMatches].sort((a,b)=>a.start-b.start);
  let kept = []; let lastEnd=-1;
  allMatches.forEach(m=>{ if(m.start>=lastEnd){ kept.push(m); lastEnd=m.end; } });

  let pos=0, html='';
  kept.forEach(m=>{
    html += escapeHtml(body.slice(pos,m.start));
    const cls = m.category==='human'?'tag-human':m.category==='ai'?'tag-ai':m.category==='security'?'tag-security':m.category==='neutral'?'tag-neutral':'tag-error';
    html += '<mark class="'+cls+'">'+escapeHtml(m.match)+'</mark>';
    pos = m.end;
  });
  html += escapeHtml(body.slice(pos));
  html = html.replace(/\n/g,'<br>');
  if(body.trim()==="") html = '<span style="color:var(--muted)">No email body was provided.</span>';

  const riskTexts = {
    legit:"This message is consistent with routine, legitimate correspondence: a personalized greeting, no coercive urgency, and a link or sender domain that is not obviously spoofed.",
    human:"This message shows classic markers of human-written phishing: a generic greeting, urgent or threatening language, and spelling or grammar irregularities that are typical of hastily written scam email.",
    ai:"This message is fluent and grammatically clean, but uses generic greetings, soft urgency, and formulaic hedging phrases common in AI-generated phishing — patterns that traditional typo-based filters tend to miss."
  };
  const recommendTexts = {
    legit:"No action needed — this message looks consistent with legitimate correspondence.",
    human:"Recommended: do not click any links or reply. Report this message as phishing.",
    ai:"Recommended: do not click any links or reply. Fluent phrasing like this is consistent with AI-generated phishing — report it to your security team."
  };

  return {
    label, labelText:LABELS[label], color:COLORS[label], confidence,
    signals, annotatedHtml:html,
    subject, sender, urls, metadata:fields.metadata||"",
    suspiciousUrl, suspiciousSender,
    riskText: riskTexts[label], recommendText: recommendTexts[label]
  };
}

/* ---------- analyze pipeline ---------- */
let lastResult = null;
let scanHistory = []; // session-only log of real scans performed in this tab — not persisted, not a backend
let pendingGmailMsgId = null; // carries a Gmail message id through runAnalysisPipeline's async delay so recordScan can tag it
let pendingGmailAuth = null; // carries the parsed SPF/DKIM/DMARC auth info alongside it, for the same reason
let pendingGmailAttachments = null; // carries attachment risk analysis alongside it, for the same reason

function recordScan(result, msgId, authInfo, attachmentInfo){
  scanHistory.push({
    label: result.label,
    labelText: result.labelText,
    confidence: result.confidence,
    subject: result.subject && result.subject.trim() ? result.subject.trim() : "(no subject)",
    sender: result.sender && result.sender.trim() ? result.sender.trim() : "",
    time: new Date(),
    result: result,
    msgId: msgId || null,
    authInfo: authInfo || null,
    attachmentInfo: attachmentInfo || null
  });
  renderDashboard();
  if(document.getElementById('view-history')) renderHistory();
  if(document.getElementById('view-analytics')) renderAnalytics();
  if(document.getElementById('view-settings')) renderSettings();
  if(msgId) updateGmailBadge(msgId, result);
}

function findScanByMsgId(msgId){
  for(let i=scanHistory.length-1;i>=0;i--){
    if(scanHistory[i].msgId===msgId) return scanHistory[i];
  }
  return null;
}

function updateGmailBadge(msgId, result){
  const badge = document.getElementById('gmail-badge-'+msgId);
  if(!badge) return;
  badge.textContent = result.labelText+' · '+result.confidence+'%';
  badge.style.background = hexToRgba(result.color, 0.18);
  badge.style.color = result.color;
}

function renderDashboard(){
  const total = scanHistory.length;
  const legitCount = scanHistory.filter(s=>s.label==='legit').length;
  const humanCount = scanHistory.filter(s=>s.label==='human').length;
  const aiCount = scanHistory.filter(s=>s.label==='ai').length;
  const threatCount = humanCount + aiCount;

  document.getElementById('metric-total').textContent = total;
  document.getElementById('metric-threats').textContent = threatCount;
  document.getElementById('metric-legit').textContent = legitCount;
  document.getElementById('metric-human').textContent = humanCount;
  document.getElementById('metric-ai').textContent = aiCount;

  const secBody = document.getElementById('dash-security-body');
  if(total===0){
    secBody.innerHTML = '<p class="dash-empty-text">No scans yet this session — run a scan to see a legitimate vs. threat breakdown here.</p>';
  } else {
    const pct = n => Math.round((n/total)*100);
    secBody.innerHTML = `
      <div class="dash-security-bars">
        <div class="dash-bar-row">
          <span class="dash-bar-label">Legitimate</span>
          <div class="dash-bar-track"><div class="dash-bar-fill" style="width:${pct(legitCount)}%;background:var(--ps-secondary);"></div></div>
          <span class="dash-bar-count">${legitCount}</span>
        </div>
        <div class="dash-bar-row">
          <span class="dash-bar-label">Human phishing</span>
          <div class="dash-bar-track"><div class="dash-bar-fill" style="width:${pct(humanCount)}%;background:var(--ps-tertiary);"></div></div>
          <span class="dash-bar-count">${humanCount}</span>
        </div>
        <div class="dash-bar-row">
          <span class="dash-bar-label">AI phishing</span>
          <div class="dash-bar-track"><div class="dash-bar-fill" style="width:${pct(aiCount)}%;background:var(--ai);"></div></div>
          <span class="dash-bar-count">${aiCount}</span>
        </div>
      </div>`;
  }

  const actBody = document.getElementById('dash-activity-body');
  if(total===0){
    actBody.innerHTML = '<p class="dash-empty-text">No emails analyzed yet. Scanned emails from this session will show up here.</p>';
  } else {
    const tagClass = {legit:'activity-tag-legit', human:'activity-tag-human', ai:'activity-tag-ai'};
    const recent = scanHistory.slice(-8).reverse();
    actBody.innerHTML = '<ul class="activity-list">' + recent.map(s=>`
      <li class="activity-item">
        <span class="activity-subject">${escapeHtml(s.subject)}</span>
        <span class="activity-tag ${tagClass[s.label]}">${escapeHtml(s.labelText)}</span>
        <span class="activity-confidence">${s.confidence}%</span>
      </li>`).join('') + '</ul>';
  }
}

function relativeTime(date){
  const diffMs = Date.now() - date.getTime();
  const mins = Math.round(diffMs/60000);
  if(mins < 1) return "just now";
  if(mins < 60) return mins+" min ago";
  const hrs = Math.round(mins/60);
  if(hrs < 24) return hrs+" hour"+(hrs===1?"":"s")+" ago";
  const days = Math.round(hrs/24);
  return days+" day"+(days===1?"":"s")+" ago";
}

function openHistoryEntry(entry){
  lastResult = entry.result;
  renderResults(lastResult);
  document.getElementById('nav-results').disabled = false;
  showView('results');
}

function renderHistory(){
  const body = document.getElementById('history-body');
  if(!body) return;
  if(scanHistory.length===0){
    body.innerHTML = `
      <div class="history-empty">
        <div class="history-empty-icon">🛡</div>
        <p class="inbox-disconnected-title">No analysis history yet</p>
        <p class="gmail-desc">Emails you analyze will appear here. Start by scanning a suspicious email or connecting your inbox.</p>
        <div class="history-empty-actions">
          <button class="btn-primary" id="btn-history-scan">Scan an email</button>
          <button class="btn-secondary" id="btn-history-inbox">Connect Gmail</button>
        </div>
      </div>`;
    document.getElementById('btn-history-scan').addEventListener('click', ()=>showView('scan'));
    document.getElementById('btn-history-inbox').addEventListener('click', ()=>showView('inbox'));
    return;
  }
  const tagClass = {legit:'activity-tag-legit', human:'activity-tag-human', ai:'activity-tag-ai'};
  let rows = scanHistory.slice().reverse();

  const searchEl = document.getElementById('history-search');
  const filterEl = document.getElementById('history-filter');
  const searchTerm = searchEl ? searchEl.value.trim().toLowerCase() : '';
  const filterLabel = filterEl ? filterEl.value : 'all';

  if(searchTerm){
    rows = rows.filter(s => (s.subject||'').toLowerCase().includes(searchTerm) || (s.sender||'').toLowerCase().includes(searchTerm));
  }
  if(filterLabel!=='all'){
    rows = rows.filter(s => s.label===filterLabel);
  }

  if(rows.length===0){
    body.innerHTML = `<div class="history-empty"><p class="gmail-desc">No entries match your search or filter.</p></div>`;
    return;
  }

  body.innerHTML = `
    <table class="history-table">
      <thead><tr><th>Sender</th><th>Subject</th><th>Classification</th><th>Threat</th><th>Confidence</th><th>Analyzed</th><th></th></tr></thead>
      <tbody>
        ${rows.map((s,idx)=>{
          const severity = threatSeverity(s.result);
          const fullDate = s.time.toLocaleString();
          return `
          <tr data-hist-idx="${idx}">
            <td class="mono">${escapeHtml(s.sender||'—')}</td>
            <td>${escapeHtml(s.subject)}</td>
            <td><span class="activity-tag ${tagClass[s.label]}">${escapeHtml(s.labelText)}</span></td>
            <td><span class="severity-badge ${severity.cls}">${escapeHtml(severity.level)}</span></td>
            <td class="mono">${s.confidence}%</td>
            <td class="mono" title="${escapeHtml(fullDate)}">${relativeTime(s.time)}</td>
            <td class="history-view-cell"><button class="history-view-btn">View</button></td>
          </tr>`;}).join('')}
      </tbody>
    </table>`;
  body.querySelectorAll('tr[data-hist-idx]').forEach(tr=>{
    tr.addEventListener('click', ()=>openHistoryEntry(rows[parseInt(tr.dataset.histIdx,10)]));
  });
}

function renderAnalytics(){
  const el = document.getElementById('analytics-body');
  if(!el) return;
  const total = scanHistory.length;

  if(total===0){
    el.innerHTML = `
      <div class="panel analytics-empty">
        <div class="history-empty-icon">📊</div>
        <p class="inbox-disconnected-title">No analytics yet</p>
        <p class="gmail-desc">Scan or connect an inbox to start building classification and threat trends for this session.</p>
        <div class="history-empty-actions">
          <button class="btn-primary" id="btn-analytics-scan">Scan an email</button>
          <button class="btn-secondary" id="btn-analytics-inbox">Connect Gmail</button>
        </div>
      </div>`;
    document.getElementById('btn-analytics-scan').addEventListener('click', ()=>showView('scan'));
    document.getElementById('btn-analytics-inbox').addEventListener('click', ()=>showView('inbox'));
    return;
  }

  const legitCount = scanHistory.filter(s=>s.label==='legit').length;
  const humanCount = scanHistory.filter(s=>s.label==='human').length;
  const aiCount = scanHistory.filter(s=>s.label==='ai').length;
  const threatCount = humanCount + aiCount;
  const threatPct = Math.round((threatCount/total)*100);
  const avgConfidence = Math.round(scanHistory.reduce((sum,s)=>sum+s.confidence,0)/total);
  const pct = n => Math.round((n/total)*100);

  el.innerHTML = `
    <div class="analytics-metrics">
      <div class="metric-card"><p class="metric-label">Emails analyzed</p><p class="metric-value">${total}</p></div>
      <div class="metric-card"><p class="metric-label">Threats detected</p><p class="metric-value metric-danger">${threatCount}</p></div>
      <div class="metric-card"><p class="metric-label">Threat rate</p><p class="metric-value metric-tertiary">${threatPct}%</p></div>
      <div class="metric-card"><p class="metric-label">AI phishing</p><p class="metric-value metric-ai">${aiCount}</p></div>
      <div class="metric-card"><p class="metric-label">Human phishing</p><p class="metric-value metric-tertiary">${humanCount}</p></div>
      <div class="metric-card"><p class="metric-label">Avg. confidence</p><p class="metric-value metric-secondary">${avgConfidence}%</p></div>
    </div>

    <div class="panel analytics-distribution">
      <p class="panel-title">Classification distribution</p>
      <div class="dash-security-bars">
        <div class="dash-bar-row">
          <span class="dash-bar-label">Legitimate</span>
          <div class="dash-bar-track"><div class="dash-bar-fill" style="width:${pct(legitCount)}%;background:var(--ps-secondary);"></div></div>
          <span class="dash-bar-count">${legitCount} (${pct(legitCount)}%)</span>
        </div>
        <div class="dash-bar-row">
          <span class="dash-bar-label">Human phishing</span>
          <div class="dash-bar-track"><div class="dash-bar-fill" style="width:${pct(humanCount)}%;background:var(--ps-tertiary);"></div></div>
          <span class="dash-bar-count">${humanCount} (${pct(humanCount)}%)</span>
        </div>
        <div class="dash-bar-row">
          <span class="dash-bar-label">AI phishing</span>
          <div class="dash-bar-track"><div class="dash-bar-fill" style="width:${pct(aiCount)}%;background:var(--ai);"></div></div>
          <span class="dash-bar-count">${aiCount} (${pct(aiCount)}%)</span>
        </div>
      </div>
    </div>`;
}

function renderSettings(){
  const el = document.getElementById('settings-body');
  if(!el) return;
  const connected = !!gmailAccessToken;
  const accountLabelEl = document.getElementById('gmail-account-label');
  const accountText = accountLabelEl ? accountLabelEl.textContent.replace('Connected as ','') : '';

  el.innerHTML = `
    <div class="panel settings-section">
      <p class="panel-title">Gmail connection</p>
      ${connected ? `
        <div class="settings-gmail-row">
          <div>
            <div class="settings-gmail-status"><span class="settings-badge settings-badge-on">Connected</span> <span class="mono">${escapeHtml(accountText)}</span></div>
            <p class="gmail-desc">Read-only access — PhishSite can list and read messages but never sends or modifies anything.</p>
            <p class="gmail-desc">Disconnecting revokes this access token immediately and asks whether to also remove Gmail messages already scanned this session — manually entered scans are never affected.</p>
          </div>
          <button class="btn-secondary" id="btn-settings-disconnect">Disconnect Gmail</button>
        </div>` : `
        <div class="settings-gmail-row">
          <div>
            <div class="settings-gmail-status"><span class="settings-badge settings-badge-off">Not connected</span></div>
            <p class="gmail-desc">Connect your inbox from the Inbox view to pull recent messages into the scanner.</p>
          </div>
          <button class="btn-primary" id="btn-settings-goto-inbox">Go to Inbox</button>
        </div>`}
    </div>

    <div class="panel settings-section">
      <p class="panel-title">Session data</p>
      <div class="settings-row">
        <div>
          <p class="settings-row-title">Scans this session</p>
          <p class="gmail-desc">${scanHistory.length} email${scanHistory.length===1?'':'s'} analyzed since you opened this page. Nothing is saved once you close the tab.</p>
        </div>
        <button class="btn-secondary" id="btn-settings-clear" ${scanHistory.length===0?'disabled':''}>Clear session history</button>
      </div>
    </div>

    <div class="panel settings-section">
      <p class="panel-title">Coming later</p>
      <div class="settings-row settings-row-disabled">
        <div>
          <p class="settings-row-title">Automatic analysis</p>
          <p class="gmail-desc">Run classification in the background as new mail arrives.</p>
        </div>
        <span class="settings-badge settings-badge-soon">Coming later</span>
      </div>
      <hr class="settings-divider">
      <div class="settings-row settings-row-disabled">
        <div>
          <p class="settings-row-title">Threat alerts</p>
          <p class="gmail-desc">Notify you immediately when a high-confidence threat is found.</p>
        </div>
        <span class="settings-badge settings-badge-soon">Coming later</span>
      </div>
      <hr class="settings-divider">
      <div class="settings-row settings-row-disabled">
        <div>
          <p class="settings-row-title">Appearance</p>
          <p class="gmail-desc">Light theme and custom accent colors.</p>
        </div>
        <span class="settings-badge settings-badge-soon">Coming later</span>
      </div>
    </div>`;

  if(connected){
    document.getElementById('btn-settings-disconnect').addEventListener('click', disconnectGmail);
  } else {
    document.getElementById('btn-settings-goto-inbox').addEventListener('click', ()=>showView('inbox'));
  }
  const clearBtn = document.getElementById('btn-settings-clear');
  if(clearBtn && scanHistory.length>0){
    clearBtn.addEventListener('click', ()=>{
      scanHistory = [];
      renderDashboard();
      renderHistory();
      renderAnalytics();
      renderSettings();
      if(fetchedMessages.length>0) renderGmailMessages(fetchedMessages);
    });
  }
}

function runAnalysisPipeline(){
  const msgIdForThisRun = pendingGmailMsgId;
  const authForThisRun = pendingGmailAuth;
  const attachmentsForThisRun = pendingGmailAttachments;
  pendingGmailMsgId = null;
  pendingGmailAuth = null;
  pendingGmailAttachments = null;
  const fields = {
    subject: document.getElementById('in-subject').value,
    sender: document.getElementById('in-sender').value,
    urls: document.getElementById('in-urls').value,
    metadata: document.getElementById('in-metadata').value,
    body: document.getElementById('in-body').value
  };
  const status = document.getElementById('scan-status');
  if(fields.body.trim()===""){
    status.textContent = "Add an email body to analyze.";
    status.classList.add('err');
    return;
  }
  status.classList.remove('err');
  const btn = document.getElementById('btn-analyze');
  btn.disabled = true;
  document.getElementById('step-analyze').classList.add('active');

  const stages = ["Preprocessing…","Extracting features…","Classifying…"];
  let i=0;
  status.textContent = stages[0];
  const interval = setInterval(()=>{
    i++;
    if(i<stages.length){ status.textContent = stages[i]; }
    else{
      clearInterval(interval);
      status.textContent = "Done.";
      document.getElementById('step-evidence').classList.add('active');
      lastResult = analyzeEmail(fields);
      lastResult.authInfo = authForThisRun || null;
      lastResult.attachmentInfo = attachmentsForThisRun || null;
      // Phase 2E-4: display-layer identity tag only — carries which Gmail message (if any)
      // this result came from, so Results can show "Gmail message" vs "Manually entered".
      lastResult.msgId = msgIdForThisRun || null;
      lastResult.source = msgIdForThisRun ? 'gmail' : 'manual';
      recordScan(lastResult, msgIdForThisRun, authForThisRun, attachmentsForThisRun);
      renderResults(lastResult);
      document.getElementById('nav-results').disabled = false;
      btn.disabled = false;
      showView('results');
      setTimeout(()=>{status.textContent="";},1500);
    }
  }, 380);
}
document.getElementById('btn-analyze').addEventListener('click', runAnalysisPipeline);

/* ---------- gmail integration ---------- */
// Phase 2E-6: application-owned OAuth Client ID — this is a public web-client identifier
// (not a secret; it is always visible in the OAuth request itself), safe to ship in frontend
// code. Registered against this deployment's exact origin(s) in Google Cloud Console under
// "Authorized JavaScript origins". Replace with this app's real Client ID before deploying.
const GOOGLE_OAUTH_CLIENT_ID = "915333477690-0k0sk9gsmpps4k334ea0p6m03e1i5od5.apps.googleusercontent.com";

let googleTokenClient = null;
let gmailAccessToken = null;
let fetchedMessages = [];
// Phase 2E-5: token-lifecycle state only — same GIS token-client flow, same client ID, same
// scope. gmailRefreshTimer schedules a silent (no-popup) token renewal before the current
// access token expires, so a long-open tab doesn't just start failing with generic errors.
let gmailRefreshTimer = null;

function gmailStatus(msg, isErr){
  const el = document.getElementById('gmail-status');
  el.textContent = msg;
  el.classList.toggle('err', !!isErr);
}

// Phase 2E-5: schedules a silent (prompt:'', no popup) token renewal shortly before the
// current access token's expiry, reusing the same googleTokenClient/client ID/scope already
// established at connect time. If the silent attempt itself fails (e.g. the user revoked
// access elsewhere, or their Google session ended), the callback above routes to
// handleGmailAuthError() instead of leaving the tab to fail with opaque 401s later.
function scheduleGmailTokenRefresh(expiresInSeconds){
  if(gmailRefreshTimer){ clearTimeout(gmailRefreshTimer); gmailRefreshTimer = null; }
  if(!expiresInSeconds) return;
  const refreshInMs = Math.max(5000, expiresInSeconds*1000 - 120000);
  gmailRefreshTimer = setTimeout(()=>{
    if(googleTokenClient) googleTokenClient.requestAccessToken({prompt:''});
  }, refreshInMs);
}

// Phase 2E-5: single place that reacts to "the current Gmail session is no longer valid" —
// either a 401/403 from gmailFetch or a failed silent refresh. Only resets the connection
// state (mirrors the parts of disconnectGmail() that clear local Gmail session state); it
// deliberately does NOT touch scanHistory/lastResult, since an expired token is not a user
// request to discard already-scanned data — see disconnectGmail() for that explicit action.
function handleGmailAuthError(){
  if(gmailRefreshTimer){ clearTimeout(gmailRefreshTimer); gmailRefreshTimer = null; }
  gmailAccessToken = null;
  fetchedMessages = [];
  document.getElementById('gmail-connected').style.display='none';
  document.getElementById('gmail-disconnected').style.display='block';
  document.getElementById('gmail-messages').innerHTML='';
  document.getElementById('gmail-batch-results').innerHTML='';
  gmailStatus('Your Gmail session expired or access was revoked — reconnect to keep scanning.', true);
  if(document.getElementById('view-settings')) renderSettings();
}

document.getElementById('btn-gmail-connect').addEventListener('click', ()=>{
  if(!window.google || !google.accounts || !google.accounts.oauth2){
    gmailStatus("Google sign-in library is still loading — try again in a moment.", true);
    return;
  }
  gmailStatus("Opening Google sign-in…", false);
  googleTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_OAUTH_CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    callback: (resp)=>{
      // Phase 2E-5: this callback now also fires for the silent background refresh triggered
      // by scheduleGmailTokenRefresh() below — detected by an access token already being set.
      const isSilentRefresh = !!gmailAccessToken;
      if(resp.error){
        if(isSilentRefresh){ handleGmailAuthError(); } else { gmailStatus("Sign-in failed: "+resp.error, true); }
        return;
      }
      gmailAccessToken = resp.access_token;
      scheduleGmailTokenRefresh(resp.expires_in);
      if(isSilentRefresh) return; // token renewed quietly — no need to redo the initial-connect UI flow
      gmailStatus("", false);
      onGmailConnected();
    }
  });
  googleTokenClient.requestAccessToken();
});

function onGmailConnected(){
  document.getElementById('gmail-disconnected').style.display='none';
  document.getElementById('gmail-connected').style.display='block';
  fetchGmailProfile();
  fetchGmailMessages();
}

function gmailFetch(url){
  return fetch(url, {headers:{Authorization:'Bearer '+gmailAccessToken}}).then(r=>{
    if(!r.ok){
      return r.json().catch(()=>({})).then(e=>{
        const err = new Error((e.error && e.error.message) ? e.error.message : ('HTTP '+r.status));
        // Phase 2E-5: same request/response as before — only tagging the thrown error with the
        // HTTP status so callers can tell an expired/revoked token (401/403) apart from any
        // other failure, without each call site re-parsing the response itself.
        err.status = r.status;
        err.isAuthError = r.status===401 || r.status===403;
        throw err;
      });
    }
    return r.json();
  });
}

function fetchGmailProfile(){
  gmailFetch('https://gmail.googleapis.com/gmail/v1/users/me/profile')
    .then(p=>{
      document.getElementById('gmail-account-label').textContent = 'Connected as '+p.emailAddress;
      if(document.getElementById('view-settings')) renderSettings();
    })
    .catch(e=>{
      if(e.isAuthError){ handleGmailAuthError(); return; }
      gmailStatus('Could not load profile: '+e.message, true);
    });
}

function base64UrlDecode(str){
  str = str.replace(/-/g,'+').replace(/_/g,'/');
  while(str.length % 4) str += '=';
  try{
    return decodeURIComponent(atob(str).split('').map(c=>'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join(''));
  }catch(e){
    try{ return atob(str); }catch(e2){ return ''; }
  }
}

function extractBody(payload){
  if(!payload) return '';
  if(payload.mimeType==='text/plain' && payload.body && payload.body.data){
    return base64UrlDecode(payload.body.data);
  }
  if(payload.parts){
    const plain = payload.parts.find(p=>p.mimeType==='text/plain');
    if(plain && plain.body && plain.body.data) return base64UrlDecode(plain.body.data);
    const htmlPart = payload.parts.find(p=>p.mimeType==='text/html');
    if(htmlPart && htmlPart.body && htmlPart.body.data){
      const html = base64UrlDecode(htmlPart.body.data);
      return html.replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
    }
    for(const p of payload.parts){
      const r = extractBody(p);
      if(r) return r;
    }
  }
  if(payload.body && payload.body.data) return base64UrlDecode(payload.body.data);
  return '';
}

// Pulls a mechanism's result (pass/fail/neutral/softfail/none...) out of Gmail's own
// Authentication-Results header text, e.g. "...; spf=pass ...; dkim=pass ...; dmarc=pass ...".
function extractAuthResult(authResultsHeader, mechanism){
  if(!authResultsHeader) return 'none';
  const re = new RegExp(mechanism+'=([a-z]+)','i');
  const m = authResultsHeader.match(re);
  return m ? m[1].toLowerCase() : 'none';
}

// Standalone email-authentication analysis, entirely separate from analyzeEmail() — it does
// not feed into or alter the phishing classifier's scoring in any way. Only produces a
// status object from headers that were actually present; never fabricates a result.
function analyzeAuthHeaders(headers){
  const authResults = (headers && headers.authResults) || '';
  const spf = extractAuthResult(authResults, 'spf');
  const dkim = extractAuthResult(authResults, 'dkim');
  const dmarc = extractAuthResult(authResults, 'dmarc');

  const fromDomain = headers && headers.from ? classifySender(headers.from).domain : null;
  const replyToDomain = headers && headers.replyTo ? classifySender(headers.replyTo).domain : null;
  const returnPathDomain = headers && headers.returnPath ? classifySender(headers.returnPath).domain : null;

  // Alignment: does the visible From domain match the domain DMARC actually authenticated.
  // Gmail includes it as "header.from=<domain>" inside the dmarc segment when available;
  // fall back to comparing From against Return-Path when that's not present.
  const dmarcFromMatch = authResults.match(/dmarc=\S+[^)]*header\.from=([a-z0-9.-]+)/i);
  const dmarcFromDomain = dmarcFromMatch ? dmarcFromMatch[1].toLowerCase() : null;
  const sameOrSubdomain = (a,b) => !!a && !!b && (a===b || a.endsWith('.'+b) || b.endsWith('.'+a));
  let alignment = 'unknown';
  if(dmarcFromDomain && fromDomain){
    alignment = sameOrSubdomain(dmarcFromDomain, fromDomain) ? 'aligned' : 'misaligned';
  } else if(returnPathDomain && fromDomain){
    alignment = sameOrSubdomain(returnPathDomain, fromDomain) ? 'aligned' : 'misaligned';
  }

  const replyToMismatch = !!(replyToDomain && fromDomain && !sameOrSubdomain(replyToDomain, fromDomain));

  return {
    spf, dkim, dmarc, alignment, replyToMismatch,
    fromDomain, replyToDomain, returnPathDomain,
    hasDkimSignature: !!(headers && headers.dkimSignature),
    available: !!authResults || !!(headers && headers.dkimSignature)
  };
}

const ATTACHMENT_HIGH_RISK_EXT = ['exe','scr','bat','cmd','js','vbs','ps1'];
const ATTACHMENT_MEDIUM_RISK_EXT = ['zip','rar','iso','html','docm','xlsm'];

function getFileExtension(filename){
  if(!filename) return '';
  const m = filename.trim().toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

// Recursively walks a Gmail message payload's MIME parts to collect attachment metadata
// only (filename/mimeType/size/attachmentId) — never fetches attachment content, no new API
// calls beyond the message payload already returned by the existing message fetch.
function extractAttachments(payload){
  if(!payload) return [];
  let found = [];
  if(payload.filename && payload.filename.trim() && payload.body){
    found.push({
      filename: payload.filename,
      mimeType: payload.mimeType || '',
      size: payload.body.size || 0,
      attachmentId: payload.body.attachmentId || null
    });
  }
  if(payload.parts){
    payload.parts.forEach(p => { found = found.concat(extractAttachments(p)); });
  }
  return found;
}

// Standalone attachment risk analysis, entirely separate from analyzeEmail() — it does not
// feed into or alter the phishing classifier's scoring. Flags file extensions only, using
// two small, documented risk tiers; never fabricates a risk finding for an unlisted type.
function analyzeAttachments(attachments){
  const list = attachments || [];
  if(list.length===0) return {available:false, count:0, riskLevel:'none', suspicious:[]};
  const suspicious = [];
  let riskLevel = 'low';
  list.forEach(a=>{
    const ext = getFileExtension(a.filename);
    if(ATTACHMENT_HIGH_RISK_EXT.includes(ext)){
      suspicious.push({filename:a.filename, mimeType:a.mimeType, risk:'high', reason:'File type ".'+ext+'" can execute code directly and is a common malware delivery format.'});
      riskLevel = 'high';
    } else if(ATTACHMENT_MEDIUM_RISK_EXT.includes(ext)){
      suspicious.push({filename:a.filename, mimeType:a.mimeType, risk:'medium', reason:'File type ".'+ext+'" can contain macros, scripts, or hidden executable content.'});
      if(riskLevel!=='high') riskLevel = 'medium';
    }
  });
  return {available:true, count:list.length, riskLevel, suspicious};
}

function parseGmailMessage(msg){
  const headers = (msg.payload && msg.payload.headers) || [];
  const getHeader = name => { const h = headers.find(h=>h.name.toLowerCase()===name.toLowerCase()); return h?h.value:''; };
  const subject = getHeader('Subject');
  const from = getHeader('From');
  const date = getHeader('Date');
  let body = extractBody(msg.payload) || msg.snippet || '';
  const urlMatches = body.match(/https?:\/\/[^\s"'<>)]+/g) || [];
  const auth = analyzeAuthHeaders({
    authResults: getHeader('Authentication-Results'),
    received: getHeader('Received'),
    returnPath: getHeader('Return-Path'),
    replyTo: getHeader('Reply-To'),
    from: from,
    dkimSignature: getHeader('DKIM-Signature')
  });
  const attachmentInfo = analyzeAttachments(extractAttachments(msg.payload));
  return {
    id: msg.id, subject, sender: from, date, snippet: msg.snippet || '',
    body, urls: urlMatches.slice(0,3).join(', '), auth, attachmentInfo
  };
}

const GMAIL_MAX_INBOX_MESSAGES = 100; // hard cap on how many message ids fetchGmailMessages() will collect
const GMAIL_LIST_PAGE_SIZE = 100; // Gmail's messages.list allows up to 500 per page; capped at our own total limit so a single page already covers the common case

// Collects up to GMAIL_MAX_INBOX_MESSAGES newest INBOX message ids, following Gmail's
// nextPageToken until either the cap is reached or Gmail reports no further page. Preserves
// the newest-first order Gmail returns pages in, requests only as many ids as still needed
// per page, and de-dupes defensively in case pagination ever returns an overlapping id.
function fetchGmailInboxIds(pageToken, collected, seen){
  collected = collected || [];
  seen = seen || new Set();
  const remaining = GMAIL_MAX_INBOX_MESSAGES - collected.length;
  let url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=INBOX&maxResults='+Math.min(GMAIL_LIST_PAGE_SIZE, remaining);
  if(pageToken) url += '&pageToken='+encodeURIComponent(pageToken);
  return gmailFetch(url).then(listResp=>{
    (listResp.messages||[]).forEach(m=>{
      if(!seen.has(m.id)){ seen.add(m.id); collected.push(m.id); }
    });
    gmailStatus('Fetching recent messages… ('+collected.length+' so far)', false);
    if(collected.length>=GMAIL_MAX_INBOX_MESSAGES || !listResp.nextPageToken){
      return collected.slice(0, GMAIL_MAX_INBOX_MESSAGES);
    }
    return fetchGmailInboxIds(listResp.nextPageToken, collected, seen);
  });
}

function fetchGmailMessages(){
  gmailStatus('Fetching recent messages…', false);
  document.getElementById('gmail-messages').innerHTML = '<div class="gmail-loading"><span class="gmail-spinner"></span>Fetching messages…</div>';
  fetchGmailInboxIds()
    .then(ids=>{
      if(ids.length===0){ gmailStatus('No messages found in inbox.', false); renderGmailMessages([]); return; }
      gmailStatus('Loading '+ids.length+' messages…', false);
      return Promise.all(ids.map(id=>gmailFetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+id+'?format=full')))
        .then(msgs=>{
          fetchedMessages = msgs.map(parseGmailMessage);
          renderGmailMessages(fetchedMessages);
          gmailStatus('Loaded '+fetchedMessages.length+' messages. Click one to scan it, or scan them all at once.', false);
        });
    })
    .catch(e=>{
      if(e.isAuthError){ handleGmailAuthError(); return; }
      gmailStatus('Could not fetch messages: '+e.message, true);
    });
}

function renderGmailMessages(list){
  const container = document.getElementById('gmail-messages');
  container.innerHTML = '';
  if(list.length===0){
    container.innerHTML = '<div class="gmail-empty"><p class="inbox-disconnected-title" style="font-size:15px;">No messages in this inbox</p><p class="gmail-desc">Nothing to scan right now — try fetching again later.</p></div>';
    return;
  }
  list.forEach(m=>{
    const row = document.createElement('div'); row.className='gmail-msg-row';
    row.dataset.msgId = m.id;
    const existing = findScanByMsgId(m.id);
    const badgeText = existing ? (existing.labelText+' · '+existing.confidence+'%') : 'Not scanned';
    const badgeStyle = existing ? ' style="background:'+hexToRgba(existing.result.color,0.18)+';color:'+existing.result.color+';"' : '';
    row.innerHTML =
      '<div class="gmail-msg-main">'+
        '<div class="gmail-msg-top-line"><span class="gmail-msg-subject">'+escapeHtml(m.subject||'(no subject)')+'</span><span class="gmail-msg-date">'+escapeHtml(m.date)+'</span></div>'+
        '<div class="gmail-msg-meta">'+escapeHtml(m.sender)+'</div>'+
        '<div class="gmail-msg-snippet">'+escapeHtml(m.snippet||'')+'</div>'+
      '</div>'+
      '<div class="gmail-msg-side">'+
        '<span class="gmail-row-badge" id="gmail-badge-'+escapeHtml(m.id)+'"'+badgeStyle+'>'+escapeHtml(badgeText)+'</span>'+
      '</div>';
    const btn = document.createElement('button'); btn.className='btn-secondary gmail-msg-scan'; btn.textContent='Scan';
    btn.addEventListener('click', ()=>scanGmailMessage(m));
    row.querySelector('.gmail-msg-side').appendChild(btn);
    container.appendChild(row);
  });
}

function fillFormFromMessage(m){
  document.getElementById('in-subject').value = m.subject || '';
  document.getElementById('in-sender').value = m.sender || '';
  document.getElementById('in-urls').value = m.urls || '';
  document.getElementById('in-metadata').value = m.date ? ('Date: '+m.date) : '';
  document.getElementById('in-body').value = m.body || m.snippet || '';
}

function scanGmailMessage(m){
  fillFormFromMessage(m);
  pendingGmailMsgId = m.id;
  pendingGmailAuth = m.auth || null;
  pendingGmailAttachments = m.attachmentInfo || null;
  runAnalysisPipeline();
}

document.getElementById('btn-gmail-scanall').addEventListener('click', ()=>{
  if(fetchedMessages.length===0){ gmailStatus('Fetch messages first.', true); return; }
  const results = fetchedMessages.map(m=>{
    const result = analyzeEmail({subject:m.subject, sender:m.sender, urls:m.urls, metadata:m.date, body:m.body||m.snippet});
    result.authInfo = m.auth || null;
    result.attachmentInfo = m.attachmentInfo || null;
    result.msgId = m.id;
    result.source = 'gmail';
    return {msg:m, result};
  });
  results.forEach(r=>{
    if(!findScanByMsgId(r.msg.id)) recordScan(r.result, r.msg.id, r.msg.auth, r.msg.attachmentInfo);
  });
  renderBatchResults(results);
});

function renderBatchResults(results){
  const wrap = document.getElementById('gmail-batch-results');
  const order = {ai:0, human:1, legit:2};
  results.sort((a,b)=>order[a.result.label]-order[b.result.label]);
  let html = '<table class="batch-table"><thead><tr><th>Subject</th><th>From</th><th>Classification</th><th>Confidence</th></tr></thead><tbody>';
  results.forEach((r,idx)=>{
    html += '<tr data-idx="'+idx+'"><td>'+escapeHtml(r.msg.subject||'(no subject)')+'</td><td>'+escapeHtml(r.msg.sender)+'</td>'+
            '<td><span class="batch-badge" style="background:'+r.result.color+'">'+r.result.labelText+'</span></td><td>'+r.result.confidence+'%</td></tr>';
  });
  html += '</tbody></table>';
  wrap.innerHTML = html;
  wrap.querySelectorAll('tr[data-idx]').forEach(tr=>{
    tr.addEventListener('click', ()=>{
      const r = results[parseInt(tr.dataset.idx,10)];
      fillFormFromMessage(r.msg);
      lastResult = r.result;
      renderResults(lastResult);
      document.getElementById('nav-results').disabled = false;
      showView('results');
    });
  });

  // also reflect classification + confidence on the matching inbox row, where available
  results.forEach(r=>{
    const badge = document.getElementById('gmail-badge-'+r.msg.id);
    if(badge){
      badge.textContent = r.result.labelText+' · '+r.result.confidence+'%';
      badge.style.background = hexToRgba(r.result.color, 0.18);
      badge.style.color = r.result.color;
    }
  });
}

document.getElementById('btn-gmail-refresh').addEventListener('click', fetchGmailMessages);

// Phase 2E-5: removes only the Gmail-sourced scan data (entries with a msgId, plus lastResult
// if it came from a Gmail scan) — manually entered/scanned history is left untouched. Called
// only from disconnectGmail(), and only after the user explicitly confirms.
function clearGmailScanData(){
  scanHistory = scanHistory.filter(s => !s.msgId);
  if(lastResult && lastResult.source==='gmail'){
    lastResult = null;
    document.getElementById('nav-results').disabled = true;
  }
  renderDashboard();
  if(document.getElementById('view-history')) renderHistory();
  if(document.getElementById('view-analytics')) renderAnalytics();
  if(document.getElementById('view-settings')) renderSettings();
}

function disconnectGmail(){
  if(gmailAccessToken && window.google && google.accounts && google.accounts.oauth2){
    google.accounts.oauth2.revoke(gmailAccessToken, ()=>{});
  }
  if(gmailRefreshTimer){ clearTimeout(gmailRefreshTimer); gmailRefreshTimer = null; }
  gmailAccessToken = null; fetchedMessages = [];
  document.getElementById('gmail-connected').style.display='none';
  document.getElementById('gmail-disconnected').style.display='block';
  document.getElementById('gmail-messages').innerHTML='';
  document.getElementById('gmail-batch-results').innerHTML='';
  // Phase 2E-5: revoking access does not, by itself, remove Gmail message data already pulled
  // into this session (scanHistory/lastResult) — ask before discarding it, and only if there
  // actually is any, so the common "disconnect with nothing scanned yet" case is unchanged.
  const hasGmailData = scanHistory.some(s=>s.msgId) || (lastResult && lastResult.source==='gmail');
  if(hasGmailData && window.confirm("Also remove the Gmail messages you've already scanned from this session's history?")){
    clearGmailScanData();
    gmailStatus('Disconnected. Gmail-scanned data cleared from this session.', false);
  } else {
    gmailStatus('Disconnected.', false);
  }
  if(document.getElementById('view-settings')) renderSettings();
}
document.getElementById('btn-gmail-disconnect').addEventListener('click', disconnectGmail);

// Display-layer only: groups an already-generated signal into one of three presentation
// tiers. Never invents evidence — every signal here was produced by analyzeEmail() itself.
// "risk" = the strong, independently-verifiable signals; anything else non-trust is "attention"
// (weaker, corroborating wording that isn't sufficient proof on its own).
function evidenceTier(s){
  if(s.kind==='trust') return 'trust';
  const strongTitles = ['Suspicious sender or link','Credential or payment information requested'];
  return strongTitles.includes(s.title) ? 'risk' : 'attention';
}

// Display-layer only: explains the existing confidence number, does not recompute it.
function confidenceExplanation(confidence){
  if(confidence>=80) return 'High confidence — multiple strong indicators agree with each other.';
  if(confidence>=55) return 'Medium confidence — some indicators were detected, but the evidence is not overwhelming.';
  return 'Low confidence — this decision rests mostly on weak or limited signals.';
}

// Display-layer only: maps the existing label + confidence + signal tiers onto a 4-level
// severity badge. Uses only data analyzeEmail() already produced — no new detection.
function threatSeverity(r){
  if(r.label==='legit') return {level:'Trusted', cls:'sev-trusted'};
  const hasRiskSignal = r.signals.some(s=>evidenceTier(s)==='risk');
  if(hasRiskSignal && r.confidence>=75) return {level:'Critical Risk', cls:'sev-critical'};
  if(hasRiskSignal || r.confidence>=60) return {level:'Suspicious', cls:'sev-suspicious'};
  return {level:'Attention', cls:'sev-attention'};
}

// Display-layer only: turns the existing classification + already-generated evidence titles
// into a short action list. Every line is derived from data analyzeEmail() already returned
// (r.label, r.recommendText, and which signal titles are present) — nothing new is detected.
function buildRecommendation(r){
  const titles = r.signals.map(s=>s.title);
  const actions = [];
  if(r.label==='legit'){
    actions.push('No action needed — this message is consistent with legitimate correspondence.');
    if(titles.includes('Recognized trusted domain')) actions.push('Sender and/or link domain matches a known trusted organization.');
    if(titles.includes('Recognized security notification')) actions.push('Wording matches a typical account/security notice — still confirm independently if anything feels off.');
    appendAuthAttachmentActions(r, actions);
    return actions;
  }
  actions.push('Do not click any links or reply to this message.');
  if(titles.includes('Credential or payment information requested')) actions.push('This message asks for credentials or payment details — never enter them if you already clicked a link.');
  if(titles.includes('Suspicious sender or link')) actions.push('Verify the sender through a separate, known channel before trusting this domain.');
  actions.push(r.label==='ai' ? 'Report this message as phishing — fluent, hedging phrasing like this is a known AI-generated phishing pattern.' : 'Report this message as phishing to your security team or email provider.');
  appendAuthAttachmentActions(r, actions);
  return actions;
}

// Phase 2E-3: display-layer only. Extends the existing recommendation list with actions
// derived from the same authInfo/attachmentInfo already attached to r — only pushed when the
// corresponding real finding is present, and only if that exact action text isn't already in
// the list, so re-running this never produces duplicates.
function appendAuthAttachmentActions(r, actions){
  const add = text => { if(!actions.includes(text)) actions.push(text); };
  const auth = r.authInfo;
  if(auth && auth.available){
    const authFailed = auth.spf==='fail' || auth.dkim==='fail' || auth.dmarc==='fail' || auth.alignment==='misaligned';
    if(authFailed){
      add('Do not trust this message solely because it appears to come from a known or familiar sender — authentication failed.');
      add('Verify the sender through an independent channel (phone, official app, or a separately typed URL) before acting on this message.');
      add('Avoid signing in through any link in this message given the authentication failure.');
    }
    if(auth.replyToMismatch) add('Check the Reply-To address before responding — it differs from the visible sender domain.');
  }
  const attachmentInfo = r.attachmentInfo;
  if(attachmentInfo && attachmentInfo.available && attachmentInfo.suspicious.length>0){
    if(attachmentInfo.suspicious.some(a=>a.risk==='high')) add('Do not open the high-risk executable attachment(s) on this message.');
    if(attachmentInfo.suspicious.some(a=>a.risk==='medium')) add('Do not enable macros or run scripts if you open the attached document or archive.');
    add('Verify unexpected attachments through an independent channel before opening them.');
  }
}

// Standalone email-authentication evidence list, entirely separate from analyzeEmail()'s own
// signals array — every line here is generated only when the corresponding header condition
// was actually detected. Returns [] when no auth data is available (e.g. a manual scan).
function buildAuthEvidence(auth){
  if(!auth || !auth.available) return [];
  const items = [];
  if(auth.spf==='fail') items.push('SPF check failed — the sending server was not authorized to send for this domain.');
  else if(auth.spf==='softfail') items.push('SPF soft-fail — the sending server is not fully authorized for this domain.');
  else if(auth.spf==='none') items.push('No SPF record was found for this sender.');
  if(auth.dkim==='fail') items.push('DKIM signature failed verification.');
  else if(auth.dkim==='none' && !auth.hasDkimSignature) items.push('No DKIM signature was present on this message.');
  if(auth.dmarc==='fail') items.push('DMARC check failed.');
  if(auth.alignment==='misaligned') items.push('The authenticated sending domain does not match the visible From address.');
  if(auth.replyToMismatch) items.push('Reply-To domain ('+auth.replyToDomain+') differs from the sender domain ('+auth.fromDomain+').');
  return items;
}

// Phase 2E-3: display-layer only. Maps the existing authInfo status fields onto the same
// Trust/Risk/Attention tiers used for r.signals, for the "Why this result?" panel. This is a
// separate list from buildAuthEvidence (which only lists problems for the Authentication
// Analysis panel and is untouched) — here a pass is genuine trust evidence, not just an
// absence of a problem. Detects nothing new; every line reflects a field analyzeAuthHeaders()
// already computed.
function authWhyFindings(auth){
  if(!auth || !auth.available) return [];
  const items = [];
  if(auth.spf==='pass') items.push({text:'SPF authentication passed for the sending domain.', tier:'trust'});
  else if(auth.spf==='fail') items.push({text:'SPF check failed — the sending server was not authorized to send for this domain.', tier:'risk'});
  else if(auth.spf==='softfail') items.push({text:'SPF soft-fail — the sending server is not fully authorized for this domain.', tier:'attention'});
  else if(auth.spf==='none') items.push({text:'No SPF record was found for this sender.', tier:'attention'});

  if(auth.dkim==='pass') items.push({text:'DKIM signature verified successfully.', tier:'trust'});
  else if(auth.dkim==='fail') items.push({text:'DKIM signature failed verification.', tier:'risk'});
  else if(auth.dkim==='none' && !auth.hasDkimSignature) items.push({text:'No DKIM signature was present on this message.', tier:'attention'});

  if(auth.dmarc==='pass') items.push({text:'DMARC check passed.', tier:'trust'});
  else if(auth.dmarc==='fail') items.push({text:'DMARC check failed.', tier:'risk'});

  if(auth.alignment==='aligned') items.push({text:'Authenticated sending domain matches the visible From address.', tier:'trust'});
  else if(auth.alignment==='misaligned') items.push({text:'The authenticated sending domain does not match the visible From address.', tier:'risk'});

  if(auth.replyToMismatch) items.push({text:'Reply-To domain ('+auth.replyToDomain+') differs from the sender domain ('+auth.fromDomain+').', tier:'attention'});
  return items;
}

// Phase 2E-3: display-layer only. Maps the existing attachmentInfo.suspicious findings (already
// produced by analyzeAttachments()) onto the same tiers for the "Why this result?" panel —
// high risk reads as a risk indicator, medium risk as an attention indicator. Detects nothing
// new and does not alter the Attachment Analysis panel or its table.
function attachmentWhyFindings(attachmentInfo){
  if(!attachmentInfo || !attachmentInfo.available) return [];
  return attachmentInfo.suspicious.map(a => ({
    text: 'Attachment "'+a.filename+'" — '+a.reason,
    tier: a.risk==='high' ? 'risk' : 'attention'
  }));
}

function renderResults(r){
  const banner = document.getElementById('result-banner');
  banner.style.borderLeftColor = r.color;
  document.getElementById('result-label').textContent = r.labelText;
  document.getElementById('result-label').style.color = r.color;
  document.getElementById('result-sub').textContent = r.subject ? ('Subject: "'+r.subject+'"') : 'No subject provided.';
  document.getElementById('confidence-num').textContent = r.confidence+'%';
  document.getElementById('confidence-num').style.color = r.color;
  const fill = document.getElementById('confidence-fill');
  fill.style.background = r.color;
  fill.style.width = '0%';
  requestAnimationFrame(()=>{ fill.style.width = r.confidence+'%'; });

  const severity = threatSeverity(r);
  const sevBadge = document.getElementById('severity-badge');
  sevBadge.textContent = severity.level;
  sevBadge.className = 'severity-badge '+severity.cls;

  // Phase 2E-4: display-layer only — identifies which Gmail message (if any) this result
  // came from, using the r.source/r.metadata already attached at scan time. No new data.
  const sourceBadge = document.getElementById('source-badge');
  if(r.source==='gmail'){
    sourceBadge.textContent = 'Gmail message';
    sourceBadge.className = 'source-badge source-gmail';
  } else {
    sourceBadge.textContent = 'Manually entered';
    sourceBadge.className = 'source-badge source-manual';
  }
  const receivedText = (r.source==='gmail' && r.metadata) ? r.metadata.replace(/^Date:\s*/i,'') : '';
  document.getElementById('summary-received').textContent = receivedText || '—';

  const urlCount = (r.urls||'').split(',').map(u=>u.trim()).filter(Boolean).length;
  document.getElementById('summary-threat').textContent = severity.level;
  document.getElementById('summary-threat').className = 'summary-stat-value '+severity.cls;
  document.getElementById('summary-classification').textContent = r.labelText;
  document.getElementById('summary-confidence').textContent = r.confidence+'%';
  document.getElementById('summary-signal-count').textContent = r.signals.length;
  document.getElementById('summary-url-count').textContent = urlCount;
  document.getElementById('summary-sender').textContent = r.sender || '—';

  let metaHtml = '';
  metaHtml += '<div><b>Subject:</b> '+escapeHtml(r.subject||'—')+'</div>';
  metaHtml += '<div><b>Sender:</b> '+escapeHtml(r.sender||'—')+(r.suspiciousSender?'<span class="flag-chip">flagged</span>':'')+'</div>';
  metaHtml += '<div><b>URLs:</b> '+escapeHtml(r.urls||'—')+(r.suspiciousUrl?'<span class="flag-chip">flagged</span>':'')+'</div>';
  metaHtml += '<div><b>Metadata:</b> '+escapeHtml(r.metadata||'—')+'</div>';
  document.getElementById('annotated-meta').innerHTML = metaHtml;
  document.getElementById('annotated-body').innerHTML = r.annotatedHtml;

  document.getElementById('confidence-explain').textContent = confidenceExplanation(r.confidence);

  const list = document.getElementById('signals-list');
  list.innerHTML = '';
  r.signals.forEach((s,idx)=>{
    const li = document.createElement('li');
    li.style.opacity = '0';
    li.style.animation = 'fadeIn .35s ease forwards';
    li.style.animationDelay = (idx*0.08)+'s';
    const tier = evidenceTier(s);
    li.classList.add('signal-kind-'+tier);
    const kindLabel = tier==='trust' ? 'Trust signal' : tier==='risk' ? 'Risk signal' : 'Attention signal';
    li.innerHTML = '<span class="signal-kind-tag">'+kindLabel+'</span>'+
                    '<span class="signal-title">'+escapeHtml(s.title)+'</span>'+
                    '<span class="signal-detail">'+escapeHtml(s.detail)+'</span>'+
                    '<div class="signal-bar"><div style="width:'+s.weight+'%"></div></div>';
    list.appendChild(li);
  });

  // Phase 2E-3: fold the existing authInfo/attachmentInfo findings (authWhyFindings /
  // attachmentWhyFindings, both display-layer-only) into the same Trust/Risk/Attention groups
  // as r.signals. r.signals never references auth or attachments, so there is no overlap to
  // dedupe against.
  const authFindings = authWhyFindings(r.authInfo);
  const attachmentFindings = attachmentWhyFindings(r.attachmentInfo);
  const byTier = tier => [
    ...r.signals.filter(s=>evidenceTier(s)===tier).map(s=>s.title),
    ...authFindings.filter(f=>f.tier===tier).map(f=>f.text),
    ...attachmentFindings.filter(f=>f.tier===tier).map(f=>f.text)
  ];
  const trustSignals = byTier('trust');
  const riskSignals = byTier('risk');
  const attentionSignals = byTier('attention');
  const fillWhyList = (elId, group) => {
    const el = document.getElementById(elId);
    if(group.length===0){ el.innerHTML = '<li class="why-empty">None detected</li>'; return; }
    el.innerHTML = group.map(text=>'<li>'+escapeHtml(text)+'</li>').join('');
  };
  fillWhyList('why-trust-list', trustSignals);
  fillWhyList('why-risk-list', riskSignals);
  fillWhyList('why-attention-list', attentionSignals);

  document.getElementById('risk-panel').style.borderLeftColor = r.color;
  document.getElementById('risk-text').textContent = r.riskText;
  document.getElementById('recommend-text').textContent = r.recommendText;
  document.getElementById('recommend-text').style.color = r.color;

  const actionList = document.getElementById('action-list');
  actionList.innerHTML = buildRecommendation(r).map(a=>'<li>'+escapeHtml(a)+'</li>').join('');

  const auth = r.authInfo;
  const authUnavailable = document.getElementById('auth-unavailable');
  const authGrid = document.getElementById('auth-grid');
  const authEvidenceList = document.getElementById('auth-evidence-list');
  if(!auth || !auth.available){
    authUnavailable.style.display = 'block';
    authGrid.style.display = 'none';
    authEvidenceList.innerHTML = '';
  } else {
    authUnavailable.style.display = 'none';
    authGrid.style.display = 'grid';
    const statusClass = v => (v==='pass'||v==='aligned') ? 'auth-pass' : (v==='none'||v==='unknown') ? 'auth-neutral' : 'auth-fail';
    const setStatus = (id, value) => {
      const el = document.getElementById(id);
      el.textContent = value;
      el.className = 'auth-status-badge '+statusClass(value);
    };
    setStatus('auth-spf', auth.spf);
    setStatus('auth-dkim', auth.dkim);
    setStatus('auth-dmarc', auth.dmarc);
    setStatus('auth-alignment', auth.alignment);
    const evidence = buildAuthEvidence(auth);
    authEvidenceList.innerHTML = evidence.length===0
      ? '<li class="why-empty">No authentication issues detected.</li>'
      : evidence.map(e=>'<li>'+escapeHtml(e)+'</li>').join('');
  }

  const attachmentInfo = r.attachmentInfo;
  const attUnavailable = document.getElementById('attachment-unavailable');
  const attNone = document.getElementById('attachment-none');
  const attTable = document.getElementById('attachment-table');
  const attTableBody = document.getElementById('attachment-table-body');
  attUnavailable.style.display = 'none';
  attNone.style.display = 'none';
  attTable.style.display = 'none';
  if(!attachmentInfo){
    attUnavailable.style.display = 'block';
  } else if(!attachmentInfo.available || attachmentInfo.count===0){
    attNone.textContent = 'No attachments were found on this message.';
    attNone.style.display = 'block';
  } else if(attachmentInfo.suspicious.length===0){
    attNone.textContent = attachmentInfo.count+' attachment(s) found — no risk indicators detected for these file types.';
    attNone.style.display = 'block';
  } else {
    attTable.style.display = 'table';
    attTableBody.innerHTML = attachmentInfo.suspicious.map(a=>
      '<tr><td>'+escapeHtml(a.filename)+'</td><td class="mono">'+escapeHtml(a.mimeType||'—')+'</td>'+
      '<td><span class="auth-status-badge '+(a.risk==='high'?'auth-fail':'attachment-risk-medium')+'">'+escapeHtml(a.risk)+'</span></td>'+
      '<td>'+escapeHtml(a.reason)+'</td></tr>'
    ).join('');
  }
}

document.getElementById('btn-export').addEventListener('click', ()=>{
  if(!lastResult) return;
  const severity = threatSeverity(lastResult);
  const urlCount = (lastResult.urls||'').split(',').map(u=>u.trim()).filter(Boolean).length;
  const report = {
    generated_at: new Date().toISOString(),
    threat_level: severity.level,
    classification: lastResult.labelText,
    confidence_percent: lastResult.confidence,
    subject: lastResult.subject,
    sender: lastResult.sender,
    url_count: urlCount,
    urls: lastResult.urls,
    metadata: lastResult.metadata,
    signal_count: lastResult.signals.length,
    signals: {
      trust: lastResult.signals.filter(s=>evidenceTier(s)==='trust').map(s=>({title:s.title, detail:s.detail})),
      risk: lastResult.signals.filter(s=>evidenceTier(s)==='risk').map(s=>({title:s.title, detail:s.detail})),
      attention: lastResult.signals.filter(s=>evidenceTier(s)==='attention').map(s=>({title:s.title, detail:s.detail}))
    },
    risk_summary: lastResult.riskText,
    recommended_action: lastResult.recommendText,
    suggested_next_steps: buildRecommendation(lastResult)
  };
  const blob = new Blob([JSON.stringify(report,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fileLabel = lastResult.label==='legit' ? 'legitimate' : lastResult.label==='ai' ? 'ai-phishing' : 'human-phishing';
  a.href = url; a.download = 'phishsite-report-'+fileLabel+'.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

/* ---------- model lab ---------- */
const MODELS = {
  tfidf:{
    kpis:{accuracy:91.4, precision:90.1, recall:89.6, f1:89.8},
    matrix:[[92,5,3],[6,88,6],[4,9,87]]
  },
  distilbert:{
    kpis:{accuracy:94.7, precision:94.0, recall:93.8, f1:93.9},
    matrix:[[96,2,2],[3,93,4],[2,5,93]]
  }
};
const CLASS_LABELS = ["Legit","Human","AI"];
const CLASS_COLORS = ["#46C08D","#E3A23C","#C2467A"];
const MODEL_META = {
  tfidf:{name:"TF-IDF + XGBoost", note:"Lightweight baseline, fast to retrain"},
  distilbert:{name:"DistilBERT-inspired", note:"Higher accuracy, heavier inference cost"}
};

function renderLab(modelKey){
  const m = MODELS[modelKey];
  document.getElementById('lab-overview-name').textContent = MODEL_META[modelKey].name;
  document.getElementById('lab-overview-note').textContent = MODEL_META[modelKey].note;
  const kpiRow = document.getElementById('kpi-row');
  kpiRow.innerHTML = '';
  [['Accuracy',m.kpis.accuracy],['Precision',m.kpis.precision],['Recall',m.kpis.recall],['F1-score',m.kpis.f1]].forEach(([label,val])=>{
    const card = document.createElement('div');
    card.className='kpi-card';
    card.innerHTML = '<p class="kpi-label">'+label+'</p><p class="kpi-value">'+val+'%</p>';
    kpiRow.appendChild(card);
  });

  document.querySelectorAll('#cmp-table tbody tr').forEach(tr=>{
    tr.classList.toggle('active-row', tr.dataset.model===modelKey);
  });

  const conf = document.getElementById('confusion-matrix');
  conf.innerHTML = '';
  conf.appendChild(document.createElement('div'));
  CLASS_LABELS.forEach(l=>{
    const h = document.createElement('div'); h.className='head'; h.textContent='Pred. '+l; conf.appendChild(h);
  });
  const maxVal = Math.max(...m.matrix.flat());
  m.matrix.forEach((row,i)=>{
    const rh = document.createElement('div'); rh.className='rowhead'; rh.textContent='Actual '+CLASS_LABELS[i];
    conf.appendChild(rh);
    row.forEach((val,j)=>{
      const cell = document.createElement('div'); cell.className='cell';
      const isDiag = i===j;
      const intensity = 0.18 + 0.75*(val/maxVal);
      cell.style.background = isDiag ? hexToRgba(CLASS_COLORS[i], intensity) : 'rgba(226,104,90,'+(0.12+0.5*(val/maxVal))+')';
      cell.textContent = val;
      conf.appendChild(cell);
    });
  });
}
function hexToRgba(hex, a){
  const v = hex.replace('#','');
  const r = parseInt(v.substring(0,2),16), g=parseInt(v.substring(2,4),16), b=parseInt(v.substring(4,6),16);
  return 'rgba('+r+','+g+','+b+','+a+')';
}

document.querySelectorAll('.toggle-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.toggle-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    renderLab(btn.dataset.model);
  });
});

function renderDist(){
  const data = [["Legitimate",1200,CLASS_COLORS[0]],["Human phishing",900,CLASS_COLORS[1]],["AI phishing",500,CLASS_COLORS[2]]];
  const max = Math.max(...data.map(d=>d[1]));
  const chart = document.getElementById('dist-chart');
  chart.innerHTML='';
  data.forEach(([label,count,color])=>{
    const row = document.createElement('div'); row.className='dist-row';
    row.innerHTML = '<span class="dist-label">'+label+'</span>'+
      '<div class="dist-track"><div class="dist-fill" style="width:'+(count/max*100)+'%;background:'+color+'"></div></div>'+
      '<span class="dist-count">'+count+'</span>';
    chart.appendChild(row);
  });
}

const historySearchEl = document.getElementById('history-search');
const historyFilterEl = document.getElementById('history-filter');
if(historySearchEl) historySearchEl.addEventListener('input', renderHistory);
if(historyFilterEl) historyFilterEl.addEventListener('change', renderHistory);

renderLab('tfidf');
renderDist();
renderDashboard();
renderHistory();
renderAnalytics();
renderSettings();
