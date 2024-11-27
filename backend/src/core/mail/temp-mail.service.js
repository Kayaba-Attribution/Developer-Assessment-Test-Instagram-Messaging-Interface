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

    // Load names from files or fallback to defaults
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

    this.logger.info("TempMailService initialized");
    this.logger.debug(
      `Example email: ${JSON.stringify(this.generateEmail(), null, 2)}`
    );
  }

  loadNamesFromFile(fileName, fallback) {
    const filePath = path.resolve(__dirname, fileName);
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        const names = content
          .split(/\r?\n/)
          .filter((name) => name.trim() !== "");
        if (names.length > 0) {
          this.logger.debug(
            `Loaded ${names.length} names from file ${fileName}`
          );
          return names;
        } else {
          this.logger.warn(
            `File ${fileName} is empty. Falling back to default names.`
          );
        }
      } else {
        this.logger.warn(
          `[TempMailService] File ${fileName} does not exist. Falling back to default names.`
        );
      }
    } catch (error) {
      this.logger.error(`Error reading file ${fileName}: ${error.message}`);
    }
    return fallback;
  }

  generateEmail(prefix = "") {
    // Generate name-based prefix if none provided
    const randomFirstName =
      this.firstNames[Math.floor(Math.random() * this.firstNames.length)];
    const randomLastName =
      this.lastNames[Math.floor(Math.random() * this.lastNames.length)];
    const namePrefix = `${randomFirstName}.${randomLastName}`;

    const uniqueIdentifier = crypto.randomBytes(4).toString("hex");
    const finalPrefix = prefix || `${namePrefix}.${uniqueIdentifier}`;
    const randomDomain =
      this.domains[Math.floor(Math.random() * this.domains.length)];
    const email = finalPrefix + randomDomain;

    // Generate hash for collision prevention and uniqueness tracking
    const hash = crypto.createHash("md5").update(email).digest("hex");

    return {
      email,
      hash,
    };
  }

  async getEmails(hash) {
    try {
      const response = await axios.get(
        `https://privatix-temp-mail-v1.p.rapidapi.com/request/mail/id/${hash}/`,
        {
          headers: {
            "x-rapidapi-key": this.rapidApiKey,
            "x-rapidapi-host": "privatix-temp-mail-v1.p.rapidapi.com",
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching emails:", error);
      throw error;
    }
  }

  extractVerificationCode(subject) {
    // Common patterns for verification codes
    const patterns = [
      /(\d{4,8})\s+is\s+your/i, // "123456 is your"
      /code\s*[:\-]?\s*(\d{4,8})/i, // "code: 123456" or "code 123456"
      /verification\s+code\s*[:\-]?\s*(\d{4,8})/i,
      /\b(\d{4,8})\b/, // Any 4-8 digit number
    ];

    for (const pattern of patterns) {
      const match = subject.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  async getVerificationCode(emailHash) {
    try {
      const emails = await this.getEmails(emailHash);

      const sortedEmails = emails.sort(
        (a, b) => b.mail_timestamp - a.mail_timestamp
      );

      for (const email of sortedEmails) {
        const code = this.extractVerificationCode(
          email.mail_subject
        );
        if (code) {
          return code;
        }
      }
    } catch (error) {
      this.logger.error("Error getting verification code:", error.message);
      throw error;
    }
  }

  generateFullName() {
    const firstName =
      this.firstNames[
        Math.floor(Math.random() * this.firstNames.length)
      ];
    const lastName =
      this.lastNames[
        Math.floor(Math.random() * this.lastNames.length)
      ];
    return `${firstName} ${lastName}`;
  }
}

module.exports = TempMailService;
