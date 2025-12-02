
# 🛡️ Military-Grade Web App Security Checklist
**Generated:** 2025-08-01

## ✅ 1. Zero Trust Architecture
- [ ] Require auth for every route, page, API, or database action
- [ ] Apply Row-Level Security (RLS) to every Supabase table
- [ ] Use least-privilege access per user, role, and component

## 🔐 2. Multi-Factor Authentication (MFA)
- [ ] Enable MFA for admin accounts (e.g., TOTP or email OTP)
- [ ] Enable optional MFA for all users
- [ ] Alert on new device/browser login

## 🔏 3. End-to-End Encryption (E2EE)
- [ ] Encrypt sensitive messages/files client-side (AES-256)
- [ ] Store keys per user or via secure key management
- [ ] Use Web Crypto API or crypto-js for frontend encryption

## 🛡 4. Injection Protections
- [ ] Sanitize all inputs with DOMPurify (XSS)
- [ ] Disable `dangerouslySetInnerHTML` unless fully sanitized
- [ ] Set Content-Security-Policy headers
- [ ] Use parameterized queries (never raw SQL)

## 🌊 5. DDoS & Rate Limiting
- [ ] Enable Cloudflare (Free tier OK)
- [ ] Enable “Under Attack” mode on high-traffic routes
- [ ] Rate-limit login, /ask, /upload, /api routes

## 🧬 6. Prompt Injection Defense (for AI features)
- [ ] Strip embedded prompts like “Ignore previous instructions”
- [ ] Add stop words or filters before passing prompt to LLM
- [ ] Disable markdown rendering unless sanitized

## 📁 7. File Upload Security
- [ ] Limit file types (e.g., .jpg, .pdf)
- [ ] Strip image metadata (EXIF)
- [ ] Scan uploads with VirusTotal, ClamAV or similar
- [ ] Use signed URLs for file access (Supabase does this)

## 📦 8. Dependency & Package Security
- [ ] Run `npm audit fix` or use Snyk/GitHub Dependabot
- [ ] Avoid untrusted packages with <10k downloads
- [ ] Pin dependencies and enable auto-updates for security

## 🔐 9. Session & Token Management
- [ ] Rotate tokens on login/logout
- [ ] Track device/IP for each session
- [ ] Invalidate session on password change or 2FA reset

## 🌐 10. Network Security
- [ ] Enforce HTTPS with HSTS headers
- [ ] Use TLS 1.3 (disable old TLS)
- [ ] Disallow mixed content and insecure iframe embeds

## 🧾 11. Logging & Monitoring
- [ ] Log login, logout, file activity, chat messages
- [ ] Capture IP, user-agent, geolocation for all sessions
- [ ] Use Sentry, LogRocket, or Datadog for alerts

## 🕵️ 12. User & Legal Protections
- [ ] Add “delete my account” feature
- [ ] Add GDPR/CCPA Privacy Policy and Terms pages
- [ ] Add security.txt and robots.txt

## 🧠 13. Advanced Protections
- [ ] Add CAPTCHA to login/signup/contact
- [ ] Add session fingerprinting (device + IP check)
- [ ] Log and display “last login IP” to user
- [ ] Run regular OWASP scans (e.g., ZAP or Nuclei)

---
**End of checklist**


Cybersecurity Professional Tools
1. Network Scanning & Reconnaissance

Nmap → Port scanner & network mapper (find open services).

Zenmap → GUI for Nmap.

Masscan → Super-fast internet-wide port scanner.

Shodan → Search engine for internet-connected devices.

2. Vulnerability Scanning

Nessus → Industry-standard vulnerability scanner.

OpenVAS (Greenbone) → Open-source vulnerability scanning.

QualysGuard → Enterprise-grade cloud vulnerability management.

3. Penetration Testing & Exploitation

Metasploit Framework → Exploit development & execution.

BeEF (Browser Exploitation Framework) → Attacks via the web browser.

Empire → Post-exploitation framework for Windows environments.

Cobalt Strike → Advanced red team tool (often abused by hackers).

4. Web Security Testing

Burp Suite → Web app penetration testing (proxy, scanner, repeater).

OWASP ZAP → Open-source alternative to Burp Suite.

Nikto → Web server scanner (looks for vulnerabilities, misconfigurations).

5. Password & Credential Cracking

John the Ripper → Password cracking tool.

Hashcat → GPU-based fast hash cracking.

Hydra → Brute force tool for network logins (FTP, SSH, HTTP, etc.).

6. Wireless Security

Aircrack-ng → Cracking WiFi WPA/WPA2 passwords.

Kismet → Wireless network detector/sniffer.

Reaver → Exploits WPS vulnerabilities on routers.

7. Traffic Analysis & Packet Capture

Wireshark → Packet capture & network analysis (gold standard).

Tcpdump → Command-line packet sniffer.

Ettercap → Man-in-the-middle attacks & packet manipulation.

8. Forensics & Incident Response

Autopsy / Sleuth Kit → Disk forensics.

Volatility → Memory analysis framework.

FTK / EnCase → Commercial digital forensics suites.

OSQuery → Query system data like a database (good for hunting).

9. OSINT (Open Source Intelligence)

Maltego → Graph-based intelligence gathering.

Recon-ng → OSINT framework for reconnaissance.

theHarvester → Collect emails, subdomains, hosts.

Spiderfoot → Automated OSINT tool.

10. Defensive / Blue Team Tools

SIEM (Security Information & Event Management):

Splunk

ELK Stack (Elasticsearch, Logstash, Kibana)

Graylog

EDR (Endpoint Detection & Response):

CrowdStrike Falcon

SentinelOne

Microsoft Defender for Endpoint

Firewalls / IDS / IPS:

Snort (Intrusion Detection System)

Suricata (Intrusion Detection & Prevention)

pfSense (Open-source firewall)

11. Specialized Tools

Kali Linux → Penetration testing distro (comes preloaded with many of the above).

Parrot Security OS → Lightweight alternative to Kali.

Docker / VirtualBox / VMware → For safe testing environments.