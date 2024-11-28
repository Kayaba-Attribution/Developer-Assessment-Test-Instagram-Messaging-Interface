const crypto = require("crypto");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

class TempMailService {
  constructor(
    logger,
    firstNamesFile = "first-name.txt",
    lastNamesFile = "last-name.txt"
  ) {
    this.logger = logger;
    this.domains = [
      "@cevipsa.com",
      "@cpav3.com",
      "@nuclene.com",
      "@steveix.com",
      "@mocvn.com",
      "@tenvil.com",
      "@tgvis.com",
      "@amozix.com",
      "@anypsd.com",
      "@maxric.com",
    ];

    this.rapidApiKey =
      process.env.RAPID_API_KEY ||
      "77c626cf32msh494171e69b2abc6p13fd21jsnc616d1046cbf";
    this.firstNames = this.loadNamesFromFile(firstNamesFile, [
      "John",
      "Jane",
      "Alex",
      "Emily",
    ]);
    this.lastNames = this.loadNamesFromFile(lastNamesFile, [
      "Doe",
      "Smith",
      "Johnson",
      "Brown",
    ]);

    // Initialize axios instance with default config
    this.mailApi = axios.create({
      baseURL: "https://privatix-temp-mail-v1.p.rapidapi.com",
      headers: {
        "x-rapidapi-key": this.rapidApiKey,
        "x-rapidapi-host": "privatix-temp-mail-v1.p.rapidapi.com",
      },
      timeout: 10000,
    });

    this.logger.info("TempMailService initialized");
  }

  loadNamesFromFile(fileName, fallback) {
    try {
      const filePath = path.resolve(__dirname, fileName);
      if (!fs.existsSync(filePath)) {
        this.logger.warn(
          `[TempMailService] Using fallback names, ${fileName} not found`
        );
        return fallback;
      }

      const names = fs
        .readFileSync(filePath, "utf-8")
        .split(/\r?\n/)
        .filter((name) => name.trim());

      return names.length ? names : fallback;
    } catch (error) {
      this.logger.error(`[TempMailService] File read error: ${error.message}`);
      return fallback;
    }
  }

  generateEmail(prefix = "") {
    const randomFirstName =
      this.firstNames[Math.floor(Math.random() * this.firstNames.length)];
    const randomLastName =
      this.lastNames[Math.floor(Math.random() * this.lastNames.length)];
    const uniqueIdentifier = crypto.randomBytes(4).toString("hex");
    const finalPrefix =
      prefix || `${randomFirstName}.${randomLastName}.${uniqueIdentifier}`;
    const randomDomain =
      this.domains[Math.floor(Math.random() * this.domains.length)];
    const email = finalPrefix + randomDomain;

    return {
      email,
      hash: crypto.createHash("md5").update(email).digest("hex"),
    };
  }

  async getEmails(hash) {
    try {
      const { data } = await this.mailApi.get(`/request/mail/id/${hash}/`);

      // Handle empty or invalid response
      if (!data) {
        this.logger.warn(`[TempMailService] No emails found for hash: ${hash}`);
        return [];
      }

      // Handle both array and single email responses
      return Array.isArray(data) ? data : [data];
    } catch (error) {
      this.logger.error(
        `[TempMailService] Email fetch failed: ${error.message}`
      );
      return []; // Return empty array instead of throwing
    }
  }

  generateFullName() {
    const firstName =
      this.firstNames[Math.floor(Math.random() * this.firstNames.length)];
    const lastName =
      this.lastNames[Math.floor(Math.random() * this.lastNames.length)];
    return `${firstName} ${lastName}`;
  }

  extractVerificationCode(subject) {
    if (!subject) return null;

    const patterns = [
      /(\d{4,8})\s+is\s+your/i,
      /code\s*[:\-]?\s*(\d{4,8})/i,
      /verification\s+code\s*[:\-]?\s*(\d{4,8})/i,
      /\b(\d{4,8})\b/,
    ];

    for (const pattern of patterns) {
      const match = subject.match(pattern);
      if (match?.[1]) return match[1];
    }
    return null;
  }

  async getVerificationCode(emailHash) {
    try {
      const emails = await this.getEmails(emailHash);

      if (!emails.length) {
        this.logger.warn("[TempMailService] No emails found");
        return null;
      }

      // Sort by timestamp if available
      const sortedEmails = emails.sort(
        (a, b) => (b.mail_timestamp || 0) - (a.mail_timestamp || 0)
      );

      for (const email of sortedEmails) {
        if (!email.mail_subject) continue;
        const code = this.extractVerificationCode(email.mail_subject);
        if (code) {
          this.logger.info(`[TempMailService] Found code: ${code}`);
          return code;
        }
      }

      return null;
    } catch (error) {
      this.logger.error(
        `[TempMailService] Failed to get code: ${error.message}`
      );
      return null;
    }
  }
}

module.exports = TempMailService;
